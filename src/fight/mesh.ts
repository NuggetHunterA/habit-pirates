/**
 * Nahtlose Figuren fuer die Kampfbuehne: Ein ganzes Bild liegt auf einem Gitter,
 * das von "Knochen" sanft verbogen wird (wie Jonte an Deck). Keine Einzelteile, keine Naehte.
 *
 * Ein WebGL-Canvas rechnet jede Figur, die 2D-Buehne kopiert das Ergebnis an ihren Platz.
 */

export type V2 = { x: number; y: number }
/** 2D-Affin-Matrix [a b c d e f]: x' = a x + c y + e, y' = b x + d y + f */
export type M = [number, number, number, number, number, number]
export const I: M = [1, 0, 0, 1, 0, 0]

export const mul = (m: M, n: M): M => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
]

/** Drehen/Skalieren um einen Punkt, dann verschieben */
export function around(p: V2, rot: number, sx = 1, sy = 1, dx = 0, dy = 0): M {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  const a = c * sx
  const b = s * sx
  const cc = -s * sy
  const d = c * sy
  return [a, b, cc, d, p.x - a * p.x - cc * p.y + dx, p.y - b * p.x - d * p.y + dy]
}

export const apply = (m: M, p: V2): V2 => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] })

/** Arm, Fluegel oder Schere: Linienzug ab der Schulter, alles im Umkreis r bewegt sich mit */
export interface Limb {
  path: V2[]
  r: number
  /** weitere Linien, die zum Glied gehoeren (z. B. Dolch in der Fluegelspitze) */
  extra?: V2[][]
}

/** Haengendes Teil (Laterne, Glocke), pendelt um seinen Aufhaengepunkt */
export interface Pendant {
  x0: number
  y0: number
  x1: number
  y1: number
  pivot: V2
}

/** Bereich, der wellenfoermig weht (Mantel, Tentakel, Geisterschweif) */
export interface Wave {
  x0: number
  y0: number
  x1: number
  y1: number
  /** Ausschlag in Bildpixeln am unteren Ende */
  amp: number
  freq: number
  /** Wellen pro 100 px */
  k?: number
}

export interface MeshSpec {
  /** Bodenpunkt (bei Schwebenden: unteres Ende) */
  feet: V2
  /** Bis hier unten bleibt alles am Boden (Beine) */
  knee: number
  waist: V2
  neck: V2
  /** Oberhalb davon federt der Hut nach */
  brow?: number
  /** Waffenarm (schwingt beim Angriff) */
  armA?: Limb
  armB?: Limb
  pendants?: Pendant[]
  waves?: Wave[]
  /** schwebt: nichts ist am Boden festgemacht */
  float?: boolean
  /** Fluegelschlag statt Armpendel */
  flap?: boolean
  /** Fernkampf: Waffe zielt und schlaegt zurueck statt auszuholen */
  shoot?: boolean
  /** Bild schaut nach rechts (+x). Sonst schaut es nach links. */
  facesRight?: boolean
  /** Arme weniger weit bewegen (grosse Figuren mit Bart oder Panzer reissen sonst) */
  armScale?: number
}

export const BONES = ['root', 'body', 'chest', 'head', 'hat', 'armA', 'armB', 'pend0', 'pend1'] as const
export type Bone = (typeof BONES)[number]
export type BoneMats = Record<Bone, M>

const smooth = (e0: number, e1: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

function segDist(p: V2, a: V2, b: V2) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t))
}

function polyDist(p: V2, path: V2[]) {
  let d = Infinity
  for (let i = 0; i < path.length - 1; i++) d = Math.min(d, segDist(p, path[i], path[i + 1]))
  return d
}

function limbWeight(p: V2, l: Limb) {
  let d = polyDist(p, l.path)
  for (const e of l.extra ?? []) d = Math.min(d, polyDist(p, e))
  return smooth(l.r, l.r * 0.6, d)
}

