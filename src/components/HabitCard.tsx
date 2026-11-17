import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import type { Glass, Habit } from '../game/types'
import { RULES } from '../game/rules'

interface Props {
  habit: Habit
  done: boolean
  focus: boolean
  wind: number
  glasses: Glass[]
  onToggle: () => void
  onAddGlass: (g: Glass) => void
  onPopGlass: () => void
}

function Check() {
  return (
    <svg width="24" height="24" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Sparks() {
  return (
    <span aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * 34, y: Math.sin(a) * 34, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            style={{ position: 'absolute', left: 21, top: 21, width: 6, height: 6, borderRadius: 3, background: i % 2 ? '#FFE9A8' : '#FFFFFF' }}
          />
        )
      })}
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

export default function HabitCard({ habit, done, focus, wind, glasses, onToggle, onAddGlass, onPopGlass }: Props) {
  const [burst, setBurst] = useState(0)
  const isDrink = habit.kind === 'drink'
  const isLassen = habit.kind === 'lassen'
  const water = glasses.filter((g) => g === 'w').length
  const windWord = `+${wind} Wind`

  const toggle = () => {
    if (!done) setBurst((b) => b + 1)
    onToggle()
  }

  const sub = isDrink
    ? `${Math.min(glasses.length, RULES.drinkGlasses)} von ${RULES.drinkGlasses} Gläsern · ${water} Wasser (mind. ${RULES.drinkMinWater}) · ${windWord}`
    : isLassen
      ? `Lassen · abends bestätigen · ${windWord}`
      : windWord

  return (
    <motion.div layout className={`card habit ${done ? 'habit--done' : ''} ${focus ? 'habit--focus' : ''}`}>
      <div className="habit__row">
        {isLassen || isDrink ? (
          <span className={`coin-btn ${done ? 'coin-btn--done' : ''}`} style={{ cursor: 'default' }} aria-hidden="true">
            <AnimatePresence>
              {done && (
                <motion.span key="c" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
                  <Check />
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        ) : (
          <motion.button
            type="button"
            className={`coin-btn ${done ? 'coin-btn--done' : ''}`}
            onClick={toggle}
            aria-pressed={done}
            aria-label={(done ? 'Zurücknehmen: ' : 'Erledigt: ') + habit.name}
            whileTap={{ scale: 0.85 }}
            animate={done ? { rotateY: [0, 180, 360], scale: [1, 1.18, 1] } : { rotateY: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {done && <Check />}
            {burst > 0 && done && <Sparks key={burst} />}
          </motion.button>
        )}
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
        {focus && <span className="tag-focus">FOKUS</span>}
        {isLassen && (
          <button type="button" className={`small-btn ${done ? 'small-btn--gold' : ''}`} onClick={toggle} aria-pressed={done}>
            {done ? 'Bestätigt' : 'Bestätigen'}
          </button>
        )}
        <AnimatePresence>
          {burst > 0 && done && (
            <motion.span
              key={burst}
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 1, 1, 0], y: -34 }}
              transition={{ duration: 1.1 }}
              style={{ position: 'absolute', right: 18, color: '#1F6F8B', fontWeight: 900, fontSize: 18, pointerEvents: 'none' }}
            >
              {windWord}
            </motion.span>
          )}
        </AnimatePresence>
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
