import { useEffect } from 'react'

/**
 * Update-Hinweis: Die App merkt sich die Kennung des zuletzt gesehenen Builds.
 * Laeuft nach dem Start eine neue Version, gibt es einmal den Hinweis "Neue Version geladen".
 * Kommt die App aus dem Hintergrund zurueck und auf dem Server liegt eine neuere Version,
 * laedt sie neu (nur wenn gerade nichts offen ist, also kein Kampf und keine Szene).
 */
const SEEN_KEY = 'hp.build'
/** Erst nach so langer Zeit im Hintergrund wird nach Updates geschaut */
const AWAY_MS = 60_000

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}
function writeSeen(id: string) {
  try {
    localStorage.setItem(SEEN_KEY, id)
  } catch {
    /* egal */
  }
}

/** Gibt den Text des Hinweises zurueck, wenn dieser Build neu ist (einmalig) */
export function freshBuildNotice(): string | null {
  const seen = readSeen()
  writeSeen(__BUILD_ID__)
  if (!seen || seen === __BUILD_ID__) return null
  return `Neue Version geladen · ${__APP_VERSION__}`
}

export function useUpdateCheck(busy: boolean) {
  useEffect(() => {
    if (!import.meta.env.PROD || location.protocol !== 'https:') return
    let hiddenAt = 0
    const onVis = async () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        return
      }
      if (!hiddenAt || Date.now() - hiddenAt < AWAY_MS || busy) return
      try {
        const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const v = (await res.json()) as { id?: string }
        if (v.id && v.id !== __BUILD_ID__) {
          navigator.serviceWorker?.getRegistration().then((r) => r?.update()).catch(() => {})
          location.reload()
        }
      } catch {
        /* offline: spaeter wieder */
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [busy])
}
