import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Glass, Habit, HabitKind, Item, Save, Slot, WeekPlan } from './types'
import { copiesOf, migrateGear, sellableCopy, wearer, withFound, wornUids } from './equipment'
import { dateKey, weekStartOf } from './dates'
import { RULES, emptyLog, windAvailable, previousWeek } from './rules'
import { CHAPTERS, chapterOf } from './map'
import { MAX_STARS, PRICE, TRADER_PRICE, itemDef, makeItem, sellPrice, starGold, starNeedsBoth } from './items'
import { START_CREW } from './foes'
import { xpTotal } from './progress'
import { STORIES } from './story'
import { loadRemote, ms, saveRemote } from './cloud'

/** Boss-Versuche pro Tag */
export const BOSS_TRIES = 3

/**
 * Spielstand pro Profil. Er liegt in Supabase (Schema `pirates`, ein Datensatz pro Profil)
 * und als Kopie im Browser, damit die App auch offline laeuft.
 * Beim Start, beim Zurueckkehren in die App und nach jeder Aenderung wird abgeglichen.
 * Bei einem Konflikt gewinnt der neuere Stand.
 */
const PROFILE_KEY = 'hp.profile'
/** Neuer Schluessel ab Phase 1: die alten Staende (hp.save.*) waren Tests und werden nicht uebernommen */
const saveKey = (p: string) => `hp2.save.${p}`
const OLD_KEYS = ['hp.save.Adrian', 'hp.save.Ulrike']

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
    /* privater Modus: Spiel laeuft trotzdem, nur ohne lokale Kopie */
  }
}
try {
  for (const k of OLD_KEYS) localStorage.removeItem(k)
} catch {
  /* egal */
}

/** Stand des Abgleichs mit Supabase */
export type SyncState = 'loading' | 'synced' | 'pending' | 'offline'

const uid = () => Math.random().toString(36).slice(2, 9)

/** Aeltere Spielstaende auf das aktuelle Format bringen */
const PROGRESS = () => ({ chapter: 1, crew: [...START_CREW], xp: 0, cleared: [], seen: [], bossTries: { day: '', n: 0 }, bossBeaten: [] })

function migrate(s: Save | null): Save | null {
  if (!s) return s
  const g = s.game
  if (g.gear && g.found && g.shop && g.chapter) return s
  return { ...s, game: migrateGear({ ...PROGRESS(), ...g, shop: g.shop ?? { day: '', bought: [] } }) }
}

