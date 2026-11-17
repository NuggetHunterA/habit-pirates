import type { AbilityId, FighterDef, FighterStats, Row } from './combat'

/** Grundwerte der Startcrew (Stufe 1, ohne Ausruestung) */
export const CREW_BASE: Record<'jonte' | 'kanonier', FighterStats> = {
  jonte: { leben: 100, angriff: 10, ruestung: 5, tempo: 10, krit: 5, ausweichen: 5 },
  kanonier: { leben: 85, angriff: 11, ruestung: 3, tempo: 7, krit: 8, ausweichen: 2 },
}

export const CREW_ABILITIES: Record<'jonte' | 'kanonier', [AbilityId, AbilityId]> = {
  jonte: ['sturmklinge', 'kapitaensruf'],
  kanonier: ['donnerbuechse', 'kettenkugel'],
}

export interface CrewSetup {
  jonte: { row: Row; ability: AbilityId }
  kanonier: { row: Row; ability: AbilityId }
}

export const DEFAULT_SETUP: CrewSetup = {
  jonte: { row: 'vorne', ability: 'sturmklinge' },
  kanonier: { row: 'hinten', ability: 'donnerbuechse' },
}

/** Werte steigen pro Stufe um 8 % */
const lvl = (s: FighterStats, level: number): FighterStats => {
  const f = 1 + 0.08 * (level - 1)
  return { ...s, leben: Math.round(s.leben * f), angriff: Math.round(s.angriff * f * 10) / 10, ruestung: Math.round(s.ruestung * f) }
}

export function crewDefs(setup: CrewSetup, level = 1, bonus?: Partial<Record<'jonte' | 'kanonier', FighterStats>>): FighterDef[] {
  return [
    {
      id: 'jonte',
      name: 'Jonte',
      look: 'jonte',
      side: 'crew',
      row: setup.jonte.row,
      stats: bonus?.jonte ?? lvl(CREW_BASE.jonte, level),
      ability: setup.jonte.ability,
    },
    {
      id: 'kanonier',
      name: '???',
      look: 'kanonier',
      side: 'crew',
      row: setup.kanonier.row,
      ranged: true,
      stats: bonus?.kanonier ?? lvl(CREW_BASE.kanonier, level),
      ability: setup.kanonier.ability,
    },
  ]
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
