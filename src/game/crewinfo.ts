import type { Save, Stats } from './types'
import { CREW, FULL_CREW, defaultSetup, lvl, type CrewId } from './foes'
import { chapterOf } from './map'
import { crewStats, levelFor } from './progress'
import { gearBonus } from './equipment'
import type { AbilityId } from './combat'

/** Rolle, wie sie ueber dem Namen steht */
export const ROLE: Record<CrewId, string> = {
  jonte: 'Kapitän',
  kanonier: 'Kanonier',
  navigatorin: 'Navigatorin',
  smutje: 'Smutje',
  ausguck: 'Ausguck',
}

export const fullName = (id: CrewId) => (id === 'jonte' ? 'Jonte Rotrock' : CREW[id].name)

/** Crew an Bord, in Beitrittsreihenfolge */
export const onBoard = (save: Save) => (save.game.crew as CrewId[]).filter((id) => id in CREW)

/** Wie viele noch nicht an Bord sind (bleiben im Spiel Silhouetten) */
export const missingCount = (save: Save) => FULL_CREW.length - onBoard(save).length

export function crewLevel(save: Save): number {
  return levelFor(save.game.xp, chapterOf(save.game.chapter).cap)
}

/** Werte eines Piraten: Stufe, eigene Ausruestung, Schiffsteil. base = ohne Ausruestung. */
export function pirateStats(save: Save, id: CrewId): { stats: Stats; base: Stats } {
  const level = crewLevel(save)
  const g = gearBonus(save)
  return { stats: crewStats(level, g.crew, g.ship)[id], base: lvl(CREW[id].stats, level) }
}

/** Aufstellung und gewaehlte Faehigkeit aus der letzten Kampfvorbereitung */
export function pickOf(save: Save, id: CrewId): { row: 'vorne' | 'hinten' | null; ability: AbilityId } {
  const setup = save.game.setup ?? defaultSetup(onBoard(save))
  const p = setup.find((x) => x.id === id)
  return { row: p ? p.row : null, ability: (p?.ability as AbilityId) ?? CREW[id].abilities[0] }
}
