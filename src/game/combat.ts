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
  /** Krit-Schaden in Prozent (ohne Angabe: 160) */
  kritSchaden?: number
}

/** Grundwert Krit-Schaden in Prozent */
export const KRIT_SCHADEN = 160

/**
 * Besondere Wirkungen aus Item-Effekten, Schulen und Sets.
 * Zahlen sind Anteile (0.1 = 10 %), Krit-Boni in Prozentpunkten.
 */
export interface Mods {
  /** Kritische Treffer verursachen Blutung */
  critBleed?: boolean
  /** Wie oft Blutung stapelt (Standard 3) */
  bleedMax?: number
  /** Mehr Krit-Chance gegen brennende oder blutende Ziele */
  critVsBrand?: number
  critVsBlutung?: number
  /** Jeder n-te eigene Angriff trifft zweimal */
  doubleEvery?: number
  /** Schild zum Kampfstart (Anteil vom Leben) */
  startShield?: number
  /** Schild kommt einmal zurueck, wenn das Leben unter 50 % faellt */
  shieldRefresh?: number
  /** Konter nach dem Ausweichen (Schaden-Multiplikator) */
  counter?: number
  /** Heilt um diesen Anteil des eigenen Schadens */
  lifesteal?: number
  /** Einmal pro Kampf: unter `below` Leben heilt `heal` */
  lastStand?: { below: number; heal: number }
  /** Eigene Heilungen staerker */
  healBonus?: number
  /** Brand macht mehr Schaden */
  brandBonus?: number
  /** Brennende Gegner explodieren beim Tod (Anteil vom Angriff an allen Gegnern) */
  explode?: number
  /** Vergiftete Gegner sind geschwaecht */
  poisonWeakens?: boolean
  /** Erster Angriff im Kampf ist kritisch und verursacht Blutung */
  firstCrit?: boolean
  /** Die Spezialfaehigkeit setzt Brand auf alle getroffenen Ziele */
  abilityBurn?: boolean
  /** Wer den Traeger verfehlt, wird vergiftet */
  poisonOnMiss?: boolean
  /** Unter `below` Leben: mehr Angriff und doppelter Lebensraub */
  rage?: { below: number; atk: number }
  /** Die ersten n eigenen Treffer verlangsamen das Ziel */
  slowHits?: number
  /** Heilt bei jedem n-ten eigenen Zug einen Anteil vom Leben */
  regen?: { every: number; pct: number }
  /** Alle Gegner starten verlangsamt */
  slowFoesAtStart?: boolean
  /** Mehr Gold aus Kaempfen */
  goldBonus?: number
  /** Zusaetzliche Chance auf ein Item nach dem Kampf */
  extraItem?: number
  /** Chance pro Treffer auf Brand, Blutung, Gift, Schwaeche oder Verlangsamen */
  burnChance?: number
  bleedChance?: number
  poisonChance?: number
  weakChance?: number
  slowChance?: number
  /** Mehr Krit-Schaden (Prozentpunkte) gegen blutende Ziele */
  kritVsBlutung?: number
  /** Nach jedem Krit: +n Ausweichen bzw. +n Tempo bis Kampfende, hoechstens 3-mal */
  critDodge?: number
  critTempo?: number
  /** Faellt ein Gegner: die Crew bekommt +n Krit-Schaden bis Kampfende */
  killRush?: number
  /** Nach dem Ausweichen ist der naechste Treffer kritisch */
  dodgeCrit?: boolean
  /** Nach dem Ausweichen heilt der Traeger diesen Anteil vom Leben */
  dodgeHeal?: number
  /** Wer den Traeger verfehlt, wird geschwaecht */
  weakOnMiss?: boolean
  /** Lebensraub nur gegen vergiftete Ziele */
  lifestealVsGift?: number
  /** Mehr Schaden gegen vergiftete bzw. brennende Ziele */
  dmgVsGift?: number
  dmgVsBrand?: number
  /** Angreifer erleiden diesen Anteil ihres Schadens selbst */
  thorns?: number
  /** Chance, dass ein Angreifer Feuer faengt */
  burnBack?: number
  /** Die ersten n Angriffe gegen den Traeger gehen ins Leere */
  veils?: number
  /** Einmal pro Kampf: faellt der Traeger, steht er mit diesem Anteil Leben wieder auf */
  revive?: number
  /** Fuer die ganze Crew: mehr Ausweichen, Schild zum Start, Energie und Zugleiste zum Start */
  teamDodge?: number
  teamShield?: number
  startEnergy?: number
  startGauge?: number
  /** Kampfstart: alle Gegner brennen bzw. sind vergiftet */
  startBurn?: boolean
  startPoison?: boolean
  /** Staerkende Faehigkeiten des Traegers heilen zusaetzlich diesen Anteil */
  buffHeal?: number
}

const MAX_KEYS: (keyof Mods)[] = ['bleedMax', 'counter', 'revive', 'teamDodge', 'teamShield', 'startEnergy', 'startGauge']

