/**
 * Kampfbuehne: zeichnet Hintergrund, nahtlos animierte Figuren, Projektile, Partikel
 * und Schadenszahlen in ein Canvas. Alle Animationen laufen in Spielzeit (Tempo 1x/2x).
 */
import type { Look, Side } from '../game/combat'
import { FIGHT_ART, figureImage, isSpoilerFree } from './art'
import { FIGURES, scaleSpec } from './figures'

const LOW_FX = 'hp.lowfx'
/** In dieser Sitzung schon als zu langsam erkannt: gleich ohne Mesh-Animation */
function lowFx(): boolean {
  try {
    return sessionStorage.getItem(LOW_FX) === '1'
  } catch {
    return false
  }
}
import { I, MeshRenderer, apply, around, mul, type BoneMats, type MeshSpec } from './mesh'

export const STAGE_W = 960
export const STAGE_H = 536

type AnimKind = 'idle' | 'attack' | 'cast' | 'hit' | 'down' | 'cheer' | 'spin' | 'dodge'

export interface Actor {
  id: string
  look: Look
  side: Side
  name: string
  x: number
  y: number
  dx: number
  dy: number
  scale: number
  anim: AnimKind
  at: number
  hp: number
  hpShown: number
  hpMax: number
  energy: number
  hasAbility: boolean
  alive: boolean
  alpha: number
  flash: number
  holtAus: boolean
  brand: number
  buff: number
  /** Hoehe der Figur auf der Buehne (fuer Lebensbalken) */
  h: number
}

interface Float {
  x: number
  y: number
  text: string
  color: string
  size: number
  t: number
  life: number
}
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  r: number
  c: string
  g: number
  glow?: boolean
}
type ProjKind = 'kugel' | 'wind' | 'feuer' | 'kette'
interface Proj {
  kind: ProjKind
  x0: number
  y0: number
  x1: number
  y1: number
  arc: number
  t: number
  dur: number
  done: () => void
}
interface Timer {
  t: number
  dur: number
  fn?: (u: number) => void
  done: () => void
}
interface Ring {
  x: number
  y: number
  t: number
  life: number
  r: number
  c: string
}

const ease = {
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  inout: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  in: (t: number) => t * t * t,
  lin: (t: number) => t,
}
type Key = [number, number, (keyof typeof ease)?]
function kf(t: number, keys: Key[]) {
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i]
    const [t0, v0] = keys[i - 1]
    if (t <= t1) return v0 + (v1 - v0) * ease[e ?? 'inout']((t - t0) / (t1 - t0))
  }
  return keys[keys.length - 1][1]
}

export const ANIM_LEN: Record<AnimKind, number> = {
  idle: 0,
  attack: 0.5,
  cast: 0.9,
  hit: 0.35,
  down: 0.9,
  cheer: 1.4,
  spin: 0.8,
  dodge: 0.4,
}

/** Hoehe des ganzen Bildes je Figur auf der Buehne */
const HEIGHT: Record<Look, number> = {
  jonte: 205,
  kanonier: 192,
  navigatorin: 200,
  smutje: 192,
  ausguck: 170,
  krabbenbandit: 170,
  krabbenmatrose: 118,
  moewenpirat: 110,
  nebelqualle: 135,
  geisterpirat: 185,
  irrlicht: 105,
  schalbart: 265,
  grauhand: 290,
  seeigel: 112,
  einsiedlerkrebs: 122,
  nebelaal: 165,
  laternenfisch: 112,
  seeungeheuer: 255,
  glutkrabbe: 112,
  aschegeist: 175,
  lavaschnecke: 118,
  funkenvogel: 112,
  obsidiangolem: 200,
  zunder: 270,
}

/** Lebensbalken sitzt ueber der Figur, nicht ueber Waffenspitzen */
const BAR_H: Partial<Record<Look, number>> = { krabbenbandit: 150, krabbenmatrose: 100 }

type Spring = { v: number; x: number }

export class Stage {
  actors = new Map<string, Actor>()
  speed = 1
  private ctx: CanvasRenderingContext2D
  private imgs = new Map<string, HTMLImageElement>()
  private floats: Float[] = []
  private particles: Particle[] = []
  private projs: Proj[] = []
  private timers: Timer[] = []
  private rings: Ring[] = []
  private dim = 0
  /** Kampfhintergrund */
  bg: keyof typeof FIGHT_ART.backgrounds = 'strand'
  /** Schrift und Balken auf kleinen Bildschirmen groesser zeichnen */
  private uiK = 1
  private dimTarget = 0
  private shake = 0
  private hitstop = 0
  private time = 0
  private raf = 0
  private last = 0
  private alive = true
  private ro: ResizeObserver
  private reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

