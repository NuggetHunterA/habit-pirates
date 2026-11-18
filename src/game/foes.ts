import type { AbilityId, FighterDef, FighterStats, Row } from './combat'
import type { Rarity } from './types'
import { applyExtra, type Extra } from './extra.ts'

export type CrewId = 'jonte' | 'kanonier' | 'navigatorin' | 'smutje' | 'ausguck'

export interface CrewMember {
  id: CrewId
  /** Name im Kampf */
  name: string
  title: string
  ranged: boolean
  stats: FighterStats
  abilities: [AbilityId, AbilityId]
  /** Bleibt in der Vorschau eine Ueberraschung */
  secret: boolean
  /** Faehigkeiten noch nicht verraten (Crew, die spaeter dazukommt) */
  hideAbilities?: boolean
}

/** Grundwerte der Crew (Stufe 1, ohne Ausruestung) */
export const CREW: Record<CrewId, CrewMember> = {
  jonte: {
    id: 'jonte',
    name: 'Jonte',
    title: 'Kapitän Jonte',
    ranged: false,
    stats: { leben: 100, angriff: 10, ruestung: 5, tempo: 10, krit: 5, ausweichen: 5, kritSchaden: 160 },
    abilities: ['sturmklinge', 'kapitaensruf'],
    secret: false,
  },
  kanonier: {
    id: 'kanonier',
    name: 'Bolle',
    title: 'Kanonier Bolle',
    ranged: true,
    stats: { leben: 85, angriff: 11, ruestung: 3, tempo: 7, krit: 8, ausweichen: 2, kritSchaden: 160 },
    abilities: ['donnerbuechse', 'kettenkugel'],
    secret: true,
  },
  navigatorin: {
    id: 'navigatorin',
    name: 'Mara',
    title: 'Navigatorin Mara',
    ranged: false,
    stats: { leben: 80, angriff: 9, ruestung: 3, tempo: 14, krit: 12, ausweichen: 15, kritSchaden: 160 },
    abilities: ['sternenkurs', 'windstille'],
    secret: true,
    hideAbilities: true,
  },
  smutje: {
    id: 'smutje',
    name: 'Grummel',
    title: 'Smutje Grummel',
    ranged: true,
    stats: { leben: 110, angriff: 7, ruestung: 6, tempo: 8, krit: 3, ausweichen: 2, kritSchaden: 160 },
    abilities: ['kombuesenfeuer', 'eintopf'],
    secret: true,
    hideAbilities: true,
  },
  ausguck: {
    id: 'ausguck',
    name: 'Pip',
    title: 'Ausguck Pip',
    ranged: true,
    stats: { leben: 75, angriff: 9, ruestung: 2, tempo: 11, krit: 10, ausweichen: 10, kritSchaden: 160 },
    abilities: ['adlerauge', 'sturzflug'],
    secret: true,
    hideAbilities: true,
  },
}

/** Wie viele Piraten kaempfen: einer pro Crewmitglied, hoechstens 4 (2 vorne, 2 hinten) */
export const MAX_FIGHTERS = 4
export const MAX_PER_ROW = 2
export const fighterSlots = (crewSize: number) => Math.min(MAX_FIGHTERS, crewSize)

export interface CrewPick {
  id: CrewId
  row: Row
  ability: AbilityId
}
export type CrewSetup = CrewPick[]

export const START_CREW: CrewId[] = ['jonte', 'kanonier']
export const FULL_CREW: CrewId[] = ['jonte', 'kanonier', 'navigatorin', 'smutje', 'ausguck']

/** Name einer Faehigkeit, wie der Spieler ihn sehen darf */
export function abilityLabel(id: CrewId, ability: AbilityId, names: Record<AbilityId, { name: string }>, hidden = false): string {
  return hidden && CREW[id].hideAbilities ? 'Spezialfähigkeit' : names[ability].name
}

/** Vorschlag: Nahkaempfer vorne, Fernkaempfer hinten */
export function defaultSetup(crew: CrewId[]): CrewSetup {
  const picks: CrewSetup = []
  for (const id of crew.slice(0, fighterSlots(crew.length))) {
    const m = CREW[id]
    const want: Row = m.ranged ? 'hinten' : 'vorne'
    const row: Row = picks.filter((p) => p.row === want).length < MAX_PER_ROW ? want : want === 'vorne' ? 'hinten' : 'vorne'
    picks.push({ id, row, ability: m.abilities[0] })
  }
  return picks
}

