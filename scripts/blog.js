// Build-time blog generator.
//
// The only editable inputs are:
//   - src/posts/<slug>.md   one Markdown file per post, with front matter
//   - src/posts/posts.json  ordered list of Markdown filenames, newest first
//
// Running `npm run dev` or `npm run build` regenerates ./blog/index.html and
// ./blog/<slug>/index.html from those files. The generated HTML is gitignored;
// never edit it by hand. See README.md for the posting workflow.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const POSTS_DIR = path.join(ROOT, 'src', 'posts')
export const BLOG_DIR = path.join(ROOT, 'blog')

const LIST_FILE = path.join(POSTS_DIR, 'posts.json')
const REQUIRED_FIELDS = ['title', 'date', 'summary', 'slug']
const WORDS_PER_MINUTE = 200

const FAVICON =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='14' fill='%23A8442A'/><text x='50' y='72' font-family='Georgia,serif' font-size='62' font-weight='600' fill='%23FAF9F7' text-anchor='middle'>A</text></svg>"

const NAV_ITEMS = [
  ['About', 'about'],
  ['Skills', 'skills'],
  ['Experience', 'experience'],
  ['Education', 'education'],
  ['Projects', 'projects'],
  ['Blog', 'blog'],
  ['Contact', 'contact'],
]

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character]
  })

function formatDate(isoDate, short = false) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    month: short ? 'short' : 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

function readingTime(markdown) {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~\-|]/g, ' ')
  const words = plain.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}

function parsePost(listedName) {
  const file = path.join(POSTS_DIR, listedName)
  const where = `src/posts/${listedName}`

  if (!existsSync(file)) {
    throw new Error(
      `[blog] src/posts/posts.json lists "${listedName}", but ${where} does not exist.`,
    )
  }

  const raw = readFileSync(file, 'utf8')
  const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(raw)
  if (!frontMatter) {
    throw new Error(
      `[blog] ${where} must start with a front-matter block: a line containing only "---", then the fields, then another "---".`,
    )
  }

  const fields = {}
  frontMatter[1].split(/\r?\n/).forEach((line, index) => {
    if (!line.trim() || line.trimStart().startsWith('#')) return

    const colon = line.indexOf(':')
    if (colon === -1) {
      throw new Error(
        `[blog] ${where}, front matter line ${index + 1}: expected "key: value", got "${line.trim()}".`,
      )
    }

    const key = line.slice(0, colon).trim()
    let value = line.slice(colon + 1).trim()
    const quoted =
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    if (quoted) value = value.slice(1, -1)

    if (!key) {
      throw new Error(`[blog] ${where}, front matter line ${index + 1}: missing a field name.`)
    }
    fields[key] = value
  })

  for (const field of REQUIRED_FIELDS) {
    if (!fields[field]) {
      throw new Error(
        `[blog] ${where} is missing the "${field}" field. Required fields: ${REQUIRED_FIELDS.join(', ')}.`,
      )
    }
  }

  const { title, date, summary, slug } = fields

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(
      `[blog] ${where}: date must look like "YYYY-MM-DD" (for example "2026-11-12"), got "${date}".`,
    )
  }

  const [year, month, day] = date.split('-').map(Number)
  const parsedDate = new Date(Date.UTC(year, month - 1, day))
  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new Error(`[blog] ${where}: "${date}" is not a real calendar date.`)
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(
      `[blog] ${where}: slug "${slug}" must use lowercase letters, numbers and single hyphens only (for example "my-first-post").`,
    )
  }

  if (listedName !== `${slug}.md`) {
    throw new Error(
      `[blog] ${where}: the front-matter slug is "${slug}", so this file must be named "${slug}.md".`,
    )
  }

  const body = raw.slice(frontMatter[0].length).trim()
  if (!body) {
    throw new Error(`[blog] ${where} has no post body after the front matter.`)
  }

  return {
    title,
    date,
    summary,
    slug,
    readTime: readingTime(body),
    html: marked.parse(body, { gfm: true, breaks: false }),
  }
}

