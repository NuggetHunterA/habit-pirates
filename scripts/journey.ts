// Reise-Simulator: npm run journey
// Spielt die ganze Reise Tag fuer Tag durch, wie ein Spieler mit 5 bis 6 Habits:
// Wind aus der Wind-Formel, Felder der echten Routen, Beute aus den echten Truhen- und Kampftabellen,
// Laden, Spezialhaendler, Werft, Serien- und Fokus-Truhen. Jeder Pirat traegt das beste gefundene Item.
// Kaempfe laufen im echten Kampfsystem mit Item-Effekten, Schulen und Sets.
//
// Umgebung: RUNS=40 (Durchlaeufe), FULL=0.8 (Anteil voller Tage), ABIL=best|first, SMART=1 (Faehigkeit selbst antippen)
// SHOP=0: Spieler kauft nichts (kein Laden, kein Haendler, keine Werft), wie ein neuer Spieler am Anfang
import { simulate, type AbilityId } from '../src/game/combat.ts'
import { CREW, ENCOUNTERS, FARM, FARM_TIERS, crewDefs, defaultSetup, farmEncounter, guardianEncounter, seaMonster, strengthen, type CrewId, type CrewSetup, type Encounter, type FarmTier } from '../src/game/foes.ts'
import { CHAPTERS } from '../src/game/map.ts'
import { CHESTS, rollChest, rollItem, pickDef, CURSE_CHANCE, type ChestKind } from '../src/game/loot.ts'
import { CATALOG, MAX_STARS, PRICE, TRADER_PRICE, itemBonus, makeItem, starGold, starNeedsBoth, shopOffer, traderOffer } from '../src/game/items.ts'
import { crewStats, levelFor, xpTotal } from '../src/game/progress.ts'
import { gearBonus, power, PIRATE_SLOTS, addStats } from '../src/game/equipment.ts'
import { crewExtras } from '../src/game/schools.ts'
import { STORIES } from '../src/game/story.ts'
import { RULES } from '../src/game/rules.ts'
import type { Item, Rarity, Save, Stats } from '../src/game/types.ts'

const RUNS = Number(process.env.RUNS ?? 40)
const FULL = Number(process.env.FULL ?? 0.8)
const ABIL = process.env.ABIL ?? 'best'
const SMART = !!process.env.SMART
const SHOP = process.env.SHOP !== '0'
const R_ORDER: Rarity[] = ['gewoehnlich', 'selten', 'episch', 'legendaer']
// Zum Tunen: SCALE="moewen=0.9,schalbart=1.2" macht einzelne Kaempfe staerker oder schwaecher (Leben und Angriff)
const SCALE: Record<string, number> = Object.fromEntries((process.env.SCALE ?? '').split(',').filter(Boolean).map((x) => { const [k, v] = x.split('='); return [k, Number(v)] }))
// XP=1.5 skaliert alle Erfahrungs-Belohnungen
const XPK = Number(process.env.XP ?? 1)
for (const [id, k] of Object.entries(SCALE)) if (ENCOUNTERS[id]) Object.assign(ENCOUNTERS[id], strengthen(ENCOUNTERS[id], k))
if (XPK !== 1) for (const e of Object.values(ENCOUNTERS)) e.reward = { ...e.reward, xp: Math.round(e.reward.xp * XPK) }

// ---------- Spielstand ----------
function newSave(): Save {
  return {
    version: 1,
    profile: 'sim' + Math.random(),
    createdAt: '',
    habits: [],
    weeks: {},
    logs: {},
    game: {
      gold: 0, windGift: 0, windSpent: 0, field: 0, looted: [], inventory: [], gear: {}, found: [], shop: { day: '', bought: [] },
      chapter: 1, crew: ['jonte', 'kanonier'], xp: 0, cleared: [], seen: [], bossTries: { day: '', n: 0 }, bossBeaten: [],
    },
  }
}

const fightersOf = (s: Save): CrewId[] => (s.game.crew as CrewId[]).slice(0, 4)
const level = (s: Save) => levelFor(s.game.xp, CHAPTERS[s.game.chapter - 1].cap)

function addItems(s: Save, items: Item[]) {
  for (const it of items) {
    s.game.inventory.push(it)
    if (!s.game.found.includes(it.key)) s.game.found.push(it.key)
  }
  equipBest(s)
}

