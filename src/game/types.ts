export type HabitKind = 'tap' | 'lassen' | 'drink'
export type Glass = 'w' | 'f'

export interface Habit {
  id: string
  name: string
  kind: HabitKind
  /** Dauer-Habit: ist jede Woche automatisch aktiv */
  always?: boolean
}

export interface WeekPlan {
  /** Montag der Woche, YYYY-MM-DD */
  weekStart: string
  habitIds: string[]
  focusIds: string[]
  /** Ab welchem Tag ein Habit zaehlt (fuer Habits, die unter der Woche dazukommen) */
  activeFrom: Record<string, string>
}

export interface DayLog {
  done: Record<string, boolean>
  glasses: Glass[]
}

export type Rarity = 'gewoehnlich' | 'selten' | 'episch' | 'legendaer'
export type Slot = 'waffe' | 'hut' | 'kleidung' | 'talisman' | 'schiff'

/** Kampfwerte. krit und ausweichen in Prozent. */
export interface Stats {
  leben: number
  angriff: number
  ruestung: number
  tempo: number
  krit: number
  ausweichen: number
}

export interface Item {
  uid: string
  /** Schluessel im Item-Katalog (game/items.ts); Werte und Bild kommen von dort */
  key: string
  name: string
  slot: Slot
  rarity: Rarity
  /** Anzeige-Text der Werte (aeltere Spielstaende) */
  stats: string
}

export interface GameState {
  gold: number
  /** Wind, der geschenkt wurde (Start, Testmodus) */
  windGift: number
  windSpent: number
  /** Index des Feldes, auf dem das Schiff liegt */
  field: number
  looted: number[]
  inventory: Item[]
  /** Angelegte Ausruestung: Slot -> Item-uid */
  equipped: Partial<Record<Slot, string>>
  /** Heute im Laden gekaufte Angebote */
  shop: { day: string; bought: string[] }
  /** Aktuelles Kapitel (1, 2, ...) */
  chapter: number
  /** Crew an Bord (ids aus game/foes) */
  crew: string[]
  /** Erfahrung der Crew. Die Stufe ergibt sich daraus (game/progress). */
  xp: number
  /** Gewonnene Kaempfe auf Feldern im aktuellen Kapitel */
  cleared: number[]
  /** Gesehene Story-Szenen */
  seen: string[]
  /** Zuletzt gewaehlte Aufstellung */
  setup?: { id: string; row: 'vorne' | 'hinten'; ability: string }[]
  /** Boss-Versuche heute */
  bossTries: { day: string; n: number }
  /** Kapitel, deren Boss besiegt ist */
  bossBeaten: number[]
}

export interface Save {
  version: 1
  profile: string
  createdAt: string
  /** Zeitpunkt der letzten Aenderung (leer = unberuehrter neuer Stand). Beim Abgleich gewinnt der neuere. */
  updatedAt?: string
  habits: Habit[]
  weeks: Record<string, WeekPlan>
  logs: Record<string, DayLog>
  game: GameState
}
