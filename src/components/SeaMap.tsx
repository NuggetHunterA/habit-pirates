import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { ART } from '../assets'
import { CHAPTER_1, MAP_H, MAP_W, legPath, pointAt, routeSvgPath, type Field, type FieldKind } from '../game/map'
import './SeaMap.css'

interface Props {
  field: number
  looted: number[]
  mini?: boolean
  onArrive?: (field: number) => void
  onSailingChange?: (sailing: boolean) => void
}

const SAIL_MS = 1900

const FIELD_COLOR: Record<FieldKind, string> = {
  start: '#FFF6E2',
  truhe: '#FFD978',
  insel: '#9BE3C9',
  wrack: '#C9D6DF',
  gabel: '#FFF6E2',
  gegner: '#E05A3F',
  hafen: '#8FC3D3',
  sturm: '#A7A9D9',
  boss: '#B3261E',
}

function FieldGlyph({ kind }: { kind: FieldKind }) {
  const s = { fill: 'none', stroke: '#3B2414', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (kind) {
    case 'truhe':
      return (
        <g {...s}>
          <path d="M-9 -1h18v9h-18z" />
          <path d="M-9 -1c0-7 18-7 18 0" />
          <path d="M0 -1v4" />
        </g>
      )
    case 'gegner':
      return (
        <g {...s}>
          <path d="M-8 -8l14 14M8 -8l-14 14" />
          <path d="M-9 4l5 5M9 4l-5 5" />
        </g>
      )
    case 'boss':
      return (
        <g {...s} stroke="#FFE9A8">
          <path d="M-8 2c0-7 3-10 8-10s8 3 8 10l-3 4h-10z" />
          <circle cx="-3.5" cy="0" r="1.6" fill="#FFE9A8" />
          <circle cx="3.5" cy="0" r="1.6" fill="#FFE9A8" />
        </g>
      )
    case 'insel':
      return (
        <g {...s}>
          <path d="M-9 7c5-3 13-3 18 0" />
          <path d="M0 6c0-6 1-9 3-12M3 -6c-4-2-8 0-9 3M3 -6c3-2 7-1 8 2" />
        </g>
      )
    case 'hafen':
      return (
        <g {...s}>
          <path d="M0 -9v16M-7 2c1 5 4 7 7 7s6-2 7-7M-4 -5h8" />
        </g>
      )
    case 'sturm':
      return (
        <g {...s}>
          <path d="M2 -9l-6 9h6l-4 9" />
        </g>
      )
    case 'gabel':
      return (
        <g {...s}>
          <path d="M0 9v-7M0 2l-7-8M0 2l7-8" />
        </g>
      )
    case 'wrack':
      return (
        <g {...s}>
          <path d="M-9 3h18l-4 5h-10zM-1 3v-12l7 7" />
        </g>
      )
    default:
      return <circle r="3" fill="#3B2414" />
  }
}

export default function SeaMap({ field, looted, mini = false, onArrive, onSailingChange }: Props) {
  const fields = CHAPTER_1
  const boxRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const shipRef = useRef<HTMLDivElement>(null)
  const travelRef = useRef<SVGPathElement>(null)
  const shownField = useRef(field)
  const anim = useRef<{ from: number; to: number; start: number } | null>(null)
  const size = useRef({ w: 0, h: 0 })
  const cam = useRef({ x: 0, y: 0, s: 1 })
  const route = useMemo(() => routeSvgPath(fields), [fields])
  const legs = useMemo(() => fields.slice(0, -1).map((_, i) => legPath(fields, i)), [fields])
  const shipW = mini ? 170 : 120
  const cb = useRef({ onArrive, onSailingChange })
  cb.current = { onArrive, onSailingChange }

  // Kamera und Schiff setzen (ohne React-Render, fuer fluessige 60 fps)
  const place = (x: number, y: number, dx: number, immediate: boolean) => {
    const { w, h } = size.current
    if (!w || !h) return
    const s = mini ? h / (MAP_H * 0.55) : Math.max(w / MAP_W, h / MAP_H)
    const tx = Math.min(0, Math.max(w - MAP_W * s, w / 2 - x * s))
    const ty = Math.min(0, Math.max(h - MAP_H * s, h * (mini ? 0.62 : 0.5) - y * s))
    const c = cam.current
    if (immediate) Object.assign(c, { x: tx, y: ty, s })
    else {
      c.x += (tx - c.x) * 0.12
      c.y += (ty - c.y) * 0.12
      c.s = s
    }
    if (innerRef.current) innerRef.current.style.transform = `translate(${c.x}px, ${c.y}px) scale(${c.s})`
    if (shipRef.current) {
      shipRef.current.style.transform = `translate(${x - shipW / 2}px, ${y - shipW * 0.82}px)`
      if (dx !== 0) shipRef.current.dataset.dir = dx < 0 ? 'left' : 'right'
    }
  }

  const travelledLength = (upTo: number, partial = 0) => {
    let d = ''
    for (let i = 0; i < upTo; i++) d += (d ? 'L' : 'M') + legs[i].map((p) => `${p[0]} ${p[1]}`).join(' L')
    if (partial > 0 && legs[upTo]) {
      const pts = legs[upTo]
      const n = Math.max(1, Math.round(pts.length * partial))
      d += (d ? 'L' : 'M') + pts.slice(0, n).map((p) => `${p[0]} ${p[1]}`).join(' L')
    }
    return d || 'M0 0'
  }

  useLayoutEffect(() => {
    const box = boxRef.current!
    const measure = () => {
      const r = box.getBoundingClientRect()
      size.current = { w: r.width, h: r.height }
      const f = fields[shownField.current]
      if (!anim.current) place(f.x, f.y, 0, true)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Neues Feld: Schiff segelt den Weg entlang
  useEffect(() => {
    if (field === shownField.current) return
    if (field < shownField.current || mini) {
      shownField.current = field
      const f = fields[field]
      place(f.x, f.y, 0, true)
      travelRef.current?.setAttribute('d', travelledLength(field))
      return
    }
    anim.current = { from: shownField.current, to: field, start: performance.now() }
    cb.current.onSailingChange?.(true)
    boxRef.current?.classList.add('seamap--sailing')
    let raf = 0
    let lastWake = 0
    const step = (now: number) => {
      const a = anim.current
      if (!a) return
      const legIdx = a.from
      const t = Math.min(1, (now - a.start) / SAIL_MS)
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      const p = pointAt(legs[legIdx], e)
      place(p.x, p.y, p.dx, false)
      travelRef.current?.setAttribute('d', travelledLength(legIdx, e))
      if (now - lastWake > 90 && t < 0.92 && innerRef.current) {
        lastWake = now
        const wk = document.createElement('div')
        wk.className = 'seamap__wake'
        wk.style.left = `${p.x}px`
        wk.style.top = `${p.y}px`
        innerRef.current.appendChild(wk)
        setTimeout(() => wk.remove(), 1200)
      }
      if (t < 1) raf = requestAnimationFrame(step)
      else {
        const next = legIdx + 1
        shownField.current = next
        if (next < a.to) {
          anim.current = { from: next, to: a.to, start: performance.now() }
          raf = requestAnimationFrame(step)
        } else {
          anim.current = null
          boxRef.current?.classList.remove('seamap--sailing')
          cb.current.onSailingChange?.(false)
          cb.current.onArrive?.(next)
          // Kamera sanft nachziehen
          let k = 0
          const settle = () => {
            const f = fields[next]
            place(f.x, f.y, 0, false)
            if (++k < 40) raf = requestAnimationFrame(settle)
          }
          raf = requestAnimationFrame(settle)
        }
      }
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      if (anim.current) {
        // Abbruch (z. B. Bildschirmwechsel): direkt ans Ziel
        shownField.current = anim.current.to
        anim.current = null
        const f = fields[field]
        place(f.x, f.y, 0, true)
        boxRef.current?.classList.remove('seamap--sailing')
        cb.current.onSailingChange?.(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field])

  const nodeR = mini ? 17 : 15
  return (
    <div ref={boxRef} className={`seamap ${mini ? 'seamap--mini' : ''}`}>
      <div ref={innerRef} className="seamap__inner" style={{ width: MAP_W, height: MAP_H }}>
        <img src={ART.seekarte} alt="Seekarte von Kapitel 1" className="seamap__img" draggable={false} />
        <svg className="seamap__svg" viewBox={`0 0 ${MAP_W} ${MAP_H}`} aria-hidden="true">
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d={route} fill="none" stroke="rgba(59,36,20,0.55)" strokeWidth="11" strokeLinecap="round" strokeDasharray="0.1 19" />
          <path d={route} fill="none" stroke="#FFF6E2" strokeWidth="6" strokeLinecap="round" strokeDasharray="0.1 19" />
          <path ref={travelRef} d={travelledLength(field)} fill="none" stroke="#FFD978" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
          {fields.map((f: Field, i) => {
            const passed = i < field
            const next = i === field + 1
            const done = f.kind === 'truhe' && looted.includes(i)
            const r = f.kind === 'boss' ? nodeR + 6 : nodeR
            return (
              <g key={i} transform={`translate(${f.x} ${f.y})`} opacity={passed ? 0.75 : 1}>
                {next && <circle r={r + 10} className="seamap__pulse" />}
                <circle r={r} fill={done ? '#C9B48A' : FIELD_COLOR[f.kind]} stroke="#3B2414" strokeWidth="3.5" />
                <g transform={`scale(${(r / 15) * 0.95})`}>
                  <FieldGlyph kind={f.kind} />
                </g>
              </g>
            )
          })}
        </svg>
        {!mini &&
          fields.map((f, i) =>
            i === 0 ? null : (
              <span key={i} className={`seamap__label ${i === field + 1 ? 'seamap__label--next' : ''}`} style={{ left: f.x, top: f.y + 20 }}>
                {f.name}
              </span>
            ),
          )}
        <div ref={shipRef} className="seamap__ship" style={{ width: shipW, height: shipW }} data-dir="right">
          <div className="seamap__swirl" aria-hidden="true">
            <svg viewBox="-60 -60 120 120">
              <path d="M-48 10 C-40 -40 30 -50 46 -8" />
              <path d="M44 18 C30 50 -30 52 -46 22" />
            </svg>
          </div>
          <div className="seamap__bob">
            <img src={ART.schiff} alt="Dein Schiff" draggable={false} />
          </div>
        </div>
      </div>
    </div>
  )
}