export const DEFAULT_SETUP = defaultSetup(START_CREW)

/** Werte steigen pro Stufe um 8 % */
export const lvl = (s: FighterStats, level: number): FighterStats => {
  const f = 1 + 0.08 * (level - 1)
  return { ...s, leben: Math.round(s.leben * f), angriff: Math.round(s.angriff * f * 10) / 10, ruestung: Math.round(s.ruestung * f) }
}

/** Name und Titel, wie der Spieler sie sehen darf (Vorschau: geheime Crew bleibt "???") */
export const crewName = (id: CrewId, hidden: boolean) => (hidden && CREW[id].secret ? '???' : CREW[id].name)
export const crewTitle = (id: CrewId, hidden: boolean) => (hidden && CREW[id].secret ? (id === 'kanonier' ? 'Zweiter Pirat' : 'Geheimer Pirat') : CREW[id].title)

/** Kampf-Figuren der Crew. extras: Item-Effekte, Schul- und Set-Boni (game/schools) */
export function crewDefs(setup: CrewSetup, level = 1, bonus?: Partial<Record<CrewId, FighterStats>>, hidden = false, extras?: Partial<Record<CrewId, Extra>>): FighterDef[] {
  return setup.map((p) => {
    const m = CREW[p.id]
    return {
      id: p.id,
      name: crewName(p.id, hidden),
      look: p.id,
      side: 'crew',
      row: p.row,
      ranged: m.ranged,
      stats: applyExtra(bonus?.[p.id] ?? lvl(m.stats, level), extras?.[p.id]),
      ability: p.ability,
      mods: extras?.[p.id]?.mods,
    }
  })
}

export interface Encounter {
  id: string
  name: string
  intro: string
  /** Kampfhintergrund */
  bg: 'strand' | 'nebel'
  boss?: boolean
  foes: FighterDef[]
  reward: { xp: number; gold: [number, number]; itemChance: number; min?: Rarity }
  /** Text nach dem Sieg */
  outro: string
}

type FoeTemplate = Omit<FighterDef, 'id' | 'side' | 'row'>

const T: Record<string, FoeTemplate> = {
  moewe: {
    name: 'Möwenpirat',
    look: 'moewenpirat',
    stats: { leben: 32, angriff: 6, ruestung: 1, tempo: 13, krit: 8, ausweichen: 18 },
    traits: ['sturzflieger', 'flink'],
  },
  matrose: {
    name: 'Matrose',
    look: 'krabbenmatrose',
    stats: { leben: 48, angriff: 7, ruestung: 2, tempo: 11, krit: 5, ausweichen: 10 },
    traits: ['flink'],
  },
  wache: {
    name: 'Schneckenwache',
    look: 'krabbenmatrose',
    stats: { leben: 72, angriff: 10, ruestung: 3, tempo: 11, krit: 5, ausweichen: 10 },
    traits: ['flink'],
  },
  bandit: {
    name: 'Krabbenbandit',
    look: 'krabbenbandit',
    stats: { leben: 170, angriff: 12, ruestung: 9, tempo: 8, krit: 5, ausweichen: 0 },
    traits: ['ankerschild', 'scherenwirbel'],
    big: { name: 'Scherenwirbel', every: 4, mult: 2.2 },
  },
  qualle: {
    name: 'Nebelqualle',
    look: 'nebelqualle',
    stats: { leben: 74, angriff: 10, ruestung: 3, tempo: 9, krit: 5, ausweichen: 8 },
    traits: ['gift'],
  },
  geist: {
    name: 'Geisterpirat',
    look: 'geisterpirat',
    stats: { leben: 92, angriff: 14, ruestung: 4, tempo: 11, krit: 8, ausweichen: 10 },
    traits: ['geisterhaft'],
  },
  irrlicht: {
    name: 'Irrlicht',
    look: 'irrlicht',
    ranged: true,
    stats: { leben: 58, angriff: 6, ruestung: 2, tempo: 12, krit: 5, ausweichen: 15 },
    traits: ['irrlicht'],
  },
}

/** Gegner aus Vorlage. k = [Leben, Angriff] als Faktor, damit ein Kapitel staerker sein kann als das letzte. */
const foe = (key: keyof typeof T, id: string, row: Row, k: [number, number] = [1, 1]): FighterDef => {
  const t = T[key]
  return { ...t, id, side: 'feind', row, stats: { ...t.stats, leben: Math.round(t.stats.leben * k[0]), angriff: Math.round(t.stats.angriff * k[1] * 10) / 10 } }
}

