// Regenerates ./blog/ while `npm run dev` is running, so editing a Markdown
// post refreshes the browser without restarting Vite. The initial generation
// happens in vite.config.js, before Vite resolves its HTML inputs.

import path from 'node:path'
import { generateBlog, POSTS_DIR } from './blog.js'

export default function blogDevPlugin() {
  let pending = null

  return {
    name: 'blog-dev-reload',
    apply: 'serve',
    configureServer(server) {
      const regenerate = (file) => {
        const absolute = path.resolve(file)
        if (path.dirname(absolute) !== POSTS_DIR) return

        clearTimeout(pending)
        pending = setTimeout(() => {
          try {
            generateBlog()
            server.ws.send({ type: 'full-reload' })
          } catch (error) {
            server.config.logger.error(error.message)
          }
        }, 50)
      }

      server.watcher.add(POSTS_DIR)
      server.watcher.on('add', regenerate)
      server.watcher.on('change', regenerate)
      server.watcher.on('unlink', regenerate)
    },
  }
}
