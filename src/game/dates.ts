export function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export function addDays(k: string, n: number): string {
  const d = parseKey(k)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

/** Montag der Woche, in der der Tag liegt */
export function weekStartOf(k: string): string {
  const d = parseKey(k)
  const dow = (d.getDay() + 6) % 7 // Mo = 0
  return addDays(k, -dow)
}

export function daysOfWeek(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

const WD = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const MO = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

export function longDate(k: string): string {
  const d = parseKey(k)
  return `${WD[d.getDay()]}, ${d.getDate()}. ${MO[d.getMonth()]}`
}

export function shortRange(weekStart: string): string {
  const a = parseKey(weekStart)
  const b = parseKey(addDays(weekStart, 6))
  return `${a.getDate()}.${a.getMonth() + 1}. bis ${b.getDate()}.${b.getMonth() + 1}.`
}