const itemPower = (it: Item) => power(addStats({ leben: 0, angriff: 0, ruestung: 0, tempo: 0, krit: 0, ausweichen: 0, kritSchaden: 160 }, itemBonus(it))) + (R_ORDER.indexOf(it.rarity) >= 2 ? 6 : 0)

/** Bestes Item je Platz, in Beitrittsreihenfolge verteilt (Kapitaen zuerst) */
function equipBest(s: Save) {
  const g = s.game
  const fighters = fightersOf(s)
  const used = new Set<string>()
  const gear: Save['game']['gear'] = {}
  for (const slot of PIRATE_SLOTS) {
    const pool = g.inventory.filter((i) => i.slot === slot).sort((a, b) => itemPower(b) - itemPower(a))
    // Doppelte desselben Items duerfen zwei Piraten tragen
    let k = 0
    for (const who of fighters) {
      while (k < pool.length && used.has(pool[k].uid)) k++
      if (k >= pool.length) break
      gear[who] = { ...(gear[who] ?? {}), [slot]: pool[k].uid }
      used.add(pool[k].uid)
      k++
    }
  }
  g.gear = gear
  const ship = g.inventory.filter((i) => i.slot === 'schiff').sort((a, b) => itemPower(b) - itemPower(a))[0]
  g.ship = ship?.uid
}

// ---------- Kampf ----------
const setups = (crew: CrewId[]): CrewSetup[] => {
  const base = defaultSetup(crew)
  const out: CrewSetup[] = []
  for (let mask = 0; mask < 1 << base.length; mask++) out.push(base.map((p, i) => ({ ...p, ability: CREW[p.id].abilities[(mask >> i) & 1] as AbilityId })))
  return out
}

function defsFor(s: Save, setup: CrewSetup, enc: Encounter) {
  const lv = level(s)
  const g = gearBonus(s)
  const bonus = crewStats(lv, g.crew, g.ship)
  const ex = crewExtras(s, setup.map((p) => p.id as CrewId))
  return [...crewDefs(setup, lv, bonus, false, ex), ...enc.foes]
}

let seed = 1
function winRate(s: Save, setup: CrewSetup, enc: Encounter, n: number): number {
  let w = 0
  const defs = defsFor(s, setup, enc)
  for (let i = 0; i < n; i++) if (simulate(defs, seed++ * 7919, SMART).sieg) w++
  return w / n
}

/** Aufstellung, die der Spieler fuer diesen Kampf waehlt (beste Faehigkeiten, einmal pro Kampf und Stufe ausprobiert) */
const pickCache = new Map<string, CrewSetup>()
function chooseSetup(s: Save, enc: Encounter): CrewSetup {
  const crew = fightersOf(s)
  if (ABIL !== 'best') return defaultSetup(crew)
  const key = `${enc.id}|${enc.name}|${crew.join()}|${level(s)}`
  const hit = pickCache.get(key)
  if (hit) return hit
  let best = defaultSetup(crew)
  let bw = -1
  for (const su of setups(crew)) {
    const w = winRate(s, su, enc, 16)
    if (w > bw) [bw, best] = [w, su]
  }
  pickCache.set(key, best)
  return best
}

/** Ein Kampf, Ergebnis wie im Spiel */
function fight(s: Save, enc: Encounter, log?: Log): boolean {
  const setup = chooseSetup(s, enc)
  const defs = defsFor(s, setup, enc)
  const win = simulate(defs, Math.floor(Math.random() * 1e9), SMART).sieg
  if (log) log.fights++
  if (!win) return false
  const cap = CHAPTERS[s.game.chapter - 1].cap
  s.game.xp = Math.min(xpTotal(cap), s.game.xp + enc.reward.xp)
  const [g0, g1] = enc.reward.gold
  const ex = crewExtras(s, setup.map((p) => p.id as CrewId))
  const mods = Object.values(ex).map((e) => e?.mods ?? {})
  const goldBonus = Math.max(0, ...mods.map((m) => m.goldBonus ?? 0))
  const extraItem = Math.max(0, ...mods.map((m) => m.extraItem ?? 0))
  s.game.gold += Math.round((g0 + Math.floor(Math.random() * (g1 - g0 + 1))) * (1 + goldBonus))
  const items: Item[] = []
  if (Math.random() < enc.reward.itemChance) items.push(rollItem(enc.reward.min ?? (enc.boss ? 'selten' : 'gewoehnlich'), s.game.chapter))
  if (extraItem && Math.random() < extraItem) items.push(rollItem('gewoehnlich', s.game.chapter))
  addItems(s, items)
  return true
}

