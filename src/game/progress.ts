import type { FighterStats } from './combat.ts'
import { CREW, lvl, type CrewId } from './foes.ts'

/** Erfahrung bis zur naechsten Stufe: 60, 100, 140, ... */
export const xpForLevel = (level: number) => 60 + 40 * (level - 1)

/** Gesamte Erfahrung, die man fuer eine Stufe braucht */
export function xpTotal(level: number): number {
  let t = 0
  for (let l = 1; l < level; l++) t += xpForLevel(l)
  return t
}

/** Stufe aus Erfahrung, begrenzt durch die Hoechststufe des Kapitels */
export function levelFor(xp: number, cap: number): number {
  let l = 1
  while (l < cap && xp >= xpTotal(l + 1)) l++
  return l
}

/** Fortschritt in der aktuellen Stufe (0..1); bei Hoechststufe 1 */
export function levelProgress(xp: number, cap: number): { level: number; into: number; need: number; max: boolean } {
  const level = levelFor(xp, cap)
  if (level >= cap) return { level, into: 0, need: 0, max: true }
  return { level, into: xp - xpTotal(level), need: xpForLevel(level), max: false }
}

type Bonus = Partial<FighterStats>
const add = (a: FighterStats, b: Bonus): FighterStats => {
  const o = { ...a }
  for (const k of Object.keys(b) as (keyof FighterStats)[]) o[k] += b[k] ?? 0
  return o
}

/**
 * Kampfwerte der ganzen Crew: Stufe fuer alle, Ausruestung fuer Jonte,
 * das Schiffsteil fuer alle.
 */
export function crewStats(level: number, jonteGear: Bonus, shipGear: Bonus): Record<CrewId, FighterStats> {
  const out = {} as Record<CrewId, FighterStats>
  for (const id of Object.keys(CREW) as CrewId[]) {
    const base = lvl(CREW[id].stats, level)
    out[id] = add(add(base, shipGear), id === 'jonte' ? jonteGear : {})
  }
  return out
}