/** Mods zusammenfuehren: Zahlen addieren (Konter und Blutungs-Stapel: hoechster Wert), Schalter verodern */
export function mergeMods(...list: (Mods | undefined)[]): Mods {
  const out: Record<string, unknown> = {}
  for (const m of list) {
    if (!m) continue
    for (const [k, v] of Object.entries(m) as [keyof Mods, unknown][]) {
      const cur = out[k]
      if (typeof v === 'number') {
        if (k === 'doubleEvery') out[k] = typeof cur === 'number' ? Math.min(cur, v) : v
        else if (MAX_KEYS.includes(k)) out[k] = Math.max((cur as number) ?? 0, v)
        else out[k] = ((cur as number) ?? 0) + v
      } else if (typeof v === 'boolean') out[k] = !!cur || v
      else if (v && typeof v === 'object') {
        // Objekte (lastStand, rage, regen): staerkere Wirkung gewinnt
        const a = cur as Record<string, number> | undefined
        const b = v as Record<string, number>
        const score = (o: Record<string, number>) => Object.values(o).reduce((x, y) => x + y, 0)
        out[k] = !a || score(b) > score(a) ? b : a
      }
    }
  }
  return out as Mods
}

export type Side = 'crew' | 'feind'
export type Row = 'vorne' | 'hinten'
export type AbilityId =
  | 'sturmklinge'
  | 'kapitaensruf'
  | 'donnerbuechse'
  | 'kettenkugel'
  | 'sternenkurs'
  | 'windstille'
  | 'kombuesenfeuer'
  | 'eintopf'
  | 'adlerauge'
  | 'sturzflug'
export type Look =
  | 'jonte'
  | 'kanonier'
  | 'navigatorin'
  | 'smutje'
  | 'ausguck'
  | 'krabbenbandit'
  | 'krabbenmatrose'
  | 'moewenpirat'
  | 'nebelqualle'
  | 'geisterpirat'
  | 'irrlicht'
  | 'schalbart'
  | 'grauhand'

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
  sternenkurs: { id: 'sternenkurs', name: 'Sternenkurs', text: 'Blitzsprung: 200 % Schaden am schwächsten Gegner, danach 2 Züge lang +40 % Ausweichen.' },
  windstille: { id: 'windstille', name: 'Windstille', text: 'Alle Gegner verlieren Tempo: ihre nächsten Züge kommen deutlich später.' },
  kombuesenfeuer: { id: 'kombuesenfeuer', name: 'Kombüsenfeuer', text: 'Heilt die ganze Crew um 22 % Leben.' },
  eintopf: { id: 'eintopf', name: 'Kraft-Eintopf', text: 'Die Crew bekommt +30 % Angriff für 3 Züge und lädt 20 % Energie auf.' },
  adlerauge: { id: 'adlerauge', name: 'Adlerauge', text: 'Markiert den stärksten Gegner: Er nimmt bis Kampfende 30 % mehr Schaden.' },
  sturzflug: { id: 'sturzflug', name: 'Sturzflug', text: '150 % Schaden an zwei zufälligen Gegnern.' },
}

export type Trait =
  | 'ankerschild'
  | 'scherenwirbel'
  | 'flink'
  | 'sturzflieger'
  | 'gift'
  | 'geisterhaft'
  | 'irrlicht'
  | 'festung'
  | 'nebelkapitaen'

export const TRAIT_TEXT: Record<Trait, string> = {
  ankerschild: 'Ankerschild: nimmt 35 % weniger Schaden von Einzelangriffen. Flächenschaden trifft voll.',
  scherenwirbel: 'Scherenwirbel: holt alle paar Züge zu einem Großangriff gegen die ganze Crew aus. Sturmklinge unterbricht ihn.',
  flink: 'Flink: handelt oft, hält aber wenig aus.',
  sturzflieger: 'Sturzflieger: greift am liebsten die hintere Reihe an.',
  gift: 'Gift: Treffer vergiften für 3 Züge.',
  geisterhaft: 'Geisterhaft: Der erste Treffer geht einfach durch ihn hindurch.',
  irrlicht: 'Irrlicht: heilt seine Verbündeten. Am besten zuerst ausschalten.',
  festung: 'Boss mit drei Phasen. Großangriffe lassen sich mit der Sturmklinge unterbrechen.',
  nebelkapitaen: 'Boss mit drei Phasen. Großangriffe lassen sich mit der Sturmklinge unterbrechen.',
}

/** Angekuendigter Grossangriff gegen die ganze Crew */
export interface BigAttack {
  name: string
  /** jede n-te eigene Aktion wird ausgeholt */
  every: number
  mult: number
  /** erst unter diesem Lebensanteil */
  below?: number
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
  big?: BigAttack
  /** Verstaerkung, die ein Boss ruft */
  adds?: FighterDef[]
  /** Item-, Schul- und Set-Wirkungen */
  mods?: Mods
}

