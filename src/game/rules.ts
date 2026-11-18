import type { DayLog, Habit, Rhythm, Save, WeekPlan } from './types'
import { daysOfWeek, weekStartOf, addDays, parseKey } from './dates.ts'

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

const DAILY: Rhythm = { kind: 'daily' }

/** Rhythmus, der an einem Tag gilt */
export function rhythmOn(h: Habit, day: string): Rhythm {
  let r = DAILY
  for (const e of h.rhythms ?? []) if (e.from <= day) r = e.r
  return r
}

/** Aktueller Rhythmus (ab heute) */
export const currentRhythm = (h: Habit): Rhythm => h.rhythms?.at(-1)?.r ?? DAILY

/** Wochentag 0 = Montag bis 6 = Sonntag */
export const weekday = (day: string): number => (parseKey(day).getDay() + 6) % 7

/** Ist der Habit an dem Tag laut Rhythmus faellig? */
export function isScheduled(save: Save, h: Habit, day: string): boolean {
  const r = rhythmOn(h, day)
  if (r.kind === 'days') return r.days.includes(weekday(day))
  if (r.kind === 'every') {
    for (let i = 1; i < r.n; i++) if (isDone(h, save.logs[addDays(day, -i)])) return false
    return true
  }
  return true
}

/** Habits der Woche, die an dem Tag schon (und noch) dabei sind, egal ob faellig */
export function plannedHabits(save: Save, day: string): Habit[] {
  const plan = save.weeks[weekStartOf(day)]
  if (!plan) return []
  return plan.habitIds
    .map((id) => save.habits.find((h) => h.id === id))
    .filter((h): h is Habit => !!h && (plan.activeFrom[h.id] ?? plan.weekStart) <= day && (!h.removedAt || day < h.removedAt))
}

/** Habits, die an einem Tag zaehlen: faellige, und nicht faellige, die trotzdem erledigt wurden */
export function activeHabits(save: Save, day: string): Habit[] {
  const log = save.logs[day]
  return plannedHabits(save, day).filter((h) => isScheduled(save, h, day) || isDone(h, log))
}

/** Habits, die an dem Tag frei haben (nicht faellig und nicht erledigt) */
export function freeHabits(save: Save, day: string): Habit[] {
  const log = save.logs[day]
  return plannedHabits(save, day).filter((h) => !isScheduled(save, h, day) && !isDone(h, log))
}

/** Ruhetag: Habits sind geplant, aber keiner ist faellig. Zaehlt weder fuer noch gegen Serien. */
export function restDay(save: Save, day: string): boolean {
  return activeHabits(save, day).length === 0 && plannedHabits(save, day).length > 0
}

/** Wann ist ein freier Habit wieder faellig? (Text, z. B. "wieder fällig morgen") */
export function nextDueText(save: Save, h: Habit, day: string): string {
  for (let i = 1; i <= 7; i++) {
    const d = addDays(day, i)
    const r = rhythmOn(h, d)
    const due = r.kind === 'days' ? r.days.includes(weekday(d)) : r.kind === 'every' ? i >= lastDoneGap(save, h, day, r.n) : true
    if (due) return i === 1 ? 'wieder fällig morgen' : r.kind === 'days' ? `fällig ${WEEKDAYS_SHORT[weekday(d)]}` : `wieder fällig in ${i} Tagen`
  }
  return 'gerade nicht fällig'
}

/** Tage bis "alle n Tage" wieder greift, gezaehlt ab day */
function lastDoneGap(save: Save, h: Habit, day: string, n: number): number {
  for (let i = 0; i < n; i++) if (isDone(h, save.logs[addDays(day, -i)])) return n - i
  return 0
}

export const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

/** Rhythmus als kurzer Text, z. B. "alle 2 Tage" oder "Mo, Mi, Fr" */
export function rhythmText(r: Rhythm): string {
  if (r.kind === 'every') return `alle ${r.n} Tage`
  if (r.kind === 'days') return r.days.length === 7 ? 'täglich' : [...r.days].sort().map((d) => WEEKDAYS_SHORT[d]).join(', ')
  return 'täglich'
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
    if (d <= first || baseDay(save, d).done > 0 || restDay(save, d)) return false
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

/** Fokus-Bilanz eines Habits in einer Woche bis einschliesslich until: faellige Tage und erledigte Tage */
export function focusTally(save: Save, h: Habit, week: string, until: string): { done: number; due: number } {
  let done = 0
  let due = 0
  for (const d of daysOfWeek(week)) {
    if (d > until || !plannedHabits(save, d).some((x) => x.id === h.id)) continue
    const ok = isDone(h, save.logs[d])
    if (ok || isScheduled(save, h, d)) due++
    if (ok) done++
  }
  return { done, due }
}

/** Fokus geschafft: an mindestens 5 von 7 der faelligen Tage (anteilig gerundet) */
export const focusOkFor = (t: { done: number; due: number }) => t.due > 0 && t.done >= Math.ceil((t.due * 5) / 7)

export function reviewWeek(save: Save, weekStart: string): WeekReview | null {
  const plan = save.weeks[weekStart]
  if (!plan) return null
  let daysAllDone = 0
  let streak = 0
  let longestStreak = 0
  for (const day of daysOfWeek(weekStart)) {
    const r = dayResult(save, day)
    if (r.allDone) {
      daysAllDone++
      streak++
      longestStreak = Math.max(longestStreak, streak)
    } else if (!restDay(save, day)) streak = 0
  }
  const focus = plan.focusIds.map((id) => save.habits.find((x) => x.id === id)).filter((h): h is Habit => !!h)
  const focusOk = focus.length ? focus.every((h) => focusOkFor(focusTally(save, h, weekStart, addDays(weekStart, 6)))) : null
  return { daysAllDone, longestStreak, focusOk }
}

export function previousWeek(weekStart: string): string {
  return addDays(weekStart, -7)
}
