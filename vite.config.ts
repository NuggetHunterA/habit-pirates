import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build:kampf` baut die Kampf-Vorschau als einzelne HTML-Datei.
// `npm run build:single` baut eine einzelne HTML-Datei (alle Bilder eingebettet) zum schnellen Testen.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'single' || mode === 'kampf' ? [viteSingleFile()] : [])],
  build:
    mode === 'single'
      ? { outDir: 'dist-single', assetsInlineLimit: 100_000_000 }
      : mode === 'kampf'
        ? { outDir: 'dist-kampf', assetsInlineLimit: 100_000_000, rollupOptions: { input: 'kampf.html' } }
        : {},
}))
