import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import pkg from './package.json' with { type: 'json' }
import type { Plugin } from 'vite'

/** Build-Datum in deutscher Zeit, z. B. 18.11.2026 */
const buildDate = new Date().toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric' })

/** Kennung dieses Builds: Commit auf Vercel, sonst Zeitstempel */
const buildId = (process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now())).slice(0, 12)

/** Schreibt version.json, damit eine laufende App neue Versionen erkennt (Update-Hinweis) */
function versionFile(): Plugin {
  return {
    name: 'version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: buildId, version: pkg.version, date: buildDate }) })
    },
  }
}

/** Schreibt precache.json: alle Dateien des Builds, die der Service Worker vorab fuer offline laedt */
function precacheList(): Plugin {
  return {
    name: 'precache-list',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map') && f !== 'precache.json' && f !== 'version.json')
      const pub = ['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon.png']
      this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify([...files, ...pub]) })
    },
  }
}

// `npm run build:kampf` baut die Kampf-Vorschau als einzelne HTML-Datei.
// `npm run build:single` baut eine einzelne HTML-Datei (alle Bilder eingebettet) zum schnellen Testen.
export default defineConfig(({ mode }) => ({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(buildDate),
    __BUILD_ID__: JSON.stringify(buildId),
    // Testmodus sichtbar in der Vercel-Vorschau und lokal, nicht in der Live-Version
    __PREVIEW__: JSON.stringify(process.env.VERCEL_ENV !== 'production'),
  },
  plugins: [react(), versionFile(), precacheList(), ...(mode === 'single' || mode === 'kampf' ? [viteSingleFile()] : [])],
  build:
    mode === 'single'
      ? { outDir: 'dist-single', assetsInlineLimit: 100_000_000 }
      : mode === 'kampf'
        ? { outDir: 'dist-kampf', assetsInlineLimit: 100_000_000, rollupOptions: { input: 'kampf.html' } }
        : {},
}))
