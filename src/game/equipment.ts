import type { GameState, Item, PirateSlot, Save, Slot, Stats } from './types'
import { itemBonus, STAT_ORDER } from './items'

/** Grundwerte von Kapitaen Jonte ohne Ausruestung */
export const BASE_STATS: Stats = { leben: 100, angriff: 10, ruestung: 5, tempo: 10, krit: 5, ausweichen: 5 }

export const SLOTS: Slot[] = ['waffe', 'hut', 'kleidung', 'talisman', 'schiff']
export const PIRATE_SLOTS: PirateSlot[] = ['waffe', 'hut', 'kleidung', 'talisman']

const byUid = (g: GameState, uid?: string) => (uid ? g.inventory.find((x) => x.uid === uid) : undefined)

/** Angelegte Items eines Piraten, inklusive Schiffsteil (gilt fuer alle) */
export function equippedItems(save: Save, who = 'jonte'): Partial<Record<Slot, Item>> {
  const g = save.game
  const out: Partial<Record<Slot, Item>> = {}
  for (const s of PIRATE_SLOTS) {
    const it = byUid(g, g.gear?.[who]?.[s])
    if (it) out[s] = it
  }
  const ship = byUid(g, g.ship)
  if (ship) out.schiff = ship
  return out
}

/** Wer traegt dieses Item? Crew-id, 'schiff' fuer das Schiffsteil, sonst null. */
export function wearer(g: GameState, uid: string): string | null {
  if (g.ship === uid) return 'schiff'
  for (const [who, slots] of Object.entries(g.gear ?? {})) if (Object.values(slots).includes(uid)) return who
  return null
}

/** Alle Item-uids, die gerade jemand traegt */
export function wornUids(g: GameState): Set<string> {
  const out = new Set<string>()
  for (const slots of Object.values(g.gear ?? {})) for (const u of Object.values(slots)) if (u) out.add(u)
  if (g.ship) out.add(g.ship)
  return out
}

export function addStats(a: Stats, b: Partial<Stats>): Stats {
  const out = { ...a }
  for (const k of STAT_ORDER) out[k] += b[k] ?? 0
  return out
}

function sumBonus(items: (Item | undefined)[]): Partial<Stats> {
  const acc: Partial<Stats> = {}
  for (const it of items) {
    if (!it) continue
    const b = itemBonus(it)
    for (const k of STAT_ORDER) if (b[k]) acc[k] = (acc[k] ?? 0) + b[k]!
  }
  return acc
}

/** Kampfkraft als eine Zahl fuer die Anzeige */
export function power(s: Stats): number {
  return Math.round(s.leben / 4 + s.angriff * 2 + s.ruestung * 1.5 + s.tempo + s.krit + s.ausweichen)
}

/** Wertunterschied, wenn `next` statt des aktuell angelegten Items im Slot getragen wird */
export function diffIfEquipped(save: Save, next: Pick<Item, 'key' | 'slot'>, who = 'jonte'): Partial<Stats> {
  const cur = equippedItems(save, who)[next.slot]
  const a = itemBonus(next)
  const b = cur ? itemBonus(cur) : {}
  const d: Partial<Stats> = {}
  for (const k of STAT_ORDER) {
    const v = (a[k] ?? 0) - (b[k] ?? 0)
    if (v) d[k] = v
  }
  return d
}

/** Ausruestungs-Boni je Pirat und das Schiffsteil (gilt fuer die ganze Crew) */
export function gearBonus(save: Save): { crew: Record<string, Partial<Stats>>; ship: Partial<Stats> } {
  const g = save.game
  const crew: Record<string, Partial<Stats>> = {}
  for (const [who, slots] of Object.entries(g.gear ?? {})) crew[who] = sumBonus(PIRATE_SLOTS.map((s) => byUid(g, slots[s])))
  return { crew, ship: sumBonus([byUid(g, g.ship)]) }
}

/** Alte Staende: Ausruestung lag nur bei Jonte (equipped). Sie bleibt bei Jonte, das Schiffsteil fuer alle. */
export function migrateGear(g: GameState): GameState {
  if (g.gear && g.found) return g
  const old = g.equipped ?? {}
  const jonte: Partial<Record<PirateSlot, string>> = {}
  for (const s of PIRATE_SLOTS) if (old[s]) jonte[s] = old[s]
  const { equipped: _drop, ...rest } = g
  void _drop
  return {
    ...rest,
    gear: g.gear ?? (Object.keys(jonte).length ? { jonte } : {}),
    ship: g.gear ? g.ship : old.schiff,
    found: g.found ?? Array.from(new Set(g.inventory.map((i) => i.key))),
  }
}

/** Neue Items ins Sammelbuch eintragen */
export function withFound(g: GameState, items: Pick<Item, 'key'>[]): string[] {
  const set = new Set(g.found ?? [])
  for (const it of items) set.add(it.key)
  return set.size === (g.found ?? []).length ? g.found : Array.from(set)
}

/** Exemplare desselben Items im Laderaum */
export const copiesOf = (g: GameState, key: string) => g.inventory.filter((x) => x.key === key)

/** Exemplar, das verkauft werden darf: nur bei Doppelten und nur eines, das niemand traegt */
export function sellableCopy(g: GameState, key: string): Item | null {
  const copies = copiesOf(g, key)
  if (copies.length < 2) return null
  const worn = wornUids(g)
  return copies.find((c) => !worn.has(c.uid)) ?? null
}