export interface Fighter extends FighterDef {
  hp: number
  gauge: number
  energy: number
  /** laufende Zustaende in Zuegen */
  brand: number
  /** Schaden pro Brand-Tick, haengt vom Angreifer ab */
  brandDmg: number
  ruf: number
  ruestungHalb: boolean
  /** Grossangriff angekuendigt */
  holtAus: boolean
  actions: number
  markiert: boolean
  /** Zuege mit +40 % Ausweichen */
  flink: number
  gift: number
  /** Geisterhaft: naechster Treffer geht durch */
  schleier: boolean
  /** Boss-Phase 1..3 */
  phase: number
  /** Wer den Brand gelegt hat (fuer Explosionen) */
  brandSrc: string
  /** Schild, faengt Schaden ab */
  shield: number
  shieldRefreshed: boolean
  /** Blutung: Stapel, verbleibende Zuege, Schaden pro Stapel */
  bleed: number
  bleedTurns: number
  bleedDmg: number
  /** Zuege verlangsamt (-30 % Tempo) und geschwaecht (-20 % Angriff) */
  slow: number
  weak: number
  lastStandUsed: boolean
  /** Erster eigener Angriff schon erfolgt */
  firstDone: boolean
  /** Eigene normale Angriffe (fuer Doppelschlag) */
  attacks: number
  /** Restliche verlangsamende Treffer */
  slowHitsLeft: number
  /** Restliche Angriffe, die ins Leere gehen */
  veils: number
  /** Stapel aus Krit-Boni (Ausweichen und Tempo) */
  critStacks: number
  /** Naechster Treffer ist kritisch */
  nextCrit: boolean
  revived: boolean
}

export type FightEvent =
  | { t: 'zug'; who: string }
  | { t: 'angriff'; who: string; target: string; ranged: boolean }
  | { t: 'treffer'; who: string; target: string; dmg: number; krit: boolean; geblockt?: boolean }
  | { t: 'verfehlt'; who: string; target: string }
  | { t: 'faehigkeit'; who: string; ability: AbilityId; targets: string[] }
  | { t: 'heilung'; target: string; amount: number }
  | { t: 'brand'; target: string; dmg: number; gift?: boolean; blut?: boolean }
  /** Kurzer Hinweis ueber einer Figur (Schild, Blutung, Konter, ...) */
  | { t: 'effekt'; target: string; text: string; tone: 'gut' | 'schlecht' }
  | { t: 'durch'; who: string; target: string }
  | { t: 'phase'; who: string; text: string }
  | { t: 'verstaerkung'; who: string; adds: string[] }
  | { t: 'zurueck'; target: string }
  | { t: 'holtAus'; who: string; name: string }
  | { t: 'unterbrochen'; who: string }
  | { t: 'wirbel'; who: string; name: string; targets: string[] }
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
    fighters: startEffects(defs.map((d, i) => spawn(d, i))),
  }
}

/** Wirkungen zum Kampfstart: Crew-Boni, Gegner verlangsamt, brennend oder vergiftet */
function startEffects(fs: Fighter[]): Fighter[] {
  const crew = fs.filter((f) => f.side === 'crew')
  const foes = fs.filter((f) => f.side === 'feind')
  const best = (k: 'teamDodge' | 'teamShield' | 'startEnergy' | 'startGauge') => Math.max(0, ...crew.map((f) => f.mods?.[k] ?? 0))
  const td = best('teamDodge')
  const ts = best('teamShield')
  const se = best('startEnergy')
  const sg = best('startGauge')
  for (const f of crew) {
    f.stats.ausweichen += td
    f.shield += Math.round(ts * f.stats.leben)
    if (f.ability) f.energy = Math.min(100, f.energy + se)
    f.gauge += sg
  }
  if (crew.some((f) => f.mods?.slowFoesAtStart)) for (const f of foes) f.slow = 2
  const burner = crew.find((f) => f.mods?.startBurn)
  if (burner) for (const f of foes) applyBrand(burner, f)
  if (crew.some((f) => f.mods?.startPoison)) for (const f of foes) f.gift = 3
  return fs
}

function spawn(d: FighterDef, i: number): Fighter {
  return {
      ...d,
      stats: { ...d.stats },
      hp: d.stats.leben,
      // leicht versetzter Start, damit nicht alle gleichzeitig handeln
      gauge: (i * 7) % 20,
      energy: 0,
      brand: 0,
      brandDmg: 0,
      ruf: 0,
      ruestungHalb: false,
      holtAus: false,
      actions: 0,
      markiert: false,
      flink: 0,
      gift: 0,
      schleier: !!d.traits?.includes('geisterhaft'),
      phase: 1,
      brandSrc: '',
      shield: Math.round((d.mods?.startShield ?? 0) * d.stats.leben),
      shieldRefreshed: false,
      bleed: 0,
      bleedTurns: 0,
      bleedDmg: 0,
      slow: 0,
      weak: 0,
      lastStandUsed: false,
      firstDone: false,
      attacks: 0,
      slowHitsLeft: d.mods?.slowHits ?? 0,
      veils: d.mods?.veils ?? 0,
      critStacks: 0,
      nextCrit: false,
      revived: false,
  }
}