const wornItems = (s: Save) => { const w = new Set([...Object.values(s.game.gear).flatMap((g) => Object.values(g)), s.game.ship]); return s.game.inventory.filter((i) => w.has(i.uid)) }

// ---------- Hafen, Haendler, Werft ----------
function gainOf(s: Save, def: { key: string; slot: string; rarity: Rarity }): number {
  const it = { uid: 'x', key: def.key, slot: def.slot, rarity: def.rarity } as Item
  const p = itemPower(it)
  const worn = new Set([...Object.values(s.game.gear).flatMap((g) => Object.values(g)), s.game.ship])
  const sameSlot = s.game.inventory.filter((i) => i.slot === def.slot && worn.has(i.uid)).map(itemPower)
  const need = def.slot === 'schiff' ? 1 : fightersOf(s).length
  if (sameSlot.length < need) return p
  return p - Math.min(...sameSlot)
}

function shopDay(s: Save, day: number) {
  for (const d of shopOffer(s.profile, `t${day}`, s.game.chapter)) {
    const price = PRICE[d.rarity]
    if (s.game.gold >= price && gainOf(s, d) > 3) {
      s.game.gold -= price
      addItems(s, [makeItem(d)])
    }
  }
  if (day % 7 === 3 && s.game.gold >= TRADER_PRICE) {
    const offer = traderOffer(s.profile, `w${day}`, s.game.chapter, s.game.found)
    const best = offer.sort((a, b) => gainOf(s, b) - gainOf(s, a))[0]
    if (best) {
      s.game.gold -= TRADER_PRICE
      addItems(s, [makeItem(best)])
    }
  }
  // Werft: guenstigster Stern auf getragenen Items, Reserve fuer den Haendler
  const reserve = 150
  for (let guard = 0; guard < 20; guard++) {
    const worn = new Set([...Object.values(s.game.gear).flatMap((g) => Object.values(g)), s.game.ship])
    const cands = s.game.inventory
      .filter((i) => worn.has(i.uid) && (i.stars ?? 0) < MAX_STARS[i.rarity])
      .map((i) => ({ i, n: (i.stars ?? 0) + 1, dup: s.game.inventory.find((x) => x.key === i.key && x.uid !== i.uid && !worn.has(x.uid)) }))
      .map((c) => ({ ...c, cost: starNeedsBoth(c.n) ? (c.dup ? starGold(c.i.rarity, c.n) : Infinity) : c.dup ? 0 : starGold(c.i.rarity, c.n) }))
      .filter((c) => c.cost === 0 || s.game.gold - c.cost >= reserve)
      .sort((a, b) => a.cost / (itemPower(a.i) + 1) - b.cost / (itemPower(b.i) + 1))
    const c = cands[0]
    if (!c) break
    s.game.gold -= c.cost
    if (c.dup && (starNeedsBoth(c.n) || c.cost === 0)) s.game.inventory = s.game.inventory.filter((x) => x.uid !== c.dup!.uid)
    c.i.stars = c.n
  }
}

// ---------- Tageswind ----------
function windToday(): number {
  const habits = Math.random() < 0.5 ? 5 : 6
  const full = Math.random() < FULL
  const share = full ? 1 : 0.5 + Math.random() * 0.3
  return Math.round((8 * Math.min(habits, 6) * share) / 6) + (full ? 2 : 0)
}

function rewardChest(s: Save, kind: Exclude<ChestKind, 'verflucht'>, sure?: Rarity) {
  const l = rollChest(kind, s.game.chapter, 0, sure)
  s.game.gold += l.gold
  addItems(s, l.items)
}