const inRect = (p: V2, r: { x0: number; y0: number; x1: number; y1: number }, soft = 6) =>
  smooth(r.x0 - soft, r.x0 + soft, p.x) * smooth(r.x1 + soft, r.x1 - soft, p.x) * smooth(r.y0 - soft, r.y0 + soft, p.y) * smooth(r.y1 + soft, r.y1 - soft, p.y)

/** Gewichte je Gitterpunkt: wie stark welcher Knochen ihn bewegt */
function weightsFor(p: V2, s: MeshSpec): number[] {
  const w: Record<Bone, number> = { root: 1, body: 0, chest: 0, head: 0, hat: 0, armA: 0, armB: 0, pend0: 0, pend1: 0 }
  const move = (to: Bone, f: number, from: Bone[] = BONES.filter((b) => b !== to) as Bone[]) => {
    if (f <= 0) return
    for (const b of from) {
      const m = w[b] * f
      w[b] -= m
      w[to] += m
    }
  }
  const mid = s.waist.y + (s.knee - s.waist.y) * 0.35
  move('body', s.float ? 1 : smooth(s.knee, mid, p.y), ['root'])
  move('chest', smooth(s.waist.y + 30, s.waist.y - 30, p.y), ['body'])
  move('head', smooth(s.neck.y + 14, s.neck.y - 22, p.y), ['chest'])
  if (s.brow != null) move('hat', smooth(s.brow + 10, s.brow - 16, p.y), ['head'])
  if (s.armA) move('armA', limbWeight(p, s.armA))
  if (s.armB) move('armB', limbWeight(p, s.armB))
  s.pendants?.forEach((pd, i) => move(i ? 'pend1' : 'pend0', inRect(p, pd)))
  return BONES.map((b) => w[b])
}

interface Built {
  cols: number
  rows: number
  rest: V2[]
  W: Float32Array
  /** Wellen je Punkt: [Gewicht, Phase, Frequenz] */
  wave: Float32Array
  waveAmp: Float32Array
  pos: Float32Array
  uvBuf: WebGLBuffer
  idxBuf: WebGLBuffer
  count: number
  tex: WebGLTexture
  w: number
  h: number
}

const VS = `attribute vec2 a_pos; attribute vec2 a_uv; uniform vec2 u_view; varying vec2 v_uv;
void main(){ vec2 c = a_pos / u_view * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); v_uv = a_uv; }`
const FS = `precision mediump float; uniform sampler2D u_tex; varying vec2 v_uv;
void main(){ gl_FragColor = texture2D(u_tex, v_uv); }`

/** Rand um das Bild, damit Arme und Waffen beim Schwingen nicht abgeschnitten werden (Anteil der Bildgroesse) */
const PAD = 0.6
const SIZE = 1024

export class MeshRenderer {
  readonly canvas: HTMLCanvasElement
  private gl: WebGLRenderingContext
  private prog: WebGLProgram
  private posBuf: WebGLBuffer
  private aPos: number
  private aUv: number
  private uView: WebGLUniformLocation
  private built = new Map<string, Built>()

