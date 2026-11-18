import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Glass, Habit, HabitKind, Item, Save, Slot, WeekPlan } from './types'
import { dateKey, weekStartOf } from './dates'
import { RULES, emptyLog, windAvailable, previousWeek } from './rules'
import { chapterOf } from './map'
import { PRICE, itemDef, makeItem, sellPrice } from './items'
import { START_CREW } from './foes'
import { xpTotal } from './progress'
import { STORIES } from './story'

/** Boss-Versuche pro Tag */
export const BOSS_TRIES = 3

/**
 * Spielstand pro Profil. Im Prototyp liegt er im Browser (localStorage).
 * Das Format passt zum spaeteren Supabase-Schema `pirates` (ein Datensatz pro Profil).
 */
const PROFILE_KEY = 'hp.profile'
const saveKey = (p: string) => `hp.save.${p}`

function read<T>(k: string): T | null {
  try {
    const v = localStorage.getItem(k)
    return v ? (JSON.parse(v) as T) : null
  } catch {
    return null
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* privater Modus: Spiel laeuft trotzdem, nur ohne Speichern */
  }
}

const uid = () => Math.random().toString(36).slice(2, 9)

/** Aeltere Spielstaende auf das aktuelle Format bringen */
const PROGRESS = () => ({ chapter: 1, crew: [...START_CREW], xp: 0, cleared: [], seen: [], bossTries: { day: '', n: 0 }, bossBeaten: [] })

function migrate(s: Save | null): Save | null {
  if (!s) return s
  const g = s.game
  if (g.equipped && g.shop && g.chapter) return s
  return { ...s, game: { ...PROGRESS(), ...g, equipped: g.equipped ?? {}, shop: g.shop ?? { day: '', bought: [] } } }
}

function newSave(profile: string): Save {
  const habits: Habit[] = [
    { id: 'trinken', name: 'Genug trinken', kind: 'drink', always: true },
    { id: uid(), name: 'Vitamin D', kind: 'tap' },
    { id: uid(), name: 'Creatin', kind: 'tap' },
    { id: uid(), name: 'Zähne putzen am Abend', kind: 'tap' },
    { id: uid(), name: 'Gesichtspflege', kind: 'tap' },
    { id: uid(), name: '10 Seiten lesen', kind: 'tap' },
    { id: uid(), name: 'Kein Doom-Scrolling', kind: 'lassen' },
  ]
  return {
    version: 1,
    profile,
    createdAt: new Date().toISOString(),
    habits,
    weeks: {},
    logs: {},
    game: { gold: 0, windGift: RULES.startWind, windSpent: 0, field: 0, looted: [], inventory: [], equipped: {}, shop: { day: '', bought: [] }, ...PROGRESS() },
  }
}

/** Kampf auf dem aktuellen Feld, der noch nicht gewonnen ist: Weitersegeln geht erst nach dem Sieg */
export function blocked(s: Save): boolean {
  const f = chapterOf(s.game.chapter).fields[s.game.field]
  return !!f.enc && !s.game.cleared.includes(s.game.field) && f.kind !== 'boss'
}

/** Boss-Versuche, die heute noch frei sind */
export function bossTriesLeft(s: Save, today: string): number {
  const t = s.game.bossTries
  return BOSS_TRIES - (t.day === today ? t.n : 0)
}

export function useToday(): string {
  const [today, setToday] = useState(() => dateKey(new Date()))
  useEffect(() => {
    const t = setInterval(() => setToday(dateKey(new Date())), 30_000)
    const vis = () => setToday(dateKey(new Date()))
    document.addEventListener('visibilitychange', vis)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])
  return today
}

