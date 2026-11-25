import { useEffect, useLayoutEffect, useRef } from 'react'

/**
 * Android-Zurück-Taste (und Zurück-Geste) innerhalb der App.
 *
 * Solange es in der App etwas gibt, wohin "zurück" führt (offenes Blatt,
 * Unteransicht, anderer Ort als das Deck), liegt genau ein zusätzlicher
 * Eintrag in der Browser-History. Drückt man Zurück, landet der Browser auf
 * dem Eintrag davor, wir bekommen `popstate` und führen den obersten
 * Zurück-Schritt aus. Gibt es danach immer noch etwas, legen wir den Eintrag
 * neu an. Auf dem Start-Screen gibt es keinen Eintrag, also schließt
 * Zurück dort wie gewohnt die App.
 */

/** Je höher, desto weiter "oben": Blätter vor Szenen vor Unteransichten vor Orten */
export const BACK = { place: 0, view: 1, scene: 2, sheet: 3 } as const

type Entry = { level: number; seq: number; run: () => void }

const entries = new Set<Entry>()
let seq = 0
/** Liegt unser zusätzlicher History-Eintrag gerade oben? */
let trapped = false
/** Selbst ausgelöste history.back(), deren popstate wir ignorieren */
let skip = 0
let timer = 0
let started = false

const MARK = 'habitPiratesBack'

function top() {
  let best: Entry | undefined
  for (const e of entries) if (!best || e.level > best.level || (e.level === best.level && e.seq > best.seq)) best = e
  return best
}

function sync() {
  timer = 0
  const want = entries.size > 0
  if (want && !trapped) {
    history.pushState({ [MARK]: true }, '')
    trapped = true
  } else if (!want && trapped) {
    trapped = false
    skip++
    history.back()
  }
}

/** Kurz warten, bis React fertig gerendert hat und alle Handler stehen */
function schedule() {
  if (!timer) timer = window.setTimeout(sync, 40)
}

function onPop() {
  if (skip > 0) {
    skip--
    return
  }
  trapped = !!(history.state as Record<string, unknown> | null)?.[MARK]
  top()?.run()
  schedule()
}

function start() {
  if (started || typeof window === 'undefined') return
  started = true
  // Nach einem Neuladen stehen wir evtl. schon auf unserem Eintrag
  trapped = !!(history.state as Record<string, unknown> | null)?.[MARK]
  window.addEventListener('popstate', onPop)
  schedule()
}

/**
 * Meldet einen Zurück-Schritt an, solange `active` wahr ist.
 * `onBack` darf sich bei jedem Rendern ändern.
 */
export function useBack(active: boolean, level: number, onBack: () => void) {
  const fn = useRef(onBack)
  useLayoutEffect(() => {
    fn.current = onBack
  })
  useEffect(() => {
    start()
    if (!active) return
    const e: Entry = { level, seq: ++seq, run: () => fn.current() }
    entries.add(e)
    schedule()
    return () => {
      entries.delete(e)
      schedule()
    }
  }, [active, level])
}
