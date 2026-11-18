import type { Item, Rarity, Slot } from './types'
import { CATALOG, makeItem } from './items'

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

export interface ChestLoot {
  gold: number
  items: Item[]
}

export function rollChest(): ChestLoot {
  const items: Item[] = []
  for (let i = 0; i < 2; i++) {
    const rarity = rollRarity()
    const pool = CATALOG.filter((t) => t.rarity === rarity && !items.some((x) => x.key === t.key))
    items.push(makeItem(pick(pool.length ? pool : CATALOG.filter((x) => x.rarity === 'gewoehnlich'))))
  }
  const order: Rarity[] = ['gewoehnlich', 'selten', 'episch', 'legendaer']
  items.sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity))
  return { gold: 25 + Math.floor(Math.random() * 16), items }
}
