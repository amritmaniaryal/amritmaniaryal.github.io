---
title: "Fake patients, real pipeline"
date: "2026-11-16"
summary: "Synthetic patient records are only useful when they are as awkward as the real ones. Here is how I build test fixtures that fail for the right reasons."
slug: "fake-patients-real-pipeline"
---



For the past month or so I've been waiting on my EAD to arrive, and it has been
taking forever. Which means a lot of free time and no way to use it productively.
I didn't want my data engineering skills going stale while I waited, so I decided
to build an end-to-end pipeline from scratch.

I wanted to cover the parts a data engineer doesn't always get to touch. Setting
up cloud accounts, wiring CI, figuring out why a load fails at 2am, building the
dashboard nobody assigned. In a real job there's usually someone else who owns
that half of the work. Here there wasn't, so it all landed on me.

I could have pointed a couple of coding agents at this and had something running
in a weekend. That would have defeated the entire point. I wrote and debugged
almost all of it myself and kept agents around as a companion for the small
stuff, mostly boilerplate I already understand and don't feel like typing again.

So I generated 1,096 fake patients with Synthea and built the rest myself, from
raw files in object storage all the way to a dashboard.

This is the short version of what that pipeline does, the parts that were
genuinely interesting, and what I would do differently if it had to survive real
users.

## What it actually does

Fake patient data comes out of Synthea as 18 CSVs. Eleven of them are relevant to
claims, and those are the ones I ingest.

From there it is a fairly standard batch pipeline. Airflow kicks off three
stages. The files go into S3 untouched. Spark validates and cleans each table
into Parquet. Snowflake picks up the Parquet and loads it into a raw schema. dbt
then turns eleven raw tables into 19 models: a staging layer that just renames
things, an intermediate layer that does the joins, and six marts that answer
actual questions.

On top of that sits a small Streamlit dashboard with four numbers and four
charts, and the whole transformation is tested on every pull request.

About 1.1 million rows, spread very unevenly. One table has 902,713 rows and
basically dominates everything.

## The bug that made me trust tests

Early on, most of my tables loaded cleanly and I felt fine about it. Then I
noticed the Spark cleaning step was reporting a healthy number of dropped rows on
`payer_transitions`, and somewhere in my head a small alarm went off.

The dedupe key was (patient, member id, start date, payer). Member id is null for
every single government payer row, because Medicare and Medicaid don't have
member ids. My cleaning step drops any row with a null anywhere in its key, on
the reasoning that a half-empty key can't identify anything. So all 10,521 of
those rows got thrown out, and they were perfectly good data.

The worst part is that it didn't look like a bug. The cleaning step reported one
combined number for rows dropped, so a wrong key and a genuine duplicate were
indistinguishable in the log. 28 percent of the table quietly vanished while every
run said things were fine.

I rebuilt the key without member id. The rows came back, the remaining three
columns are unique across all 37,700 rows, and the cleaning step now counts
duplicates and null-key drops separately, because those are completely different
problems. That was the moment I stopped trusting a pipeline just because it ran.

## Spark is very polite about losing your data

My first Spark job inferred schemas from the files. That is convenient and it is
also how you get a column of nulls with no error message.

Two examples from this dataset. Zip codes lose their leading zeros because Spark
decides they are integers. Procedure codes like "03" become 3. And Spark doesn't
even complain when it can't cast a value. It quietly puts a null there and moves
on with the row.

So now every schema is declared in code, and before cleaning each file Spark
reads it twice: once without a schema to get the true count of empty fields, once
with the schema. Any null beyond the real blanks is a value that died in a cast.
Boring check, saved me multiple times.

## Four different answers to "what did we spend"

Healthcare data is a gift that keeps giving. This dataset contains at least four
totally different cost totals: 192.8 million from patient-reported expenses,
178.2 million from transaction amounts, 152 million from encounter totals, and
146.7 million from actual payments.

None of them are wrong exactly. They just measure different things, and picking
one badly changes every number on your dashboard.

I went with payments, because it is the only figure that ties back to individual
claim lines. The transaction amount includes transfers between payers, which look
like spending and are not. That single decision moved the headline number by 21
percent.

## dbt did most of the thinking

The transformation layer ended up being my favourite part. Nineteen models, and
most of the work was deciding what each layer is allowed to promise.

Staging promises that the columns are renamed and typed correctly. Intermediate
promises that the joins are safe. Marts promise an answer a human can read.

Splitting those promises means 95 tests that fail at the right level instead of
one giant model that fails somewhere mysterious.

The layer also caught a modelling mistake I would have shipped otherwise. One
aggregate summed the transaction amount across all four transaction types, which
counted money moving between payers as new spend. Conditional measures fixed it.

## The part where CI reports success while testing nothing

Once the pipeline worked, I added the stuff that makes it look like a real
project: GitHub Actions running dbt on every pull request, Slack alerts when
Airflow fails, a dashboard, documentation.

The CI work was the most humbling. I ran into four separate bugs where the build
reported success without actually checking anything. A path filter that ignored
the file it was supposed to watch. A shell pipeline that failed on success and
read as "no changes here". A pull request build that would have written to the
real production tables while looking perfectly isolated.

None of them turned the check red. That is the scary version. A red check
interrupts you and tells you what happened. A green check that tests nothing
never interrupts you, and you find out weeks later.

## What I would change at scale

Three things, in order.

Roles per environment. Right now one credential writes both the sandbox schemas
and the published ones. In a real setup, production tables are writable only by
the deploy job.

An incremental fact table. Rebuilding 902,713 rows on every run is fine at this
size and wrong at any real one.

A real schedule. The DAG runs when I trigger it. Scheduling it on my laptop would
be theatre, so the honest version is a hosted Airflow, and that is a project of
its own.

## Was it worth it

Yes, mostly because of the two failure modes I hadn't really met before.

Nullable primary keys, for one. In past jobs the keys were usually enforced
upstream or handed to me already clean, so a column that is legitimately empty
for an entire category of records never really came up. Here it was sitting in
plain sight, and the cleaning step dealt with it by quietly discarding 28 percent
of the table.

Cast failures I had seen plenty of. They are usually loud. A type mismatch blows
up a job, someone gets paged, you fix the schema and move on. Here nothing blew
up. Spark read a value it could not cast, put a null in its place, and kept going.
The job went green and the data was wrong. That was the first time a pipeline of
mine failed without telling me.

Which is the real reason this was worth the month. I have written plenty of
pipelines that ran. This is the first one where I stopped assuming that running
means correct.

The code is at
[github.com/amritmaniaryal/de-e2e-healthcare-pipeline](https://github.com/amritmaniaryal/de-e2e-healthcare-pipeline).