function readPosts() {
  let listed
  try {
    listed = JSON.parse(readFileSync(LIST_FILE, 'utf8'))
  } catch (error) {
    throw new Error(
      `[blog] src/posts/posts.json could not be read as JSON. It should be a list like ["my-post.md"]. (${error.message})`,
    )
  }

  if (!Array.isArray(listed) || listed.some((name) => typeof name !== 'string')) {
    throw new Error(
      '[blog] src/posts/posts.json must be a JSON array of filenames, for example ["my-post.md"].',
    )
  }

  const posts = listed.map(parsePost)
  const seenSlugs = new Set()
  for (const post of posts) {
    if (seenSlugs.has(post.slug)) {
      throw new Error(`[blog] Two posts use the slug "${post.slug}". Slugs must be unique.`)
    }
    seenSlugs.add(post.slug)
  }

  const unlisted = readdirSync(POSTS_DIR)
    .filter((name) => name.endsWith('.md') && !listed.includes(name))
    .sort()
  if (unlisted.length) {
    console.warn(
      `[blog] Ignoring Markdown file(s) not listed in src/posts/posts.json: ${unlisted.join(', ')}`,
    )
  }

  return posts
}

// depth = number of directories between the generated page and the site root.
// Blog index is depth 1, a post is depth 2.
function header(depth) {
  const root = '../'.repeat(depth)
  const home = root || './'
  const blog = depth <= 1 ? './' : '../'.repeat(depth - 1)
  const resume = `${root}resume.pdf`

  const desktopLinks = NAV_ITEMS.map(([label, id]) => {
    const href = id === 'blog' ? blog : `${root}#${id}`
    const active = id === 'blog' ? ' active' : ''
    const current = id === 'blog' ? ' aria-current="page"' : ''
    return `<a href="${href}" class="nav-link${active} text-sm"${current}>${label}</a>`
  }).join('\n          ')

  const mobileLinks = NAV_ITEMS.map(([label, id]) => {
    const href = id === 'blog' ? blog : `${root}#${id}`
    const active = id === 'blog' ? ' text-text-primary' : ' text-text-body'
    const current = id === 'blog' ? ' aria-current="page"' : ''
    return `<a href="${href}" class="block${active} hover:text-text-primary transition-colors"${current}>${label}</a>`
  }).join('\n        ')

  return `  <nav id="navbar" class="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16 md:h-20">
        <a href="${home}" class="font-display text-lg font-semibold text-text-primary tracking-tight">
          Amrit Aryal
        </a>

        <div class="hidden md:flex items-center gap-6 lg:gap-8">
          ${desktopLinks}
          <a href="${resume}" class="btn-primary text-sm py-2 px-4" target="_blank">
            Resume
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </a>
        </div>

        <button id="mobile-menu-btn" class="md:hidden p-2 text-text-body hover:text-text-primary transition-colors" aria-label="Toggle menu">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path id="menu-icon-open" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            <path id="menu-icon-close" class="hidden" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>

    <div id="mobile-menu" class="hidden md:hidden bg-paper border-t border-border">
      <div class="px-4 py-4 space-y-3">
        ${mobileLinks}
        <a href="${resume}" class="btn-primary text-sm py-2 px-4 inline-flex" target="_blank">Resume</a>
      </div>
    </div>
  </nav>`
}

function footer() {
  return `  <footer class="py-8 border-t border-border">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="text-text-muted text-sm">
          &copy; 2026 Amrit Aryal
        </div>
        <div class="flex items-center gap-6">
          <a href="mailto:maniamrit55@gmail.com" class="text-text-muted hover:text-accent transition-colors" aria-label="Email">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </a>
          <a href="https://linkedin.com/in/amritmani/" target="_blank" rel="noopener noreferrer" class="text-text-muted hover:text-accent transition-colors" aria-label="LinkedIn">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
          <a href="https://github.com/amritmaniaryal" target="_blank" rel="noopener noreferrer" class="text-text-muted hover:text-accent transition-colors" aria-label="GitHub">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  </footer>`
}

