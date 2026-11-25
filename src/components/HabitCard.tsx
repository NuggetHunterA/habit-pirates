import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { Glass, Habit } from '../game/types'
import { RULES } from '../game/rules'
import { sendCoin } from './Celebrate'

interface Props {
  habit: Habit
  done: boolean
  focus: boolean
  glasses: Glass[]
  onToggle: () => void
  onAddGlass: (g: Glass) => void
  onPopGlass: () => void
  /** Langes Druecken: Habit bearbeiten */
  onEdit?: () => void
  /** Rhythmus-Text, wenn nicht taeglich (z. B. "alle 2 Tage") */
  rhythm?: string
  /** Heute frei: Hinweis, wann er wieder faellig ist */
  freeText?: string
  /** Wind, den der Tag durch das letzte Abhaken dazubekommen hat */
  gain?: number
}

function Check() {
  return (
    <svg width="24" height="24" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Goldfunken, Lichtring und aufsteigender Wind beim Abhaken */
function Burst({ gain }: { gain: number }) {
  return (
    <span className="burst" aria-hidden="true">
      <span className="burst__ring" />
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} className="burst__ray" style={{ ['--a' as string]: `${i * 36}deg`, animationDelay: `${160 + (i % 3) * 30}ms`, background: i % 2 ? '#ffe9a8' : '#e2a73a' }} />
      ))}
      <span className="burst__gain">{gain > 0 ? `+${gain} Wind` : 'Geschafft!'}</span>
    </span>
  )
}

