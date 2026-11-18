import type { DayLog, Habit, Save, WeekPlan } from './types'
import { daysOfWeek, weekStartOf, addDays } from './dates.ts'

/** Regeln aus dem Spielkonzept. Feinschliff kommt mit dem Balancing. */
export const RULES = {
  /** Gewicht eines Habits im erledigten Anteil (Fokus zaehlt doppelt) */
  windPerHabit: 1,
  windPerFocus: 2,
  /** Tageswind bei vollem Tag ohne Bonus, erreicht ab fullWindHabits Habits */
  dayWind: 8,
  fullWindHabits: 6,
  fullDayBonus: 2,
  /** Rueckenwind: nach so vielen Tagen ganz ohne Habit gibt es Extra-Wind, sobald die Haelfte erledigt ist */
  backwindPause: 2,
  backwindBonus: 3,
  /** Ein Tag zaehlt fuer die Serie ab so vielen erledigten Habits */
  streakMin: 2,
  windPerField: 3,
  startWind: 3,
  drinkGlasses: 6,
  drinkMinWater: 2,
  maxFocus: 2,
  maxGlasses: 10,
}

export const emptyLog = (): DayLog => ({ done: {}, glasses: [] })

export function isDone(h: Habit, log: DayLog | undefined): boolean {
  if (!log) return false
  if (h.kind === 'drink') {
    const water = log.glasses.filter((g) => g === 'w').length
    return log.glasses.length >= RULES.drinkGlasses && water >= RULES.drinkMinWater
  }
  return !!log.done[h.id]
}

/** Habits, die an einem Tag zaehlen */
export function activeHabits(save: Save, day: string): Habit[] {
  const plan = save.weeks[weekStartOf(day)]
  if (!plan) return []
  return plan.habitIds
    .map((id) => save.habits.find((h) => h.id === id))
    .filter((h): h is Habit => !!h && (plan.activeFrom[h.id] ?? plan.weekStart) <= day)
}

export function habitWind(plan: WeekPlan | undefined, h: Habit): number {
  return plan?.focusIds.includes(h.id) ? RULES.windPerFocus : RULES.windPerHabit
}

export interface DayResult {
  total: number
  done: number
  /** Wind des Tages inklusive Bonus und Rueckenwind */
  wind: number
  /** Hoechstmoeglicher Wind heute (ohne Rueckenwind) */
  max: number
  allDone: boolean
  /** Rueckenwind heute verdient */
  backwind: boolean
}

/** Erledigte Habits und Gewichte eines Tages, ohne Rueckenwind */
function baseDay(save: Save, day: string) {
  const plan = save.weeks[weekStartOf(day)]
  const hs = activeHabits(save, day)
  const log = save.logs[day]
  let weight = 0
  let doneWeight = 0
  let done = 0
  for (const h of hs) {
    const w = habitWind(plan, h)
    weight += w
    if (isDone(h, log)) {
      done++
      doneWeight += w
    }
  }
  const total = hs.length
  const allDone = total > 0 && done === total
  const base = (RULES.dayWind * Math.min(total, RULES.fullWindHabits)) / RULES.fullWindHabits
  const wind = weight ? Math.round((base * doneWeight) / weight) + (allDone ? RULES.fullDayBonus : 0) : 0
  const max = total ? Math.round(base) + RULES.fullDayBonus : 0
  return { total, done, wind, max, allDone }
}

/** Erster Tag, an dem ueberhaupt ein Habit erledigt wurde */
export function firstActiveDay(save: Save): string | null {
  const days = Object.keys(save.logs).sort()
  return days.find((d) => baseDay(save, d).done > 0) ?? null
}

/** Nach einer Pause (Tage ganz ohne Habit) bekommt dieser Tag Rueckenwind, wenn die Haelfte erledigt ist */
export function afterPause(save: Save, day: string, first = firstActiveDay(save)): boolean {
  if (!first || first >= day) return false
  for (let i = 1; i <= RULES.backwindPause; i++) {
    const d = addDays(day, -i)
    if (d <= first || baseDay(save, d).done > 0) return false
  }
  return true
}

export function dayResult(save: Save, day: string, first?: string | null): DayResult {
  const b = baseDay(save, day)
  const backwind = b.total > 0 && b.done * 2 >= b.total && afterPause(save, day, first === undefined ? firstActiveDay(save) : first)
  return { ...b, wind: b.wind + (backwind ? RULES.backwindBonus : 0), backwind }
}

export function windEarned(save: Save): number {
  const first = firstActiveDay(save)
  return Object.keys(save.logs).reduce((sum, day) => sum + dayResult(save, day, first).wind, 0)
}

/** Zaehlt der Tag fuer die Serie? */
export function streakDay(save: Save, day: string): boolean {
  const b = baseDay(save, day)
  return b.total > 0 && b.done >= Math.min(RULES.streakMin, b.total)
}

export function windAvailable(save: Save): number {
  return save.game.windGift + windEarned(save) - save.game.windSpent
}

export interface WeekReview {
  daysAllDone: number
  longestStreak: number
  focusOk: boolean | null
}

export function reviewWeek(save: Save, weekStart: string): WeekReview | null {
  const plan = save.weeks[weekStart]
  if (!plan) return null
  let daysAllDone = 0
  let streak = 0
  let longestStreak = 0
  const focusHits: Record<string, number> = {}
  for (const day of daysOfWeek(weekStart)) {
    const r = dayResult(save, day)
    if (r.allDone) {
      daysAllDone++
      streak++
      longestStreak = Math.max(longestStreak, streak)
    } else streak = 0
    for (const id of plan.focusIds) {
      const h = save.habits.find((x) => x.id === id)
      if (h && isDone(h, save.logs[day])) focusHits[id] = (focusHits[id] ?? 0) + 1
    }
  }
  const focusOk = plan.focusIds.length ? plan.focusIds.every((id) => (focusHits[id] ?? 0) >= 5) : null
  return { daysAllDone, longestStreak, focusOk }
}

export function previousWeek(weekStart: string): string {
  return addDays(weekStart, -7)
}
