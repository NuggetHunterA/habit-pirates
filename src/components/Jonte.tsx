import { useEffect, useRef } from 'react'
import { JONTE_PARTS, JONTE_RIG } from '../assets'

/**
 * Kapitaen Jonte Rotrock aus 14 Einzelteilen, im Code animiert
 * (Atmen, Hut und Mantel schwingen nach, Jubeln mit Sprung).
 * Portierung des abgenommenen Bewegungstests.
 */

type Action = 'cheer'
interface Props {
  /** Bei jeder Aenderung startet die Aktion neu */
  trigger?: { kind: Action; n: number }
  className?: string
  label?: string
}

// Sichtfenster im Rig-Raum (Rig ist auf halbe Groesse skaliert)
const VIEW = { x: 30, y: -50, w: 470, h: 560 }
const CX = 260
const FY = 487

type Pose = { rot: number; dx: number; dy: number; sx: number; sy: number }
const ease = {
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  inout: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t: number) => {
    const c = 1.9
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2)
  },
  in: (t: number) => t * t * t,
}
type EaseName = keyof typeof ease
type Key = [number, number, EaseName?]
function kf(t: number, keys: Key[]) {
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i]
    const [t0, v0] = keys[i - 1]
    if (t <= t1) {
      const u = (t - t0) / (t1 - t0)
      return v0 + (v1 - v0) * ease[e ?? 'inout'](u)
    }
  }
  return keys[keys.length - 1][1]
}

/**
 * Gelenke weich machen: Glieder blenden am Drehpunkt sanft aus, damit sie in das Teil darunter
 * uebergehen statt mit harter Kante darauf zu liegen. Werte in Rig-Einheiten (r0: unsichtbar bis, r1: voll ab).
 */
const FEATHER: Record<string, { r0: number; r1: number }> = {
  oberarm_b: { r0: 4, r1: 22 },
  oberarm_f: { r0: 4, r1: 22 },
  unterarm_b: { r0: 2, r1: 14 },
  unterarm_f: { r0: 2, r1: 12 },
  unter_l: { r0: 3, r1: 16 },
  unter_r: { r0: 3, r1: 16 },
}
/**
 * Unverblendete Kopie eines Glieds unter dem Teil, an dem es haengt. So scheint an der weichen
 * Kante nie der Hintergrund durch, sondern das Glied selbst.
 */
const BACK_Z: Record<string, number> = {
  oberarm_b: 4.9,
  oberarm_f: 4.95,
  unterarm_b: 5.45,
  unterarm_f: 5.9,
  unter_l: 2.9,
  unter_r: 2.9,
}

/** Torso: Hosenbund unten weich auslaufen lassen (Anteil der Bildhoehe) */
const TORSO_FADE = { from: 0.95, to: 1.0 }

function soften(name: string, img: HTMLImageElement, feather: boolean): HTMLImageElement {
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const x = c.getContext('2d', { willReadFrequently: true })!
  x.drawImage(img, 0, 0)
  const d = x.getImageData(0, 0, c.width, c.height)
  const a = d.data
  const r = JONTE_RIG[name]
  const f = feather ? FEATHER[name] : undefined
  const W = c.width
  for (let p = 0, i = 3; i < a.length; i += 4, p++) {
    // Kanten haerten gegen helle Naehte
    let al = Math.min(255, Math.max(0, (a[i] - 40) * 1.6))
    if (f && al) {
      const px = (p % W) / 2
      const py = Math.floor(p / W) / 2
      const dist = Math.hypot(px - r.px, py - r.py)
      const t = Math.min(1, Math.max(0, (dist - f.r0) / (f.r1 - f.r0)))
      al *= t * t * (3 - 2 * t)
    }
    if (name === 'torso' && al) {
      const v = Math.floor(p / W) / c.height
      const t = 1 - Math.min(1, Math.max(0, (v - TORSO_FADE.from) / (TORSO_FADE.to - TORSO_FADE.from)))
      al *= t
    }
    a[i] = al
  }
  x.putImageData(d, 0, 0)
  return c as unknown as HTMLImageElement
}

