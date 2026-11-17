import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
import { useState } from 'react'
import { rollChest, RARITY_LABEL, SLOT_LABEL } from '../game/loot'
import type { Item } from '../game/types'
import ItemIcon, { RARITY_COLOR } from './ItemIcon'
import Jonte from './Jonte'
import './ChestScene.css'

interface Props {
  title: string
  onCollect: (gold: number, items: Item[]) => void
}

type Phase = 'idle' | 'shake' | 'open'

function Chest({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 240 200" width="240" height="200" style={{ overflow: 'visible' }} aria-hidden="true">
      <defs>
        <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A9653A" />
          <stop offset="1" stopColor="#6B3A1A" />
        </linearGradient>
        <linearGradient id="woodLid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C27A45" />
          <stop offset="1" stopColor="#7A4220" />
        </linearGradient>
        <linearGradient id="brass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE9A8" />
          <stop offset="0.5" stopColor="#E2A73A" />
          <stop offset="1" stopColor="#9C6A1C" />
        </linearGradient>
        <radialGradient id="inner" cx="0.5" cy="1" r="0.9">
          <stop offset="0" stopColor="#FFF6C8" />
          <stop offset="0.5" stopColor="#FFD978" />
          <stop offset="1" stopColor="#B36B1E" />
        </radialGradient>
      </defs>
      {/* Schatten */}
      <ellipse cx="120" cy="188" rx="100" ry="12" fill="rgba(0,0,0,0.35)" />
      {/* Korpus */}
      <rect x="24" y="92" width="192" height="90" rx="10" fill="url(#wood)" stroke="#3B2414" strokeWidth="5" />
      {[52, 86, 120, 154, 188].map((x) => (
        <path key={x} d={`M${x} 98v78`} stroke="#5A2E12" strokeWidth="2" opacity="0.45" />
      ))}
      <rect x="24" y="118" width="192" height="12" fill="url(#brass)" stroke="#3B2414" strokeWidth="3" />
      <rect x="40" y="92" width="16" height="90" fill="url(#brass)" stroke="#3B2414" strokeWidth="3" />
      <rect x="184" y="92" width="16" height="90" fill="url(#brass)" stroke="#3B2414" strokeWidth="3" />
      {/* Schloss */}
      <g>
        <rect x="104" y="108" width="32" height="38" rx="7" fill="url(#brass)" stroke="#3B2414" strokeWidth="4" />
        <circle cx="120" cy="123" r="4.5" fill="#3B2414" />
        <path d="M120 126v9" stroke="#3B2414" strokeWidth="4" strokeLinecap="round" />
      </g>
      {/* Offener Deckel: Innenseite steht hinter dem Rand */}
      <motion.g
        initial={false}
        animate={open ? { scaleY: 1, opacity: 1 } : { scaleY: 0, opacity: 0 }}
        transition={open ? { type: 'spring', stiffness: 320, damping: 12, delay: 0.08 } : { duration: 0.1 }}
        style={{ originX: 0.5, originY: 1 }}
      >
        <path d="M30 94 L44 22 Q120 6 196 22 L210 94 Z" fill="#4A2512" stroke="#3B2414" strokeWidth="5" strokeLinejoin="round" />
        <path d="M44 86 L55 32 Q120 20 185 32 L196 86 Z" fill="#6B3A1A" />
        <path d="M30 94 L44 22 Q120 6 196 22 L210 94" fill="none" stroke="url(#brass)" strokeWidth="7" strokeLinejoin="round" />
      </motion.g>
      {/* Schatz im Inneren */}
      <motion.g initial={false} animate={{ opacity: open ? 1 : 0, y: open ? 0 : 10 }} transition={{ duration: 0.3, delay: open ? 0.1 : 0 }}>
        <ellipse cx="120" cy="96" rx="94" ry="16" fill="url(#inner)" />
        {[[70, 90], [92, 84], [114, 82], [136, 85], [158, 83], [178, 90], [104, 92], [148, 93], [124, 88]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="9" ry="5" fill="#FFD978" stroke="#9C6A1C" strokeWidth="1.5" />
        ))}
        <path d="M150 80 l6 -14 l6 14 z" fill="#4DABF7" stroke="#1C7ED6" strokeWidth="1.5" />
        <circle cx="88" cy="80" r="6" fill="#E64980" stroke="#A61E4D" strokeWidth="1.5" />
      </motion.g>
      {/* Geschlossener Deckel */}
      <motion.g
        initial={false}
        animate={open ? { scaleY: 0, y: -8 } : { scaleY: 1, y: 0 }}
        transition={{ duration: open ? 0.12 : 0.2, ease: 'easeIn' }}
        style={{ originX: 0.5, originY: 1 }}
      >
        <path d="M20 96 C20 40 220 40 220 96 Z" fill="url(#woodLid)" stroke="#3B2414" strokeWidth="5" strokeLinejoin="round" />
        <path d="M40 94 C40 58 56 50 56 50 L56 94Z M184 50 C184 50 200 58 200 94 L184 94Z" fill="url(#brass)" stroke="#3B2414" strokeWidth="3" />
        <rect x="18" y="88" width="204" height="12" rx="4" fill="url(#brass)" stroke="#3B2414" strokeWidth="3.5" />
        <path d="M70 62 C90 52 150 52 170 62" stroke="#FFF1C8" strokeWidth="4" strokeLinecap="round" opacity="0.5" fill="none" />
      </motion.g>
    </svg>
  )
}

