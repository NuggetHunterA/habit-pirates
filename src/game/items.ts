import type { Item, Rarity, School, SetId, Slot, Stats } from './types'
import type { Mods } from './combat'

const art = import.meta.glob('../assets/items/*.webp', { eager: true, import: 'default' }) as Record<string, string>
const ART: Record<string, string> = Object.fromEntries(Object.entries(art).map(([k, v]) => [k.split('/').pop()!.replace('.webp', ''), v]))

export interface ItemDef {
  key: string
  name: string
  slot: Slot
  rarity: Rarity
  bonus: Partial<Stats>
  /** Kurzer Flavour-Text fuer Detailansicht und Laden */
  text: string
  /** Schule (nur episch und legendaer) */
  school?: School
  /** Set-Teil (ab Kapitel 2) */
  set?: SetId
  /** Effekt (episch: einer, legendaer: ein einzigartiger) */
  effect?: { text: string; mods: Mods }
}

/** Alle Items im Spiel. Bilder: src/assets/items/<key>.webp (Anime-Stil C). */
export const CATALOG: ItemDef[] = [
  // Waffen
  { key: 'entersaebel', name: 'Rostiger Entersäbel', slot: 'waffe', rarity: 'gewoehnlich', bonus: { angriff: 4 }, text: 'Hat schon bessere Tage gesehen. Schneidet trotzdem.' },
  { key: 'dolch', name: 'Matrosendolch', slot: 'waffe', rarity: 'gewoehnlich', bonus: { angriff: 3 }, text: 'Leicht und schnell zur Hand.' },
  { key: 'enteraxt', name: 'Enteraxt', slot: 'waffe', rarity: 'selten', bonus: { angriff: 8 }, text: 'Für Taue, Planken und freche Krabben.' },
  { key: 'schlitzer', name: 'Wellenschlitzer', slot: 'waffe', rarity: 'selten', bonus: { angriff: 7, krit: 5 }, text: 'Die Klinge glänzt wie die Brandung.' },
  { key: 'pistole', name: 'Steinschlosspistole', slot: 'waffe', rarity: 'selten', bonus: { angriff: 6, tempo: 3 }, text: 'Ein Schuss, aber der sitzt.' },
  { key: 'korallendegen', name: 'Korallendegen', slot: 'waffe', rarity: 'episch', bonus: { angriff: 11, krit: 8 }, text: 'Aus einem Riff gewachsen, das nie stillsteht.', school: 'klinge', effect: { text: 'Kritische Treffer verursachen Blutung.', mods: { critBleed: true } } },
  { key: 'gezeitenklinge', name: 'Klinge der Gezeiten', slot: 'waffe', rarity: 'legendaer', bonus: { angriff: 16, krit: 10, tempo: 4 }, text: 'Wer sie führt, hat das Meer auf seiner Seite.', school: 'klinge', effect: { text: 'Gegen blutende Ziele +30 % Krit-Chance. Jeder 3. Angriff trifft zweimal.', mods: { critVsBlutung: 30, doubleEvery: 3 } } },
  // Hüte
  { key: 'kopftuch', name: 'Rotes Kopftuch', slot: 'hut', rarity: 'gewoehnlich', bonus: { leben: 6 }, text: 'Hält Sonne und Schweiß aus den Augen.' },
  { key: 'dreispitz', name: 'Alter Dreispitz', slot: 'hut', rarity: 'gewoehnlich', bonus: { ruestung: 2 }, text: 'Zerbeult, aber stolz.' },
  { key: 'federhut', name: 'Hut mit Möwenfeder', slot: 'hut', rarity: 'selten', bonus: { ruestung: 4, tempo: 4 }, text: 'Die Möwe wollte die Feder nicht zurück.' },
  { key: 'kapitaenshut', name: 'Goldener Kapitänshut', slot: 'hut', rarity: 'episch', bonus: { ruestung: 6, leben: 15 }, text: 'Jeder an Bord weiß sofort, wer hier das Sagen hat.', school: 'gezeiten', effect: { text: 'Kampfstart: Schild über 10 % Leben.', mods: { startShield: 0.1 } } },
  // Kleidung
  { key: 'weste', name: 'Leinenweste', slot: 'kleidung', rarity: 'gewoehnlich', bonus: { ruestung: 3 }, text: 'Luftig und robust.' },
  { key: 'stiefel', name: 'Deckstiefel', slot: 'kleidung', rarity: 'gewoehnlich', bonus: { leben: 8 }, text: 'Rutschfest auf nassen Planken.' },
  { key: 'schaerpe', name: 'Rote Schärpe', slot: 'kleidung', rarity: 'gewoehnlich', bonus: { tempo: 2 }, text: 'Macht flink und sieht gut aus.' },
  { key: 'lederwams', name: 'Gehärtetes Lederwams', slot: 'kleidung', rarity: 'selten', bonus: { ruestung: 6, leben: 8 }, text: 'Dreifach geschnallt, doppelt sicher.' },
  { key: 'sturmmantel', name: 'Sturmmantel', slot: 'kleidung', rarity: 'episch', bonus: { ruestung: 9, ausweichen: 5 }, text: 'Im Saum knistern kleine Blitze.', school: 'glueck', effect: { text: 'Nach dem Ausweichen: Konter mit 60 % Schaden.', mods: { counter: 0.6 } } },
  // Talismane
  { key: 'muschel', name: 'Glatte Muschel', slot: 'talisman', rarity: 'gewoehnlich', bonus: { ausweichen: 2 }, text: 'Wer hineinhorcht, hört das Meer.' },
  { key: 'gluecksmuenze', name: 'Glücksmünze', slot: 'talisman', rarity: 'selten', bonus: { ausweichen: 3, krit: 2 }, text: 'Kopf oder Totenkopf?' },
  { key: 'haizahn', name: 'Haizahnkette', slot: 'talisman', rarity: 'selten', bonus: { angriff: 3, krit: 4 }, text: 'Der Hai brauchte sie nicht mehr.' },
  { key: 'sturmkompass', name: 'Sturmkompass', slot: 'talisman', rarity: 'episch', bonus: { tempo: 8, ausweichen: 4 }, text: 'Zeigt immer dahin, wo der Wind herkommt.', school: 'gezeiten', effect: { text: 'Die ersten 2 Treffer verlangsamen das Ziel.', mods: { slowHits: 2 } } },
  { key: 'perle', name: 'Herz der Tiefe', slot: 'talisman', rarity: 'legendaer', bonus: { leben: 30, ruestung: 4, ausweichen: 8 }, text: 'Eine Perle, die im Dunkeln leise leuchtet.', school: 'gezeiten', effect: { text: 'Einmal pro Kampf: Fällt das Leben unter 30 %, heilt der Träger 40 %.', mods: { lastStand: { below: 0.3, heal: 0.4 } } } },
  // Schiffsteile (gelten fuer die ganze Crew)
  { key: 'segeltuch', name: 'Geflicktes Segeltuch', slot: 'schiff', rarity: 'gewoehnlich', bonus: { tempo: 1 }, text: 'Mehr Flicken als Segel, aber es fängt Wind.' },
  { key: 'messingkanone', name: 'Messingkanone', slot: 'schiff', rarity: 'selten', bonus: { angriff: 3 }, text: 'Klein, laut und blank geputzt.' },
  { key: 'galionsfigur', name: 'Meerjungfrau-Galionsfigur', slot: 'schiff', rarity: 'episch', bonus: { leben: 20, ruestung: 4 }, text: 'Sie wacht über Schiff und Crew.', school: 'gezeiten', effect: { text: 'Jeder Pirat heilt bei jedem 4. Zug 5 % Leben.', mods: { regen: { every: 4, pct: 0.05 } } } },
]

