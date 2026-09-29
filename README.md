# amritmaniaryal.github.io

Personal portfolio site — single-page, built with [Vite](https://vite.dev/) and
[Tailwind CSS](https://tailwindcss.com/), with vanilla JavaScript (no framework).

Live at <https://amritmaniaryal.github.io/>.

## Structure

| Path | Role |
| --- | --- |
| `index.html` | **Vite entry point and the site's content.** Edit content here. |
| `src/main.js` | Nav, mobile menu, scroll-spy, typing animation, scroll reveal. |
| `src/style.css` | Tailwind layers plus custom component classes. |
| `tailwind.config.js` | Theme tokens (colours, fonts, keyframes). |
| `profile.jpg` | Source image for the hero photo **and** the `og:image`. |
| `public/` | Copied verbatim into the build (`resume.pdf`). |
| `dist/` | Build output. Gitignored — never edit or commit it. |

`profile.jpg` is hashed into `dist/assets/` at build time, and Vite rewrites the
`og:image` meta tag to match, so the hero and the social preview always use the
same photo. Keep the file at the repo root.

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
