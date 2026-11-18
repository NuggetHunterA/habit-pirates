import type { Item, Rarity, Slot } from './types'
import { CATALOG, makeItem, type ItemDef } from './items'

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

export function rollChest(chapter = 1): ChestLoot {
  const items: Item[] = []
  for (let i = 0; i < 2; i++) {
    items.push(makeItem(pickDef(rollRarity(), chapter, items.map((x) => x.key))))
  }
  const order: Rarity[] = ['gewoehnlich', 'selten', 'episch', 'legendaer']
  items.sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity))
  return { gold: 25 + Math.floor(Math.random() * 16), items }
}

const RARITY_ORDER: Rarity[] = ['gewoehnlich', 'selten', 'episch', 'legendaer']

/** Ein einzelnes Item (Kampfbeute, Story). min hebt die Seltenheit an, z. B. beim Boss. */
export function rollItem(min: Rarity = 'gewoehnlich', chapter = 1): Item {
  let rarity = rollRarity()
  if (RARITY_ORDER.indexOf(rarity) < RARITY_ORDER.indexOf(min)) rarity = min
  return makeItem(pickDef(rarity, chapter))
}
