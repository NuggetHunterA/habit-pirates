/**
 * Kampf-Engine (Auto-Kampf mit Zeitleiste). Rein rechnerisch und mit festem Zufalls-Seed,
 * damit derselbe Code im Kampf-Bildschirm und im Balancing-Simulator laeuft.
 *
 * Ablauf: Jede Figur fuellt ihre Zugleiste mit ihrem Tempo. Wer 100 erreicht, handelt.
 * Fuer jede Aktion fuellt sich die Faehigkeits-Energie. Ist sie voll, kann die Faehigkeit
 * ausgeloest werden (Auto oder per Antippen).
 */

/** Gleiche Schluessel wie die Ausruestungs-Werte (Stats in types.ts) */
export interface FighterStats {
  leben: number
  angriff: number
  ruestung: number
  tempo: number
  krit: number
  ausweichen: number
}

export type Side = 'crew' | 'feind'
export type Row = 'vorne' | 'hinten'
export type AbilityId = 'sturmklinge' | 'kapitaensruf' | 'donnerbuechse' | 'kettenkugel'
export type Look = 'jonte' | 'kanonier' | 'krabbenbandit' | 'krabbenmatrose'

export interface Ability {
  id: AbilityId
  name: string
  text: string
}

export const ABILITIES: Record<AbilityId, Ability> = {
  sturmklinge: {
    id: 'sturmklinge',
    name: 'Sturmklinge',
    text: 'Fliegender Windhieb: 220 % Schaden an einem Ziel. Wirft es zurück und unterbricht Großangriffe.',
  },
  kapitaensruf: {
    id: 'kapitaensruf',
    name: 'Kapitänsruf',
    text: 'Die Crew bekommt +30 % Angriff für 3 Züge und heilt 8 % Leben.',
  },
  donnerbuechse: {
    id: 'donnerbuechse',
    name: 'Donnerbüchse',
    text: 'Feuerball: 120 % Schaden an allen Gegnern und Brand für 3 Züge.',
  },
  kettenkugel: {
    id: 'kettenkugel',
    name: 'Kettenkugel',
    text: '260 % Schaden an einem Ziel, halbiert seine Rüstung bis Kampfende.',
  },
}

export type Trait = 'ankerschild' | 'scherenwirbel' | 'flink'

export const TRAIT_TEXT: Record<Trait, string> = {
  ankerschild: 'Ankerschild: nimmt 35 % weniger Schaden von Einzelangriffen. Flächenschaden trifft voll.',
  scherenwirbel: 'Scherenwirbel: holt alle paar Züge zu einem Großangriff gegen die ganze Crew aus.',
  flink: 'Flink: handelt oft, hält aber wenig aus.',
}

export interface FighterDef {
  id: string
  name: string
  look: Look
  side: Side
  row: Row
  /** Fernkampf trifft jede Reihe ohne Abzug */
  ranged?: boolean
  stats: FighterStats
  ability?: AbilityId
  traits?: Trait[]
}

export interface Fighter extends FighterDef {
  hp: number
  gauge: number
  energy: number
  /** laufende Zustaende in Zuegen */
  brand: number
  ruf: number
  ruestungHalb: boolean
  /** Grossangriff angekuendigt */
  holtAus: boolean
  actions: number
}

export type FightEvent =
  | { t: 'zug'; who: string }
  | { t: 'angriff'; who: string; target: string; ranged: boolean }
  | { t: 'treffer'; who: string; target: string; dmg: number; krit: boolean; geblockt?: boolean }
  | { t: 'verfehlt'; who: string; target: string }
  | { t: 'faehigkeit'; who: string; ability: AbilityId; targets: string[] }
  | { t: 'heilung'; target: string; amount: number }
  | { t: 'brand'; target: string; dmg: number }
  | { t: 'zurueck'; target: string }
  | { t: 'holtAus'; who: string }
  | { t: 'unterbrochen'; who: string }
  | { t: 'wirbel'; who: string; targets: string[] }
  | { t: 'besiegt'; who: string }
  | { t: 'ende'; sieg: boolean }

export interface Battle {
  fighters: Fighter[]
  seed: number
  over: boolean
  sieg: boolean
  round: number
}

const ENERGY_PER_ACTION = 25
const ENERGY_PER_HIT = 12
const KRIT_MULT = 1.6
const MAX_ACTIONS = 400