function head({ title, description, depth, type = 'website', publishedTime }) {
  const root = '../'.repeat(depth)
  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="${type}">
  ${publishedTime ? `<meta property="article:published_time" content="${publishedTime}">\n  ` : ''}<meta name="twitter:card" content="summary">
  <link rel="icon" href="${FAVICON}">
  <link rel="stylesheet" href="${root}src/style.css">
</head>`
}

function renderRow(post, index) {
  return `            <li class="border-b border-border">
              <a href="${post.slug}/" class="group grid gap-3 py-8 md:grid-cols-12 md:items-baseline md:gap-x-6">
                <div class="font-mono text-xs uppercase tracking-widest text-text-muted md:col-span-1">
                  ${String(index + 1).padStart(2, '0')}
                </div>
                <div class="md:col-span-7">
                  <h2 class="font-display text-2xl font-semibold leading-snug text-text-primary transition-colors group-hover:text-accent">
                    ${escapeHtml(post.title)}
                  </h2>
                  <p class="mt-2 leading-relaxed text-text-body">${escapeHtml(post.summary)}</p>
                </div>
                <div class="font-mono text-xs uppercase tracking-wider text-text-muted md:col-span-4 md:text-right">
                  <time datetime="${post.date}">${formatDate(post.date, true)}</time>
                  <span class="mx-1" aria-hidden="true">&middot;</span>
                  ${post.readTime} min read
                </div>
              </a>
            </li>`
}

function renderBlogIndex(posts) {
  const rows = posts.map(renderRow).join('\n')
  return `${head({
    title: 'Blog — Amrit Aryal',
    description:
      'Notes on data engineering, testing, and the parts of the job that do not fit on a resume.',
    depth: 1,
  })}
<body class="bg-paper text-text-body font-sans antialiased" data-page="blog">
${header(1)}

  <main class="pt-28 md:pt-36 pb-20 md:pb-32">
    <section aria-labelledby="blog-title" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="md:grid md:grid-cols-12 md:gap-x-10">
        <div class="md:col-span-3 mb-6 md:mb-0">
          <p class="section-label md:sticky md:top-28">01 / Writing</p>
        </div>

        <div class="md:col-span-9">
          <h1 id="blog-title" class="section-title">Writing</h1>
          <p class="section-desc">
            Notes on data engineering, testing, and the parts of the job that do not fit on a resume.
          </p>

          <ol class="mt-12 border-t border-border">
${rows}
          </ol>
        </div>
      </div>
    </section>
  </main>

${footer()}

  <script type="module" src="../src/main.js"></script>
</body>
</html>
`
}

function renderPost(post) {
  return `${head({
    title: `${post.title} — Amrit Aryal`,
    description: post.summary,
    depth: 2,
    type: 'article',
    publishedTime: post.date,
  })}
<body class="bg-paper text-text-body font-sans antialiased" data-page="blog">
${header(2)}

  <main class="pt-28 md:pt-36 pb-20 md:pb-32">
    <article class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 md:grid md:grid-cols-12 md:gap-x-10">
      <div class="md:col-span-3 mb-6 md:mb-0">
        <p class="section-label md:sticky md:top-28">Writing</p>
      </div>

      <div class="md:col-span-9 max-w-3xl">
        <a href="../" class="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-text-muted transition-colors hover:text-accent">
          <span aria-hidden="true">&larr;</span> All writing
        </a>

        <h1 class="mt-6 font-display text-3xl font-semibold leading-tight text-text-primary sm:text-4xl md:text-5xl">
          ${escapeHtml(post.title)}
        </h1>

        <p class="mt-5 text-lg leading-relaxed text-text-body">${escapeHtml(post.summary)}</p>

        <p class="mt-6 border-t border-border pt-5 font-mono text-xs uppercase tracking-wider text-text-muted">
          <time datetime="${post.date}">${formatDate(post.date)}</time>
          <span class="mx-1" aria-hidden="true">&middot;</span>
          ${post.readTime} min read
        </p>

        <div class="post-body mt-10">
${post.html}
        </div>

        <p class="mt-16 border-t border-border pt-8">
          <a href="../" class="btn-outline"><span aria-hidden="true">&larr;</span> All writing</a>
        </p>
      </div>
    </article>
  </main>

${footer()}

  <script type="module" src="../../src/main.js"></script>
</body>
</html>
`
}

export function generateBlog() {
  if (BLOG_DIR !== path.join(ROOT, 'blog')) {
    throw new Error(`[blog] Refusing to write to unexpected directory: ${BLOG_DIR}`)
  }

  const posts = readPosts()

  rmSync(BLOG_DIR, { recursive: true, force: true })
  mkdirSync(BLOG_DIR, { recursive: true })
  writeFileSync(path.join(BLOG_DIR, 'index.html'), renderBlogIndex(posts), 'utf8')

  for (const post of posts) {
    const directory = path.join(BLOG_DIR, post.slug)
    mkdirSync(directory, { recursive: true })
    writeFileSync(path.join(directory, 'index.html'), renderPost(post), 'utf8')
  }

  console.log(
    `[blog] Generated ${posts.length} post page(s) plus the index in ./blog/`,
  )

  return posts
}
