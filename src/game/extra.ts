import type { Stats } from './types'
import type { Mods } from './combat'

/** Was ein Pirat zusaetzlich zu den Item-Werten bekommt */
export interface Extra {
  stats: Partial<Stats>
  pct: Partial<Stats>
  mods: Mods
}

/** Werte plus Extra: erst feste Boni, dann Prozent */
export function applyExtra<T extends Partial<Stats>>(s: T, e?: Extra): T {
  if (!e) return s
  const o = { ...s } as Record<string, number>
  for (const [k, v] of Object.entries(e.stats)) o[k] = (o[k] ?? 0) + (v as number)
  for (const [k, v] of Object.entries(e.pct)) if (o[k] != null) o[k] = Math.round(o[k] * (1 + (v as number)) * 10) / 10
  return o as T
}
