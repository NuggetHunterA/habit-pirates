import type { Item, Rarity, Slot } from './types'

interface Template {
  key: string
  name: string
  slot: Slot
  rarity: Rarity
  stats: string
}

/** Kleine Auswahl fuer den Prototyp. Die grosse Item-Liste kommt mit dem Ausruestungs-Tab. */
const TABLE: Template[] = [
  { key: 'entersaebel', name: 'Rostiger Entersäbel', slot: 'waffe', rarity: 'gewoehnlich', stats: '+4 Angriff' },
  { key: 'dolch', name: 'Matrosendolch', slot: 'waffe', rarity: 'gewoehnlich', stats: '+3 Angriff, +2 Tempo' },
  { key: 'kopftuch', name: 'Rotes Kopftuch', slot: 'hut', rarity: 'gewoehnlich', stats: '+6 Leben' },
  { key: 'dreispitz', name: 'Alter Dreispitz', slot: 'hut', rarity: 'gewoehnlich', stats: '+2 Rüstung' },
  { key: 'weste', name: 'Leinenweste', slot: 'kleidung', rarity: 'gewoehnlich', stats: '+3 Rüstung' },
  { key: 'stiefel', name: 'Deckstiefel', slot: 'kleidung', rarity: 'gewoehnlich', stats: '+8 Leben' },
  { key: 'muschel', name: 'Glatte Muschel', slot: 'talisman', rarity: 'gewoehnlich', stats: '+2 % Ausweichen' },
  { key: 'segeltuch', name: 'Geflicktes Segeltuch', slot: 'schiff', rarity: 'gewoehnlich', stats: '+1 Tempo für alle' },
  { key: 'gluecksmuenze', name: 'Glücksmünze', slot: 'talisman', rarity: 'selten', stats: '+3 % Ausweichen, +5 % Beute' },
  { key: 'schlitzer', name: 'Wellenschlitzer', slot: 'waffe', rarity: 'selten', stats: '+7 Angriff, +5 % Krit' },
  { key: 'federhut', name: 'Hut mit Möwenfeder', slot: 'hut', rarity: 'selten', stats: '+4 Rüstung, +4 Tempo' },
  { key: 'messingkanone', name: 'Messingkanone', slot: 'schiff', rarity: 'selten', stats: '+3 Angriff für alle' },
  { key: 'sturmkompass', name: 'Sturmkompass', slot: 'talisman', rarity: 'episch', stats: 'Gezeiten · Tempo +10 % im ersten Zug' },
]

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
  if (r < 0.03) return 'episch'
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
    const pool = TABLE.filter((t) => t.rarity === rarity && !items.some((x) => x.key === t.key))
    const t = pick(pool.length ? pool : TABLE.filter((x) => x.rarity === 'gewoehnlich'))
    items.push({ ...t, uid: `${t.key}-${Date.now()}-${i}` })
  }
  const order: Rarity[] = ['gewoehnlich', 'selten', 'episch', 'legendaer']
  items.sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity))
  return { gold: 25 + Math.floor(Math.random() * 16), items }
}