// ---------- Reise ----------
interface ChapterLog {
  days: number
  sailDays: number
  arriveLevel: number
  winLevel: number
  bossTries: number
  bossFirst: number
  routeFirst: [number, number, number][]
  bossDef: number
  bossEnd: number
  farm: Record<FarmTier, number>
  found: number
  gold: number
  epic: number
  legend: number
  stars: number
  starsBy: Record<string, [number, number]>
}
interface Log {
  fights: number
}

function journey(maxDays = 140) {
  const s = newSave()
  const out: ChapterLog[] = []
  let wind = RULES.startWind
  let streak = 0
  let cur: ChapterLog = blank(1, s)
  let chapterStart = 0
  let arrived = -1
  const log: Log = { fights: 0 }
  for (let day = 0; day < maxDays && s.game.chapter <= CHAPTERS.length; day++) {
    wind += windToday()
    streak++
    if ([7, 14].includes(streak)) rewardChest(s, streak === 7 ? 'silber' : 'gold')
    else if (streak === 60) rewardChest(s, 'gold', 'legendaer')
    else if (streak >= 30 && streak % 30 === 0) rewardChest(s, 'gold', 'episch')
    if (day % 7 === 6) rewardChest(s, Math.random() < 0.5 ? 'gold' : 'silber')
    if (SHOP) shopDay(s, day)
    let triesToday = 0
    const ch = CHAPTERS[s.game.chapter - 1]
    let stuck = 0
    while (true) {
      const f = ch.fields[s.game.field]
      // Kampf auf dem Feld, noch nicht gewonnen
      if (f.enc && f.kind !== 'boss' && !s.game.cleared.includes(s.game.field)) {
        const enc = ENCOUNTERS[f.enc]
        if (!cur.routeFirst[s.game.field]) snap(enc.id, s)
        if (!cur.routeFirst[s.game.field]) cur.routeFirst[s.game.field] = [winRate(s, defaultSetup(fightersOf(s)), enc, 60), winRate(s, chooseSetup(s, enc), enc, 60), level(s)]
        if (fight(s, enc, log)) {
          s.game.cleared.push(s.game.field)
          // Bewachte Truhe: nach dem Sieg geht die Truhe auf
          if (f.kind === 'truhe') openChest(s, f.chest ?? 'holz')
        } else if (++stuck >= 6) break
        continue
      }
      if (f.kind === 'boss') {
        if (arrived < 0) {
          arrived = day
          cur.sailDays = day - chapterStart + 1
          cur.arriveLevel = level(s)
          snap(f.enc!, s)
          cur.bossFirst = winRate(s, chooseSetup(s, ENCOUNTERS[f.enc!]), ENCOUNTERS[f.enc!], 80)
          cur.bossDef = winRate(s, defaultSetup(fightersOf(s)), ENCOUNTERS[f.enc!], 80)
        }
        const boss = ENCOUNTERS[f.enc!]
        let beaten = false
        while (triesToday < 3) {
          triesToday++
          cur.bossTries++
          if (fight(s, boss, log)) {
            beaten = true
            break
          }
        }
        if (beaten) {
          cur.winLevel = level(s)
          cur.bossEnd = winRate(s, chooseSetup(s, boss), boss, 80)
          cur.days = day - chapterStart + 1
          cur.found = s.game.found.length
          cur.gold = s.game.gold
          cur.stars = wornItems(s).reduce((a, i) => a + (i.stars ?? 0), 0)
          for (const r of R_ORDER) { const w = wornItems(s).filter((i) => i.rarity === r); cur.starsBy[r] = [w.length, w.reduce((a, i) => a + (i.stars ?? 0), 0)] }
          cur.epic = s.game.found.filter((k) => CATALOG.find((d) => d.key === k)!.rarity === 'episch').length
          cur.legend = s.game.found.filter((k) => CATALOG.find((d) => d.key === k)!.rarity === 'legendaer').length
          out.push(cur)
          // Abschluss-Szene, ggf. neues Crewmitglied
          const outro = STORIES[ch.outro]
          if (outro?.join && !s.game.crew.includes(outro.join)) s.game.crew.push(outro.join)
          s.game.chapter++
          s.game.field = 0
          s.game.cleared = []
          chapterStart = day + 1
          arrived = -1
          if (s.game.chapter > CHAPTERS.length) break
          cur = blank(s.game.chapter, s)
          equipBest(s)
          break
        }
        // Beutezug: schwerste Stufe, die meist gewonnen wird
        if (wind < RULES.windPerField) break
        wind -= RULES.windPerField
        const list = FARM[ch.n]
        const base = list[Math.floor(Math.random() * list.length)]
        let tier: FarmTier = 'leicht'
        for (const t of ['schwer', 'mittel'] as FarmTier[]) {
          const e = farmEncounter(base.id, t)
          if (winRate(s, chooseSetup(s, e), e, 12) >= 0.7) {
            tier = t
            break
          }
        }
        cur.farm[tier]++
        fight(s, farmEncounter(base.id, tier), log)
        if (Math.random() < 0.25) eventLoot(s)
        continue
      }
      if (wind < RULES.windPerField) break
      wind -= RULES.windPerField
      s.game.field++
      resolveField(s)
    }
  }
  return out
}