export const MOEWEN: Encounter = {
  id: 'moewen',
  name: 'Möwenpiraten',
  intro: 'Kreischend stürzen sich Möwenpiraten aus dem Wrack auf euer Deck!',
  bg: 'strand',
  foes: [foe('moewe', 'moewe1', 'vorne', [2.4, 2.4]), foe('moewe', 'moewe2', 'vorne', [2.4, 2.4]), foe('moewe', 'moewe3', 'hinten', [2.4, 2.4])],
  reward: { xp: 30, gold: [10, 18], itemChance: 0.3 },
  outro: 'Die Möwen flattern davon und lassen ein paar glänzende Münzen fallen.',
}

/** Erster Kampf in Kapitel 1 */
export const KRABBENBANDE: Encounter = {
  id: 'krabbenbande',
  name: 'Krabbenbande',
  intro: 'Der Krabbenbandit und seine Matrosen versperren die Durchfahrt!',
  bg: 'strand',
  foes: [foe('bandit', 'bandit', 'vorne', [1.4, 1.4]), foe('matrose', 'matrose1', 'vorne', [1.4, 1.4]), foe('matrose', 'matrose2', 'hinten', [1.4, 1.4])],
  reward: { xp: 45, gold: [18, 30], itemChance: 0.35 },
  outro: 'Die Krabbenbande zieht sich ins Riff zurück. Der Weg ist frei.',
}

export const SCHALBART: Encounter = {
  id: 'schalbart',
  name: 'Fürst Schalbart',
  intro: 'Die Klippenfestung erhebt sich aus dem Wasser. Sie hat Beine.',
  bg: 'strand',
  boss: true,
  foes: [
    {
      id: 'schalbart',
      name: 'Fürst Schalbart',
      look: 'schalbart',
      side: 'feind',
      row: 'vorne',
      stats: { leben: 840, angriff: 21, ruestung: 8, tempo: 8, krit: 5, ausweichen: 0 },
      traits: ['festung'],
      big: { name: 'Ankerflut', every: 3, mult: 2.4, below: 0.25 },
    },
    foe('wache', 'wache1', 'vorne'),
    foe('wache', 'wache2', 'hinten'),
  ],
  reward: { xp: 120, gold: [80, 120], itemChance: 1 },
  outro: 'Fürst Schalbart zieht sich grummelnd in sein Haus zurück. Der Weg ins Nebelriff ist frei.',
}

export const QUALLEN: Encounter = {
  id: 'quallen',
  name: 'Nebelquallen',
  intro: 'Aus dem Nebel schweben leuchtende Quallen heran.',
  bg: 'nebel',
  foes: [foe('qualle', 'qualle1', 'vorne', [4.8, 4.5]), foe('qualle', 'qualle2', 'vorne', [4.8, 4.5]), foe('qualle', 'qualle3', 'hinten', [4.8, 4.5])],
  reward: { xp: 60, gold: [24, 36], itemChance: 0.35 },
  outro: 'Die Quallen sinken leuchtend in die Tiefe.',
}

export const GEISTERTRUPP: Encounter = {
  id: 'geistertrupp',
  name: 'Geistertrupp',
  intro: 'Zwei Geisterpiraten und ein Irrlicht versperren den Weg zum Leuchtturm.',
  bg: 'nebel',
  foes: [foe('geist', 'geist1', 'vorne', [3.85, 3.5]), foe('geist', 'geist2', 'vorne', [3.85, 3.5]), foe('irrlicht', 'irrlicht1', 'hinten', [3.85, 3.5])],
  reward: { xp: 75, gold: [30, 44], itemChance: 0.4 },
  outro: 'Die Geister lösen sich im Nebel auf. Nur das Irrlicht kichert noch eine Weile.',
}

export const GEISTERSCHIFF: Encounter = {
  id: 'geisterschiff',
  name: 'Geisterschiff',
  intro: 'Die Crew des Geisterschiffs entert euch!',
  bg: 'nebel',
  foes: [foe('geist', 'geist1', 'vorne', [4.65, 4.3]), foe('qualle', 'qualle1', 'vorne', [4.65, 4.3]), foe('irrlicht', 'irrlicht1', 'hinten', [4.65, 4.3]), foe('geist', 'geist2', 'hinten', [4.65, 4.3])],
  reward: { xp: 90, gold: [36, 50], itemChance: 0.45 },
  outro: 'Das Geisterschiff verschwindet lautlos im Nebel.',
}

