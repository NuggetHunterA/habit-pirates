import type { Item, Save, Slot, Stats } from './types'
import { itemBonus, STAT_ORDER } from './items'

/** Grundwerte von Kapitaen Jonte ohne Ausruestung */
export const BASE_STATS: Stats = { leben: 100, angriff: 10, ruestung: 5, tempo: 10, krit: 5, ausweichen: 5 }

export const SLOTS: Slot[] = ['waffe', 'hut', 'kleidung', 'talisman', 'schiff']

export function equippedItems(save: Save): Partial<Record<Slot, Item>> {
  const out: Partial<Record<Slot, Item>> = {}
  for (const s of SLOTS) {
    const uid = save.game.equipped?.[s]
    const it = uid ? save.game.inventory.find((x) => x.uid === uid) : undefined
    if (it) out[s] = it
  }
  return out
}

export function addStats(a: Stats, b: Partial<Stats>): Stats {
  const out = { ...a }
  for (const k of STAT_ORDER) out[k] += b[k] ?? 0
  return out
}

/**
 * Kampfwerte des Kapitaens: Grundwerte plus angelegte Ausruestung
 * (inklusive Schiffsteil, das fuer die ganze Crew gilt). Von den Kaempfen genutzt.
 */
export function heroStats(save: Save): Stats {
  return Object.values(equippedItems(save)).reduce((s, it) => addStats(s, itemBonus(it!)), BASE_STATS)
}

/** Kampfkraft als eine Zahl fuer die Anzeige */
export function power(s: Stats): number {
  return Math.round(s.leben / 4 + s.angriff * 2 + s.ruestung * 1.5 + s.tempo + s.krit + s.ausweichen)
}

/** Wertunterschied, wenn `next` statt des aktuell angelegten Items im Slot getragen wird */
export function diffIfEquipped(save: Save, next: Item): Partial<Stats> {
  const cur = equippedItems(save)[next.slot]
  const a = itemBonus(next)
  const b = cur ? itemBonus(cur) : {}
  const d: Partial<Stats> = {}
  for (const k of STAT_ORDER) {
    const v = (a[k] ?? 0) - (b[k] ?? 0)
    if (v) d[k] = v
  }
  return d
}
