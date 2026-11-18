---
title: "Green doesn't mean tested"
date: "2026-11-17"
summary: "A passing pipeline only proves that nothing threw. Data correctness needs assertions about the output, not just the exit code."
slug: "green-doesnt-mean-tested"
---



Six weeks ago I started building a healthcare claims pipeline end to end: Synthea
CSVs → S3 → Spark → Snowflake → dbt, orchestrated by Airflow, 1.1M rows across
eleven tables. Week 5 was the one with nothing new to model. It was CI/CD,
alerting and a dashboard — the plumbing.

It turned into the most instructive week of the project, and almost none of the
lessons were about data. They were about checks that pass while validating
nothing.

## The setup, briefly

Eleven raw tables land in `healthcare.raw`. dbt turns them into 19 models in
three layers — staging (1:1 renames), intermediate (joins), marts (two
dimensions, one fact of 902,713 claim lines, three aggregates) — with 95 tests
across the layers. A dashboard reads the marts.

Everything below is about what happens when a pull request changes one of those
models.

## Part 1: `dbt build` is one command, and that's the point

The obvious CI line is `dbt run && dbt test`. It's also wrong.

`dbt run` builds every model, then `dbt test` tests every model. `dbt build`
interleaves them: build a model, test it, then move to its children. When a test
fails, the children are skipped entirely.

That difference matters more than it sounds. On this project, a broken staging
test under `dbt run && dbt test` leaves every mart rebuilt from bad data before
the first assertion runs. Under `dbt build`, the marts are never touched: the
build stops where the break is, and the log points at that layer instead of a
confusing failure six models later.

One command. Half the warehouse work when something breaks. A log that names the
right model.

## Part 2: CI writes somewhere nobody reads

`dbt build` writes. Point it at your normal target and every pull request
rebuilds the tables your dashboard reads — so "publish" quietly becomes "whatever
branch ran last".

So CI gets its own schema (`ci_staging`, `ci_marts`), and this is where the day
got interesting.

The project's `generate_schema_name` override returns a custom schema verbatim,
because the default behaviour concatenates (`staging` + `marts` = `staging_marts`,
which nobody wants). That override ignores `target.schema` — which means adding a
`ci` target was not enough. `+schema: marts` still resolved to the real `marts`,
so a PR would have written to production while looking correctly isolated.

The fix was to derive the schema from the target name, which also removed a
`--vars` flag. And the flag mattered: the first attempt at passing it had a typo
(`mart_schema` instead of `marts_schema`). dbt does not error on an unknown
variable — it falls back to the default. CI would have built the real marts and
reported success.

Two independent ways to write production from a pull request, both silent. That
set the theme for the week.

## Part 3: the account changed the auth model mid-project

`dbt build` stopped with `Multi-factor authentication is required for this
account`. Snowflake had begun enforcing MFA on password logins.

This blocks local runs and CI at the same time, and it is worse for CI: a runner
has no browser and no passcode. No amount of retrying gets past it.

Key-pair authentication was the fix. The client signs; the server verifies against
a registered public key. The private key never travels. Two things cost time:

- `env_var()` returns a raw string. `~/.snowflake/rsa_key.p8` fails as "file not
  found", because nothing expands the tilde.
- A PEM pasted into a GitHub secret loses its newlines. Base64-encode it, decode
  onto the runner, `chmod 600`.

Worth knowing before it happens to you: a green CI pipeline is not a stable
asset. Auth policies, base images and connector versions move underneath it.

## Part 4: one alert per run, not thirty-three

The pipeline is 33 task instances from three definitions. The failure callback
lived in `default_args`, so a broken table under a mapped task sent eleven
messages for one failure.

Moving it to the DAG decorator made it one message per failed run. Two details:

- Read `dag_run.run_after`, not `logical_date`. Manually triggered runs have no
  logical date, which is the same trap that broke date templating in Week 1.