  private cv: HTMLCanvasElement
  /** Mesh-Animation (WebGL). Faellt weg, wenn das Geraet sie nicht fluessig schafft (siehe watchFrames). */
  private mesh = lowFx() ? null : MeshRenderer.create()
  /** Bildzeiten der ersten Sekunden, um ein zu langsames Geraet zu erkennen */
  private frameTimes: number[] = []
  private watchDone = false
  private springs = new Map<string, Record<string, Spring>>()
  private specs = new Map<string, MeshSpec>()
  /** Waffenspitze je Figur in Buehnen-Koordinaten (fuer Muendungsfeuer) */
  private tips = new Map<string, { x: number; y: number }>()

  constructor(cv: HTMLCanvasElement) {
    this.cv = cv
    this.ctx = cv.getContext('2d')!
    for (const src of Object.values(FIGHT_ART.backgrounds)) this.load(src)
    for (const src of FIGHT_ART.allFigures) this.load(src)
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(cv)
    this.resize()
    this.raf = requestAnimationFrame(this.loop)
  }

  destroy() {
    this.mesh?.destroy()
    this.alive = false
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    for (const t of this.timers) t.done()
    for (const p of this.projs) p.done()
    this.timers = []
    this.projs = []
  }

  private load(src: string) {
    if (this.imgs.has(src)) return
    const i = new Image()
    i.src = src
    this.imgs.set(src, i)
  }
  private img(src: string) {
    const i = this.imgs.get(src)
    return i && i.complete && i.naturalWidth ? i : null
  }

  private resize() {
    const r = this.cv.getBoundingClientRect()
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.cv.width = Math.max(1, Math.round(r.width * dpr))
    this.cv.height = Math.max(1, Math.round(r.height * dpr))
  }

  addActor(a: Omit<Actor, 'dx' | 'dy' | 'anim' | 'at' | 'alpha' | 'flash' | 'scale' | 'h' | 'hpShown' | 'holtAus' | 'brand' | 'buff'>) {
    this.actors.set(a.id, { ...a, dx: 0, dy: 0, anim: 'idle', at: 0, alpha: 1, flash: 0, scale: 1, h: BAR_H[a.look] ?? HEIGHT[a.look], hpShown: a.hp, holtAus: false, brand: 0, buff: 0 })
  }

  // ---------- Zeit ----------
  wait(sec: number): Promise<void> {
    return new Promise((done) => this.timers.push({ t: 0, dur: sec, done }))
  }
  tween(sec: number, fn: (u: number) => void): Promise<void> {
    return new Promise((done) => this.timers.push({ t: 0, dur: sec, fn, done }))
  }

  play(id: string, anim: AnimKind) {
    const a = this.actors.get(id)
    if (!a) return
    a.anim = anim
    a.at = 0
  }

  /** Mittelpunkt (Brusthoehe) einer Figur */
  center(id: string) {
    const a = this.actors.get(id)!
    return { x: a.x + a.dx, y: a.y + a.dy - a.h * 0.5 }
  }

  async lunge(id: string, targetId: string, sec: number) {
    const a = this.actors.get(id)!
    const t = this.actors.get(targetId)!
    const dist = t.x - a.x
    const goal = dist - Math.sign(dist) * 95
    const goalY = t.y - a.y + 6
    const sx = a.dx
    const sy = a.dy
    await this.tween(sec, (u) => {
      const e = ease.out(u)
      a.dx = sx + (goal - sx) * e
      a.dy = sy + (goalY - sy) * e - Math.sin(u * Math.PI) * 14
    })
  }
  async back(id: string, sec: number) {
    const a = this.actors.get(id)!
    const sx = a.dx
    const sy = a.dy
    await this.tween(sec, (u) => {
      const e = ease.inout(u)
      a.dx = sx * (1 - e)
      a.dy = sy * (1 - e) - Math.sin(u * Math.PI) * 10
    })
  }
  async knock(id: string, px: number) {
    const a = this.actors.get(id)!
    await this.tween(0.25, (u) => (a.dx = px * Math.sin(u * Math.PI) * (1 - u * 0.3)))
    a.dx = 0
  }

  shoot(kind: ProjKind, fromId: string, toId: string, dur: number, arc = 0, from?: { x: number; y: number }): Promise<void> {
    const f = from ?? this.center(fromId)
    const t = this.center(toId)
    return new Promise((done) => this.projs.push({ kind, x0: f.x, y0: f.y, x1: t.x, y1: t.y, arc, t: 0, dur, done }))
  }
  shootAt(kind: ProjKind, from: { x: number; y: number }, to: { x: number; y: number }, dur: number, arc = 0): Promise<void> {
    return new Promise((done) => this.projs.push({ kind, x0: from.x, y0: from.y, x1: to.x, y1: to.y, arc, t: 0, dur, done }))
  }