export function useGame() {
  const [profile, setProfileState] = useState<string | null>(() => read<string>(PROFILE_KEY))
  const [save, setSave] = useState<Save | null>(() => {
    const p = read<string>(PROFILE_KEY)
    return p ? migrate(read<Save>(saveKey(p))) ?? newSave(p) : null
  })
  const today = useToday()
  const week = weekStartOf(today)

  useEffect(() => {
    if (save) write(saveKey(save.profile), save)
  }, [save])

  const update = useCallback((fn: (s: Save) => Save) => setSave((s) => (s ? fn(s) : s)), [])

  const chooseProfile = useCallback((p: string) => {
    write(PROFILE_KEY, p)
    setProfileState(p)
    setSave(migrate(read<Save>(saveKey(p))) ?? newSave(p))
  }, [])

  const logoutProfile = useCallback(() => {
    try {
      localStorage.removeItem(PROFILE_KEY)
    } catch {
      /* egal */
    }
    setProfileState(null)
    setSave(null)
  }, [])

  const plan: WeekPlan | undefined = save?.weeks[week]

  /** Vorschlag fuer den Wochenstart: Habits der letzten geplanten Woche plus Dauer-Habits */
  const suggestion = useMemo(() => {
    if (!save) return { habitIds: [] as string[], focusIds: [] as string[] }
    const weeks = Object.keys(save.weeks).sort()
    const last = weeks.filter((w) => w < week).pop()
    const always = save.habits.filter((h) => h.always).map((h) => h.id)
    if (!last) return { habitIds: save.habits.map((h) => h.id), focusIds: [] }
    const prev = save.weeks[last]
    return {
      habitIds: Array.from(new Set([...always, ...prev.habitIds])).filter((id) => save.habits.some((h) => h.id === id)),
      focusIds: [],
    }
  }, [save, week])

  const actions = useMemo(
    () => ({
      startWeek(habitIds: string[], focusIds: string[]) {
        update((s) => {
          const old = s.weeks[week]
          const activeFrom: Record<string, string> = { ...(old?.activeFrom ?? {}) }
          // Wer die Woche spaeter aendert: neue Habits zaehlen ab heute
          if (old) for (const id of habitIds) if (!old.habitIds.includes(id) && today > week) activeFrom[id] = today
          return { ...s, weeks: { ...s.weeks, [week]: { weekStart: week, habitIds, focusIds, activeFrom } } }
        })
      },
      addHabit(name: string, kind: HabitKind, always: boolean, opts: { addToWeek: boolean }) {
        const h: Habit = { id: uid(), name: name.trim(), kind, always }
        update((s) => {
          const next = { ...s, habits: [...s.habits, h] }
          const p = s.weeks[week]
          if (opts.addToWeek && p) {
            next.weeks = {
              ...s.weeks,
              [week]: { ...p, habitIds: [...p.habitIds, h.id], activeFrom: { ...p.activeFrom, [h.id]: today } },
            }
          }
          return next
        })
        return h.id
      },
      removeHabit(id: string) {
        update((s) => ({ ...s, habits: s.habits.filter((h) => h.id !== id) }))
      },
      toggleDone(id: string) {
        update((s) => {
          const log = s.logs[today] ?? emptyLog()
          return { ...s, logs: { ...s.logs, [today]: { ...log, done: { ...log.done, [id]: !log.done[id] } } } }
        })
      },
      addGlass(g: Glass) {
        update((s) => {
          const log = s.logs[today] ?? emptyLog()
          if (log.glasses.length >= RULES.maxGlasses) return s
          return { ...s, logs: { ...s.logs, [today]: { ...log, glasses: [...log.glasses, g] } } }
        })
      },
      popGlass() {
        update((s) => {
          const log = s.logs[today] ?? emptyLog()
          return { ...s, logs: { ...s.logs, [today]: { ...log, glasses: log.glasses.slice(0, -1) } } }
        })
      },
      sail() {
        update((s) => {
          const fields = chapterOf(s.game.chapter).fields
          if (windAvailable(s) < RULES.windPerField || s.game.field >= fields.length - 1 || blocked(s)) return s
          return { ...s, game: { ...s.game, field: s.game.field + 1, windSpent: s.game.windSpent + RULES.windPerField } }
        })
      },
      /**
       * Sieg in einem Kampf. field: Feld des Kampfs (null beim Beutezug).
       * Beutezuege kosten Wind, aber erst beim Sieg.
       */
      winFight(opts: { field: number | null; boss: boolean; farm: boolean; xp: number; gold: number; items: Item[] }) {
        update((s) => {
          const g = s.game
          const cap = chapterOf(g.chapter).cap
          return {
            ...s,
            game: {
              ...g,
              xp: Math.min(xpTotal(cap), g.xp + opts.xp),
              gold: g.gold + opts.gold,
              inventory: [...g.inventory, ...opts.items],
              cleared: opts.field != null && !g.cleared.includes(opts.field) ? [...g.cleared, opts.field] : g.cleared,
              bossBeaten: opts.boss && !g.bossBeaten.includes(g.chapter) ? [...g.bossBeaten, g.chapter] : g.bossBeaten,
              windSpent: g.windSpent + (opts.farm ? RULES.windPerField : 0),
            },
          }
        })
      },
      /** Zaehlt einen Boss-Versuch. Gibt false zurueck, wenn heute keiner mehr frei ist. */
      bossTry(): boolean {
        if (!save) return false
        const t = save.game.bossTries
        const n = t.day === today ? t.n : 0
        if (n >= BOSS_TRIES) return false
        update((s) => ({ ...s, game: { ...s.game, bossTries: { day: today, n: n + 1 } } }))
        return true
      },
      saveSetup(setup: NonNullable<Save['game']['setup']>) {
        update((s) => ({ ...s, game: { ...s.game, setup } }))
      },
      /** Szene gesehen: Belohnung, Crew-Beitritt. Bei Ereignis-Feldern zaehlt das Feld als erledigt. */
      finishStory(id: string, gold: number, items: Item[]) {
        update((s) => {
          const g = s.game
          if (g.seen.includes(id)) return s
          const st = STORIES[id]
          return {
            ...s,
            game: {
              ...g,
              seen: [...g.seen, id],
              gold: g.gold + gold,
              inventory: [...g.inventory, ...items],
              crew: st?.join && !g.crew.includes(st.join) ? [...g.crew, st.join] : g.crew,
            },
          }
        })
      },
      nextChapter() {
        update((s) => {
          const g = s.game
          if (!g.bossBeaten.includes(g.chapter) || g.chapter >= 2) return s
          return { ...s, game: { ...g, chapter: g.chapter + 1, field: 0, looted: [], cleared: [] } }
        })
      },
      testXp() {
        update((s) => ({ ...s, game: { ...s.game, xp: Math.min(xpTotal(chapterOf(s.game.chapter).cap), s.game.xp + 100) } }))
      },
      collectChest(field: number, gold: number, items: Item[]) {
        update((s) =>
          s.game.looted.includes(field)
            ? s
            : {
                ...s,
                game: {
                  ...s.game,
                  gold: s.game.gold + gold,
                  looted: [...s.game.looted, field],
                  inventory: [...s.game.inventory, ...items],
                },
              },
        )
      },
      equip(uid: string) {
        update((s) => {
          const it = s.game.inventory.find((x) => x.uid === uid)
          if (!it) return s
          return { ...s, game: { ...s.game, equipped: { ...s.game.equipped, [it.slot]: uid } } }
        })
      },
      unequip(slot: Slot) {
        update((s) => {
          const equipped = { ...s.game.equipped }
          delete equipped[slot]
          return { ...s, game: { ...s.game, equipped } }
        })
      },
      sellItem(uid: string) {
        update((s) => {
          const it = s.game.inventory.find((x) => x.uid === uid)
          if (!it) return s
          const equipped = { ...s.game.equipped }
          if (equipped[it.slot] === uid) delete equipped[it.slot]
          return {
            ...s,
            game: { ...s.game, gold: s.game.gold + sellPrice(it.rarity), inventory: s.game.inventory.filter((x) => x.uid !== uid), equipped },
          }
        })
      },
      /** Kauft ein Tagesangebot. Gibt das neue Item zurueck oder null (zu wenig Gold, schon gekauft). */
      buyItem(key: string): Item | null {
        const def = itemDef(key)
        const s = save
        if (!def || !s) return null
        const bought = s.game.shop.day === today ? s.game.shop.bought : []
        if (s.game.gold < PRICE[def.rarity] || bought.includes(key)) return null
        const it = makeItem(def)
        update((x) => ({
          ...x,
          game: {
            ...x.game,
            gold: x.game.gold - PRICE[def.rarity],
            inventory: [...x.game.inventory, it],
            shop: { day: today, bought: [...(x.game.shop.day === today ? x.game.shop.bought : []), key] },
          },
        }))
        return it
      },
      testWind() {
        update((s) => ({ ...s, game: { ...s.game, windGift: s.game.windGift + RULES.windPerField } }))
      },
      testGold() {
        update((s) => ({ ...s, game: { ...s.game, gold: s.game.gold + 100 } }))
      },
      resetGame() {
        update((s) => newSave(s.profile))
      },
    }),
    [update, week, today, save],
  )

  return { profile, save, today, week, plan, suggestion, previousWeek: previousWeek(week), chooseProfile, logoutProfile, ...actions }
}

export type Game = ReturnType<typeof useGame>

/** Felder im aktuellen Kapitel, die erledigt sind (fuer die Karte) */
export function doneFields(s: Save): number[] {
  const fields = chapterOf(s.game.chapter).fields
  return fields
    .map((f, i) => {
      if (f.kind === 'boss') return s.game.bossBeaten.includes(s.game.chapter)
      if (f.enc) return s.game.cleared.includes(i)
      if (f.kind === 'truhe') return s.game.looted.includes(i)
      if (f.story && f.kind !== 'start') return s.game.seen.includes(f.story)
      return false
    })
    .flatMap((d, i) => (d ? [i] : []))
}