export const alive = (b: Battle, side?: Side) => b.fighters.filter((f) => f.hp > 0 && (!side || f.side === side))
export const byId = (b: Battle, id: string) => b.fighters.find((f) => f.id === id)!
export const abilityReady = (f: Fighter) => !!f.ability && f.hp > 0 && f.energy >= 100

/** Tempo mit Verlangsamung */
const speed = (f: Fighter) => Math.max(1, f.stats.tempo * (f.slow > 0 ? 0.7 : 1))

/** Wer ist als Naechstes dran? Fuellt die Zugleisten bis einer 100 erreicht. */
function nextActor(b: Battle): Fighter {
  const living = alive(b)
  for (;;) {
    const ready = living.filter((f) => f.gauge >= 100).sort((a, c) => c.gauge - a.gauge)
    if (ready.length) return ready[0]
    const step = Math.min(...living.map((f) => (100 - f.gauge) / speed(f)))
    for (const f of living) f.gauge += speed(f) * step + 1e-9
  }
}

function pickTarget(b: Battle, me: Fighter): Fighter {
  const foes = alive(b, me.side === 'crew' ? 'feind' : 'crew')
  const front = foes.filter((f) => f.row === 'vorne')
  if (me.side === 'crew') {
    if (me.ranged) return [...foes].sort((a, c) => a.hp - c.hp)[0]
    return (front.length ? front : foes).sort((a, c) => a.hp - c.hp)[0]
  }
  const back0 = foes.filter((f) => f.row === 'hinten')
  if (me.traits?.includes('sturzflieger') && back0.length && rnd(b) < 0.7) return back0[Math.floor(rnd(b) * back0.length)]
  // Gegner: vorne wird oefter getroffen
  if (front.length && (front.length === foes.length || rnd(b) < 0.72)) return front[Math.floor(rnd(b) * front.length)]
  const back = foes.filter((f) => f.row === 'hinten')
  return back[Math.floor(rnd(b) * back.length)] ?? foes[0]
}

const raging = (f: Fighter) => !!f.mods?.rage && f.hp / f.stats.leben < f.mods.rage.below

function attackPower(b: Battle, me: Fighter): number {
  let a = me.stats.angriff
  if (me.ruf > 0) a *= 1.3
  if (me.weak > 0) a *= 0.8
  if (me.gift > 0 && alive(b, me.side === 'crew' ? 'feind' : 'crew').some((f) => f.mods?.poisonWeakens)) a *= 0.8
  if (raging(me)) a *= 1 + me.mods!.rage!.atk
  // Nahkaempfer aus der hinteren Reihe treffen schwaecher
  if (!me.ranged && me.row === 'hinten') a *= 0.7
  return a
}

function armor(t: Fighter) {
  let r = t.stats.ruestung
  if (t.traits?.includes('festung') && t.phase === 1) r += 14
  return t.ruestungHalb ? r / 2 : r
}

function dodge(t: Fighter) {
  let d = t.stats.ausweichen + (t.flink > 0 ? 40 : 0) + (t.mods?.critDodge ? Math.min(3, t.critStacks) * t.mods.critDodge : 0)
  if (t.traits?.includes('nebelkapitaen') && t.phase === 1) d += 30
  return d
}

/** Heilen mit Obergrenze, gibt den geheilten Betrag zurueck */
function heal(t: Fighter, amount: number, ev: FightEvent[]): number {
  const h = Math.min(t.stats.leben - t.hp, Math.round(amount))
  if (h < 1 || t.hp <= 0) return 0
  t.hp += h
  ev.push({ t: 'heilung', target: t.id, amount: h })
  return h
}

/** Brand legen: 3 Zuege, Schaden haengt vom Angriff des Verursachers ab */
export function applyBrand(me: Fighter, t: Fighter) {
  t.brand = 3
  t.brandSrc = me.id
  t.brandDmg = Math.max(1, Math.round(Math.min(t.stats.leben * 0.05, me.stats.angriff * 0.6) * (1 + (me.mods?.brandBonus ?? 0))))
}

/** Blutung: stapelt (Standard bis 3), 25 % des Angriffs pro Stapel und Zug. Geisterhafte sind immun. */
function applyBleed(me: Fighter, t: Fighter, ev: FightEvent[]) {
  if (t.hp <= 0) return
  if (t.traits?.includes('geisterhaft')) {
    ev.push({ t: 'effekt', target: t.id, text: 'Immun gegen Blutung', tone: 'schlecht' })
    return
  }
  t.bleed = Math.min(me.mods?.bleedMax ?? 3, t.bleed + 1)
  t.bleedTurns = 3
  t.bleedDmg = Math.max(t.bleedDmg, Math.max(1, Math.round(me.stats.angriff * 0.25)))
  ev.push({ t: 'effekt', target: t.id, text: t.bleed > 1 ? `Blutung ×${t.bleed}` : 'Blutung', tone: me.side === 'crew' ? 'gut' : 'schlecht' })
}

interface StrikeOpts {
  area?: boolean
  noDodge?: boolean
  /** Konter und Explosionen loesen keine weiteren aus */
  chain?: boolean
}