  static create(): MeshRenderer | null {
    try {
      const cv = document.createElement('canvas')
      cv.width = cv.height = SIZE
      const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: true })
      return gl ? new MeshRenderer(cv, gl) : null
    } catch {
      return null
    }
  }

  private constructor(cv: HTMLCanvasElement, gl: WebGLRenderingContext) {
    this.canvas = cv
    this.gl = gl
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
    this.prog = prog
    this.posBuf = gl.createBuffer()!
    this.aPos = gl.getAttribLocation(prog, 'a_pos')
    this.aUv = gl.getAttribLocation(prog, 'a_uv')
    this.uView = gl.getUniformLocation(prog, 'u_view')!
    gl.enableVertexAttribArray(this.aPos)
    gl.enableVertexAttribArray(this.aUv)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  }

  destroy() {
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
  }

  private build(key: string, img: HTMLImageElement, s: MeshSpec): Built {
    const { gl } = this
    const w = img.naturalWidth
    const h = img.naturalHeight
    // Gitter mit Rand: Punkte ausserhalb des Bildes sind durchsichtig, helfen aber beim Biegen
    const cols = 56
    const rows = Math.round(cols * (h / w))
    const rest: V2[] = []
    const uv: number[] = []
    const W: number[] = []
    const wave: number[] = []
    const waveAmp: number[] = []
    for (let r = 0; r <= rows; r++)
      for (let c = 0; c <= cols; c++) {
        const p = { x: (c / cols) * w, y: (r / rows) * h }
        rest.push(p)
        uv.push(c / cols, r / rows)
        W.push(...weightsFor(p, s))
        let ww = 0
        let amp = 0
        let phase = 0
        let freq = 0
        for (const wv of s.waves ?? []) {
          const f = inRect(p, wv, 10)
          if (f <= 0) continue
          // nach unten (weg vom Ansatz) staerker
          const along = Math.min(1, Math.max(0, (p.y - wv.y0) / (wv.y1 - wv.y0 || 1)))
          ww = Math.max(ww, f * along)
          amp = wv.amp
          phase = (p.y / 100) * Math.PI * 2 * (wv.k ?? 0.6)
          freq = wv.freq
        }
        wave.push(ww, phase, freq)
        waveAmp.push(amp)
      }
    const idx: number[] = []
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const i = r * (cols + 1) + c
        idx.push(i, i + 1, i + cols + 1, i + 1, i + cols + 2, i + cols + 1)
      }
    const uvBuf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW)
    const idxBuf = gl.createBuffer()!
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW)
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const b: Built = {
      cols,
      rows,
      rest,
      W: new Float32Array(W),
      wave: new Float32Array(wave),
      waveAmp: new Float32Array(waveAmp),
      pos: new Float32Array(rest.length * 2),
      uvBuf,
      idxBuf,
      count: idx.length,
      tex,
      w,
      h,
    }
    this.built.set(key, b)
    return b
  }

  /**
   * Figur verbogen zeichnen. k = Pixel pro Bildpixel.
   * Gibt den Ausschnitt im WebGL-Canvas und die Lage in Bildkoordinaten zurueck.
   */
  render(key: string, img: HTMLImageElement, spec: MeshSpec, mats: BoneMats, time: number, k: number) {
    const { gl } = this
    const b = this.built.get(key) ?? this.build(key, img, spec)
    const padX = b.w * PAD
    const padY = b.h * PAD
    const rw = b.w + padX * 2
    const rh = b.h + padY * 2
    k = Math.min(k, SIZE / rw, SIZE / rh)
    const pw = Math.max(1, Math.floor(rw * k))
    const ph = Math.max(1, Math.floor(rh * k))
    const ms = BONES.map((x) => mats[x])
    const n = BONES.length
    for (let i = 0; i < b.rest.length; i++) {
      const p = b.rest[i]
      let x = 0
      let y = 0
      for (let j = 0; j < n; j++) {
        const wj = b.W[i * n + j]
        if (!wj) continue
        const m = ms[j]
        x += wj * (m[0] * p.x + m[2] * p.y + m[4])
        y += wj * (m[1] * p.x + m[3] * p.y + m[5])
      }
      const ww = b.wave[i * 3]
      if (ww) x += Math.sin(time * b.wave[i * 3 + 2] - b.wave[i * 3 + 1]) * b.waveAmp[i] * ww
      b.pos[i * 2] = (x + padX) * k
      b.pos[i * 2 + 1] = (y + padY) * k
    }
    gl.viewport(0, SIZE - ph, pw, ph)
    // ganze Flaeche leeren: beim Skalieren liest drawImage auch Nachbarpixel
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(this.prog)
    gl.uniform2f(this.uView, pw, ph)
    gl.bindTexture(gl.TEXTURE_2D, b.tex)
    gl.bindBuffer(gl.ARRAY_BUFFER, b.uvBuf)
    gl.vertexAttribPointer(this.aUv, 2, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf)
    gl.bufferData(gl.ARRAY_BUFFER, b.pos, gl.DYNAMIC_DRAW)
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.idxBuf)
    gl.drawElements(gl.TRIANGLES, b.count, gl.UNSIGNED_SHORT, 0)
    return { sw: pw, sh: ph, x: -padX, y: -padY, w: rw, h: rh }
  }
}