function GlassIcon({ kind, index, filled }: { kind?: Glass; index: number; filled: boolean }) {
  const color = kind === 'f' ? '#E8590C' : '#5FB3D3'
  const top = kind === 'f' ? '#FFA94D' : '#A5E3F5'
  return (
    <svg width="30" height="42" viewBox="0 0 30 42" aria-hidden="true">
      <defs>
        <clipPath id={`gl-${index}`}>
          <path d="M3 3h24l-3 34a4 4 0 0 1-4 3.5H10A4 4 0 0 1 6 37z" />
        </clipPath>
      </defs>
      <path d="M3 3h24l-3 34a4 4 0 0 1-4 3.5H10A4 4 0 0 1 6 37z" fill="rgba(255,255,255,0.55)" />
      <g clipPath={`url(#gl-${index})`}>
        <motion.g initial={false} animate={{ y: filled ? 0 : 40 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }}>
          <motion.path
            d="M-10 9 Q -2 5 6 9 T 22 9 T 38 9 T 54 9 V 45 H -10 Z"
            fill={color}
            animate={{ x: [0, -16] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
          />
          <rect x="0" y="9" width="30" height="2" fill={top} opacity="0.7" />
          {kind === 'f' && (
            <>
              <circle cx="11" cy="24" r="1.6" fill="#FFE8CC" />
              <circle cx="19" cy="30" r="1.2" fill="#FFE8CC" />
              <circle cx="15" cy="17" r="1" fill="#FFE8CC" />
            </>
          )}
        </motion.g>
      </g>
      <path d="M3 3h24l-3 34a4 4 0 0 1-4 3.5H10A4 4 0 0 1 6 37z" fill="none" stroke="#3B2414" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M8 8l1.5 24" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

export default function HabitCard({ habit, done, focus, glasses, onToggle, onAddGlass, onPopGlass, onEdit, rhythm, freeText, gain = 0 }: Props) {
  /** Belohnung: zaehlt hoch bei jedem Wechsel auf erledigt, merkt sich den Wind-Zuwachs */
  const [burst, setBurst] = useState<{ n: number; gain: number } | null>(null)
  const coinRef = useRef<HTMLElement | null>(null)
  const wasDone = useRef(done)
  useEffect(() => {
    if (done && !wasDone.current) {
      setBurst((b) => ({ n: (b?.n ?? 0) + 1, gain }))
      try {
        navigator.vibrate?.(18)
      } catch {
        /* egal */
      }
      sendCoin(coinRef.current)
      const t = setTimeout(() => setBurst(null), 1400)
      wasDone.current = done
      return () => clearTimeout(t)
    }
    if (!done) setBurst(null)
    wasDone.current = done
  }, [done, gain])
  // Langes Druecken (0,5 s) oeffnet das Bearbeiten-Blatt, der folgende Tipp zaehlt dann nicht
  const pressT = useRef(0)
  const longDone = useRef(false)
  const startPress = (e: React.PointerEvent) => {
    if (!onEdit || e.button > 0) return
    longDone.current = false
    clearTimeout(pressT.current)
    pressT.current = window.setTimeout(() => {
      longDone.current = true
      navigator.vibrate?.(15)
      onEdit()
    }, 500)
  }
  const endPress = () => clearTimeout(pressT.current)
  const isDrink = habit.kind === 'drink'
  const isLassen = habit.kind === 'lassen'
  const water = glasses.filter((g) => g === 'w').length

  const toggle = () => onToggle()

  const base = isDrink
    ? `${Math.min(glasses.length, RULES.drinkGlasses)} von ${RULES.drinkGlasses} Gläsern · ${water} Wasser (mind. ${RULES.drinkMinWater})`
    : isLassen
      ? 'Lassen · abends bestätigen'
      : focus
        ? 'Fokus · zählt doppelt'
        : done
          ? 'Erledigt'
          : 'Abhaken'
  const sub = freeText ? `${base} · ${freeText}` : rhythm && !isDrink ? `${base} · ${rhythm}` : base

  return (
    <motion.div
      layout
      className={`card habit ${burst ? 'habit--burst' : ''} ${done ? 'habit--done' : ''} ${focus ? 'habit--focus' : ''} ${freeText ? 'habit--free' : ''}`}
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={endPress}
      onPointerCancel={endPress}
      onContextMenu={(e) => onEdit && e.preventDefault()}
      onClickCapture={(e) => {
        if (longDone.current) {
          longDone.current = false
          e.stopPropagation()
          e.preventDefault()
        }
      }}
    >
      {burst && (
        <span className="habit__shine" aria-hidden="true" key={burst.n}>
          <span />
        </span>
      )}
      <div className="habit__row">
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span className="habit__name">
            {habit.name}
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={{ scaleX: done ? 1 : 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ position: 'absolute', left: 0, right: 0, top: '55%', height: 2.5, background: '#6B4423', transformOrigin: 'left', borderRadius: 2 }}
            />
          </span>
          <span className="habit__sub">{sub}</span>
        </div>
        {focus && (
          <span className="tag-focus" title="Fokus · zählt doppelt">
            ×2
          </span>
        )}
        {isLassen && (
          <button type="button" className={`small-btn ${done ? 'small-btn--gold' : ''}`} onClick={toggle} aria-pressed={done}>
            {done ? 'Bestätigt' : 'Bestätigen'}
          </button>
        )}
        <span className="coin-wrap" ref={coinRef}>
          {burst && <Burst key={burst.n} gain={burst.gain} />}
          {isLassen || isDrink ? (
            <span className={`coin-btn ${done ? 'coin-btn--done' : ''} ${burst ? 'coin-btn--stamp' : ''}`} style={{ cursor: 'default' }} aria-hidden="true">
              {done && <Check />}
            </span>
          ) : (
            <button
              type="button"
              className={`coin-btn ${done ? 'coin-btn--done' : ''} ${burst ? 'coin-btn--stamp' : ''}`}
              onClick={toggle}
              aria-pressed={done}
              aria-label={(done ? 'Zurücknehmen: ' : 'Erledigt: ') + habit.name}
            >
              {done && <Check />}
            </button>
          )}
        </span>
      </div>
      {isDrink && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 2 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="img" aria-label={`${glasses.length} Gläser getrunken, davon ${water} Wasser`}>
            {Array.from({ length: Math.max(RULES.drinkGlasses, glasses.length) }).map((_, i) => (
              <GlassIcon key={i} index={i} kind={glasses[i]} filled={i < glasses.length} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="small-btn small-btn--water" onClick={() => onAddGlass('w')}>
              + Wasser
            </button>
            <button type="button" className="small-btn small-btn--fun" onClick={() => onAddGlass('f')}>
              + Spaßgetränk
            </button>
            <button type="button" className="small-btn" style={{ width: 44, padding: 0 }} onClick={onPopGlass} aria-label="Letztes Glas leeren" disabled={!glasses.length}>
              −
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