/** Schaden mit Ruestung, Krit und Ausweichen, plus alle Item-Wirkungen */
function strike(b: Battle, me: Fighter, t: Fighter, mult: number, ev: FightEvent[], opts: StrikeOpts = {}) {
  if (t.schleier) {
    t.schleier = false
    ev.push({ t: 'durch', who: me.id, target: t.id })
    return
  }
  if (t.veils > 0 && !opts.area) {
    t.veils--
    ev.push({ t: 'effekt', target: t.id, text: 'Schattenhaft', tone: tone(t) })
    ev.push({ t: 'verfehlt', who: me.id, target: t.id })
    return
  }
  if (!opts.noDodge && rnd(b) * 100 < dodge(t)) {
    ev.push({ t: 'verfehlt', who: me.id, target: t.id })
    if (t.mods?.poisonOnMiss && me.hp > 0) {
      me.gift = 3
      ev.push({ t: 'effekt', target: me.id, text: 'Vergiftet', tone: me.side === 'crew' ? 'schlecht' : 'gut' })
    }
    if (t.mods?.weakOnMiss && me.hp > 0) {
      me.weak = 2
      ev.push({ t: 'effekt', target: me.id, text: 'Geschwächt', tone: tone(t) })
    }
    if (t.mods?.dodgeCrit) t.nextCrit = true
    if (t.mods?.dodgeHeal) heal(t, t.stats.leben * t.mods.dodgeHeal, ev)
    if (t.mods?.counter && !opts.chain && t.hp > 0 && me.hp > 0) {
      ev.push({ t: 'effekt', target: t.id, text: 'Konter!', tone: t.side === 'crew' ? 'gut' : 'schlecht' })
      strike(b, t, me, t.mods.counter, ev, { noDodge: true, chain: true })
    }
    return
  }
  const first = !me.firstDone && !!me.mods?.firstCrit
  me.firstDone = true
  let chance = me.stats.krit
  if (t.brand > 0) chance += me.mods?.critVsBrand ?? 0
  if (t.bleed > 0) chance += me.mods?.critVsBlutung ?? 0
  const forced = me.nextCrit && !opts.chain
  if (forced) me.nextCrit = false
  const krit = first || forced || rnd(b) * 100 < chance
  let dmg = attackPower(b, me) * mult * (20 / (20 + armor(t))) * (0.9 + rnd(b) * 0.2)
  if (krit) dmg *= ((me.stats.kritSchaden ?? KRIT_SCHADEN) + (t.bleed > 0 ? (me.mods?.kritVsBlutung ?? 0) : 0)) / 100
  if (t.gift > 0) dmg *= 1 + (me.mods?.dmgVsGift ?? 0)
  if (t.brand > 0) dmg *= 1 + (me.mods?.dmgVsBrand ?? 0)
  const geblockt = !opts.area && !!t.traits?.includes('ankerschild')
  if (geblockt) dmg *= 0.65
  if (t.markiert) dmg *= 1.3
  let d = Math.max(1, Math.round(dmg))
  if (t.shield > 0) {
    const abs = Math.min(t.shield, d)
    t.shield -= abs
    d -= abs
    ev.push({ t: 'effekt', target: t.id, text: t.shield > 0 ? `Schild −${abs}` : 'Schild zerbrochen', tone: t.side === 'crew' ? 'gut' : 'schlecht' })
    if (d === 0) return
  }
  t.hp = Math.max(0, t.hp - d)
  if (t.ability) t.energy = Math.min(100, t.energy + ENERGY_PER_HIT)
  ev.push({ t: 'treffer', who: me.id, target: t.id, dmg: d, krit, geblockt })
  const steal = (me.mods?.lifesteal ?? 0) * (raging(me) ? 2 : 1) + (t.gift > 0 ? (me.mods?.lifestealVsGift ?? 0) : 0)
  if (steal > 0) heal(me, d * steal, ev)
  if (krit && me.critStacks < 3 && (me.mods?.critDodge || me.mods?.critTempo)) {
    me.critStacks++
    if (me.mods.critTempo) me.stats.tempo += me.mods.critTempo
  }
  if (!opts.chain && me.hp > 0) hitBack(b, me, t, d, ev)
  if (t.hp === 0) {
    if (revive(t, ev)) return
    ev.push({ t: 'besiegt', who: t.id })
    killRush(b, t, ev)
    explodeIfBurning(b, t, ev, opts)
    return
  }
  if (me.traits?.includes('gift') && !opts.area) t.gift = 3
  if ((krit && me.mods?.critBleed) || first) applyBleed(me, t, ev)
  if (me.slowHitsLeft > 0) {
    me.slowHitsLeft--
    t.slow = 2
    ev.push({ t: 'effekt', target: t.id, text: 'Verlangsamt', tone: tone(me) })
  }
  if (!opts.chain) onHitChances(b, me, t, ev)
  afterDamage(t, ev)
  bossPhase(b, t, ev)
}

/** Ton eines Hinweises: gut, wenn es der Crew hilft */
const tone = (helped: Fighter): 'gut' | 'schlecht' => (helped.side === 'crew' ? 'gut' : 'schlecht')

