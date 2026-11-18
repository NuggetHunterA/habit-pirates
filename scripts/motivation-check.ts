// Prueft Wind-Formel, Rueckenwind, Serien, Rettungsring und Fokus-Truhe: npm run motcheck
import { activeHabits, dayResult, freeHabits, nextDueText, windEarned } from '../src/game/rules.ts'
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

// Rhythmus: alle 2 Tage ab letztem Erledigen, feste Wochentage, Ruhetag, Loeschen
{
  const s = save(2)
  s.habits[1].rhythms = [{ from: MON, r: { kind: 'every', n: 2 } }]
  eq('alle 2 Tage: am Start fällig', activeHabits(s, MON).length, 2)
  tick(s, MON, 2)
  eq('alle 2 Tage: am Tag danach frei', freeHabits(s, addDays(MON, 1)).map((h) => h.id), ['h1'])
  eq('frei: Text', nextDueText(s, s.habits[1], addDays(MON, 1)), 'wieder fällig morgen')
  eq('frei zählt nicht für vollen Wind', dayResult(s, addDays(MON, 1)).total, 1)
  eq('alle 2 Tage: übermorgen wieder fällig', activeHabits(s, addDays(MON, 2)).length, 2)
  eq('verpasst: bleibt fällig', activeHabits(s, addDays(MON, 3)).length, 2)
  s.logs[addDays(MON, 1)] = { done: { h0: true, h1: true }, glasses: [] }
  eq('freier Habit abgehakt zählt mit', dayResult(s, addDays(MON, 1)).total, 2)

  const t = save(1)
  t.habits[0].rhythms = [{ from: MON, r: { kind: 'days', days: [0, 2, 4] } }]
  eq('Wochentage: Di frei', activeHabits(t, addDays(MON, 1)).length, 0)
  eq('Wochentage: Text', nextDueText(t, t.habits[0], addDays(MON, 1)), 'wieder fällig morgen')
  eq('Wochentage: Text Fr', nextDueText(t, t.habits[0], addDays(MON, 2)), 'fällig Fr')
  for (const i of [0, 2, 4, 7, 9]) t.logs[addDays(MON, i)] = { done: { h0: true }, glasses: [] }
  eq('Ruhetage brechen die Serie nicht', streakInfo(t, addDays(MON, 9)).days, 5)
  eq('Ruhetage verbrauchen keinen Rettungsring', streakInfo(t, addDays(MON, 9)).rescued, [])

  const f = save(1, 1)
  f.habits[0].rhythms = [{ from: MON, r: { kind: 'days', days: [0, 2, 4] } }]
  for (const i of [0, 2, 4]) f.logs[addDays(MON, i)] = { done: { h0: true }, glasses: [] }
  eq('Fokus mit Rhythmus 3 von 3: Gold', focusWeek(f, MON, addDays(MON, 6))?.chest, { kind: 'gold' })
  delete f.logs[addDays(MON, 4)]
  eq('Fokus mit Rhythmus 2 von 3: nichts', focusWeek(f, MON, addDays(MON, 6))?.chest, null)

  const d = save(2)
  for (let i = 0; i < 3; i++) tick(d, addDays(MON, i), 2)
  const before = windEarned(d)
  d.habits[1].removedAt = addDays(MON, 3)
  eq('Löschen ändert vergangenen Wind nicht', windEarned(d), before)
  eq('gelöschter Habit ab dem Tag weg', activeHabits(d, addDays(MON, 3)).length, 1)
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
