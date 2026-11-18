# amritmaniaryal.github.io

Personal portfolio site — single-page, built with [Vite](https://vite.dev/) and
[Tailwind CSS](https://tailwindcss.com/), with vanilla JavaScript (no framework).

Live at <https://amritmaniaryal.github.io/>.

## Structure

| Path | Role |
| --- | --- |
| `index.html` | **Vite entry point and the site's content.** Edit content here. |
| `src/posts/` | **Blog source.** One Markdown file per post, plus `posts.json`. |
| `scripts/blog.js` | Turns the Markdown posts into the blog HTML at dev/build time. |
| `blog/` | Generated blog pages. Gitignored — never edit or commit it. |
| `src/main.js` | Nav, mobile menu, scroll-spy, typing animation, scroll reveal. |
| `src/style.css` | Tailwind layers plus custom component classes. |
| `tailwind.config.js` | Theme tokens (colours, fonts, keyframes). |
| `profile.jpg` | Source image for the hero photo **and** the `og:image`. |
| `public/` | Copied verbatim into the build (`resume.pdf`). |
| `dist/` | Build output. Gitignored — never edit or commit it. |

`profile.jpg` is hashed into `dist/assets/` at build time, and Vite rewrites the
`og:image` meta tag to match, so the hero and the social preview always use the
same photo. Keep the file at the repo root.

## Adding a blog post

The blog is generated from two things: one Markdown file per post, and one line
in a list. You do not need to touch HTML, CSS, or JavaScript.

### 1. Create the post file

Create a new file in `src/posts/` named after its slug, for example
`src/posts/my-first-post.md`. Start it with this front matter, then write the
body in Markdown below the second `---`:

```markdown
---
title: "My first post"
date: "2026-11-20"
summary: "One sentence that appears on the blog index and in search results."
slug: "my-first-post"
---

The post body starts here. Write as much as you like.

## A section heading

Normal paragraphs, **bold**, *italic*, [links](https://example.com), lists,
blockquotes, tables, and fenced code blocks all work.
```

Rules for the four metadata fields:

| Field | Format | Notes |
| --- | --- | --- |
| `title` | Text in quotes | Shown as the page heading and browser title. |
| `date` | `"YYYY-MM-DD"` | Displayed on the index and post page. |
| `summary` | Text in quotes | One line on the index; also the meta description. |
| `slug` | Lowercase words joined by `-` | Must match the filename: `my-first-post` → `my-first-post.md`. |

### 2. Add one line to the list

Open `src/posts/posts.json`. Add the filename as the first entry, because the
array order is the order shown on the blog index (newest first):

```json
[
  "my-first-post.md",
  "fake-patients-real-pipeline.md",
  "green-doesnt-mean-tested.md"
]
```

Keep the quotes and the comma between entries.

### 3. Preview and publish

```bash
npm run dev      # regenerates the blog on every save at /blog/
npm run build    # production build, including /blog/
npm run preview  # serve the built output
```

The new post will be at `/blog/my-first-post/`. Commit the `.md` file and
`posts.json`; the generated `blog/` folder is ignored and rebuilt by GitHub
Actions on push.

If a required field is missing, the filename and slug do not match, or the
date/slug is malformed, `npm run dev` and `npm run build` stop with a message
naming the file and the problem.

Read time is calculated from the body automatically. The first paragraph is
not reused as the summary — always fill in `summary`.

## Local development

```bash
npm install
npm run dev      # dev server with HMR
npm run build    # production build -> dist/
npm run preview  # serve the built output locally
```

## Deployment

Deployment is **automatic** via GitHub Actions
(`.github/workflows/deploy.yml`): every push to `main` runs `npm ci` and
`npm run build`, then uploads `dist/` as the Pages artifact.

There is no manual deploy script, and none is needed.

> **Important:** the repository's Pages source must stay set to
> **"GitHub Actions"** — *Settings → Pages → Build and deployment → Source*.
>
> The source `index.html` links `/src/style.css`, which is raw Tailwind and not
> servable. If Pages were switched to "Deploy from a branch", that file would be
> served directly and the site would render unstyled.

To deploy, just commit and push to `main`.

## History

An earlier `deploy.sh` built the site and committed the output to the repo root.
It was removed because it was destructive: it restored `index.html` from an old
commit before building, which silently reverted later content changes, and it
overwrote the Vite entry point. The committed root output it left behind
(`assets/`) was never served — the live site comes from the Actions artifact.
Both are now gone, and `.gitignore` blocks them from returning.
