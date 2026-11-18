import type { Save, School, SetId, Stats } from './types'
import { mergeMods, type Mods } from './combat'
import { itemDef } from './items'
import { equippedItems } from './equipment'
import type { CrewId } from './foes'
import type { Extra } from './extra'
export { applyExtra, type Extra } from './extra'

/** Ein Bonus: feste Werte, Werte in Prozent (leben/angriff) und besondere Wirkungen */
export interface Boost {
  text: string
  stats?: Partial<Stats>
  pct?: Partial<Stats>
  mods?: Mods
}

export interface SchoolDef {
  id: School
  name: string
  style: string
  color: string
  /** Bonus bei 3 und bei 6 Items in der Crew */
  at3: Boost
  at6: Boost
}

/** Die 5 Schulen. Gezaehlt werden alle Items der kaempfenden Crew, das Schiffsteil einmal. */
export const SCHOOLS: Record<School, SchoolDef> = {
  pulver: {
    id: 'pulver',
    name: 'Pulver',
    style: 'Brand, Explosionen, Flächenschaden',
    color: '#d9480f',
    at3: { text: 'Brand macht 30 % mehr Schaden.', mods: { brandBonus: 0.3 } },
    at6: { text: 'Brennende Gegner explodieren beim Tod: 50 % Angriff an allen Gegnern.', mods: { explode: 0.5 } },
  },
  klinge: {
    id: 'klinge',
    name: 'Klinge',
    style: 'Blutung und Krits gegen einzelne Ziele',
    color: '#c2255c',
    at3: { text: '+20 % Krit-Schaden für die Crew.', stats: { kritSchaden: 20 } },
    at6: { text: 'Jeder Krit verursacht Blutung, Blutung stapelt bis 5-mal.', mods: { critBleed: true, bleedMax: 5 } },
  },
  gezeiten: {
    id: 'gezeiten',
    name: 'Gezeiten',
    style: 'Heilung, Schilde, Verlangsamen',
    color: '#1971c2',
    at3: { text: 'Kampfstart: Schild über 8 % Leben für alle.', mods: { startShield: 0.08 } },
    at6: { text: 'Heilung +30 %, alle Gegner starten verlangsamt.', mods: { healBonus: 0.3, slowFoesAtStart: true } },
  },
  fluch: {
    id: 'fluch',
    name: 'Fluch',
    style: 'Gift, Schwächen, Lebensraub',
    color: '#6741d9',
    at3: { text: '5 % Lebensraub für die Crew.', mods: { lifesteal: 0.05 } },
    at6: { text: 'Vergiftete Gegner sind zusätzlich geschwächt.', mods: { poisonWeakens: true } },
  },
  glueck: {
    id: 'glueck',
    name: 'Glück',
    style: 'Ausweichen, Konter, mehr Beute',
    color: '#2b8a3e',
    at3: { text: '+5 % Ausweichen für die Crew.', stats: { ausweichen: 5 } },
    at6: { text: 'Konter nach jedem Ausweichen (50 % Schaden) und +10 % Chance auf ein Extra-Item nach Kämpfen.', mods: { counter: 0.5, extraItem: 0.1 } },
  },
}
export const SCHOOL_ORDER: School[] = ['pulver', 'klinge', 'gezeiten', 'fluch', 'glueck']

export interface SetDef {
  id: SetId
  name: string
  school: School
  /** Ab welchem Kapitel die Teile auftauchen */
  chapter: number
  at2: Boost
  at4: Boost
}