/** Neuer Stand. touched=false: unberuehrt, ein Stand aus Supabase gewinnt immer. */
function newSave(profile: string, touched = false): Save {
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
    updatedAt: touched ? new Date().toISOString() : '',
    habits,
    weeks: {},
    logs: {},
    game: { gold: 0, windGift: RULES.startWind, windSpent: 0, field: 0, looted: [], inventory: [], gear: {}, found: [], shop: { day: '', bought: [] }, ...PROGRESS() },
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
    return p ? migrate(read<Save>(saveKey(p))) : null
  })
  const [sync, setSync] = useState<SyncState>(() => (profile && !save ? 'loading' : 'pending'))
  const [syncedAt, setSyncedAt] = useState<number | null>(null)
  const today = useToday()
  const week = weekStartOf(today)

  /** Aktueller Stand und letzter bekannter Zeitstempel in Supabase (fuer Abgleich ausserhalb von React) */
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  }, [save])
  const remoteAt = useRef(0)
  const pushT = useRef(0)
  const busy = useRef(false)
  const again = useRef<() => void>(() => {})

  /** Stand aus Supabase uebernehmen, wenn er neuer ist als der lokale */
  const adopt = useCallback((data: Save, at: string) => {
    remoteAt.current = Math.max(remoteAt.current, ms(at))
    setSave((cur) => {
      if (!cur || cur.profile !== data.profile) return cur
      return ms(at) > ms(cur.updatedAt) ? (migrate(data) ?? cur) : cur
    })
    setSync('synced')
    setSyncedAt(Date.now())
  }, [])

  const push = useCallback(
    async (keepalive = false) => {
      const s = saveRef.current
      if (!s || busy.current || ms(s.updatedAt) <= remoteAt.current) return
      busy.current = true
      try {
        const r = await saveRemote(s, keepalive)
        adopt(r.data, r.updated_at)
        // Waehrend des Speicherns geaendert: gleich nochmal
        if (ms(saveRef.current?.updatedAt) > remoteAt.current) pushT.current = window.setTimeout(() => again.current(), 300)
      } catch {
        setSync('offline')
      } finally {
        busy.current = false
      }
    },
    [adopt],
  )
  useEffect(() => {
    again.current = () => void push()
  }, [push])

  const pull = useCallback(
    async (p: string) => {
      try {
        const r = await loadRemote(p)
        if (saveRef.current && saveRef.current.profile !== p) return
        if (r) adopt(r.data, r.updated_at)
        if (!saveRef.current) setSave(r ? migrate(r.data) : newSave(p))
        if (!r) setSync('synced')
        void push()
      } catch {
        // Offline und noch kein lokaler Stand: neu beginnen, Supabase gewinnt spaeter, solange nichts geaendert wurde
        setSave((cur) => cur ?? newSave(p))
        setSync('offline')
      }
    },
    [adopt, push],
  )

  // Beim Start und bei jedem Profilwechsel abgleichen
  useEffect(() => {
    if (!profile) return
    remoteAt.current = 0
    void pull(profile)
  }, [profile, pull])

  // Lokale Kopie schreiben und Aenderungen kurz gesammelt nach Supabase schicken
  useEffect(() => {
    if (!save) return
    write(saveKey(save.profile), save)
    if (ms(save.updatedAt) > remoteAt.current) {
      setSync((x) => (x === 'offline' ? x : 'pending'))
      clearTimeout(pushT.current)
      pushT.current = window.setTimeout(() => void push(), 1200)
    }
  }, [save, push])

  // Zurueck in der App oder wieder online: neu abgleichen. Beim Verlassen sofort speichern.
  useEffect(() => {
    const vis = () => {
      if (document.visibilityState === 'hidden') void push(true)
      else if (profile) void pull(profile)
    }
    const online = () => profile && void pull(profile)
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('online', online)
    const t = setInterval(() => sync === 'offline' && void push(), 60_000)
    return () => {
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('online', online)
      clearInterval(t)
    }
  }, [profile, pull, push, sync])

  /** Aenderung am Spielstand: bekommt einen neuen Zeitstempel */
  const update = useCallback(
    (fn: (s: Save) => Save) =>
      setSave((s) => {
        if (!s) return s
        const n = fn(s)
        return n === s ? s : { ...n, updatedAt: new Date().toISOString() }
      }),
    [],
  )

  const chooseProfile = useCallback((p: string) => {
    write(PROFILE_KEY, p)
    const local = migrate(read<Save>(saveKey(p)))
    setSave(local)
    setSync(local ? 'pending' : 'loading')
    setProfileState(p)
  }, [])

  const logoutProfile = useCallback(() => {
    void push(true)
    try {
      localStorage.removeItem(PROFILE_KEY)
    } catch {
      /* egal */
    }
    setProfileState(null)
    setSave(null)
  }, [push])

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
      /** Sieg in einem Kampf. field: Feld des Kampfs (null beim Beutezug). Der Wind fuer Beutezuege ist schon beim Start bezahlt. */
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
              found: withFound(g, opts.items),
              cleared: opts.field != null && !g.cleared.includes(opts.field) ? [...g.cleared, opts.field] : g.cleared,
              bossBeaten: opts.boss && !g.bossBeaten.includes(g.chapter) ? [...g.bossBeaten, g.chapter] : g.bossBeaten,
            },
          }
        })
      },
      /** Beutezug starten: kostet sofort Wind. false, wenn zu wenig da ist. */
      startFarm(): boolean {
        if (!save || windAvailable(save) < RULES.windPerField) return false
        update((s) => ({ ...s, game: { ...s.game, windSpent: s.game.windSpent + RULES.windPerField } }))
        return true
      },
      /** Niederlage beim Beutezug: der Wind ist weg, es gibt Erfahrung (halbe) */
      gainXp(xp: number) {
        update((s) => ({ ...s, game: { ...s.game, xp: Math.min(xpTotal(chapterOf(s.game.chapter).cap), s.game.xp + xp) } }))
      },
      /** Waechter einer verfluchten Truhe besiegt */
      guardWin(field: number) {
        update((s) => ((s.game.guardWon ?? []).includes(field) ? s : { ...s, game: { ...s.game, guardWon: [...(s.game.guardWon ?? []), field] } }))
      },
      /** Verfluchte Truhe liegen gelassen oder Waechter-Kampf verloren: die Truhe versinkt */
      sinkChest(field: number) {
        update((s) => (s.game.looted.includes(field) ? s : { ...s, game: { ...s.game, looted: [...s.game.looted, field] } }))
      },
      /**
       * Item in der Werft um einen Stern verstaerken.
       * pay: 'gold' oder 'dup' (Stern 1 und 2), ab Stern 3 immer beides.
       */
      upgradeStar(uid: string, pay: 'gold' | 'dup'): string | null {
        if (!save) return 'Kein Spielstand.'
        const g = save.game
        const it = g.inventory.find((x) => x.uid === uid)
        if (!it) return 'Item nicht gefunden.'
        const n = (it.stars ?? 0) + 1
        if (n > MAX_STARS[it.rarity]) return 'Schon voll verstärkt.'
        const both = starNeedsBoth(n)
        const gold = both || pay === 'gold' ? starGold(it.rarity, n) : 0
        const dup = both || pay === 'dup' ? sellableCopy(g, it.key, it.uid) : null
        if ((both || pay === 'dup') && !dup) return 'Dafür fehlt ein Duplikat.'
        if (g.gold < gold) return `Dir fehlen ${gold - g.gold} Gold.`
        update((s) => ({
          ...s,
          game: {
            ...s.game,
            gold: s.game.gold - gold,
            inventory: s.game.inventory.filter((x) => x.uid !== dup?.uid).map((x) => (x.uid === uid ? { ...x, stars: n } : x)),
          },
        }))
        return null
      },
      /** Kauf beim Spezialhaendler: ein Item pro Woche */
      buyTrader(key: string): Item | null {
        const def = itemDef(key)
        const s = save
        if (!def || !s || s.game.gold < TRADER_PRICE || s.game.trader?.week === week) return null
        const it = makeItem(def)
        update((x) => ({
          ...x,
          game: { ...x.game, gold: x.game.gold - TRADER_PRICE, inventory: [...x.game.inventory, it], found: withFound(x.game, [it]), trader: { week, bought: key } },
        }))
        return it
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
              found: withFound(g, items),
              crew: st?.join && !g.crew.includes(st.join) ? [...g.crew, st.join] : g.crew,
            },
          }
        })
      },
      nextChapter() {
        update((s) => {
          const g = s.game
          if (!g.bossBeaten.includes(g.chapter) || g.chapter >= CHAPTERS.length) return s
          return { ...s, game: { ...g, chapter: g.chapter + 1, field: 0, looted: [], cleared: [], guardWon: [] } }
        })
      },
      testXp() {
        update((s) => ({ ...s, game: { ...s.game, xp: Math.min(xpTotal(chapterOf(s.game.chapter).cap), s.game.xp + 100) } }))
      },
      /** Serien- oder Fokus-Truhe geoeffnet */
      claimReward(key: string, gold: number, items: Item[]) {
        update((s) =>
          (s.game.claimed ?? []).includes(key)
            ? s
            : {
                ...s,
                game: {
                  ...s.game,
                  gold: s.game.gold + gold,
                  claimed: [...(s.game.claimed ?? []), key],
                  inventory: [...s.game.inventory, ...items],
                  found: withFound(s.game, items),
                },
              },
        )
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
                  found: withFound(s.game, items),
                },
              },
        )
      },
      /**
       * Item bei einem Piraten anlegen (Schiffsteile gelten fuer alle).
       * Traegt es schon ein anderer, wird ein freies Exemplar genommen oder es wechselt den Besitzer.
       */
      equip(uid: string, who: string) {
        update((s) => {
          const g = s.game
          let it = g.inventory.find((x) => x.uid === uid)
          if (!it) return s
          const w = wearer(g, it.uid)
          if (w && w !== who && it.slot !== 'schiff') {
            const worn = wornUids(g)
            it = copiesOf(g, it.key).find((c) => !worn.has(c.uid)) ?? it
          }
          const gear: Save['game']['gear'] = {}
          for (const [p, slots] of Object.entries(g.gear)) {
            gear[p] = Object.fromEntries(Object.entries(slots).filter(([, u]) => u !== it!.uid))
          }
          if (it.slot === 'schiff') return { ...s, game: { ...g, gear, ship: it.uid } }
          gear[who] = { ...gear[who], [it.slot]: it.uid }
          return { ...s, game: { ...g, gear, ship: g.ship === it.uid ? undefined : g.ship } }
        })
      },
      unequip(slot: Slot, who: string) {
        update((s) => {
          if (slot === 'schiff') return { ...s, game: { ...s.game, ship: undefined } }
          const mine = { ...s.game.gear[who] }
          delete mine[slot]
          return { ...s, game: { ...s.game, gear: { ...s.game.gear, [who]: mine } } }
        })
      },
      /** Verkauft ein doppeltes Exemplar. Das letzte Exemplar und getragene Items bleiben. */
      sellDuplicate(key: string): Item | null {
        if (!save) return null
        const it = sellableCopy(save.game, key)
        if (!it) return null
        update((s) => {
          const c = sellableCopy(s.game, key)
          if (!c) return s
          return { ...s, game: { ...s.game, gold: s.game.gold + sellPrice(c.rarity), inventory: s.game.inventory.filter((x) => x.uid !== c.uid) } }
        })
        return it
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
            found: withFound(x.game, [it]),
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
        update((s) => newSave(s.profile, true))
      },
    }),
    [update, week, today, save],
  )

  return { profile, save, sync, syncedAt, today, week, plan, suggestion, previousWeek: previousWeek(week), chooseProfile, logoutProfile, ...actions }
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