function blank(n: number, s: Save): ChapterLog {
  void n
  void s
  return { days: 0, sailDays: 0, arriveLevel: 0, winLevel: 0, bossTries: 0, bossFirst: 0, bossDef: 0, bossEnd: 0, routeFirst: [], farm: { leicht: 0, mittel: 0, schwer: 0 }, found: 0, gold: 0, epic: 0, legend: 0, stars: 0, starsBy: {} }
}

function eventLoot(s: Save) {
  const r = Math.random()
  if (r < 0.45) addItems(s, [rollItem('selten', s.game.chapter)])
  else if (r < 0.8) s.game.gold += Math.round((30 + Math.random() * 40) * (1 + 0.6 * (s.game.chapter - 1)))
}

function openChest(s: Save, kind: ChestKind) {
  const l = rollChest(kind, s.game.chapter)
  s.game.gold += l.gold
  addItems(s, l.items)
}

function resolveField(s: Save) {
  const ch = CHAPTERS[s.game.chapter - 1]
  const f = ch.fields[s.game.field]
  const story = f.story ? STORIES[f.story] : undefined
  if (story?.join && !s.game.crew.includes(story.join)) {
    s.game.crew.push(story.join)
    equipBest(s)
  }
  if (story?.reward?.gold) s.game.gold += story.reward.gold
  if (story?.reward?.item) addItems(s, [rollItem('gewoehnlich', s.game.chapter)])
  if (story?.choice) addItems(s, [rollItem('gewoehnlich', s.game.chapter)])
  if (f.kind === 'truhe' && !f.enc) {
    let kind: ChestKind = f.chest ?? 'holz'
    if (Math.random() < CURSE_CHANCE) {
      const g = guardianEncounter(s.game.chapter)
      if (fight(s, g)) kind = 'verflucht'
    }
    openChest(s, kind)
  }
  if (f.kind === 'sturm' || f.kind === 'wrack') {
    if (f.kind === 'sturm' && Math.random() < 0.15) fight(s, seaMonster(s.game.chapter))
    else eventLoot(s)
  }
}

// ---------- Tuner ----------
// TUNE=1: merkt sich den Spielstand beim ersten Treffen jedes Kampfes und sucht die Staerke,
// bei der die Standard-Aufstellung das Ziel trifft (normale Kaempfe 75 %, Bosse 30 %). TUNE_Q siehe unten.
const SNAPS = new Map<string, Save[]>()
function snap(id: string, s: Save) {
  if (!process.env.TUNE) return
  const list = SNAPS.get(id) ?? []
  if (list.length < 16) list.push(structuredClone(s))
  SNAPS.set(id, list)
}
function tune() {
  const out: string[] = []
  for (const [id, saves] of SNAPS) {
    const base = ENCOUNTERS[id]
    const target = base.boss ? Number(process.env.BOSS_TARGET ?? 0.3) : Number(process.env.TARGET ?? 0.75)
    // TUNE_Q=0.25: statt des Durchschnitts zaehlt der Spielstand im unteren Viertel (wenig Gluck mit Beute)
    const q = process.env.TUNE_Q ? Number(process.env.TUNE_Q) : null
    const rate = (k: number) => {
      const r = saves.map((s) => winRate(s, defaultSetup(fightersOf(s)), strengthen(base, k), 40))
      return q == null ? avg(r) : r.sort((a, b) => a - b)[Math.floor(q * (r.length - 1))]
    }
    let lo = 0.3
    let hi = 4
    for (let i = 0; i < 10; i++) {
      const mid = Math.sqrt(lo * hi)
      if (rate(mid) > target) lo = mid
      else hi = mid
    }
    const k = Math.sqrt(lo * hi) * (SCALE[id] ?? 1)
    out.push(`${id}=${k.toFixed(2)}`)
  }
  console.log('Vorschlag: SCALE="' + out.join(',') + '"')
}

