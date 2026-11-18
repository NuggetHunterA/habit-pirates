import { useEffect, useRef } from 'react'
import { MeshRenderer, I, around, mul, type BoneMats, type MeshSpec } from '../fight/mesh'
import { FIGURES, scaleSpec } from '../fight/figures'
import { figureImage } from '../fight/art'
import type { Look } from '../game/combat'

/**
 * Ein Crewmitglied als nahtlose Mesh-Animation, wie im Kampf (gleiches Bild, gleiche Gelenkpunkte).
 * Leerlauf: Atmen, Wiegen, Kopf nickt, Arme pendeln, Kleidung weht. Antippen: kurzer Jubel-Hüpfer.
 */
export default function CrewFigure({ look, label }: { look: Look; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const cheer = useRef(-10)
  const t0 = useRef(0)

  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    const mesh = MeshRenderer.create()
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const img = new Image()
    img.src = figureImage(look)
    let spec: MeshSpec | null = null
    let raf = 0
    t0.current = performance.now()

    const pose = (s: MeshSpec, T: number, c: number): BoneMats => {
      const m = reduce ? 0.3 : 1
      const fwd = s.facesRight ? 1 : -1
      const b = Math.sin(T * 2.1)
      // Jubel: 0..1.2 s
      const up = c >= 0 && c < 1.2 ? Math.sin((c / 1.2) * Math.PI) : 0
      const lean = (s.float ? 0.03 : 0.012) * Math.sin(T * 0.9) * m
      let aRot = 0.04 * Math.sin(T * 2.1 + 0.8) * m - fwd * 0.34 * up
      let bRot = -0.04 * Math.sin(T * 2.1 + 0.3) * m + fwd * 0.28 * up
      if (s.flap) {
        const f = Math.sin(T * 9)
        aRot = 0.22 * f
        bRot = -0.22 * f
      }
      aRot *= s.armScale ?? 1
      bRot *= s.armScale ?? 1
      const squash = 1 + 0.04 * up
      const tf = {} as BoneMats
      tf.root = around(s.feet, 0, 1 / Math.sqrt(squash), squash)
      tf.body = mul(tf.root, around(s.feet, lean))
      tf.chest = mul(tf.body, around(s.waist, 0.006 * Math.sin(T * 1.3) * m, 1 - 0.006 * b * m, 1 + 0.014 * b * m))
      const headRot = 0.03 * Math.sin(T * 1.1 + 0.5) * m - lean * 1.2
      tf.head = mul(tf.chest, around(s.neck, headRot, 1, 1, 0, -1.5 * b * m))
      tf.hat = s.brow != null ? mul(tf.head, around({ x: s.neck.x, y: s.brow }, -headRot * 0.6 + 0.02 * Math.sin(T * 1.7) * m)) : tf.head
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
        const parent = i === 0 && s.armB ? tf.armB : tf.chest
        tf[bone] = mul(parent, around(pd.pivot, 0.08 * Math.sin(T * 1.4 + i * 2) * m))
      }
      return tf
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (!img.complete || !img.naturalHeight) return
      const fig = FIGURES[look]
      spec ??= scaleSpec(fig.spec, img.naturalHeight / fig.refH)
      const dpr = Math.min(2, devicePixelRatio || 1)
      const W = cv.clientWidth
      const H = cv.clientHeight
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
        cv.width = Math.round(W * dpr)
        cv.height = Math.round(H * dpr)
      }
      const T = (now - t0.current) / 1000
      const c = T - cheer.current
      const hop = c >= 0 && c < 1.2 ? -Math.sin((c / 1.2) * Math.PI) * H * 0.06 : 0
      // Figur so gross wie moeglich, Fuesse unten, etwas Luft oben fuer Arme
      const k = Math.min((H * 0.9) / img.naturalHeight, (W * 0.8) / img.naturalWidth)
      const flip = spec.facesRight ? 1 : -1
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, cv.width, cv.height)
      const M = new DOMMatrix()
        .scale(dpr, dpr)
        .translate(W / 2, H - 4 + hop)
        .scale(flip * k, k)
        .translate(-spec.feet.x, -spec.feet.y)
      ctx.setTransform(M)
      if (mesh) {
        const r = mesh.render(look + ':' + img.naturalHeight, img, spec, pose(spec, T, c), T, k * dpr)
        ctx.drawImage(mesh.canvas, 0, 0, r.sw, r.sh, r.x, r.y, r.w, r.h)
      } else {
        ctx.drawImage(img, 0, 0)
      }
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      mesh?.destroy()
    }
  }, [look])

  return (
    <canvas
      ref={ref}
      className="crew-figure"
      role="img"
      aria-label={label}
      onClick={() => {
        cheer.current = (performance.now() - t0.current) / 1000
      }}
    />
  )
}
