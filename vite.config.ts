import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages project sites are served below the repository name.
  base: '/currency-converter/',
  plugins: [react()],
})
