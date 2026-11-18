// Prueft Wind-Formel, Rueckenwind, Serien, Rettungsring und Fokus-Truhe: npm run motcheck
import { dayResult, windEarned } from '../src/game/rules.ts'
import { pendingRewards, streakInfo, focusWeek } from '../src/game/motivation.ts'
import { addDays } from '../src/game/dates.ts'
import type { Save } from '../src/game/types.ts'

let fail = 0
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fail++
  console.log(`${ok ? 'ok  ' : 'FEHLER'} ${name}: ${JSON.stringify(got)}${ok ? '' : ` (erwartet ${JSON.stringify(want)})`}`)
}

const MON = '2026-11-02'
function save(n: number, focus = 0): Save {
  const habits = Array.from({ length: n }, (_, i) => ({ id: `h${i}`, name: `H${i}`, kind: 'tap' as const }))
  const ids = habits.map((h) => h.id)
  const weeks: Save['weeks'] = {}
  for (let w = 0; w < 12; w++) {
    const ws = addDays(MON, w * 7)
    weeks[ws] = { weekStart: ws, habitIds: ids, focusIds: ids.slice(0, focus), activeFrom: {} }
  }
  return { version: 1, profile: 'T', createdAt: '', habits, weeks, logs: {}, game: { claimed: [] } as unknown as Save['game'] }
}
const tick = (s: Save, day: string, k: number) => {
  s.logs[day] = { done: Object.fromEntries(s.habits.slice(0, k).map((h) => [h.id, true])), glasses: [] }
}

// Wind bei vollem Tag nach Anzahl Habits (1 Fokus)
for (const [n, want] of [[2, 5], [3, 6], [4, 7], [5, 9], [6, 10], [10, 10]] as const) {
  const s = save(n, 1)
  tick(s, MON, n)
  eq(`voller Tag mit ${n} Habits`, dayResult(s, MON).wind, want)
}
{
  const s = save(7, 1)
  // h0 ist Fokus: 4 normale (h1..h4) = 4 von 8 Punkten
  s.logs[MON] = { done: { h1: true, h2: true, h3: true, h4: true }, glasses: [] }
  eq('7 Habits, 4 normale erledigt', dayResult(s, MON).wind, 4)
}

// Rueckenwind: Mo erledigt, Di+Mi nichts, Do Haelfte
{
  const s = save(6)
  tick(s, MON, 6)
  tick(s, addDays(MON, 3), 3)
  eq('Rückenwind nach 2 Tagen Pause', dayResult(s, addDays(MON, 3)).wind, 4 + 3)
  tick(s, addDays(MON, 3), 2)
  eq('kein Rückenwind unter der Hälfte', dayResult(s, addDays(MON, 3)).backwind, false)
  const t = save(6)
  tick(t, MON, 6)
  eq('erster Tag überhaupt ohne Rückenwind', dayResult(t, MON).backwind, false)
}

// Serie: 2 Habits reichen; Rettungsring einmal pro Woche
{
  const s = save(6)
  for (let i = 0; i < 14; i++) tick(s, addDays(MON, i), 2)
  const today = addDays(MON, 14)
  eq('14 Tage Serie', streakInfo(s, today).days, 14)
  eq('Truhen bei 7 und 14', pendingRewards(s, today).map((r) => [r.chest.kind, r.title]), [
    ['silber', 'Serien-Truhe: 7 Tage'],
    ['gold', 'Serien-Truhe: 14 Tage'],
  ])
  tick(s, addDays(MON, 4), 1) // Fr der ersten Woche verpasst: Rettungsring
  const i = streakInfo(s, today)
  eq('Rettungsring hält die Serie', [i.days, i.rescued], [13, [addDays(MON, 4)]])
  tick(s, addDays(MON, 5), 0) // Sa auch verpasst: Serie reisst
  eq('zweiter Fehltag in der Woche bricht', streakInfo(s, today).days, 8)
  eq('heute offen bricht nicht', streakInfo(s, addDays(MON, 14)).todayOk, false)
}

// Fokus-Truhe
{
  const s = save(4, 1)
  for (let i = 0; i < 5; i++) tick(s, addDays(MON, i), 1)
  eq('5 von 7: Silber', focusWeek(s, MON, addDays(MON, 6))?.chest, { kind: 'silber' })
  eq('Samstag noch nicht offen', pendingRewards(s, addDays(MON, 5)).filter((r) => r.key.startsWith('fokus')).length, 0)
  eq('Sonntag offen', pendingRewards(s, addDays(MON, 6)).filter((r) => r.key.startsWith('fokus')).length, 1)
  tick(s, addDays(MON, 5), 1)
  tick(s, addDays(MON, 6), 1)
  eq('7 von 7: Gold', focusWeek(s, MON, addDays(MON, 6))?.chest, { kind: 'gold' })
}

// Wind gesamt bleibt endlich und berechenbar
{
  const s = save(6)
  for (let i = 0; i < 60; i++) tick(s, addDays(MON, i), 6)
  eq('60 volle Tage', windEarned(s), 600)
  eq('Serie 60', streakInfo(s, addDays(MON, 59)).days, 60)
}

if (fail) {
  console.log(`\n${fail} Fehler`)
  process.exit(1)
}
console.log('\nAlles in Ordnung.')