  /** Muendung bzw. Waffenspitze */
  muzzle(id: string) {
    const a = this.actors.get(id)!
    const tip = this.tips.get(id)
    if (tip) return tip
    const dir = a.side === 'crew' ? 1 : -1
    return { x: a.x + a.dx + dir * 50, y: a.y + a.dy - a.h * 0.42 }
  }

  float(id: string, text: string, color: string, size = 30) {
    const c = this.center(id)
    const a = this.actors.get(id)!
    this.floats.push({ x: c.x + (Math.random() - 0.5) * 30, y: a.y - a.h * 0.85, text, color, size, t: 0, life: 1.1 })
  }
  floatAt(x: number, y: number, text: string, color: string, size = 34) {
    this.floats.push({ x, y, text, color, size, t: 0, life: 1.3 })
  }

  burst(x: number, y: number, n: number, cols: string[], sp: number, g = 500, glow = false, r = 3) {
    if (this.reduce) n = Math.ceil(n / 3)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const s = sp * (0.3 + Math.random() * 0.9)
      const life = 0.35 + Math.random() * 0.45
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - sp * 0.2, life, max: life, r: r * (0.6 + Math.random()), c: cols[i % cols.length], g, glow })
    }
  }
  ring(x: number, y: number, r: number, c: string, life = 0.45) {
    this.rings.push({ x, y, t: 0, life, r, c })
  }
  hitFx(id: string, krit: boolean, geblockt?: boolean) {
    const c = this.center(id)
    const a = this.actors.get(id)!
    a.flash = 1
    if (geblockt) {
      this.burst(c.x - 20, c.y, 10, ['#d9e2ec', '#9fb3c8', '#ffffff'], 260, 400)
      this.ring(c.x - 20, c.y, 40, 'rgba(159,179,200,0.9)', 0.3)
    } else {
      this.burst(c.x, c.y, krit ? 22 : 12, krit ? ['#fff3b0', '#ffd43b', '#ffffff'] : ['#ffffff', '#ffe8cc', '#ffc078'], krit ? 420 : 300, 600, true)
    }
    if (krit) {
      this.hitstop = this.reduce ? 0 : 0.12
      this.shake = this.reduce ? 0 : 10
      this.ring(c.x, c.y, 70, 'rgba(255,236,153,0.95)', 0.35)
    } else this.shake = Math.max(this.shake, this.reduce ? 0 : 3)
  }
  explode(x: number, y: number, big = 1) {
    this.burst(x, y, 40 * big, ['#ffd43b', '#ff922b', '#f03e3e', '#fff3bf'], 520 * big, 300, true, 5)
    this.burst(x, y, 14, ['#495057', '#343a40', '#868e96'], 200, -60, false, 9)
    this.ring(x, y, 130 * big, 'rgba(255,169,77,0.95)', 0.5)
    this.shake = this.reduce ? 0 : 14
  }
  setDim(v: number) {
    this.dimTarget = v
  }
  doShake(v: number) {
    if (!this.reduce) this.shake = Math.max(this.shake, v)
  }

  // ---------- Schleife ----------
  private loop = (ts: number) => {
    if (!this.alive) return
    if (this.last) this.watchFrames(ts - this.last)
    const real = Math.min(0.05, (ts - this.last) / 1000 || 0.016)
    this.last = ts
    let dt = real * this.speed
    if (this.hitstop > 0) {
      this.hitstop -= real
      dt *= 0.08
    }
    this.update(dt, real)
    this.draw()
    this.raf = requestAnimationFrame(this.loop)
  }

  /**
   * Leistungs-Waechter (Phase 6): Schafft das Geraet die Mesh-Animation nicht fluessig
   * (Median unter 30 Bildern pro Sekunde nach dem Laden), zeichnet der Kampf die Figuren
   * als ganze Bilder weiter. Gilt bis zum naechsten App-Start.
   */
  private watchFrames(ms: number) {
    if (!this.mesh || this.watchDone) return
    this.frameTimes.push(ms)
    // Die ersten Bilder (Laden, Aufbau) zaehlen nicht; dann 30 Bilder oder 2 Sekunden
    const t = this.frameTimes.slice(6)
    if (t.length < 30 && t.reduce((a, b) => a + b, 0) < 2000) return
    t.sort((a, b) => a - b)
    const slow = t[Math.floor(t.length / 2)] > 33
    this.watchDone = true
    if (!slow) return
    this.mesh.destroy()
    this.mesh = null
    try {
      sessionStorage.setItem(LOW_FX, '1')
    } catch {
      /* egal */
    }
  }

  private update(dt: number, real: number) {
    this.time += dt
    this.dim += (this.dimTarget - this.dim) * Math.min(1, real * 8)
    this.shake *= Math.pow(0.001, real)
    for (const a of this.actors.values()) {
      a.at += dt
      if (a.anim !== 'idle' && a.anim !== 'down' && a.at >= ANIM_LEN[a.anim]) a.anim = 'idle'
      a.flash = Math.max(0, a.flash - dt * 5)
      a.hpShown += (a.hp - a.hpShown) * Math.min(1, dt * 8)
      if (!a.alive) a.alpha = Math.max(a.side === 'crew' ? 0.45 : 0, a.alpha - dt * (a.side === 'crew' ? 0.6 : 0.9))
    }
    const timers = this.timers
    this.timers = []
    for (const t of timers) {
      t.t += dt
      const u = Math.min(1, t.t / t.dur)
      t.fn?.(u)
      if (u >= 1) t.done()
      else this.timers.push(t)
    }
    const projs = this.projs
    this.projs = []
    for (const p of projs) {
      p.t += dt
      const u = Math.min(1, p.t / p.dur)
      const { x, y } = projPos(p, u)
      if (p.kind === 'feuer' && Math.random() < 0.9) this.burst(x, y, 2, ['#ffd43b', '#ff922b', '#f03e3e'], 60, -120, true, 4)
      if (p.kind === 'wind') this.burst(x, y, 2, ['#c3fae8', '#63e6be', '#ffffff'], 50, 0, true, 3)
      if (u >= 1) p.done()
      else this.projs.push(p)
    }
    this.particles = this.particles.filter((p) => (p.life -= dt) > 0)
    for (const p of this.particles) {
      p.vy += p.g * dt
      p.vx *= 1 - dt * 1.5
      p.x += p.vx * dt
      p.y += p.vy * dt
    }
    this.floats = this.floats.filter((f) => (f.t += dt) < f.life)
    this.rings = this.rings.filter((r) => (r.t += dt) < r.life)
    // Brand: kleine Flammen
    for (const a of this.actors.values()) {
      if (a.alive && a.brand > 0 && Math.random() < dt * 14) {
        this.burst(a.x + a.dx + (Math.random() - 0.5) * 50, a.y + a.dy - a.h * (0.2 + Math.random() * 0.5), 1, ['#ffd43b', '#ff922b'], 30, -160, true, 4)
      }
    }
  }

  private draw() {
    const { ctx, cv } = this
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, cv.width, cv.height)
    // Figuren passen immer ganz hinein (Bereich x 125..915), Boden unten buendig
    const s = Math.min(cv.height / STAGE_H, cv.width / 720)
    this.uiK = Math.min(1.9, Math.max(1, 0.85 / (s / (window.devicePixelRatio > 1 ? Math.min(2, window.devicePixelRatio) : 1))))
    const jx = (Math.random() - 0.5) * this.shake * s
    const jy = (Math.random() - 0.5) * this.shake * s
    const ox = cv.width / 2 - 512 * s + jx
    const oy = cv.height - STAGE_H * s + jy
    const V = new DOMMatrix().translate(ox, oy).scale(s)
    // Hintergrund fuellt die ganze Flaeche
    const bg = this.img(FIGHT_ART.backgrounds[this.bg])
    if (bg) {
      const bs = Math.max(cv.width / 890, cv.height / STAGE_H, s)
      const bw = STAGE_W * bs
      const bh = STAGE_H * bs
      ctx.drawImage(bg, cv.width / 2 - 512 * bs + jx - 10, cv.height - bh + jy, bw + 20, bh + 10)
    } else {
      ctx.fillStyle = '#7cc6d6'
      ctx.fillRect(0, 0, cv.width, cv.height)
    }
    ctx.setTransform(V)
    // leichte Wellenbewegung auf dem Wasser (nur am Strand, im Nebel laege sie auf dem Sand)
    ctx.globalAlpha = this.bg === 'strand' ? 0.25 : 0
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    for (let i = 0; i < 4; i++) {
      const y = 300 + i * 18
      ctx.beginPath()
      for (let x = 250; x <= 720; x += 10) ctx.lineTo(x, y + Math.sin(x * 0.03 + this.time * 1.6 + i) * 2.2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    // Figuren nach Tiefe
    const list = [...this.actors.values()].sort((a, b) => a.y - b.y)
    for (const a of list) this.drawShadow(a, V)
    for (const a of list) this.drawActor(a, V)

    if (this.dim > 0.01) {
      ctx.setTransform(V)
      ctx.fillStyle = `rgba(4,18,26,${0.5 * this.dim})`
      ctx.fillRect(-20, -20, STAGE_W + 40, STAGE_H + 40)
      // Figuren, die gerade handeln, ueber der Abdunklung
    }

    ctx.setTransform(V)
    for (const r of this.rings) {
      const u = r.t / r.life
      ctx.globalAlpha = 1 - u
      ctx.strokeStyle = r.c
      ctx.lineWidth = 8 * (1 - u) + 1
      ctx.beginPath()
      ctx.arc(r.x, r.y, r.r * ease.out(u), 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    for (const p of this.projs) this.drawProj(p)
    ctx.globalCompositeOperation = 'lighter'
    for (const p of this.particles) {
      if (!p.glow) continue
      ctx.globalAlpha = Math.min(1, p.life / p.max) * 0.9
      ctx.fillStyle = p.c
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
    for (const p of this.particles) {
      if (p.glow) continue
      ctx.globalAlpha = Math.min(1, p.life / p.max) * 0.8
      ctx.fillStyle = p.c
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    for (const a of list) this.drawBars(a)

    for (const f of this.floats) {
      const u = f.t / f.life
      const pop = u < 0.15 ? 0.6 + (u / 0.15) * 0.6 : 1.2 - Math.min(0.2, (u - 0.15) * 0.6)
      ctx.globalAlpha = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1
      ctx.font = `900 ${f.size * pop * Math.min(this.uiK, 1.5)}px Nunito, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.lineWidth = 6
      ctx.strokeStyle = 'rgba(20,10,4,0.85)'
      const y = f.y - ease.out(Math.min(1, u * 1.5)) * 40
      ctx.strokeText(f.text, f.x, y)
      ctx.fillStyle = f.color
      ctx.fillText(f.text, f.x, y)
    }
    ctx.globalAlpha = 1
  }

  private drawShadow(a: Actor, V: DOMMatrix) {
    const { ctx } = this
    if (a.alpha <= 0) return
    ctx.setTransform(V)
    const lift = Math.min(0.6, Math.max(0, -a.dy) / 120)
    const w = (a.look === 'schalbart' || a.look === 'grauhand' || a.look === 'seeungeheuer' || a.look === 'zunder' ? 120 : a.look === 'krabbenbandit' ? 95 : a.look === 'krabbenmatrose' ? 62 : 58) * (1 - lift)
    ctx.globalAlpha = 0.3 * a.alpha
    ctx.fillStyle = '#3b2414'
    ctx.beginPath()
    ctx.ellipse(a.x + a.dx, a.y + Math.max(0, a.dy) + 2, w, w * 0.18, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  private drawBars(a: Actor) {
    const { ctx } = this
    if (!a.alive && a.alpha < 0.6) return
    const k = this.uiK
    const w = (a.look === 'schalbart' || a.look === 'grauhand' || a.look === 'seeungeheuer' || a.look === 'zunder' ? 140 : a.look === 'krabbenbandit' ? 104 : 80) * Math.min(k, 1.25)
    const x = a.x - w / 2
    const y = a.y - a.h - 20 * k
    ctx.globalAlpha = Math.max(0, a.alpha)
    ctx.font = `800 ${15 * k}px Nunito, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.lineWidth = 4
    ctx.strokeStyle = 'rgba(10,20,25,0.8)'
    ctx.strokeText(a.name, a.x, y - 6 * k)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(a.name, a.x, y - 6 * k)
    roundRect(ctx, x - 2, y - 2, w + 4, 10 * k + 4, 6, 'rgba(10,20,25,0.75)')
    const f = Math.max(0, a.hpShown / a.hpMax)
    const col = a.side === 'crew' ? (f > 0.35 ? '#51cf66' : '#fcc419') : '#fa5252'
    if (f > 0) roundRect(ctx, x, y, w * f, 10 * k, 5, col)
    if (a.hasAbility) {
      roundRect(ctx, x, y + 10 * k + 3, w, 5 * k, 2.5, 'rgba(10,20,25,0.75)')
      const e = Math.min(1, a.energy / 100)
      if (e > 0) roundRect(ctx, x, y + 10 * k + 3, w * e, 5 * k, 2.5, e >= 1 ? `hsl(${45 + Math.sin(this.time * 8) * 10},100%,60%)` : '#4dabf7')
    }
    if (a.holtAus && a.alive) {
      const p = 1 + Math.sin(this.time * 10) * 0.12
      ctx.font = `900 ${34 * p}px Nunito, system-ui, sans-serif`
      ctx.lineWidth = 6
      ctx.strokeStyle = '#3b0a0a'
      ctx.strokeText('!', a.x + w / 2 + 14, y + 10)
      ctx.fillStyle = '#ff6b6b'
      ctx.fillText('!', a.x + w / 2 + 14, y + 10)
    }
    if (a.buff > 0 && a.alive) {
      ctx.font = '900 16px Nunito, system-ui, sans-serif'
      ctx.fillStyle = '#ffd43b'
      ctx.fillText('▲', x - 10, y + 10)
    }
    ctx.globalAlpha = 1
  }

  private drawProj(p: Proj) {
    const { ctx } = this
    const u = Math.min(1, p.t / p.dur)
    const { x, y } = projPos(p, u)
    const ang = Math.atan2(p.y1 - p.y0, p.x1 - p.x0)
    ctx.save()
    ctx.translate(x, y)
    if (p.kind === 'kugel' || p.kind === 'kette') {
      ctx.fillStyle = '#212529'
      ctx.beginPath()
      ctx.arc(0, 0, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.beginPath()
      ctx.arc(-3, -3, 3, 0, Math.PI * 2)
      ctx.fill()
      if (p.kind === 'kette') {
        const r = this.time * 20
        ctx.strokeStyle = '#868e96'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.cos(r) * 26, Math.sin(r) * 26)
        ctx.stroke()
        ctx.fillStyle = '#212529'
        ctx.beginPath()
        ctx.arc(Math.cos(r) * 26, Math.sin(r) * 26, 8, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (p.kind === 'feuer') {
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 30)
      g.addColorStop(0, '#fff9db')
      g.addColorStop(0.35, '#ffd43b')
      g.addColorStop(0.7, 'rgba(255,146,43,0.8)')
      g.addColorStop(1, 'rgba(240,62,62,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, 30, 0, Math.PI * 2)
      ctx.fill()
    } else if (p.kind === 'wind') {
      ctx.rotate(ang)
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = ['rgba(99,230,190,0.95)', 'rgba(195,250,232,0.9)', 'rgba(255,255,255,0.9)'][i]
        ctx.lineWidth = [14, 8, 3][i]
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.arc(-30, 0, 55, -0.95, 0.95)
        ctx.stroke()
      }
      ctx.globalCompositeOperation = 'source-over'
    }
    ctx.restore()
  }

  // ---------- Figuren ----------
  private drawActor(a: Actor, V: DOMMatrix) {
    const { ctx } = this
    if (a.alpha <= 0.01) return
    ctx.globalAlpha = Math.max(0, a.alpha)
    this.drawFigure(a, V)
    ctx.globalAlpha = 1
    ctx.filter = 'none'
  }

  private filterFor(a: Actor) {
    const f: string[] = []
    if (a.look === 'krabbenmatrose') f.push('hue-rotate(28deg) saturate(0.85) brightness(1.05)')
    if (a.flash > 0) f.push(`brightness(${1 + a.flash * 1.4})`)
    if (a.holtAus && a.alive) f.push(`drop-shadow(0 0 ${10 + Math.sin(this.time * 10) * 5}px rgba(255,60,60,0.95))`)
    if (a.buff > 0 && a.alive) f.push('drop-shadow(0 0 6px rgba(255,212,59,0.9))')
    return f.length ? f.join(' ') : 'none'
  }

  private spec(look: Look, im: HTMLImageElement): MeshSpec {
    const key = look + ':' + im.naturalHeight
    let s = this.specs.get(key)
    if (!s) {
      const fig = FIGURES[look]
      s = scaleSpec(fig.spec, im.naturalHeight / fig.refH)
      this.specs.set(key, s)
    }
    return s
  }

  private spring(a: Actor, name: string, target: number, k: number, d: number, dt: number) {
    let m = this.springs.get(a.id)
    if (!m) this.springs.set(a.id, (m = {}))
    const s = (m[name] ??= { v: 0, x: target })
    s.v += (k * (target - s.x) - d * s.v) * dt
    s.x += s.v * dt
    return s.x
  }

  /** Knochen-Stellung aus Ruhe-Bewegung und aktueller Animation */
  private pose(a: Actor, s: MeshSpec): BoneMats {
    const t = a.at
    const T = this.time + a.x * 0.013
    const m = this.reduce ? 0.3 : 1
    const dt = 1 / 60
    const fwd = s.facesRight ? 1 : -1
    const b = Math.sin(T * 2.1)
    let lean = (s.float ? 0.03 : 0.012) * Math.sin(T * 0.9) * m
    let rootRot = 0
    let squash = 1
    let aRot = 0.04 * Math.sin(T * 2.1 + 0.8) * m
    let bRot = -0.04 * Math.sin(T * 2.1 + 0.3) * m
    let head = 0
    if (s.flap) {
      const f = Math.sin(T * 9)
      aRot = 0.22 * f
      bRot = -0.22 * f
    }
    switch (a.anim) {
      case 'attack':
        if (s.shoot) {
          aRot += fwd * kf(t, [[0, 0], [0.1, -0.12, 'out'], [0.18, 0.22, 'out'], [0.5, 0]])
          lean += -fwd * kf(t, [[0, 0], [0.18, 0.07, 'out'], [0.5, 0]])
        } else {
          aRot += fwd * kf(t, [[0, 0], [0.16, 0.34, 'out'], [0.27, -0.3, 'in'], [0.36, -0.26], [0.5, 0]])
          bRot += fwd * kf(t, [[0, 0], [0.16, -0.12], [0.27, 0.12], [0.5, 0]])
          lean += fwd * kf(t, [[0, 0], [0.16, -0.08, 'out'], [0.27, 0.14, 'in'], [0.36, 0.12], [0.5, 0]])
        }
        squash = kf(t, [[0, 1], [0.15, 0.95, 'out'], [0.26, 1.03, 'in'], [0.5, 1]])
        break
      case 'cast':
        aRot += -fwd * kf(t, [[0, 0], [0.3, 0.32, 'out'], [0.7, 0.28], [0.9, 0]])
        bRot += fwd * kf(t, [[0, 0], [0.3, 0.26, 'out'], [0.7, 0.24], [0.9, 0]])
        lean += -fwd * kf(t, [[0, 0], [0.3, 0.07], [0.7, 0.07], [0.9, 0]])
        squash = kf(t, [[0, 1], [0.2, 0.94], [0.4, 1.05], [0.9, 1]])
        break
      case 'hit':
        lean += -fwd * kf(t, [[0, 0], [0.07, 0.14, 'out'], [0.35, 0]])
        head = -fwd * kf(t, [[0, 0], [0.07, 0.2, 'out'], [0.35, 0]])
        aRot += fwd * kf(t, [[0, 0], [0.07, 0.14, 'out'], [0.35, 0]])
        bRot += -fwd * kf(t, [[0, 0], [0.07, 0.14, 'out'], [0.35, 0]])
        squash = kf(t, [[0, 1], [0.06, 0.9, 'out'], [0.3, 1]])
        break
      case 'dodge':
        lean += -fwd * kf(t, [[0, 0], [0.12, 0.14, 'out'], [0.4, 0]])
        break
      case 'down':
        rootRot = -fwd * kf(t, [[0, 0], [0.7, s.float ? 0.5 : 1.45, 'in']])
        aRot += fwd * kf(t, [[0, 0], [0.5, 0.2]])
        break
      case 'cheer':
        aRot += -fwd * kf(t, [[0, 0], [0.2, 0.05], [0.5, 0.36], [1.0, 0.32], [1.4, 0]])
        bRot += fwd * kf(t, [[0, 0], [0.2, 0.05], [0.5, 0.3], [1.0, 0.28], [1.4, 0]])
        squash = kf(t, [[0, 1], [0.16, 0.9], [0.32, 1.06], [0.7, 1], [0.86, 0.93], [1.05, 1.02], [1.25, 1]])
        break
    }
    if (a.holtAus && a.alive) {
      aRot += fwd * (0.3 + Math.sin(this.time * 9) * 0.03)
      lean += -fwd * 0.05
    }
    aRot *= s.armScale ?? 1
    bRot *= s.armScale ?? 1

    const tf = {} as BoneMats
    tf.root = around(s.feet, rootRot, 1 / Math.sqrt(squash), squash)
    tf.body = mul(tf.root, around(s.feet, lean))
    tf.chest = mul(tf.body, around(s.waist, 0.006 * Math.sin(T * 1.3) * m, 1 - 0.006 * b * m, 1 + 0.014 * b * m))
    const headRot = 0.03 * Math.sin(T * 1.1 + 0.5) * m + this.spring(a, 'head', -lean * 1.2 + head, 70, 7, dt)
    tf.head = mul(tf.chest, around(s.neck, headRot, 1, 1, 0, -1.5 * b * m))
    const hatRot = this.spring(a, 'hat', -headRot * 0.8 + head * 0.5, 90, 6, dt)
    tf.hat = s.brow != null ? mul(tf.head, around({ x: s.neck.x, y: s.brow }, hatRot)) : tf.head
    tf.armA = s.armA ? mul(tf.chest, around(s.armA.path[0], aRot)) : tf.chest
    tf.armB = s.armB ? mul(tf.chest, around(s.armB.path[0], bRot)) : tf.chest
    const pend = s.pendants ?? []
    for (let i = 0; i < 2; i++) {
      const pd = pend[i]
      const bone = i ? 'pend1' : 'pend0'
      if (!pd) {
        tf[bone] = I
        continue
      }
      // Haengt an der Hand, wenn der Aufhaengepunkt am Arm liegt, sonst an der Brust
      const parent = i === 0 && s.armB ? tf.armB : tf.chest
      const swing = this.spring(a, bone, -(lean + aRot * 0.3 + bRot) * 1.2 + 0.08 * Math.sin(T * 1.4 + i * 2), 30, 3, dt)
      tf[bone] = mul(parent, around(pd.pivot, swing))
    }
    return tf
  }

  private drawFigure(a: Actor, V: DOMMatrix) {
    const { ctx } = this
    const im = this.img(figureImage(a.look))
    if (!im) return
    const s = this.spec(a.look, im)
    const t = a.at
    const dir = a.side === 'crew' ? 1 : -1
    const silhouette = isSpoilerFree() && a.side === 'crew' && a.look !== 'jonte'
    let dx = a.dx
    let dy = a.dy + (s.float ? -10 + Math.sin(this.time * 2.4 + a.x) * 6 : 0)
    let rot = 0
    switch (a.anim) {
      case 'hit':
        dx += -dir * kf(t, [[0, 0], [0.08, 12, 'out'], [0.35, 0]])
        break
      case 'dodge':
        dx += -dir * kf(t, [[0, 0], [0.12, 40, 'out'], [0.4, 0]])
        break
      case 'down':
        if (s.float) dy += kf(t, [[0, 0], [0.8, 40, 'in']])
        break
      case 'cheer':
        dy += kf(t, [[0, 0], [0.16, 0], [0.5, -34, 'out'], [0.86, 0, 'in']])
        break
      case 'spin':
        rot = -Math.PI * 2 * kf(t, [[0, 0], [0.8, 1, 'inout']])
        dy -= kf(t, [[0, 0], [0.4, 26, 'out'], [0.8, 0, 'in']])
        break
    }
    const hs = HEIGHT[a.look] / im.naturalHeight
    const flip = (a.side === 'crew') !== !!s.facesRight ? -1 : 1
    // Bild-Koordinaten -> Buehne: Fuesse stehen auf (x, y)
    const M = V.translate(a.x + dx, a.y + dy)
      .translate(0, -HEIGHT[a.look] / 2)
      .rotate(rot * 57.2958)
      .translate(0, HEIGHT[a.look] / 2)
      .scale(flip * hs, hs)
      .translate(-s.feet.x, -s.feet.y)
    ctx.filter = silhouette ? `drop-shadow(0 0 3px rgba(150,240,255,0.9)) ${this.filterFor(a)}`.replace(' none', '') : this.filterFor(a)
    const mats = this.pose(a, s)
    const tipLimb = s.armA
    if (tipLimb) {
      const last = tipLimb.extra?.length ? tipLimb.extra[0][tipLimb.extra[0].length - 1] : tipLimb.path[tipLimb.path.length - 1]
      const tip = apply(mats.armA, last)
      const local = new DOMMatrix().translate(a.x + dx, a.y + dy).scale(flip * hs, hs).translate(-s.feet.x, -s.feet.y).transformPoint(new DOMPoint(tip.x, tip.y))
      this.tips.set(a.id, { x: local.x, y: local.y })
    }
    ctx.setTransform(M)
    if (this.mesh) {
      const k = Math.hypot(M.a, M.b)
      const r = this.mesh.render(a.look + ':' + im.naturalHeight, im, s, mats, this.time, k)
      ctx.drawImage(this.mesh.canvas, 0, 0, r.sw, r.sh, r.x, r.y, r.w, r.h)
    } else {
      // ohne WebGL: ganzes Bild, nur als Ganzes bewegt
      ctx.drawImage(im, 0, 0)
    }
    ctx.filter = 'none'
    ctx.setTransform(V)
    // Hiebspur beim Nahkampf: Die Figur selbst biegt sich nur leicht, der Schwung kommt vom Bogen
    if (a.anim === 'attack' && !s.shoot && t > 0.17 && t < 0.42) {
      const H = HEIGHT[a.look]
      const u = (t - 0.17) / 0.25
      const a0 = -Math.PI * 0.7
      const a1 = Math.PI * 0.3
      const end = a0 + (a1 - a0) * Math.min(1, u * 1.8)
      const start = a0 + (a1 - a0) * Math.max(0, u * 1.8 - 0.8)
      ctx.setTransform(V.translate(a.x + dx + dir * H * 0.22, a.y + dy - H * 0.5).scale(dir, 1))
      ctx.globalAlpha = Math.max(0, 1 - u) * a.alpha
      ctx.lineCap = 'round'
      ctx.shadowColor = 'rgba(160,230,255,0.9)'
      ctx.shadowBlur = 14
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'
      ctx.lineWidth = 9 * (1 - u) + 2
      ctx.beginPath()
      ctx.arc(0, 0, H * 0.42, start, end)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.globalAlpha = Math.max(0, a.alpha)
      ctx.setTransform(V)
    }
    if (silhouette) {
      ctx.globalAlpha *= 0.85
      ctx.font = '900 54px Nunito, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(180,240,255,0.55)'
      ctx.fillText('?', a.x + dx, a.y + dy - HEIGHT[a.look] * 0.45)
    }
  }
}

function projPos(p: Proj, u: number) {
  const x = p.x0 + (p.x1 - p.x0) * u
  const y = p.y0 + (p.y1 - p.y0) * u - Math.sin(u * Math.PI) * p.arc
  return { x, y }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.roundRect(x, y, Math.max(w, 0.1), h, Math.min(r, w / 2))
  ctx.fill()
}
