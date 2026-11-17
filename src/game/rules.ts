import type { DayLog, Habit, Save, WeekPlan } from './types'
import { daysOfWeek, weekStartOf, addDays } from './dates'

/** Regeln aus dem Spielkonzept. Feinschliff kommt mit dem Balancing. */
export const RULES = {
  windPerHabit: 1,
  windPerFocus: 2,
  fullDayBonus: 2,
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
  wind: number
  allDone: boolean
}

export function dayResult(save: Save, day: string): DayResult {
  const plan = save.weeks[weekStartOf(day)]
  const hs = activeHabits(save, day)
  const log = save.logs[day]
  let wind = 0
  let done = 0
  for (const h of hs) {
    if (isDone(h, log)) {
      done++
      wind += habitWind(plan, h)
    }
  }
  const allDone = hs.length > 0 && done === hs.length
  if (allDone) wind += RULES.fullDayBonus
  return { total: hs.length, done, wind, allDone }
}

export function windEarned(save: Save): number {
  return Object.keys(save.logs).reduce((sum, day) => sum + dayResult(save, day).wind, 0)
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