/** Zufaellige Zustaende durch Treffer (Item-Effekte) */
function onHitChances(b: Battle, me: Fighter, t: Fighter, ev: FightEvent[]) {
  const m = me.mods
  if (!m || t.hp <= 0) return
  if (m.burnChance && rnd(b) < m.burnChance) {
    applyBrand(me, t)
    ev.push({ t: 'effekt', target: t.id, text: 'Brand', tone: tone(me) })
  }
  if (m.bleedChance && rnd(b) < m.bleedChance) applyBleed(me, t, ev)
  if (m.poisonChance && rnd(b) < m.poisonChance) {
    t.gift = 3
    ev.push({ t: 'effekt', target: t.id, text: 'Vergiftet', tone: tone(me) })
  }
  if (m.weakChance && rnd(b) < m.weakChance) {
    t.weak = 2
    ev.push({ t: 'effekt', target: t.id, text: 'Geschwächt', tone: tone(me) })
  }
  if (m.slowChance && rnd(b) < m.slowChance) {
    t.slow = 2
    ev.push({ t: 'effekt', target: t.id, text: 'Verlangsamt', tone: tone(me) })
  }
}

/** Dornen und Feuer am Getroffenen schlagen auf den Angreifer zurueck */
function hitBack(b: Battle, me: Fighter, t: Fighter, d: number, ev: FightEvent[]) {
  const th = t.mods?.thorns
  if (th) {
    const x = Math.max(1, Math.round(d * th))
    me.hp = Math.max(0, me.hp - x)
    ev.push({ t: 'brand', target: me.id, dmg: x })
    if (me.hp === 0 && !revive(me, ev)) {
      ev.push({ t: 'besiegt', who: me.id })
      killRush(b, me, ev)
      return
    }
  }
  if (t.mods?.burnBack && me.brand <= 0 && rnd(b) < t.mods.burnBack) {
    applyBrand(t, me)
    ev.push({ t: 'effekt', target: me.id, text: 'Brand', tone: tone(t) })
  }
}

/** Einmal pro Kampf wieder aufstehen. true, wenn es geklappt hat. */
function revive(t: Fighter, ev: FightEvent[]): boolean {
  if (!t.mods?.revive || t.revived) return false
  t.revived = true
  t.hp = Math.max(1, Math.round(t.stats.leben * t.mods.revive))
  t.brand = 0
  t.gift = 0
  t.bleed = 0
  ev.push({ t: 'effekt', target: t.id, text: 'Steht wieder auf!', tone: tone(t) })
  ev.push({ t: 'heilung', target: t.id, amount: t.hp })
  return true
}

/** Faellt ein Gegner, bekommt die Gegenseite Krit-Schaden (Kapitaensrock) */
function killRush(b: Battle, dead: Fighter, ev: FightEvent[]) {
  const other = alive(b, dead.side === 'crew' ? 'feind' : 'crew')
  const k = Math.max(0, ...other.map((f) => f.mods?.killRush ?? 0))
  if (!k) return
  for (const f of other) f.stats.kritSchaden = (f.stats.kritSchaden ?? KRIT_SCHADEN) + k
  const src = other.find((f) => f.mods?.killRush)
  if (src) ev.push({ t: 'effekt', target: src.id, text: `+${k} % Krit-Schaden`, tone: tone(src) })
}

/** Schild-Erneuerung und letzte Rettung, wenn das Leben faellt */
function afterDamage(t: Fighter, ev: FightEvent[]) {
  const f = t.hp / t.stats.leben
  if (t.mods?.shieldRefresh && !t.shieldRefreshed && f < 0.5) {
    t.shieldRefreshed = true
    t.shield += Math.round(t.mods.shieldRefresh * t.stats.leben)
    ev.push({ t: 'effekt', target: t.id, text: 'Schild erneuert', tone: 'gut' })
  }
  if (t.mods?.lastStand && !t.lastStandUsed && f < t.mods.lastStand.below) {
    t.lastStandUsed = true
    ev.push({ t: 'effekt', target: t.id, text: 'Letzte Rettung', tone: 'gut' })
    heal(t, t.mods.lastStand.heal * t.stats.leben, ev)
  }
}

/** Pulver-Schule: brennende Gegner explodieren beim Tod */
function explodeIfBurning(b: Battle, t: Fighter, ev: FightEvent[], opts: StrikeOpts) {
  if (opts.chain || t.brand <= 0 || !t.brandSrc) return
  const src = b.fighters.find((f) => f.id === t.brandSrc)
  const k = src?.mods?.explode
  if (!src || !k) return
  ev.push({ t: 'effekt', target: t.id, text: 'Explosion!', tone: src.side === 'crew' ? 'gut' : 'schlecht' })
  for (const o of alive(b, t.side)) strike(b, src, o, k, ev, { area: true, noDodge: true, chain: true })
}

