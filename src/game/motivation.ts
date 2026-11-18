import type { Rarity, Save } from './types'
import { addDays, daysOfWeek, weekStartOf } from './dates.ts'
import { firstActiveDay, isDone, streakDay } from './rules.ts'
import type { ChestKind } from './loot'

/**
 * Motivation aus dem Spielkonzept: Serien mit Truhen, Rettungsring, Fokus-Truhe.
 * Alles wird aus den Tages-Logs abgeleitet, gespeichert wird nur, welche Truhen schon geoeffnet sind.
 */

/** Serien-Truhen: bei 7, 14, 30, 60 und danach alle 30 Tage */
export function isMilestone(n: number): boolean {
  return n === 7 || n === 14 || n === 30 || n === 60 || (n > 60 && n % 30 === 0)
}

export const MILESTONES = [7, 14, 30, 60]

export function nextMilestone(n: number): number {
  for (let m = n + 1; ; m++) if (isMilestone(m)) return m
}

export interface RewardChest {
  kind: Exclude<ChestKind, 'verflucht'>
  /** Mindestens ein Item dieser Seltenheit */
  sure?: Rarity
}

export function milestoneChest(n: number): RewardChest {
  if (n === 7) return { kind: 'silber' }
  if (n === 14) return { kind: 'gold' }
  if (n === 60) return { kind: 'gold', sure: 'legendaer' }
  return { kind: 'gold', sure: 'episch' }
}

export interface StreakInfo {
  /** Aktuelle Serie in Tagen (heute zaehlt mit, sobald er geschafft ist) */
  days: number
  /** Heute schon fuer die Serie geschafft */
  todayOk: boolean
  /** Rettungsring dieser Woche noch frei */
  ringFree: boolean
  /** Tage, die ein Rettungsring gerettet hat */
  rescued: string[]
  /** Erreichte Meilensteine als Belohnungs-Schluessel mit Tageszahl */
  earned: { key: string; days: number }[]
}

export function streakInfo(save: Save, today: string): StreakInfo {
  const first = firstActiveDay(save)
  const rescued: string[] = []
  const earned: StreakInfo['earned'] = []
  const ringUsed = new Set<string>()
  let days = 0
  let runStart = ''
  let todayOk = false
  if (first) {
    for (let d = first; d <= today; d = addDays(d, 1)) {
      const ok = streakDay(save, d)
      if (ok) {
        if (days === 0) runStart = d
        days++
        if (isMilestone(days)) earned.push({ key: `serie|${runStart}|${days}`, days })
        if (d === today) todayOk = true
      } else if (d === today) {
        // Der laufende Tag bricht die Serie nie
      } else if (days > 0 && !ringUsed.has(weekStartOf(d))) {
        ringUsed.add(weekStartOf(d))
        rescued.push(d)
      } else {
        days = 0
        runStart = ''
      }
    }
  }
  return { days, todayOk, ringFree: !ringUsed.has(weekStartOf(today)), rescued, earned }
}

export interface FocusResult {
  week: string
  /** Tage, an denen alle Fokus-Habits erledigt waren */
  days: number
  chest: RewardChest | null
}

/** Fokus-Ergebnis einer Woche bis einschliesslich bis (meist heute) */
export function focusWeek(save: Save, week: string, until: string): FocusResult | null {
  const plan = save.weeks[week]
  if (!plan?.focusIds.length) return null
  const habits = plan.focusIds.map((id) => save.habits.find((h) => h.id === id)).filter((h) => !!h)
  if (!habits.length) return null
  let days = Infinity
  for (const h of habits) {
    const n = daysOfWeek(week).filter((d) => d <= until && isDone(h, save.logs[d])).length
    days = Math.min(days, n)
  }
  const chest: RewardChest | null = days >= 7 ? { kind: 'gold' } : days >= 5 ? { kind: 'silber' } : null
  return { week, days, chest }
}

export interface PendingReward {
  key: string
  title: string
  text: string
  chest: RewardChest
}

/** Truhen fuer Serien und Fokus, die verdient, aber noch nicht geoeffnet sind */
export function pendingRewards(save: Save, today: string): PendingReward[] {
  const claimed = new Set(save.game.claimed ?? [])
  const out: PendingReward[] = []
  for (const e of streakInfo(save, today).earned) {
    if (claimed.has(e.key)) continue
    out.push({ key: e.key, title: `Serien-Truhe: ${e.days} Tage`, text: `${e.days} Tage in Folge mit mindestens 2 Habits.`, chest: milestoneChest(e.days) })
  }
  for (const week of Object.keys(save.weeks).sort()) {
    const sunday = addDays(week, 6)
    if (today < sunday) continue
    const key = `fokus|${week}`
    if (claimed.has(key)) continue
    const r = focusWeek(save, week, today)
    if (!r?.chest) continue
    out.push({ key, title: 'Fokus-Truhe', text: `Fokus an ${r.days} von 7 Tagen geschafft.`, chest: r.chest })
  }
  return out
}

/** Sonntag, Fokus bisher an 6 Tagen und heute noch offen: wer jetzt oeffnet, verschenkt die Goldtruhe */
export function focusGoldPossible(save: Save, today: string): boolean {
  const week = weekStartOf(today)
  if (today !== addDays(week, 6)) return false
  const r = focusWeek(save, week, today)
  return !!r && r.days === 6 && !(save.game.claimed ?? []).includes(`fokus|${week}`) && focusWeek(save, week, addDays(today, -1))!.days === 6
}
