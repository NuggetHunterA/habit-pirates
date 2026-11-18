import { useEffect, useRef } from 'react'
import ganz from '../assets/jonte/jonte_ganz.webp'

/**
 * Kapitaen Jonte Rotrock als nahtlose Mesh-Animation (wie Live2D, nur kleiner):
 * Ein einziges Bild liegt auf einem Gitter, das von "Knochen" sanft verbogen wird.
 * Dadurch gibt es keine Naehte an Schultern oder Hueften.
 * Leerlauf: Atmen, Wiegen, Kopf und Hut federn nach, Mantel weht, Saebelarm pendelt.
 * Antippen oder trigger: Jubeln mit Sprung, Saebel hoch und Funken.
 */

type Action = 'cheer'
interface Props {
  /** Bei jeder Aenderung startet die Aktion neu */
  trigger?: { kind: Action; n: number }
  className?: string
  label?: string
}

// Bildmasse (jonte_ganz.webp) und Ankerpunkte darin
const IMG_W = 782
const IMG_H = 1087
const FEET = { x: 400, y: 1080 }
const WAIST = { x: 430, y: 510 }
const NECK = { x: 430, y: 240 }
const HAT = { x: 415, y: 115 }
const COAT = { x: 330, y: 520 }
const SHOULDER = { x: 515, y: 290 }
const SWORD_TIP = { x: 765, y: 895 }

const COLS = 26
const ROWS = 36

type V2 = { x: number; y: number }
const smooth = (e0: number, e1: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}
function segDist(p: V2, a: V2, b: V2) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t))
}

/** 2D-Affin-Matrix [a b c d e f]: x' = a x + c y + e, y' = b x + d y + f */
type M = [number, number, number, number, number, number]
const I: M = [1, 0, 0, 1, 0, 0]
const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
]
/** Drehen/Skalieren um einen Punkt, dann verschieben */
function around(p: V2, rot: number, sx = 1, sy = 1, dx = 0, dy = 0): M {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  const a = c * sx
  const b = s * sx
  const cc = -s * sy
  const d = c * sy
  return [a, b, cc, d, p.x - a * p.x - cc * p.y + dx, p.y - b * p.x - d * p.y + dy]
}

const BONES = ['root', 'body', 'chest', 'head', 'hat', 'coat', 'arm'] as const
type Bone = (typeof BONES)[number]

/** Gewichte je Gitterpunkt: wie stark welcher Knochen ihn bewegt */
function weightsFor(p: V2): number[] {
  const w: Record<Bone, number> = { root: 1, body: 0, chest: 0, head: 0, hat: 0, coat: 0, arm: 0 }
  const move = (from: Bone[], to: Bone, f: number) => {
    for (const b of from) {
      const m = w[b] * f
      w[b] -= m
      w[to] += m
    }
  }
  // Beine bleiben stehen, darueber bewegt sich der Koerper
  move(['root'], 'body', smooth(880, 600, p.y))
  // Oberkoerper ab der Taille
  move(['body'], 'chest', smooth(560, 440, p.y))
  // Kopf
  move(['chest'], 'head', smooth(275, 215, p.y))
  // Hut: oberhalb der Stirn
  move(['head'], 'hat', smooth(140, 100, p.y))
  // Mantelschoss links: weht im Wind
  const coat = smooth(320, 200, p.x) * smooth(470, 560, p.y)
  move(['root', 'body', 'chest'], 'coat', coat)
  // Saebelarm mit Klinge
  const dArm = Math.min(segDist(p, SHOULDER, { x: 572, y: 610 }) - 44, segDist(p, { x: 560, y: 590 }, SWORD_TIP) - 62)
  move(['root', 'body', 'chest', 'coat'], 'arm', smooth(40, 0, dArm) * smooth(250, 330, p.y))
  return BONES.map((b) => w[b])
}

const VS = `attribute vec2 a_pos; attribute vec2 a_uv; uniform vec2 u_view; varying vec2 v_uv;
void main(){ vec2 c = a_pos / u_view * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); v_uv = a_uv; }`
const FS = `precision mediump float; uniform sampler2D u_tex; varying vec2 v_uv;
void main(){ gl_FragColor = texture2D(u_tex, v_uv); }`

