import type { Item, Rarity, Slot } from './types'
import { CATALOG, makeItem, seededRoll, type ItemDef } from './items'
import { chapterOf } from './map'

export const RARITY_LABEL: Record<Rarity, string> = {
  gewoehnlich: 'Gewöhnlich',
  selten: 'Selten',
  episch: 'Episch',
  legendaer: 'Legendär',
}

export const SLOT_LABEL: Record<Slot, string> = {
  waffe: 'Waffe',
  hut: 'Hut',
  kleidung: 'Kleidung',
  talisman: 'Talisman',
  schiff: 'Schiffsteil',
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function rollRarity(): Rarity {
  const r = Math.random()
  if (r < 0.01) return 'legendaer'
  if (r < 0.05) return 'episch'
  if (r < 0.3) return 'selten'
  return 'gewoehnlich'
}

const RARITY_ORDER: Rarity[] = ['gewoehnlich', 'selten', 'episch', 'legendaer']

/**
 * Beute-Pool nach Kapitel: Items aus dem aktuellen und frueheren Kapiteln,
 * die des aktuellen Kapitels doppelt so wahrscheinlich. Fehlt die Seltenheit, gilt die naechstniedrigere.
 */
export function pickDef(rarity: Rarity, chapter = 1, avoid: string[] = []): ItemDef {
  const order: Rarity[] = ['legendaer', 'episch', 'selten', 'gewoehnlich']
  for (const r of order.slice(order.indexOf(rarity))) {
    const pool = CATALOG.filter((d) => d.rarity === r && d.chapter <= chapter && !avoid.includes(d.key))
    if (!pool.length) continue
    const weight = (d: ItemDef) => (d.chapter === chapter ? 2 : 1)
    let x = Math.random() * pool.reduce((s, d) => s + weight(d), 0)
    for (const d of pool) if ((x -= weight(d)) < 0) return d
    return pool[pool.length - 1]
  }
  return pick(CATALOG.filter((d) => d.rarity === 'gewoehnlich'))
}

export interface ChestLoot {
  gold: number
  items: Item[]
}

export type ChestKind = 'holz' | 'silber' | 'gold' | 'verflucht'

/** Chance je Truhenfeld, verflucht zu sein (hoechstens eine pro Kapitel) */
export const CURSE_CHANCE = 0.08

/** Welches Truhenfeld im Kapitel verflucht ist (fest je Profil und Kapitel), oder null. Bewachte Truhen werden nie verflucht. */
export function cursedField(profile: string, chapter: number): number | null {
  const fields = chapterOf(chapter).fields
  for (let i = 0; i < fields.length; i++) {
    if (fields[i].kind === 'truhe' && !fields[i].enc && seededRoll(`${profile}|fluch|${chapter}|${i}`) < CURSE_CHANCE) return i
  }
  return null
}

/** Art der Truhe auf einem Feld */
export function chestAt(profile: string, chapter: number, field: number): ChestKind {
  if (cursedField(profile, chapter) === field) return 'verflucht'
  return chapterOf(chapter).fields[field]?.chest ?? 'holz'
}

export const CHEST_LABEL: Record<ChestKind, string> = { holz: 'Holztruhe', silber: 'Silbertruhe', gold: 'Goldtruhe', verflucht: 'Verfluchte Truhe' }

/** Truhenarten: Gold, Anzahl Items und Chancen je Item (gewoehnlich, selten, episch, legendaer) */
export const CHESTS: Record<Exclude<ChestKind, 'verflucht'>, { gold: [number, number]; items: number; odds: [number, number, number, number] }> = {
  holz: { gold: [20, 35], items: 1, odds: [0.8, 0.19, 0.01, 0] },
  silber: { gold: [40, 60], items: 2, odds: [0.56, 0.36, 0.07, 0.01] },
  gold: { gold: [80, 120], items: 2, odds: [0, 0.78, 0.19, 0.03] },
}

function rollOdds(odds: [number, number, number, number]): Rarity {
  let r = Math.random()
  for (let i = 0; i < 4; i++) if ((r -= odds[i]) < 0) return RARITY_ORDER[i]
  return 'gewoehnlich'
}

const between = ([a, b]: [number, number]) => a + Math.floor(Math.random() * (b - a + 1))

/**
 * Truhe oeffnen. goldBonus: Goldene-Moewe-Set (+25 % Gold aus Truhen).
 * sure: das erste Item hat mindestens diese Seltenheit (Serien-Truhen).
 * Verflucht: 100 bis 150 Gold, 2 Items, eines mindestens episch mit 20 % Chance auf legendaer.
 */
export function rollChest(kind: ChestKind = 'holz', chapter = 1, goldBonus = 0, sure?: Rarity): ChestLoot {
  const items: Item[] = []
  const add = (r: Rarity) => items.push(makeItem(pickDef(r, chapter, items.map((x) => x.key))))
  let gold: number
  if (kind === 'verflucht') {
    gold = between([100, 150])
    add(Math.random() < 0.2 ? 'legendaer' : 'episch')
    add(rollOdds(CHESTS.gold.odds))
  } else {
    const c = CHESTS[kind]
    gold = between(c.gold)
    for (let i = 0; i < c.items; i++) {
      const r = rollOdds(c.odds)
      // Serien-Truhe: das erste Item hat mindestens die zugesagte Seltenheit
      add(i === 0 && sure && RARITY_ORDER.indexOf(r) < RARITY_ORDER.indexOf(sure) ? sure : r)
    }
  }
  const order: Rarity[] = ['gewoehnlich', 'selten', 'episch', 'legendaer']
  items.sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity))
  return { gold: Math.round(gold * (1 + goldBonus)), items }
}

/** Ein einzelnes Item (Kampfbeute, Story). min hebt die Seltenheit an, z. B. beim Boss. */
export function rollItem(min: Rarity = 'gewoehnlich', chapter = 1): Item {
  let rarity = rollRarity()
  if (RARITY_ORDER.indexOf(rarity) < RARITY_ORDER.indexOf(min)) rarity = min
  return makeItem(pickDef(rarity, chapter))
}