// Mulberry32: kleiner, schneller Zufall mit Seed
function rnd(b: Battle): number {
  let t = (b.seed = (b.seed + 0x6d2b79f5) | 0)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function createBattle(defs: FighterDef[], seed = (Math.random() * 2 ** 31) | 0): Battle {
  return {
    seed,
    over: false,
    sieg: false,
    round: 0,
    fighters: defs.map((d, i) => ({
      ...d,
      hp: d.stats.leben,
      // leicht versetzter Start, damit nicht alle gleichzeitig handeln
      gauge: (i * 7) % 20,
      energy: 0,
      brand: 0,
      ruf: 0,
      ruestungHalb: false,
      holtAus: false,
      actions: 0,
    })),
  }
}

export const alive = (b: Battle, side?: Side) => b.fighters.filter((f) => f.hp > 0 && (!side || f.side === side))
export const byId = (b: Battle, id: string) => b.fighters.find((f) => f.id === id)!
export const abilityReady = (f: Fighter) => !!f.ability && f.hp > 0 && f.energy >= 100

/** Wer ist als Naechstes dran? Fuellt die Zugleisten bis einer 100 erreicht. */
function nextActor(b: Battle): Fighter {
  const living = alive(b)
  for (;;) {
    const ready = living.filter((f) => f.gauge >= 100).sort((a, c) => c.gauge - a.gauge)
    if (ready.length) return ready[0]
    const step = Math.min(...living.map((f) => (100 - f.gauge) / Math.max(1, f.stats.tempo)))
    for (const f of living) f.gauge += f.stats.tempo * step + 1e-9
  }
}

function pickTarget(b: Battle, me: Fighter): Fighter {
  const foes = alive(b, me.side === 'crew' ? 'feind' : 'crew')
  const front = foes.filter((f) => f.row === 'vorne')
  if (me.side === 'crew') {
    if (me.ranged) return [...foes].sort((a, c) => a.hp - c.hp)[0]
    return (front.length ? front : foes).sort((a, c) => a.hp - c.hp)[0]
  }
  // Gegner: vorne wird oefter getroffen
  if (front.length && (front.length === foes.length || rnd(b) < 0.72)) return front[Math.floor(rnd(b) * front.length)]
  const back = foes.filter((f) => f.row === 'hinten')
  return back[Math.floor(rnd(b) * back.length)] ?? foes[0]
}

function attackPower(me: Fighter): number {
  let a = me.stats.angriff
  if (me.ruf > 0) a *= 1.3
  // Nahkaempfer aus der hinteren Reihe treffen schwaecher
  if (!me.ranged && me.row === 'hinten') a *= 0.7
  return a
}

function armor(t: Fighter) {
  return t.ruestungHalb ? t.stats.ruestung / 2 : t.stats.ruestung
}

/** Schaden mit Ruestung, Krit und Ausweichen */
function strike(b: Battle, me: Fighter, t: Fighter, mult: number, ev: FightEvent[], opts: { area?: boolean; noDodge?: boolean } = {}) {
  if (!opts.noDodge && rnd(b) * 100 < t.stats.ausweichen) {
    ev.push({ t: 'verfehlt', who: me.id, target: t.id })
    return
  }
  const krit = rnd(b) * 100 < me.stats.krit
  let dmg = attackPower(me) * mult * (20 / (20 + armor(t))) * (0.9 + rnd(b) * 0.2)
  if (krit) dmg *= KRIT_MULT
  const geblockt = !opts.area && !!t.traits?.includes('ankerschild')
  if (geblockt) dmg *= 0.65
  const d = Math.max(1, Math.round(dmg))
  t.hp = Math.max(0, t.hp - d)
  if (t.ability) t.energy = Math.min(100, t.energy + ENERGY_PER_HIT)
  ev.push({ t: 'treffer', who: me.id, target: t.id, dmg: d, krit, geblockt })
  if (t.hp === 0) ev.push({ t: 'besiegt', who: t.id })
}

function castAbility(b: Battle, me: Fighter, ev: FightEvent[]) {
  me.energy = 0
  const foes = alive(b, me.side === 'crew' ? 'feind' : 'crew')
  switch (me.ability) {
    case 'sturmklinge': {
      // trifft bevorzugt einen Gegner, der gerade ausholt
      const t = foes.find((f) => f.holtAus) ?? pickTarget(b, me)
      ev.push({ t: 'faehigkeit', who: me.id, ability: 'sturmklinge', targets: [t.id] })
      strike(b, me, t, 2.2, ev, { noDodge: true })
      if (t.hp > 0) {
        t.gauge = Math.max(0, t.gauge - 60)
        ev.push({ t: 'zurueck', target: t.id })
        if (t.holtAus) {
          t.holtAus = false
          ev.push({ t: 'unterbrochen', who: t.id })
        }
      }
      break
    }
    case 'kapitaensruf': {
      const crew = alive(b, me.side)
      ev.push({ t: 'faehigkeit', who: me.id, ability: 'kapitaensruf', targets: crew.map((f) => f.id) })
      for (const f of crew) {
        f.ruf = 3
        const heal = Math.round(f.stats.leben * 0.08)
        f.hp = Math.min(f.stats.leben, f.hp + heal)
        ev.push({ t: 'heilung', target: f.id, amount: heal })
      }
      break
    }
    case 'donnerbuechse': {
      ev.push({ t: 'faehigkeit', who: me.id, ability: 'donnerbuechse', targets: foes.map((f) => f.id) })
      for (const t of foes) {
        strike(b, me, t, 1.2, ev, { area: true, noDodge: true })
        if (t.hp > 0) t.brand = 3
      }
      break
    }
    case 'kettenkugel': {
      const t = [...foes].sort((a, c) => c.hp - a.hp)[0]
      ev.push({ t: 'faehigkeit', who: me.id, ability: 'kettenkugel', targets: [t.id] })
      strike(b, me, t, 2.6, ev, { noDodge: true })
      t.ruestungHalb = true
      break
    }
  }
}

function checkEnd(b: Battle, ev: FightEvent[]) {
  if (b.over) return
  const crew = alive(b, 'crew').length
  const feind = alive(b, 'feind').length
  if (!crew || !feind) {
    b.over = true
    b.sieg = !feind && !!crew
    ev.push({ t: 'ende', sieg: b.sieg })
  }
}

/**
 * Eine Aktion ausfuehren.
 * @param wants  Crew-Mitglieder, deren Faehigkeit ausgeloest werden soll (Antippen oder Auto)
 */
export function step(b: Battle, wants: Set<string>): FightEvent[] {
  const ev: FightEvent[] = []
  if (b.over) return ev
  b.round++

  // Angetippte Faehigkeit loest sofort aus, ohne auf den Zug zu warten
  const caster = alive(b, 'crew').find((f) => wants.has(f.id) && abilityReady(f))
  if (caster) {
    wants.delete(caster.id)
    castAbility(b, caster, ev)
    checkEnd(b, ev)
    return ev
  }

  const me = nextActor(b)
  me.gauge -= 100
  me.actions++
  ev.push({ t: 'zug', who: me.id })

  // Brand tickt zu Beginn des eigenen Zugs
  if (me.brand > 0) {
    me.brand--
    const d = Math.max(1, Math.round(me.stats.leben * 0.05))
    me.hp = Math.max(0, me.hp - d)
    ev.push({ t: 'brand', target: me.id, dmg: d })
    if (me.hp === 0) {
      ev.push({ t: 'besiegt', who: me.id })
      checkEnd(b, ev)
      return ev
    }
  }
  if (me.ruf > 0) me.ruf--

  if (me.side === 'feind' && me.traits?.includes('scherenwirbel')) {
    if (me.holtAus) {
      me.holtAus = false
      const crew = alive(b, 'crew')
      ev.push({ t: 'wirbel', who: me.id, targets: crew.map((f) => f.id) })
      for (const t of crew) strike(b, me, t, 2.2, ev, { area: true, noDodge: true })
      checkEnd(b, ev)
      return ev
    }
    if (me.actions % 4 === 3) {
      me.holtAus = true
      ev.push({ t: 'holtAus', who: me.id })
      return ev
    }
  }

  const t = pickTarget(b, me)
  ev.push({ t: 'angriff', who: me.id, target: t.id, ranged: !!me.ranged })
  strike(b, me, t, 1, ev)
  if (me.ability) me.energy = Math.min(100, me.energy + ENERGY_PER_ACTION)
  if (b.round > MAX_ACTIONS) {
    // Notbremse: Unentschieden zaehlt als Niederlage
    b.over = true
    ev.push({ t: 'ende', sieg: false })
    return ev
  }
  checkEnd(b, ev)
  return ev
}

/** Ganzen Kampf ohne Animation durchrechnen (Simulator). auto = Faehigkeiten sofort nutzen */
export function simulate(defs: FighterDef[], seed: number, smart = false): { sieg: boolean; aktionen: number; crewHp: number } {
  const b = createBattle(defs, seed)
  const wants = new Set<string>()
  while (!b.over) {
    for (const f of alive(b, 'crew')) {
      if (!abilityReady(f)) continue
      // "smart": Sturmklinge fuer den Grossangriff aufheben
      if (smart && f.ability === 'sturmklinge' && !alive(b, 'feind').some((x) => x.holtAus) && alive(b, 'feind').some((x) => x.traits?.includes('scherenwirbel'))) continue
      wants.add(f.id)
    }
    step(b, wants)
  }
  const crew = b.fighters.filter((f) => f.side === 'crew')
  return { sieg: b.sieg, aktionen: b.round, crewHp: crew.reduce((s, f) => s + f.hp, 0) / crew.reduce((s, f) => s + f.stats.leben, 0) }
}

/** Die naechsten n Zuege vorhersagen (fuer die Zugleiste), ohne den Kampf zu veraendern */
export function turnOrder(b: Battle, n: number): string[] {
  const living = alive(b).map((f) => ({ id: f.id, g: f.gauge, t: Math.max(1, f.stats.tempo) }))
  const out: string[] = []
  while (out.length < n && living.length) {
    const ready = living.filter((f) => f.g >= 100).sort((a, c) => c.g - a.g)
    if (ready.length) {
      ready[0].g -= 100
      out.push(ready[0].id)
      continue
    }
    const step = Math.min(...living.map((f) => (100 - f.g) / f.t))
    for (const f of living) f.g += f.t * step + 1e-9
  }
  return out
}