// ---------- Auswertung ----------
const runs = Array.from({ length: RUNS }, () => journey())
const pct = (x: number) => `${Math.round(x * 100)} %`
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)
const fmt = (x: number, d = 1) => x.toFixed(d).replace('.', ',')
console.log(`Reise-Simulator: ${RUNS} Durchläufe, ${pct(FULL)} volle Tage, Fähigkeiten ${ABIL}${SMART ? ', selbst angetippt' : ', Automatik'}${SHOP ? '' : ', ohne Einkaufen'}`)
let total = 0
for (let c = 0; c < CHAPTERS.length; c++) {
  const L = runs.map((r) => r[c]).filter(Boolean)
  if (!L.length) {
    console.log(`Kapitel ${c + 1}: nicht erreicht oder Boss nicht besiegt`)
    continue
  }
  const d = avg(L.map((l) => l.days))
  total += d
  const routeIdx = Array.from(new Set(L.flatMap((l) => l.routeFirst.map((v, i) => (v ? i : -1)).filter((i) => i >= 0)))).sort((a, b) => a - b)
  console.log(
    `Kapitel ${c + 1} (${CHAPTERS[c].fields.length} Felder): ${fmt(d)} Tage (Segeln ${fmt(avg(L.map((l) => l.sailDays)))}), Sterne ${fmt(avg(L.map((l) => l.stars)))}, ` +
      `Stufe am Boss ${fmt(avg(L.map((l) => l.arriveLevel)))} -> Sieg auf ${fmt(avg(L.map((l) => l.winLevel)))} (max ${CHAPTERS[c].cap}), ` +
      `Boss beim Ankommen ${pct(avg(L.map((l) => l.bossDef)))} / angepasst ${pct(avg(L.map((l) => l.bossFirst)))}, beim Sieg ${pct(avg(L.map((l) => l.bossEnd)))}, Versuche ${fmt(avg(L.map((l) => l.bossTries)))}, ` +
      `Beutezüge l/m/s ${fmt(avg(L.map((l) => l.farm.leicht)), 0)}/${fmt(avg(L.map((l) => l.farm.mittel)), 0)}/${fmt(avg(L.map((l) => l.farm.schwer)), 0)}`,
  )
  console.log(
    `   Route-Kämpfe (Standard / angepasst, Stufe): ${routeIdx.map((i) => { const r = L.map((l) => l.routeFirst[i]).filter(Boolean); return `${ENCOUNTERS[CHAPTERS[c].fields[i].enc!].name} ${pct(avg(r.map((x) => x[0])))} / ${pct(avg(r.map((x) => x[1])))}, St ${fmt(avg(r.map((x) => x[2])))}` }).join(' · ')}`,
  )
  console.log(`   Getragen (Anzahl, Sterne im Schnitt): ${R_ORDER.map((r) => `${r} ${fmt(avg(L.map((l) => l.starsBy[r]?.[0] ?? 0)))} Teile, ${fmt(avg(L.map((l) => (l.starsBy[r]?.[1] ?? 0) / Math.max(1, l.starsBy[r]?.[0] ?? 0))))} Sterne`).join(' · ')}`)
  console.log(`   Gefunden ${fmt(avg(L.map((l) => l.found)), 0)} Items (episch ${fmt(avg(L.map((l) => l.epic)), 0)}, legendär ${fmt(avg(L.map((l) => l.legend)), 0)}), Gold übrig ${fmt(avg(L.map((l) => l.gold)), 0)}`)
}
console.log(`Gesamt: ${fmt(total)} Tage (${fmt(total / 7)} Wochen)`)
if (process.env.TUNE) tune()
void CHESTS
void pickDef