export const GRAUHAND: Encounter = {
  id: 'grauhand',
  name: 'Kapitän Grauhand',
  intro: 'Eine Laterne leuchtet in der Höhle auf. Kapitän Grauhand erwartet euch.',
  bg: 'nebel',
  boss: true,
  foes: [
    {
      id: 'grauhand',
      name: 'Kapitän Grauhand',
      look: 'grauhand',
      side: 'feind',
      row: 'vorne',
      stats: { leben: 3020, angriff: 59, ruestung: 7, tempo: 10, krit: 8, ausweichen: 5 },
      traits: ['nebelkapitaen'],
      big: { name: 'Totenglocke', every: 3, mult: 2.5, below: 0.3 },
      adds: [foe('geist', 'geist', 'vorne', [2.4, 2.4]), foe('geist', 'geist', 'hinten', [2.4, 2.4])],
    },
    foe('irrlicht', 'irrlicht1', 'hinten', [3.35, 3.35]),
  ],
  reward: { xp: 200, gold: [140, 200], itemChance: 1 },
  outro: 'Grauhands Laterne erlischt. Der Nebel hebt sich, und am Horizont glüht es rot.',
}

/** Zufallskaempfe beim Farmen vor dem Boss */
export const FARM: Record<number, Encounter[]> = {
  1: [MOEWEN, KRABBENBANDE],
  2: [QUALLEN, GEISTERTRUPP, GEISTERSCHIFF],
}

export const ENCOUNTERS: Record<string, Encounter> = Object.fromEntries(
  [MOEWEN, KRABBENBANDE, SCHALBART, QUALLEN, GEISTERTRUPP, GEISTERSCHIFF, GRAUHAND].map((e) => [e.id, e]),
)

/** Gegner staerker machen (Leben und Angriff mal k), z. B. fuer schwere Beutezuege und Truhenwaechter */
export function strengthen(enc: Encounter, k: number): Encounter {
  if (k === 1) return enc
  return {
    ...enc,
    foes: enc.foes.map((f) => ({ ...f, stats: { ...f.stats, leben: Math.round(f.stats.leben * k), angriff: Math.round(f.stats.angriff * k * 10) / 10 } })),
  }
}

/** Stufen des Beutezugs am Boss-Feld */
export type FarmTier = 'leicht' | 'mittel' | 'schwer'
export const FARM_TIERS: Record<FarmTier, { name: string; k: number; gold: number; itemChance: number; min: Rarity; text: string }> = {
  leicht: { name: 'Leicht', k: 1, gold: 1, itemChance: 0.6, min: 'gewoehnlich', text: 'Normale Gegner · 60 % Chance auf ein Item' },
  mittel: { name: 'Mittel', k: 1.25, gold: 1.5, itemChance: 0.6, min: 'selten', text: '25 % stärker · Item mindestens selten · 1,5× Gold' },
  schwer: { name: 'Schwer', k: 1.6, gold: 2, itemChance: 0.5, min: 'episch', text: '60 % stärker · Item mindestens episch · 2× Gold' },
}

/** Kampf fuer einen Beutezug in dieser Stufe */
export function farmEncounter(id: string, tier: FarmTier): Encounter {
  const base = ENCOUNTERS[id]
  const t = FARM_TIERS[tier]
  const g = base.reward.gold
  return {
    ...strengthen(base, t.k),
    name: `${base.name} · ${t.name}`,
    reward: { xp: Math.round(base.reward.xp * t.k), gold: [Math.round(g[0] * t.gold), Math.round(g[1] * t.gold)], itemChance: t.itemChance, min: t.min },
  }
}

/** Waechter einer verfluchten Truhe: der staerkste normale Kampf des Kapitels, 10 % staerker. Beute gibt die Truhe. */
export function guardianEncounter(chapter: number): Encounter {
  const list = FARM[chapter] ?? FARM[1]
  const base = list[list.length - 1]
  return {
    ...strengthen(base, 1.1),
    id: 'waechter',
    name: 'Truhenwächter',
    intro: 'Kaum berührt ihr die Truhe, steigen ihre Wächter aus dem Wasser!',
    reward: { xp: base.reward.xp, gold: [0, 0], itemChance: 0 },
    outro: 'Die Wächter sind besiegt. Die Truhe gehört euch!',
  }
}