function Coins({ n = 26 }: { n?: number }) {
  const [coins] = useState(() =>
      Array.from({ length: n }).map((_, i) => {
        const dir = (Math.random() - 0.5) * 2
        return { x: dir * (90 + Math.random() * 90), peak: -(150 + Math.random() * 130), land: 60 + Math.random() * 60, rot: Math.random() * 720 - 360, delay: (i / n) * 0.35, s: 0.7 + Math.random() * 0.5 }
      }),
  )
  return (
    <div className="chest__coins" aria-hidden="true">
      {coins.map((c, i) => (
        <motion.span
          key={i}
          className="chest__coin"
          initial={{ x: 0, y: 0, opacity: 0, scale: c.s }}
          animate={{ x: [0, c.x * 0.6, c.x], y: [0, c.peak, c.land], opacity: [0, 1, 1, 0], rotate: c.rot }}
          transition={{ duration: 1.3, delay: c.delay, ease: ['easeOut', 'easeIn'], times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  )
}

export default function ChestScene({ title, onCollect }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [loot] = useState(rollChest)
  const [cheer, setCheer] = useState({ kind: 'cheer' as const, n: 0 })
  const shake = useAnimationControls()
  const stage = useAnimationControls()
  const [shown, setShown] = useState(0)

  const open = async () => {
    if (phase !== 'idle') return
    setPhase('shake')
    await shake.start({
      rotate: [0, -4, 4, -6, 6, -9, 9, -3, 0],
      y: [0, 0, -4, 0, -8, 0, -12, 0, 0],
      transition: { duration: 0.9, ease: 'easeInOut' },
    })
    setPhase('open')
    setCheer((c) => ({ ...c, n: c.n + 1 }))
    stage.start({ x: [0, -10, 9, -6, 4, 0], y: [0, 6, -5, 3, 0], transition: { duration: 0.4 } })
    try {
      navigator.vibrate?.([30, 40, 60])
    } catch {
      /* kein Vibrieren */
    }
    loot.items.forEach((_, i) => setTimeout(() => setShown((s) => Math.max(s, i + 2)), 700 + i * 650))
    setTimeout(() => setShown((s) => Math.max(s, 1)), 450)
  }

  const isOpen = phase === 'open'

  return (
    <motion.div className="chest" animate={stage}>
      <motion.div className="chest__rays" initial={false} animate={{ opacity: isOpen ? 1 : 0, scale: isOpen ? 1 : 0.4 }} transition={{ duration: 0.8 }} />
      <AnimatePresence>{isOpen && <motion.div key="flash" className="chest__flash" initial={{ opacity: 0.95 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} />}</AnimatePresence>

      <div className="chest__content">
        <div className="kicker" style={{ color: 'var(--gold-text)' }}>
          Holztruhe · {title}
        </div>
        <motion.div className="display chest__title" key={isOpen ? 'o' : 'c'} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          {isOpen ? 'Beute!' : 'Eine Truhe!'}
        </motion.div>

        <button type="button" className="chest__btn" onClick={open} aria-label="Truhe öffnen" disabled={phase !== 'idle'}>
          <motion.div
            className="chest__glow"
            initial={false}
            animate={isOpen ? { opacity: 1, scale: 1.4 } : phase === 'shake' ? { opacity: 0.6, scale: 0.9 } : { opacity: [0.15, 0.35, 0.15], scale: 0.7 }}
            transition={isOpen || phase === 'shake' ? { duration: 0.6 } : { repeat: Infinity, duration: 2 }}
          />
          <motion.div
            animate={shake}
            style={{ originY: 0.95 }}
          >
            <motion.div animate={phase === 'idle' ? { rotate: [0, -2, 2, 0], y: [0, -3, 0] } : {}} transition={{ repeat: Infinity, duration: 1.8, repeatDelay: 0.8 }}>
              <Chest open={isOpen} />
            </motion.div>
          </motion.div>
          {isOpen && <Coins />}
          <span className="chest__jonte">
            <Jonte trigger={cheer} />
          </span>
        </button>

        {phase === 'idle' && (
          <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 1.6 }} style={{ fontSize: 16, fontWeight: 800 }}>
            Tippe auf die Truhe!
          </motion.div>
        )}

        <div className="chest__loot">
          <AnimatePresence>
            {shown >= 1 && (
              <motion.div key="gold" className="chest__item" style={{ borderColor: '#E2A73A' }} initial={{ y: -140, scale: 0.3, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
                <span className="coin" style={{ width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'var(--ink)' }}>
                  {loot.gold}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{loot.gold} Gold</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Für Laden und Werft</div>
                </div>
              </motion.div>
            )}
            {loot.items.map((it, i) =>
              shown >= i + 2 ? (
                <motion.div
                  key={it.uid}
                  className={`chest__item chest__item--${it.rarity}`}
                  style={{ borderColor: RARITY_COLOR[it.rarity].ring, boxShadow: `0 0 18px ${RARITY_COLOR[it.rarity].glow}` }}
                  initial={{ y: -160, scale: 0.2, rotate: -25, opacity: 0 }}
                  animate={{ y: 0, scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <ItemIcon slot={it.slot} rarity={it.rarity} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{it.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      {SLOT_LABEL[it.slot]} · {it.stats}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 900, padding: '3px 8px', borderRadius: 8, background: RARITY_COLOR[it.rarity].tagBg, color: RARITY_COLOR[it.rarity].tagFg }}>
                    {RARITY_LABEL[it.rarity]}
                  </span>
                </motion.div>
              ) : null,
            )}
          </AnimatePresence>
          {shown >= loot.items.length + 1 && (
            <motion.button type="button" className="btn-gold" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} onClick={() => onCollect(loot.gold, loot.items)}>
              Einsammeln
            </motion.button>
          )}
        </div>
      </div>

    </motion.div>
  )
}
