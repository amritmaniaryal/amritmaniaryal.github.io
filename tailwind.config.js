/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm paper ground. The palette is intentionally low-chroma: one
        // oxide accent against paper and ink, instead of cyan on near-black.
        paper: '#FAF9F7',
        surface: {
          DEFAULT: '#FFFFFF',
          lift: '#F3F1EB',
        },
        accent: {
          DEFAULT: '#A8442A',
          glow: '#BE5236',
          dim: '#8A3722',
        },
        text: {
          primary: '#17171A',
          body: '#46423C',
          // Darkened from #7C756C, which measured 4.32:1 on paper and fell
          // just under the WCAG AA 4.5:1 floor for normal-size text.
          muted: '#6F6960',
        },
        border: '#E3DFD7',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        display: ['"IBM Plex Serif"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