/** Phasenwechsel der Bosse, ausgeloest durch Schaden */
function bossPhase(b: Battle, t: Fighter, ev: FightEvent[]) {
  const f = t.hp / t.stats.leben
  if (t.traits?.includes('festung')) {
    if (t.phase === 1 && f < 0.6) {
      t.phase = 2
      t.stats.tempo = Math.round(t.stats.tempo * 1.4)
      ev.push({ t: 'phase', who: t.id, text: 'Das Schneckenhaus bekommt Risse!' })
    }
    if (t.phase === 2 && f < 0.25) {
      t.phase = 3
      ev.push({ t: 'phase', who: t.id, text: 'Fürst Schalbart wird wütend!' })
    }
  }
  if (t.traits?.includes('nebelkapitaen')) {
    if (t.phase === 1 && f < 0.55) {
      t.phase = 2
      ev.push({ t: 'phase', who: t.id, text: 'Der Nebel lichtet sich. Grauhand ruft seine Crew!' })
      const adds = (t.adds ?? []).map((d, i) => spawn({ ...d, id: `${d.id}-${b.round}-${i}` }, i))
      for (const a of adds) a.gauge = 30
      b.fighters.push(...adds)
      if (adds.length) ev.push({ t: 'verstaerkung', who: t.id, adds: adds.map((a) => a.id) })
    }
    if (t.phase === 2 && f < 0.3) {
      t.phase = 3
      ev.push({ t: 'phase', who: t.id, text: 'Die Totenglocke beginnt zu läuten …' })
    }
  }
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
        heal(f, f.stats.leben * (0.08 + (me.mods?.buffHeal ?? 0)) * (1 + (me.mods?.healBonus ?? 0)), ev)
      }
      break
    }
    case 'donnerbuechse': {
      ev.push({ t: 'faehigkeit', who: me.id, ability: 'donnerbuechse', targets: foes.map((f) => f.id) })
      for (const t of foes) {
        strike(b, me, t, 1.2, ev, { area: true, noDodge: true })
        if (t.hp > 0) applyBrand(me, t)
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
    case 'sternenkurs': {
      const t = [...foes].sort((a, c) => a.hp - c.hp)[0]
      ev.push({ t: 'faehigkeit', who: me.id, ability: 'sternenkurs', targets: [t.id] })
      strike(b, me, t, 2.0, ev, { noDodge: true })
      me.flink = 2
      break
    }
    case 'windstille': {
      ev.push({ t: 'faehigkeit', who: me.id, ability: 'windstille', targets: foes.map((f) => f.id) })
      for (const t of foes) {
        t.gauge = Math.max(0, t.gauge - 45)
        ev.push({ t: 'zurueck', target: t.id })
      }
      break
    }
    case 'kombuesenfeuer':
    case 'eintopf': {
      const crew = alive(b, me.side)
      ev.push({ t: 'faehigkeit', who: me.id, ability: me.ability, targets: crew.map((f) => f.id) })
      for (const f of crew) {
        if (me.ability === 'eintopf') {
          f.ruf = 3
          if (f.ability && f.id !== me.id) f.energy = Math.min(100, f.energy + 20)
          if (me.mods?.buffHeal) heal(f, f.stats.leben * me.mods.buffHeal * (1 + (me.mods.healBonus ?? 0)), ev)
        } else {
          heal(f, f.stats.leben * 0.22 * (1 + (me.mods?.healBonus ?? 0)), ev)
        }
      }
      break
    }
    case 'adlerauge': {
      const t = [...foes].sort((a, c) => c.hp - a.hp)[0]
      ev.push({ t: 'faehigkeit', who: me.id, ability: 'adlerauge', targets: [t.id] })
      t.markiert = true
      strike(b, me, t, 1.0, ev, { noDodge: true })
      break
    }
    case 'sturzflug': {
      const ts = [...foes].sort(() => rnd(b) - 0.5).slice(0, 2)
      ev.push({ t: 'faehigkeit', who: me.id, ability: 'sturzflug', targets: ts.map((f) => f.id) })
      for (const t of ts) strike(b, me, t, 1.5, ev, { noDodge: true })
      break
    }
  }
  // Pulverteufel-Set: Faehigkeit setzt Brand auf alle getroffenen Gegner
  if (me.mods?.abilityBurn) {
    const cast = ev.find((e) => e.t === 'faehigkeit')
    const ids = cast && cast.t === 'faehigkeit' ? cast.targets : []
    for (const id of ids) {
      const t = b.fighters.find((f) => f.id === id)
      if (t && t.side !== me.side && t.hp > 0) {
        applyBrand(me, t)
        ev.push({ t: 'effekt', target: t.id, text: 'Brand', tone: me.side === 'crew' ? 'gut' : 'schlecht' })
      }
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
    const d = me.brandDmg
    me.hp = Math.max(0, me.hp - d)
    ev.push({ t: 'brand', target: me.id, dmg: d })
    if (me.hp === 0 && !revive(me, ev)) {
      ev.push({ t: 'besiegt', who: me.id })
      killRush(b, me, ev)
      me.brand = Math.max(1, me.brand)
      explodeIfBurning(b, me, ev, {})
      checkEnd(b, ev)
      return ev
    }
  }
  if (me.gift > 0) {
    me.gift--
    const d = Math.max(1, Math.round(me.stats.leben * 0.04))
    me.hp = Math.max(0, me.hp - d)
    ev.push({ t: 'brand', target: me.id, dmg: d, gift: true })
    if (me.hp === 0 && !revive(me, ev)) {
      ev.push({ t: 'besiegt', who: me.id })
      killRush(b, me, ev)
      checkEnd(b, ev)
      return ev
    }
  }
  if (me.bleed > 0) {
    const d = me.bleedDmg * me.bleed
    me.hp = Math.max(0, me.hp - d)
    ev.push({ t: 'brand', target: me.id, dmg: d, blut: true })
    if (--me.bleedTurns <= 0) me.bleed = 0
    if (me.hp === 0 && !revive(me, ev)) {
      ev.push({ t: 'besiegt', who: me.id })
      killRush(b, me, ev)
      checkEnd(b, ev)
      return ev
    }
  }
  if (me.mods?.regen && me.actions % me.mods.regen.every === 0) heal(me, me.stats.leben * me.mods.regen.pct, ev)
  if (me.ruf > 0) me.ruf--
  if (me.flink > 0) me.flink--
  if (me.slow > 0) me.slow--
  if (me.weak > 0) me.weak--

  // Angekuendigter Grossangriff
  const big = me.big
  const bigActive = big && (!big.below || me.hp / me.stats.leben < big.below)
  if (me.side === 'feind' && big && (me.holtAus || bigActive)) {
    if (me.holtAus) {
      me.holtAus = false
      const crew = alive(b, 'crew')
      ev.push({ t: 'wirbel', who: me.id, name: big.name, targets: crew.map((f) => f.id) })
      for (const t of crew) strike(b, me, t, big.mult, ev, { area: true, noDodge: true })
      checkEnd(b, ev)
      return ev
    }
    if (me.actions % big.every === big.every - 1) {
      me.holtAus = true
      ev.push({ t: 'holtAus', who: me.id, name: big.name })
      return ev
    }
  }

  // Irrlicht heilt jeden zweiten Zug den am staerksten verletzten Verbuendeten
  if (me.traits?.includes('irrlicht') && me.actions % 2 === 0) {
    const hurt = alive(b, me.side)
      .filter((f) => f.hp < f.stats.leben)
      .sort((a, c) => a.hp / a.stats.leben - c.hp / c.stats.leben)[0]
    if (hurt) {
      const heal = Math.round(hurt.stats.leben * 0.15)
      hurt.hp = Math.min(hurt.stats.leben, hurt.hp + heal)
      ev.push({ t: 'heilung', target: hurt.id, amount: heal })
      return ev
    }
  }

  // Fuerst Schalbart: Festungskanone (Phase 1) und Ankerschwung (ab Phase 2)
  if (me.traits?.includes('festung')) {
    if (me.phase === 1 && me.actions % 3 === 0) {
      const crew = alive(b, 'crew')
      const back = crew.filter((f) => f.row === 'hinten')
      const t = (back.length ? back : crew)[Math.floor(rnd(b) * (back.length || crew.length))]
      ev.push({ t: 'angriff', who: me.id, target: t.id, ranged: true })
      strike(b, me, t, 1.6, ev)
      checkEnd(b, ev)
      return ev
    }
    if (me.phase >= 2) {
      const crew = alive(b, 'crew')
      const front = crew.filter((f) => f.row === 'vorne')
      const ts = front.length ? front : crew.slice(0, 1)
      ev.push({ t: 'angriff', who: me.id, target: ts[0].id, ranged: false })
      for (const t of ts) strike(b, me, t, 1.0, ev)
      checkEnd(b, ev)
      return ev
    }
  }

  const t = pickTarget(b, me)
  ev.push({ t: 'angriff', who: me.id, target: t.id, ranged: !!me.ranged })
  strike(b, me, t, 1, ev)
  me.attacks++
  const every = me.mods?.doubleEvery
  if (every && me.attacks % every === 0 && t.hp > 0 && me.hp > 0) {
    ev.push({ t: 'effekt', target: me.id, text: 'Doppelschlag', tone: me.side === 'crew' ? 'gut' : 'schlecht' })
    strike(b, me, t, 1, ev)
  }
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
      if (smart && f.ability === 'sturmklinge' && !alive(b, 'feind').some((x) => x.holtAus) && alive(b, 'feind').some((x) => x.big)) continue
      wants.add(f.id)
    }
    step(b, wants)
  }
  const crew = b.fighters.filter((f) => f.side === 'crew')
  return { sieg: b.sieg, aktionen: b.round, crewHp: crew.reduce((s, f) => s + f.hp, 0) / crew.reduce((s, f) => s + f.stats.leben, 0) }
}

/** Die naechsten n Zuege vorhersagen (fuer die Zugleiste), ohne den Kampf zu veraendern */
export function turnOrder(b: Battle, n: number): string[] {
  const living = alive(b).map((f) => ({ id: f.id, g: f.gauge, t: speed(f) }))
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