/** Die 6 Sets. Sie zaehlen pro Pirat; ein Set-Schiffsteil zaehlt fuer jeden Piraten als ein Teil. */
export const SETS: Record<SetId, SetDef> = {
  sturmjaeger: {
    id: 'sturmjaeger',
    name: 'Sturmjäger',
    school: 'klinge',
    chapter: 2,
    at2: { text: '+8 Tempo', stats: { tempo: 8 } },
    at4: { text: 'Der erste Angriff in jedem Kampf ist kritisch und verursacht Blutung.', mods: { firstCrit: true } },
  },
  korallenwacht: {
    id: 'korallenwacht',
    name: 'Korallenwacht',
    school: 'gezeiten',
    chapter: 2,
    at2: { text: '+15 % Leben', pct: { leben: 0.15 } },
    at4: { text: 'Kampfstart: Schild über 15 % Leben. Fällt das Leben unter 50 %, kommt der Schild einmal zurück.', mods: { startShield: 0.15, shieldRefresh: 0.15 } },
  },
  goldene_moewe: {
    id: 'goldene_moewe',
    name: 'Goldene Möwe',
    school: 'glueck',
    chapter: 2,
    at2: { text: '+8 % Krit-Chance', stats: { krit: 8 } },
    at4: { text: '+25 % Gold aus Kämpfen und Truhen.', mods: { goldBonus: 0.25 } },
  },
  pulverteufel: {
    id: 'pulverteufel',
    name: 'Pulverteufel',
    school: 'pulver',
    chapter: 3,
    at2: { text: '+10 % Angriff', pct: { angriff: 0.1 } },
    at4: { text: 'Die Spezialfähigkeit setzt Brand auf alle getroffenen Ziele.', mods: { abilityBurn: true } },
  },
  nebelgaenger: {
    id: 'nebelgaenger',
    name: 'Nebelgänger',
    school: 'fluch',
    chapter: 3,
    at2: { text: '+6 % Ausweichen', stats: { ausweichen: 6 } },
    at4: { text: 'Wer den Träger verfehlt, wird vergiftet.', mods: { poisonOnMiss: true } },
  },
  tiefseeschwur: {
    id: 'tiefseeschwur',
    name: 'Tiefseeschwur',
    school: 'fluch',
    chapter: 3,
    at2: { text: '+6 % Lebensraub', mods: { lifesteal: 0.06 } },
    at4: { text: 'Unter 35 % Leben: +30 % Angriff und doppelter Lebensraub.', mods: { rage: { below: 0.35, atk: 0.3 } } },
  },
}

/** Wie viele Items jeder Schule die kaempfende Crew traegt (Schiffsteil einmal) */
export function schoolCounts(save: Save, fighters: CrewId[]): Record<School, number> {
  const out = { pulver: 0, klinge: 0, gezeiten: 0, fluch: 0, glueck: 0 } as Record<School, number>
  const seen = new Set<string>()
  for (const who of fighters) {
    for (const it of Object.values(equippedItems(save, who))) {
      if (!it || seen.has(it.uid)) continue
      seen.add(it.uid)
      const s = itemDef(it.key)?.school
      if (s) out[s]++
    }
  }
  return out
}

/** Set-Teile eines Piraten (eigene Plaetze plus Schiffsteil) */
export function setCounts(save: Save, who: CrewId): Partial<Record<SetId, number>> {
  const out: Partial<Record<SetId, number>> = {}
  for (const it of Object.values(equippedItems(save, who))) {
    const s = it && itemDef(it.key)?.set
    if (s) out[s] = (out[s] ?? 0) + 1
  }
  return out
}

/** Aktive Stufe einer Schule: 0, 3 oder 6 */
export const schoolTier = (n: number) => (n >= 6 ? 6 : n >= 3 ? 3 : 0)
/** Aktive Stufe eines Sets: 0, 2 oder 4 */
export const setTier = (n: number) => (n >= 4 ? 4 : n >= 2 ? 2 : 0)

function addBoost(e: Extra, b: Boost) {
  for (const [k, v] of Object.entries(b.stats ?? {}) as [keyof Stats, number][]) e.stats[k] = (e.stats[k] ?? 0) + v
  for (const [k, v] of Object.entries(b.pct ?? {}) as [keyof Stats, number][]) e.pct[k] = (e.pct[k] ?? 0) + v
  if (b.mods) e.mods = mergeMods(e.mods, b.mods)
}

/**
 * Item-Effekte, Schul- und Set-Boni fuer jeden Piraten.
 * fighters: wer kaempft (zaehlt fuer die Schulen). Fuer die Anzeige kann ein Pirat dazukommen, der nicht kaempft.
 */
export function crewExtras(save: Save, fighters: CrewId[], also: CrewId[] = []): Partial<Record<CrewId, Extra>> {
  const counts = schoolCounts(save, fighters)
  const team: Extra = { stats: {}, pct: {}, mods: {} }
  for (const s of SCHOOL_ORDER) {
    const tier = schoolTier(counts[s])
    if (tier >= 3) addBoost(team, SCHOOLS[s].at3)
    if (tier >= 6) addBoost(team, SCHOOLS[s].at6)
  }
  const out: Partial<Record<CrewId, Extra>> = {}
  for (const who of Array.from(new Set([...fighters, ...also]))) {
    const e: Extra = { stats: { ...team.stats }, pct: { ...team.pct }, mods: { ...team.mods } }
    for (const it of Object.values(equippedItems(save, who))) {
      const fx = it && itemDef(it.key)?.effect
      if (fx) e.mods = mergeMods(e.mods, fx.mods)
    }
    for (const [id, n] of Object.entries(setCounts(save, who)) as [SetId, number][]) {
      const tier = setTier(n)
      if (tier >= 2) addBoost(e, SETS[id].at2)
      if (tier >= 4) addBoost(e, SETS[id].at4)
    }
    out[who] = e
  }
  return out
}

