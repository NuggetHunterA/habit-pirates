import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import pkg from './package.json' with { type: 'json' }

/** Build-Datum in deutscher Zeit, z. B. 18.11.2026 */
const buildDate = new Date().toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric' })

// `npm run build:kampf` baut die Kampf-Vorschau als einzelne HTML-Datei.
// `npm run build:single` baut eine einzelne HTML-Datei (alle Bilder eingebettet) zum schnellen Testen.
export default defineConfig(({ mode }) => ({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(buildDate),
    // Testmodus sichtbar in der Vercel-Vorschau und lokal, nicht in der Live-Version
    __PREVIEW__: JSON.stringify(process.env.VERCEL_ENV !== 'production'),
  },
  plugins: [react(), ...(mode === 'single' || mode === 'kampf' ? [viteSingleFile()] : [])],
  build:
    mode === 'single'
      ? { outDir: 'dist-single', assetsInlineLimit: 100_000_000 }
      : mode === 'kampf'
        ? { outDir: 'dist-kampf', assetsInlineLimit: 100_000_000, rollupOptions: { input: 'kampf.html' } }
        : {},
}))
