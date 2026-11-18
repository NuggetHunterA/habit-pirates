/**
 * Kampfbuehne: zeichnet Hintergrund, Figuren aus Einzelteilen, Projektile, Partikel
 * und Schadenszahlen in ein Canvas. Alle Animationen laufen in Spielzeit (Tempo 1x/2x).
 */
import type { Look, Side } from '../game/combat'
import { FIGHT_ART, isSpoilerFree, spriteFor } from './art'

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

type Pose = { rot: number; dx: number; dy: number; sx: number; sy: number; around?: [number, number, number]; pivot?: number }

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

/** Bodenpunkt und Massstab je Figur */
const LOOK = {
  jonte: { cx: 260, fy: 487, scale: 0.4, h: 200 },
  kanonier: { cx: 0, fy: 0, scale: 0.6, h: 192 },
  navigatorin: { cx: 0, fy: 0, scale: 0.6, h: 200 },
  smutje: { cx: 0, fy: 0, scale: 0.6, h: 192 },
  ausguck: { cx: 0, fy: 0, scale: 0.6, h: 170 },
  krabbenbandit: { cx: 200, fy: 300, scale: 0.68, h: 155 },
  krabbenmatrose: { cx: 200, fy: 300, scale: 0.47, h: 102 },
  moewenpirat: { cx: 0, fy: 0, scale: 1, h: 110 },
  nebelqualle: { cx: 0, fy: 0, scale: 1, h: 135 },
  geisterpirat: { cx: 0, fy: 0, scale: 1, h: 185 },
  irrlicht: { cx: 0, fy: 0, scale: 1, h: 105 },
  schalbart: { cx: 0, fy: 0, scale: 1, h: 265 },
  grauhand: { cx: 0, fy: 0, scale: 1, h: 290 },
} as const

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

  constructor(cv: HTMLCanvasElement) {
    this.cv = cv
    this.ctx = cv.getContext('2d')!
    for (const src of Object.values(FIGHT_ART.backgrounds)) this.load(src)
    for (const src of FIGHT_ART.allSprites) this.load(src)
    for (const { parts } of Object.values(FIGHT_ART.rigs)) for (const src of Object.values(parts)) this.load(src)
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(cv)
    this.resize()
    this.raf = requestAnimationFrame(this.loop)
  }

  destroy() {
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
    const L = LOOK[a.look]
    this.actors.set(a.id, { ...a, dx: 0, dy: 0, anim: 'idle', at: 0, alpha: 1, flash: 0, scale: L.scale, h: L.h, hpShown: a.hp, holtAus: false, brand: 0, buff: 0 })
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

  /** Muendung der Kanone (Silhouette, nach rechts gespiegelt) */
  muzzle(id: string) {
    const a = this.actors.get(id)!
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
    // leichte Wellenbewegung auf dem Wasser
    ctx.globalAlpha = 0.25
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
    const w = (a.look === 'schalbart' || a.look === 'grauhand' ? 120 : a.look === 'krabbenbandit' ? 95 : a.look === 'krabbenmatrose' ? 62 : 58) * (1 - lift)
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
    const w = (a.look === 'schalbart' || a.look === 'grauhand' ? 140 : a.look === 'krabbenbandit' ? 104 : 80) * Math.min(k, 1.25)
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
    if (spriteFor(a.look)) this.drawSprite(a, V)
    else this.drawRig(a, V)
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

  private drawSprite(a: Actor, V: DOMMatrix) {
    const { ctx } = this
    const im = this.img(spriteFor(a.look)!)
    if (!im) return
    const t = a.at
    const dir = a.side === 'crew' ? 1 : -1
    const floats = ['nebelqualle', 'geisterpirat', 'irrlicht', 'grauhand', 'moewenpirat'].includes(a.look)
    const silhouette = isSpoilerFree() && a.side === 'crew'
    let dx = a.dx
    let dy = a.dy + (floats ? -10 + Math.sin(this.time * 2.4 + a.x) * 6 : 0)
    let rot = Math.sin(this.time * 1.7 + a.x) * (floats ? 0.03 : 0.01)
    let sy = 1 + Math.sin(this.time * 2.1 + a.x) * 0.014
    let sx = 1
    switch (a.anim) {
      case 'attack':
      case 'cast': {
        const k = a.anim === 'cast' ? 1.6 : 1
        rot += dir * kf(t, [[0, 0], [0.15, -0.08 * k, 'out'], [0.26, 0.14 * k, 'in'], [0.5, 0]])
        sy *= kf(t, [[0, 1], [0.15, 0.92, 'out'], [0.26, 1.06, 'in'], [0.5, 1]])
        break
      }
      case 'hit':
        dx += -dir * kf(t, [[0, 0], [0.08, 12, 'out'], [0.35, 0]])
        rot += -dir * kf(t, [[0, 0], [0.08, 0.1, 'out'], [0.35, 0]])
        sx = kf(t, [[0, 1], [0.06, 1.08, 'out'], [0.3, 1]])
        sy *= kf(t, [[0, 1], [0.06, 0.92, 'out'], [0.3, 1]])
        break
      case 'dodge':
        dx += -dir * kf(t, [[0, 0], [0.12, 40, 'out'], [0.4, 0]])
        break
      case 'down':
        rot = -dir * kf(t, [[0, 0], [0.6, 1.4, 'in']])
        if (floats) dy += kf(t, [[0, 0], [0.8, 40, 'in']])
        break
      case 'cheer':
        dy += kf(t, [[0, 0], [0.2, 0], [0.5, -30, 'out'], [0.85, 0, 'in']])
        sy *= kf(t, [[0, 1], [0.2, 0.9], [0.5, 1.08], [1, 1]])
        break
      case 'spin':
        rot = -Math.PI * 2 * kf(t, [[0, 0], [0.8, 1, 'inout']])
        break
    }
    const h = a.h
    const w = (im.width / im.height) * h
    const flip = a.side === 'crew' ? -1 : 1
    ctx.setTransform(V.translate(a.x + dx, a.y + dy).translate(0, -h / 2).rotate(rot * 57.3).translate(0, h / 2).scale(flip * sx, sy))
    ctx.filter = silhouette ? `drop-shadow(0 0 3px rgba(150,240,255,0.9)) ${this.filterFor(a)}`.replace(' none', '') : this.filterFor(a)
    ctx.drawImage(im, -w / 2, -h, w, h)
    ctx.filter = 'none'
    ctx.setTransform(V)
    if (silhouette) {
      ctx.globalAlpha *= 0.85
      ctx.font = '900 54px Nunito, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(180,240,255,0.55)'
      ctx.fillText('?', a.x + dx, a.y + dy - h * 0.45)
    }
  }

  private drawRig(a: Actor, V: DOMMatrix) {
    const isCrab = a.look !== 'jonte'
    const { rig, parts } = isCrab ? FIGHT_ART.rigs.krabbe : FIGHT_ART.rigs.jonte
    const L = LOOK[a.look]
    const names = Object.keys(rig)
    const P: Record<string, Pose> = {}
    for (const k of names) P[k] = { rot: 0, dx: 0, dy: 0, sx: 1, sy: 1 }
    const root: Pose = { rot: 0, dx: 0, dy: 0, sx: 1, sy: 1 }
    if (isCrab) this.poseCrab(a, P, root)
    else this.poseJonte(a, P, root)
    const hidden = a.look === 'krabbenmatrose' ? new Set(['tuch', 'saebel', 'schild']) : new Set<string>()

    const rootM = new DOMMatrix()
      .translate(a.x + a.dx, a.y + a.dy)
      .scale(a.scale)
      .translate(root.dx, root.dy - (root.pivot ?? 0))
      .rotate(root.rot * 57.2958)
      .translate(0, root.pivot ?? 0)
      .scale(root.sx, root.sy)
      .translate(-L.cx, -L.fy)
    const cache: Record<string, DOMMatrix> = {}
    const mat = (k: string): DOMMatrix => {
      if (cache[k]) return cache[k]
      const r = rig[k]
      const p = P[k]
      const px = r.x + r.px
      const py = r.y + r.py
      let M = r.parent ? mat(r.parent) : rootM
      if (p.around) M = M.translate(p.around[0], p.around[1]).rotate(p.around[2] * 57.2958).translate(-p.around[0], -p.around[1])
      M = M.translate(px + p.dx, py + p.dy)
        .rotate(((r.r ?? 0) + p.rot) * 57.2958)
        .scale((r.s ?? 1) * p.sx, (r.s ?? 1) * p.sy)
        .translate(-px, -py)
      return (cache[k] = M)
    }
    const { ctx } = this
    ctx.filter = this.filterFor(a)
    for (const k of [...names].sort((x, y) => rig[x].z - rig[y].z)) {
      if (hidden.has(k)) continue
      const im = this.img(parts[rig[k].img])
      if (!im) continue
      ctx.setTransform(V.multiply(mat(k)))
      ctx.drawImage(im, rig[k].x, rig[k].y)
    }
    ctx.filter = 'none'
    ctx.setTransform(V)
  }

  private poseJonte(a: Actor, P: Record<string, Pose>, root: Pose) {
    const T = this.time
    const b = Math.sin(T * 2.2 + a.x)
    P.torso.sy = 1 + 0.018 * b
    P.torso.sx = 1 - 0.008 * b
    P.kopf.dy = -1.5 * b
    P.kopf.rot = 0.025 * Math.sin(T * 1.1)
    P.oberarm_b.rot = 0.05 * Math.sin(T * 2.2 + 0.6)
    P.oberarm_f.rot = -0.04 * Math.sin(T * 2.2 + 0.4)
    P.unterarm_f.rot = -0.05 * Math.sin(T * 2.2 + 0.9)
    P.mantel_r.rot = 0.05 * Math.sin(T * 1.7)
    P.mantel_l.rot = -0.04 * Math.sin(T * 1.9 + 1)
    P.hut.rot = 0.02 * Math.sin(T * 2.2 - 0.8)
    const t = a.at
    switch (a.anim) {
      case 'attack':
      case 'cast': {
        const k = a.anim === 'cast' ? 1.8 : 1
        const keys = (v: number[]): Key[] => [[0, 0], [0.18 * k, v[0], 'out'], [0.26 * k, v[1], 'in'], [0.34 * k, v[2], 'out'], [0.5 * k, 0]]
        P.oberarm_f.rot += kf(t, keys([-1.9, 0.9, 0.7]))
        P.unterarm_f.rot += kf(t, keys([-0.6, 0.4, 0.3]))
        P.oberarm_b.rot += kf(t, keys([0.3, -0.3, -0.2]))
        root.rot = kf(t, keys([-0.06, 0.12, 0.1]))
        P.kopf.rot += kf(t, keys([-0.05, 0.08, 0.06]))
        P.mantel_l.rot += kf(t, keys([0.1, -0.25, -0.2]))
        P.mantel_r.rot += kf(t, keys([0.1, -0.3, -0.2]))
        P.hut.rot += kf(t, keys([-0.06, 0.1, 0.05]))
        break
      }
      case 'hit':
        root.rot = kf(t, [[0, 0], [0.07, -0.14, 'out'], [0.35, 0]])
        P.hut.rot += kf(t, [[0, 0], [0.1, -0.25, 'out'], [0.35, 0]])
        P.oberarm_f.rot += kf(t, [[0, 0], [0.07, 0.3, 'out'], [0.35, 0]])
        break
      case 'dodge':
        root.dx = kf(t, [[0, 0], [0.12, -40, 'out'], [0.4, 0]])
        root.rot = kf(t, [[0, 0], [0.12, -0.1, 'out'], [0.4, 0]])
        break
      case 'down':
        root.rot = kf(t, [[0, 0], [0.7, -1.45, 'in']])
        root.dy = kf(t, [[0, 0], [0.7, 10, 'in']])
        P.hut.dy = kf(t, [[0, 0], [0.5, -40, 'out'], [0.9, 30, 'in']])
        break
      case 'cheer':
        root.dy = kf(t, [[0, 0], [0.18, 0], [0.55, -38, 'out'], [0.9, 0, 'in'], [1.4, 0]])
        P.oberarm_f.rot = kf(t, [[0, 0], [0.2, 0.25], [0.5, -2.3], [1.0, -2.2], [1.4, 0]])
        P.hut.dy = kf(t, [[0, 0], [0.3, 0], [0.62, -21, 'out'], [0.95, 0, 'in'], [1.4, 0]])
        break
    }
  }

  private poseCrab(a: Actor, P: Record<string, Pose>, root: Pose) {
    const T = this.time + a.x * 0.01
    const walk = Math.abs(a.dx) > 2 ? 3 : 1
    P.bein_1.rot = 0.08 * Math.sin(T * 3 * walk) * walk
    P.bein_2.rot = 0.1 * Math.sin(T * 3 * walk + 1.5) * walk
    P.bein_3.rot = -0.1 * Math.sin(T * 3 * walk + 0.7) * walk
    P.bein_4.rot = -0.08 * Math.sin(T * 3 * walk + 2.2) * walk
    P.koerper.dy = Math.sin(T * 3) * 2
    P.koerper.sy = 1 + Math.sin(T * 3) * 0.015
    P.tuch.rot = Math.sin(T * 2) * 0.03
    P.arm_f.rot = Math.sin(T * 2.5) * 0.04
    P.arm_b.rot = Math.sin(T * 2.5 + 1) * 0.05
    // Saebel haengt an der Schere (nicht im Rig verknuepft): gleiche Drehung um den Scherenpunkt
    const ab = FIGHT_ART.rigs.krabbe.rig.arm_b
    const pivot: [number, number] = [ab.x + ab.px, ab.y + ab.py]
    let swing = 0
    const t = a.at
    if (a.holtAus && a.alive) swing = 0.7 + Math.sin(this.time * 9) * 0.06
    switch (a.anim) {
      case 'attack':
        swing = kf(t, [[0, 0], [0.18, 0.6, 'out'], [0.28, -0.9, 'in'], [0.36, -0.8], [0.5, 0]])
        P.arm_f.rot += kf(t, [[0, 0], [0.18, 0.3, 'out'], [0.28, -0.5, 'in'], [0.5, 0]])
        root.rot = kf(t, [[0, 0], [0.18, 0.05], [0.28, -0.1], [0.5, 0]])
        break
      case 'spin':
        root.rot = kf(t, [[0, 0], [0.8, -Math.PI * 4, 'inout']])
        root.pivot = 110
        root.dy = -kf(t, [[0, 0], [0.4, 30, 'out'], [0.8, 0, 'in']])
        swing = -0.9
        break
      case 'hit':
        root.sx = kf(t, [[0, 1], [0.06, 1.12, 'out'], [0.35, 1]])
        root.sy = kf(t, [[0, 1], [0.06, 0.86, 'out'], [0.35, 1]])
        root.rot = kf(t, [[0, 0], [0.07, 0.1, 'out'], [0.35, 0]])
        break
      case 'dodge':
        root.dx = kf(t, [[0, 0], [0.12, 60, 'out'], [0.4, 0]])
        break
      case 'down':
        root.pivot = 100
        root.rot = kf(t, [[0, 0], [0.6, Math.PI * 0.95, 'in']])
        root.dy = kf(t, [[0, 0], [0.3, -60, 'out'], [0.6, 0, 'in']])
        break
    }
    P.arm_b.rot += swing
    P.saebel.around = [pivot[0], pivot[1], swing]
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