export default function Jonte({ trigger, className, label = 'Kapitän Jonte Rotrock' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const actRef = useRef<{ kind: Action; t: number } | null>(null)

  useEffect(() => {
    if (trigger && trigger.n > 0) actRef.current = { kind: trigger.kind, t: 0 }
  }, [trigger])

  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    const imgs: Record<string, HTMLImageElement> = {}
    const raw: Record<string, HTMLImageElement> = {}
    let alive = true
    let loaded = 0
    const names = Object.keys(JONTE_RIG)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    for (const n of names) {
      const i = new Image()
      i.onload = () => {
        loaded++
      }
      i.src = JONTE_PARTS[JONTE_RIG[n].img]
      imgs[n] = i
      i.decode?.()
        .then(() => {
          raw[n] = soften(n, i, false)
          imgs[n] = soften(n, i, true)
        })
        .catch(() => {})
    }
    const P: Record<string, Pose> = {}
    for (const k of names) P[k] = { rot: 0, dx: 0, dy: 0, sx: 1, sy: 1 }
    const root: Pose = { rot: 0, dx: 0, dy: 0, sx: 1, sy: 1 }
    const spr = { hat: { v: 0, x: 0 }, coat: { v: 0, x: 0 }, head: { v: 0, x: 0 } }
    const spring = (s: { v: number; x: number }, target: number, k: number, d: number, dt: number) => {
      s.v += (k * (target - s.x) - d * s.v) * dt
      s.x += s.v * dt
      return s.x
    }
    type Particle = { x: number; y: number; vx: number; vy: number; life: number; r: number; c: string; g: number }
    let particles: Particle[] = []
    let spawned: Record<string, boolean> = {}
    const burst = (x: number, y: number, n: number, cols: string[], sp: number, g = 300) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const s = sp * (0.4 + Math.random() * 0.8)
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.4, r: 2 + Math.random() * 3, c: cols[i % cols.length], g })
      }
    }

    let time = 0
    let last = 0
    let raf = 0

    const resize = () => {
      const r = cv.getBoundingClientRect()
      const dpr = Math.min(2.5, window.devicePixelRatio || 1)
      cv.width = Math.max(1, Math.round(r.width * dpr))
      cv.height = Math.max(1, Math.round(r.height * dpr))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(cv)

    const mat = (k: string): DOMMatrix => {
      const r = JONTE_RIG[k]
      const p = P[k]
      const px = r.x + r.px
      const py = r.y + r.py
      const M = r.parent ? mat(r.parent) : rootM()
      return M.translate(px + p.dx, py + p.dy).rotate(p.rot * 57.2958).scale(p.sx, p.sy).translate(-px, -py)
    }
    const rootM = () =>
      new DOMMatrix().translate(CX + root.dx, FY + root.dy).rotate(root.rot * 57.2958).scale(root.sx, root.sy).translate(-CX, -FY)

    const update = (dt: number) => {
      for (const k of names) Object.assign(P[k], { rot: 0, dx: 0, dy: 0, sx: 1, sy: 1 })
      Object.assign(root, { rot: 0, dx: 0, dy: 0, sx: 1, sy: 1 })
      const m = reduce ? 0.3 : 1
      const b = Math.sin(time * 2.2)
      P.torso.sy = 1 + 0.018 * b * m
      P.torso.sx = 1 - 0.008 * b * m
      P.kopf.dy = -1.5 * b * m
      P.kopf.rot = 0.025 * Math.sin(time * 1.1) * m
      P.oberarm_b.rot = 0.05 * Math.sin(time * 2.2 + 0.6) * m
      P.oberarm_f.rot = -0.04 * Math.sin(time * 2.2 + 0.4) * m
      P.unterarm_b.rot = 0.06 * Math.sin(time * 2.2 + 1.0) * m
      P.unterarm_f.rot = -0.05 * Math.sin(time * 2.2 + 0.9) * m
      P.oberarm_b.dy = -1 * b * m
      P.oberarm_f.dy = -1 * b * m
      let bodyAcc = 0
      const act = actRef.current
      if (act && !reduce) {
        act.t += dt
        const t = act.t
        const jump = kf(t, [[0, 0], [0.18, 0], [0.55, -38, 'out'], [0.9, 0, 'in'], [1.4, 0]])
        root.dy = jump
        const sq = kf(t, [[0, 1], [0.18, 0.86, 'out'], [0.3, 1.12, 'out'], [0.7, 1.02], [0.9, 1.0], [0.98, 0.88, 'out'], [1.2, 1.03, 'out'], [1.4, 1]])
        root.sy = sq
        root.sx = 1 / Math.sqrt(sq)
        P.oberarm_f.rot = kf(t, [[0, 0], [0.2, 0.25], [0.5, -2.3, 'back'], [1.0, -2.2], [1.4, 0, 'inout']])
        P.unterarm_f.rot = kf(t, [[0, 0], [0.5, -0.3, 'back'], [1.0, -0.2], [1.4, 0, 'inout']])
        // Klinge zeigt beim Hochreissen nach oben statt hinter den Kopf
        P.saebel.rot = kf(t, [[0, 0], [0.2, 0.1], [0.5, 2.45, 'back'], [1.0, 2.35], [1.4, 0, 'inout']])
        P.unter_l.rot = kf(t, [[0, 0], [0.18, 0.35, 'out'], [0.3, 0], [0.45, 0.5], [0.9, 0.1], [0.98, 0.4, 'out'], [1.3, 0]])
        P.unter_r.rot = kf(t, [[0, 0], [0.18, -0.3, 'out'], [0.3, 0], [0.45, -0.2], [0.9, 0], [0.98, -0.3, 'out'], [1.3, 0]])
        P.oberarm_b.rot += kf(t, [[0, 0], [0.2, -0.1], [0.5, 0.7, 'back'], [1.0, 0.6], [1.4, 0, 'inout']])
        P.unterarm_b.rot += kf(t, [[0, 0], [0.5, 0.6, 'back'], [1.0, 0.5], [1.4, 0, 'inout']])
        P.hut.dy = kf(t, [[0, 0], [0.3, 0], [0.62, -21, 'out'], [0.95, 0, 'in'], [1.4, 0]])
        P.hut.rot = kf(t, [[0, 0], [0.3, 0], [0.62, -0.35, 'out'], [0.95, 0.05, 'in'], [1.2, 0]])
        P.ober_l.rot = kf(t, [[0, 0], [0.45, -0.35], [0.85, 0], [1.4, 0]])
        P.ober_r.rot = kf(t, [[0, 0], [0.45, 0.25], [0.85, 0], [1.4, 0]])
        if (t >= 0.5 && !spawned.st) {
          spawned.st = true
          burst(CX + 150, 40, 18, ['#fff3b0', '#ffe27a', '#ffffff'], 160)
        }
        bodyAcc = -jump * 0.5
        if (t >= 1.4) {
          actRef.current = null
          spawned = {}
        }
      }
      const drive = Math.max(-0.25, Math.min(0.25, bodyAcc * 0.004)) + 0.02 * Math.sin(time * 2.2 - 0.8) * m
      P.hut.rot += spring(spr.hat, -drive * 1.4 + P.kopf.rot * -0.6, 120, 9, dt)
      P.mantel_r.rot = spring(spr.coat, -drive * 0.9 + 0.05 * Math.sin(time * 1.7) * m, 60, 5, dt)
      P.mantel_l.rot = -P.mantel_r.rot * 0.8 + 0.04 * Math.sin(time * 1.9 + 1) * m
      P.kopf.rot += spring(spr.head, drive * 0.6, 90, 8, dt)
      particles = particles.filter((p) => (p.life -= dt) > 0)
      for (const p of particles) {
        p.vy += p.g * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
      }
    }

    const order = [...names.map((k) => ({ k, z: JONTE_RIG[k].z, back: false })), ...Object.entries(BACK_Z).map(([k, z]) => ({ k, z, back: true }))].sort(
      (a, b) => a.z - b.z,
    )
    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, cv.width, cv.height)
      if (loaded < names.length) return
      const s = Math.min(cv.width / VIEW.w, cv.height / VIEW.h)
      const ox = (cv.width - VIEW.w * s) / 2 - VIEW.x * s
      const oy = cv.height - (VIEW.y + VIEW.h) * s
      const V = new DOMMatrix().translate(ox, oy).scale(s)
      ctx.setTransform(V)
      const sh = 1 - Math.min(0.5, -root.dy / 120)
      ctx.fillStyle = 'rgba(0,0,0,0.28)'
      ctx.beginPath()
      ctx.ellipse(CX + root.dx, FY + 2, 75 * sh, 10 * sh, 0, 0, Math.PI * 2)
      ctx.fill()
      for (const { k, back } of order) {
        ctx.setTransform(V.multiply(mat(k)))
        const r = JONTE_RIG[k]
        const im = back ? raw[k] ?? imgs[k] : imgs[k]
        // Bilder liegen in doppelter Aufloesung vor, das Rig in halber
        ctx.drawImage(im, r.x, r.y, im.width / 2, im.height / 2)
      }
      ctx.setTransform(V)
      for (const p of particles) {
        ctx.globalAlpha = Math.min(1, p.life / 0.3)
        ctx.fillStyle = p.c
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    const loop = (ts: number) => {
      if (!alive) return
      const dt = Math.min(0.05, (ts - last) / 1000 || 0.016)
      last = ts
      time += dt
      update(dt)
      draw()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={ref}
      className={className}
      role="img"
      aria-label={label}
      onClick={() => (actRef.current = { kind: 'cheer', t: 0 })}
      style={{ display: 'block', width: '100%', height: '100%', touchAction: 'manipulation' }}
    />
  )
}
