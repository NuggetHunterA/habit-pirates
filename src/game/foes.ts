import type { AbilityId, FighterDef, FighterStats, Row } from './combat'

export type CrewId = 'jonte' | 'kanonier' | 'navigatorin' | 'smutje' | 'ausguck'

export interface CrewMember {
  id: CrewId
  /** Name im Kampf. Noch nicht enthuellte Piraten heissen "???" */
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
    stats: { leben: 100, angriff: 10, ruestung: 5, tempo: 10, krit: 5, ausweichen: 5 },
    abilities: ['sturmklinge', 'kapitaensruf'],
    secret: false,
  },
  kanonier: {
    id: 'kanonier',
    name: '???',
    title: 'Zweiter Pirat',
    ranged: true,
    stats: { leben: 85, angriff: 11, ruestung: 3, tempo: 7, krit: 8, ausweichen: 2 },
    abilities: ['donnerbuechse', 'kettenkugel'],
    secret: true,
  },
  navigatorin: {
    id: 'navigatorin',
    name: '???',
    title: 'Geheimer Pirat',
    ranged: false,
    stats: { leben: 80, angriff: 9, ruestung: 3, tempo: 14, krit: 12, ausweichen: 15 },
    abilities: ['sternenkurs', 'windstille'],
    secret: true,
    hideAbilities: true,
  },
  smutje: {
    id: 'smutje',
    name: '???',
    title: 'Geheimer Pirat',
    ranged: true,
    stats: { leben: 110, angriff: 7, ruestung: 6, tempo: 8, krit: 3, ausweichen: 2 },
    abilities: ['kombuesenfeuer', 'eintopf'],
    secret: true,
    hideAbilities: true,
  },
  ausguck: {
    id: 'ausguck',
    name: '???',
    title: 'Geheimer Pirat',
    ranged: true,
    stats: { leben: 75, angriff: 9, ruestung: 2, tempo: 11, krit: 10, ausweichen: 10 },
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
export function abilityLabel(id: CrewId, ability: AbilityId, names: Record<AbilityId, { name: string }>): string {
  return CREW[id].hideAbilities ? 'Spezialfähigkeit' : names[ability].name
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
const lvl = (s: FighterStats, level: number): FighterStats => {
  const f = 1 + 0.08 * (level - 1)
  return { ...s, leben: Math.round(s.leben * f), angriff: Math.round(s.angriff * f * 10) / 10, ruestung: Math.round(s.ruestung * f) }
}

export function crewDefs(setup: CrewSetup, level = 1, bonus?: Partial<Record<CrewId, FighterStats>>): FighterDef[] {
  return setup.map((p) => {
    const m = CREW[p.id]
    return {
      id: p.id,
      name: m.name,
      look: p.id,
      side: 'crew',
      row: p.row,
      ranged: m.ranged,
      stats: bonus?.[p.id] ?? lvl(m.stats, level),
      ability: p.ability,
    }
  })
}

export interface Encounter {
  id: string
  name: string
  intro: string
  foes: FighterDef[]
  reward: { xp: number; gold: [number, number]; itemChance: number }
}

/** Erster Kampf in Kapitel 1 */
export const KRABBENBANDE: Encounter = {
  id: 'krabbenbande',
  name: 'Krabbenbande',
  intro: 'Der Krabbenbandit und seine Matrosen versperren die Durchfahrt!',
  foes: [
    {
      id: 'bandit',
      name: 'Krabbenbandit',
      look: 'krabbenbandit',
      side: 'feind',
      row: 'vorne',
      stats: { leben: 170, angriff: 12, ruestung: 9, tempo: 8, krit: 5, ausweichen: 0 },
      traits: ['ankerschild', 'scherenwirbel'],
    },
    {
      id: 'matrose1',
      name: 'Matrose',
      look: 'krabbenmatrose',
      side: 'feind',
      row: 'vorne',
      stats: { leben: 48, angriff: 7, ruestung: 2, tempo: 12, krit: 5, ausweichen: 10 },
      traits: ['flink'],
    },
    {
      id: 'matrose2',
      name: 'Matrose',
      look: 'krabbenmatrose',
      side: 'feind',
      row: 'hinten',
      stats: { leben: 48, angriff: 7, ruestung: 2, tempo: 11, krit: 5, ausweichen: 10 },
      traits: ['flink'],
    },
  ],
  reward: { xp: 40, gold: [18, 30], itemChance: 0.35 },
}
