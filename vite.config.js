import path from 'node:path'
import { defineConfig } from 'vite'
import { generateBlog, ROOT } from './scripts/blog.js'
import blogDevPlugin from './scripts/vite-plugin-blog.js'

// Generate blog/index.html and blog/<slug>/index.html from src/posts before
// Vite resolves its HTML inputs. `.gitignore` excludes ./blog/; the Markdown
// files and src/posts/posts.json are the source of truth.
const posts = generateBlog()

const blogEntries = Object.fromEntries(
  posts.map((post) => [
    `blog-${post.slug}`,
    path.join(ROOT, 'blog', post.slug, 'index.html'),
  ]),
)

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: path.join(ROOT, 'index.html'),
        blog: path.join(ROOT, 'blog', 'index.html'),
        ...blogEntries,
      },
    },
  },
  plugins: [blogDevPlugin()],
})
