import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    // Vercel serves from the domain root; GitHub Pages serves below the repo name.
    base: process.env.VERCEL ? '/' : '/currency-convertor/',
    plugins: [react()],
});