- The sender raises on failure; the callback wrapper catches everything. An alert
  that throws while handling a failure buries the original error.

## Part 5: the dashboard, and the number that looked wrong

Six read-only queries over the marts, cached for ten minutes. Streamlit reruns
the whole script on every interaction, and every uncached query resumes the
warehouse for a sixty-second minimum, so the cache is what keeps a session to one
resume.

The interesting part was a number. One procedure showed $167M paid against a
project total of $146.7M — impossible. Before touching the model, I ran a
reconciliation:

```
fact_paid_total   146,698,193.10
agg_paid_total    146,698,193.10
```

Exact, to the cent. The aggregate was right and the $167M was my misreading of a
screenshot. The lesson is not "verify your data" but something narrower: **check
the total before debugging the parts.** Two subqueries would have saved an hour
of suspicion.

The marts themselves encode a decision worth naming: cost figures are
`payments`, not `charges`. Four different cost totals exist in this dataset
(patient-reported expenses at 192.8M, transaction amounts at 178.2M, encounter
totals at 152.0M, payments at 146.7M), and payments are the only one traceable to
claim lines.

## Part 6: two false greens

The bugs I'll remember are the ones where CI reported success without checking
anything.

**The pipe.** The path filter decided whether to build by piping a file list into
`grep -q`. Under `set -o pipefail`, when `grep -q` exits on its first match, the
writer can receive SIGPIPE — failing the pipeline, which the step then read as
"no dbt changes". A skipped build, reported as passing. Measured locally: 10
changed files matched; 5,000 did not. A here-string has no pipe and no bug.

**The filter that watched one file.** The pattern named
`.github/workflows/dbt.yml` exactly. That was deliberate — editing the CI
workflow should re-run it. But then a second workflow appeared,
`dbt-deploy.yml`, which decides what gets published and where. A PR editing it
matched nothing, skipped the build, and went green. Its first execution would
have been live against production tables.

Watching the directory fixed the class. And because `dbt build` cannot validate
YAML, `actionlint` now runs before the filter — five seconds, no warehouse, and
it catches the typos that motivated the worry.

Both bugs share a shape: the check was green because it declined to look.

## Part 7: merged is not published

For most of the week, merging a dbt PR left the marts stale. CI proved the branch
worked, then threw the result away. The dashboard kept serving the previous
numbers, and only a local `dbt build` closed the gap.

The fix is a second workflow: on push to `main`, `dbt build --target prod`. It
re-tests nothing, because branch protection already required a green check on
that exact code. It publishes.

That needed a `prod` target, and the `prod` target needed the schema conditional
to include it — otherwise `--target prod` derives `prod_marts`, a schema nobody
reads, while the deploy reports success. The same class of bug, three times in
one week: a correct-looking run pointing at the wrong place.

## What I'd do differently at scale

- **Roles per environment, not just schemas.** Right now one credential writes
  the sandbox and the published tables. Production should be writable only by the
  deploy job.
- **Slim CI.** `--select state:modified+ --defer --state prod_manifest` rebuilds
  only changed models and their children, instead of all 19 on every PR.
- **A staging environment between merge and prod**, because a publish can be
  wrong in ways tests don't catch — numbers that are internally consistent and
  externally surprising.
- **Freshness checks**, not just correctness tests. Nothing currently notices
  that `raw` stopped arriving.

## The takeaway

Every bug that cost real time this week produced a green check. Not one of them
produced a red one.

Red failures are cheap: they interrupt you and explain themselves. Green checks
that test nothing are expensive, because nothing interrupts you. So the question
to ask of a CI pipeline isn't "does it pass?" but "what would have to be true for
this pass to mean something?" — and then to check that the pipeline actually
evaluates that.

The repo is at [github.com/amritmaniaryal/de-e2e-healthcare-pipeline](https://github.com/amritmaniaryal/de-e2e-healthcare-pipeline).
