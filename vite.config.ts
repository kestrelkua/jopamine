import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Builds are served from GitHub Pages at kestrelkua.github.io/jopamine/.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/jopamine/' : '/',
  plugins: [react()],
}))