const BY_KEY: Record<string, ItemDef> = Object.fromEntries(CATALOG.map((d) => [d.key, d]))

export function itemDef(key: string): ItemDef | undefined {
  return BY_KEY[key]
}

export function itemArt(key: string): string | undefined {
  return ART[key]
}

export const STAT_LABEL: Record<keyof Stats, string> = {
  leben: 'Leben',
  angriff: 'Angriff',
  ruestung: 'Rüstung',
  tempo: 'Tempo',
  krit: 'Krit',
  ausweichen: 'Ausweichen',
  kritSchaden: 'Krit-Schaden',
}

export const STAT_ORDER: (keyof Stats)[] = ['leben', 'angriff', 'ruestung', 'tempo', 'krit', 'kritSchaden', 'ausweichen']

export const isPercent = (k: keyof Stats) => k === 'krit' || k === 'ausweichen' || k === 'kritSchaden'

export function bonusText(b: Partial<Stats>): string {
  return STAT_ORDER.filter((k) => b[k])
    .map((k) => `+${b[k]}${isPercent(k) ? ' %' : ''} ${STAT_LABEL[k]}`)
    .join(', ')
}

export function itemBonus(it: Pick<Item, 'key'>): Partial<Stats> {
  return BY_KEY[it.key]?.bonus ?? {}
}

let n = 0
export function makeItem(def: ItemDef): Item {
  return { uid: `${def.key}-${Date.now().toString(36)}-${(n++).toString(36)}`, key: def.key, name: def.name, slot: def.slot, rarity: def.rarity, stats: bonusText(def.bonus) }
}

/** Preise im Laden. Verkauf bringt ein Drittel. */
export const PRICE: Record<Rarity, number> = { gewoehnlich: 30, selten: 80, episch: 200, legendaer: 450 }
export const sellPrice = (r: Rarity) => Math.round(PRICE[r] / 3)

/** Kleiner, deterministischer Zufall (gleiches Angebot den ganzen Tag) */
function seeded(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Tagesangebot des Händlers: 2 gewöhnlich, 1 selten, 1 selten oder episch. Legendäres gibt es nur als Beute. */
export function shopOffer(profile: string, day: string): ItemDef[] {
  const rnd = seeded(`${profile}|${day}`)
  const pick = (r: Rarity[], taken: ItemDef[]) => {
    const pool = CATALOG.filter((d) => r.includes(d.rarity) && !taken.includes(d))
    return pool[Math.floor(rnd() * pool.length)]
  }
  const out: ItemDef[] = []
  out.push(pick(['gewoehnlich'], out))
  out.push(pick(['gewoehnlich'], out))
  out.push(pick(['selten'], out))
  out.push(pick(rnd() < 0.35 ? ['episch'] : ['selten'], out))
  return out
}
