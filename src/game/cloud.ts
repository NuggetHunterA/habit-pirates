import type { Save } from './types'

/**
 * Spielstand in Supabase (Projekt von Putzy, Schema `pirates`).
 * Zugriff nur ueber die zwei Funktionen pirates_load und pirates_save,
 * abgesichert wie Putzy: Profil waehlen ohne Passwort.
 */
const URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://krqjgcquziraxrofejev.supabase.co'
const KEY = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_70X8oFL4aIz5WUPeO-hCyw_YmI0VK9M'

export interface Remote {
  data: Save
  updated_at: string
}

async function rpc<T>(fn: string, body: unknown, keepalive = false): Promise<T> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 8000)
  const json = JSON.stringify(body)
  try {
    const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: json,
      signal: ctrl.signal,
      // keepalive (Speichern beim Verlassen der App) erlaubt nur kleine Anfragen
      keepalive: keepalive && json.length < 60_000,
    })
    if (!res.ok) throw new Error(`${fn}: ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(t)
  }
}

/** Gespeicherter Stand des Profils oder null, wenn es noch keinen gibt */
export const loadRemote = (profile: string) => rpc<Remote | null>('pirates_load', { p_profile: profile })

/**
 * Speichert den Stand, wenn er neuer ist als der in Supabase.
 * Antwort ist immer der Stand, der danach in Supabase liegt.
 */
export const saveRemote = (s: Save, keepalive = false) =>
  rpc<Remote>('pirates_save', { p_profile: s.profile, p_data: s, p_updated_at: s.updatedAt }, keepalive)

/** Zeitpunkte vergleichen (ISO-Strings aus Browser und Postgres haben verschiedene Formate) */
export const ms = (iso: string | undefined) => (iso ? Date.parse(iso) || 0 : 0)