export default function Jonte({ trigger, className, label = 'Kapitän Jonte Rotrock' }: Props) {
  const glRef = useRef<HTMLCanvasElement>(null)
  const fxRef = useRef<HTMLCanvasElement>(null)
  const actRef = useRef<{ kind: Action; t: number } | null>(null)

  useEffect(() => {
    if (trigger && trigger.n > 0) actRef.current = { kind: trigger.kind, t: 0 }
  }, [trigger])

  useEffect(() => {
    const cv = glRef.current!
    const fx = fxRef.current!
    const ctx = fx.getContext('2d')!
    const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true })
    if (!gl) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

    // ---------- Gitter ----------
    const rest: V2[] = []
    const uv: number[] = []
    const W: number[][] = []
    for (let r = 0; r <= ROWS; r++)
      for (let c = 0; c <= COLS; c++) {
        const p = { x: (c / COLS) * IMG_W, y: (r / ROWS) * IMG_H }
        rest.push(p)
        uv.push(c / COLS, r / ROWS)
        W.push(weightsFor(p))
      }
    const idx: number[] = []
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const i = r * (COLS + 1) + c
        idx.push(i, i + 1, i + COLS + 1, i + 1, i + COLS + 2, i + COLS + 1)
      }
    const pos = new Float32Array(rest.length * 2)

    // ---------- WebGL ----------
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS))
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(prog)
    gl.useProgram(prog)
    const posBuf = gl.createBuffer()
    const uvBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW)
    const aUv = gl.getAttribLocation(prog, 'a_uv')
    gl.enableVertexAttribArray(aUv)
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0)
    const aPos = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    const ib = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW)
    const uView = gl.getUniformLocation(prog, 'u_view')
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    let ready = false
    const tex = gl.createTexture()
    const img = new Image()
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      ready = true
    }
    img.src = ganz

    // ---------- Groesse ----------
    let view = { s: 1, ox: 0, oy: 0 }
    const resize = () => {
      const r = cv.getBoundingClientRect()
      const dpr = Math.min(2.5, window.devicePixelRatio || 1)
      const w = Math.max(1, Math.round(r.width * dpr))
      const h = Math.max(1, Math.round(r.height * dpr))
      cv.width = fx.width = w
      cv.height = fx.height = h
      // Platz nach oben fuer Sprung und Saebel lassen
      const s = Math.min(w / (IMG_W * 1.02), h / (IMG_H * 1.1))
      view = { s, ox: (w - IMG_W * s) / 2, oy: h - IMG_H * s - h * 0.01 }
      gl.viewport(0, 0, w, h)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(cv)

    // ---------- Federn und Partikel ----------
    const spr = { hat: { v: 0, x: 0 }, head: { v: 0, x: 0 }, coat: { v: 0, x: 0 }, arm: { v: 0, x: 0 } }
    const spring = (s: { v: number; x: number }, target: number, k: number, d: number, dt: number) => {
      s.v += (k * (target - s.x) - d * s.v) * dt
      s.x += s.v * dt
      return s.x
    }
    type Particle = { x: number; y: number; vx: number; vy: number; life: number; r: number; c: string }
    let particles: Particle[] = []
    let sparked = false
    const burst = (x: number, y: number) => {
      for (let i = 0; i < 22; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 220 * (0.4 + Math.random() * 0.8)
        particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, life: 0.5 + Math.random() * 0.4, r: 4 + Math.random() * 6, c: ['#fff3b0', '#ffe27a', '#ffffff', '#7ee0ff'][i % 4] })
      }
    }

    let time = 0
    let last = 0
    let lastJump = 0
    let raf = 0
    let alive = true
    const tf: Record<Bone, M> = { root: I, body: I, chest: I, head: I, hat: I, coat: I, arm: I }

    const update = (dt: number) => {
      const m = reduce ? 0.3 : 1
      const b = Math.sin(time * 2.1)
      let jump = 0
      let squash = 1
      let armUp = 0
      let lean = 0
      const act = actRef.current
      if (act && !reduce) {
        act.t += dt
        const t = act.t
        const k = (keys: [number, number][]) => {
          if (t <= keys[0][0]) return keys[0][1]
          for (let i = 1; i < keys.length; i++) {
            if (t <= keys[i][0]) {
              const u = (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])
              const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
              return keys[i - 1][1] + (keys[i][1] - keys[i - 1][1]) * e
            }
          }
          return keys[keys.length - 1][1]
        }
        squash = k([[0, 1], [0.16, 0.9], [0.32, 1.06], [0.7, 1.0], [0.86, 0.93], [1.05, 1.02], [1.25, 1]])
        jump = k([[0, 0], [0.16, 0], [0.5, -70], [0.86, 0], [1.3, 0]])
        armUp = k([[0, 0], [0.14, 0.05], [0.45, -0.2], [0.95, -0.17], [1.35, 0]])
        lean = k([[0, 0], [0.16, 0.04], [0.5, -0.03], [0.9, 0], [1.3, 0]])
        if (t > 0.48 && !sparked) {
          sparked = true
          const tip = apply(tf.arm, SWORD_TIP)
          burst(tip.x, tip.y)
        }
        if (t >= 1.4) {
          actRef.current = null
          sparked = false
        }
      }
      const vel = (jump - lastJump) / Math.max(dt, 0.001) / 60
      lastJump = jump
      const swayRot = 0.012 * Math.sin(time * 0.9) * m + lean
      // Wurzel: Sprung und Stauchen an den Fuessen
      tf.root = around(FEET, 0, 1 / Math.sqrt(squash), squash, 0, jump)
      // Koerper wiegt um die Fuesse
      tf.body = mul(tf.root, around(FEET, swayRot))
      // Brust atmet (Hoehe) um die Taille
      tf.chest = mul(tf.body, around(WAIST, 0.008 * Math.sin(time * 1.3) * m, 1 - 0.006 * b * m, 1 + 0.014 * b * m))
      // Kopf: leichtes Nicken und Nachfedern
      const headRot = 0.03 * Math.sin(time * 1.1 + 0.5) * m + spring(spr.head, -swayRot * 1.5 + vel * 0.004, 70, 7, dt)
      tf.head = mul(tf.chest, around(NECK, headRot, 1, 1, 0, -2.5 * b * m))
      // Hut federt nach, hebt beim Sprung kurz ab
      const hatRot = spring(spr.hat, -headRot * 0.8 + vel * 0.012, 90, 6, dt)
      tf.hat = mul(tf.head, around(HAT, hatRot, 1, 1, 0, Math.min(0, vel * 0.9)))
      // Mantelschoss weht im Wind
      const wind = 0.05 * Math.sin(time * 1.7) + 0.025 * Math.sin(time * 3.1 + 1)
      const coatRot = spring(spr.coat, wind * m + vel * 0.006, 40, 4, dt)
      tf.coat = mul(tf.body, around(COAT, coatRot, 1 + 0.02 * Math.sin(time * 1.7 + 0.4) * m, 1))
      // Saebelarm pendelt, beim Jubeln hoch
      const armRot = spring(spr.arm, armUp + 0.03 * Math.sin(time * 2.1 + 0.8) * m, 120, 13, dt)
      tf.arm = mul(tf.chest, around(SHOULDER, armRot))

      particles = particles.filter((p) => (p.life -= dt) > 0)
      for (const p of particles) {
        p.vy += 420 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
      }
    }

    const apply = (m: M, p: V2): V2 => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] })

    const draw = () => {
      if (!ready) return
      const mats = BONES.map((b) => tf[b])
      for (let i = 0; i < rest.length; i++) {
        const p = rest[i]
        const w = W[i]
        let x = 0
        let y = 0
        for (let j = 0; j < mats.length; j++) {
          const wj = w[j]
          if (!wj) continue
          const m = mats[j]
          x += wj * (m[0] * p.x + m[2] * p.y + m[4])
          y += wj * (m[1] * p.x + m[3] * p.y + m[5])
        }
        pos[i * 2] = view.ox + x * view.s
        pos[i * 2 + 1] = view.oy + y * view.s
      }
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(uView, cv.width, cv.height)
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
      gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW)
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0)

      // Schatten und Funken
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, fx.width, fx.height)
      ctx.setTransform(view.s, 0, 0, view.s, view.ox, view.oy)
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
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [])

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={glRef}
        role="img"
        aria-label={label}
        onClick={() => (actRef.current = { kind: 'cheer', t: 0 })}
        style={{ position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%', touchAction: 'manipulation' }}
      />
      <canvas ref={fxRef} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
    </div>
  )
}
