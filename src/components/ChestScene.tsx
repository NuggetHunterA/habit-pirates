import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
import { useState } from 'react'
import { CHEST_LABEL, rollChest, RARITY_LABEL, SLOT_LABEL, type ChestKind } from '../game/loot'
import { sellPrice } from '../game/items'
import type { Item } from '../game/types'
import ItemIcon, { RARITY_COLOR } from './ItemIcon'
import ItemExtras from './ItemExtras'
import holz from '../assets/truhen/truhe_holz.webp'
import silber from '../assets/truhen/truhe_silber.webp'
import gold from '../assets/truhen/truhe_gold.webp'
import verflucht from '../assets/truhen/truhe_verflucht.webp'
import Jonte from './Jonte'
import './ChestScene.css'

const CHEST_ART: Record<ChestKind, string> = { holz, silber, gold, verflucht }

interface Props {
  title: string
  kind?: ChestKind
  /** Aktuelles Kapitel, bestimmt den Beute-Pool */
  chapter?: number
  /** Mehr Gold aus Truhen (Goldene-Moewe-Set) */
  goldBonus?: number
  /** Schon gefundene Items, um Neues und Duplikate zu zeigen */
  found?: string[]
  /** Verfluchte Truhe: Waechter schon besiegt */
  guardWon?: boolean
  /** Verfluchte Truhe: Waechter-Kampf starten oder liegen lassen */
  onGuardian?: () => void
  onLeave?: () => void
  onCollect: (gold: number, items: Item[]) => void
}

type Phase = 'idle' | 'shake' | 'open'

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

export default function ChestScene({ title, kind = 'holz', chapter = 1, goldBonus = 0, found = [], guardWon = false, onGuardian, onLeave, onCollect }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [loot] = useState(() => rollChest(kind, chapter, goldBonus))
  const [known] = useState(() => new Set(found))
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

  if (kind === 'verflucht' && !guardWon) return <Cursed title={title} onFight={onGuardian} onLeave={onLeave} />

  return (
    <motion.div className="chest" animate={stage}>
      <motion.div className="chest__rays" initial={false} animate={{ opacity: isOpen ? 1 : 0, scale: isOpen ? 1 : 0.4 }} transition={{ duration: 0.8 }} />
      <AnimatePresence>{isOpen && <motion.div key="flash" className="chest__flash" initial={{ opacity: 0.95 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} />}</AnimatePresence>

      <div className="chest__content">
        <div className="kicker" style={{ color: 'var(--gold-text)' }}>
          {CHEST_LABEL[kind]} · {title}
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
              <motion.img
                src={CHEST_ART[kind]}
                alt=""
                className="chest__img"
                draggable={false}
                initial={false}
                animate={isOpen ? { scale: [1, 1.18, 1.06], y: [0, -24, 0] } : { scale: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              />
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
                  <ItemIcon itemKey={it.key} slot={it.slot} rarity={it.rarity} size={60} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 900, padding: '2px 7px', borderRadius: 8, background: RARITY_COLOR[it.rarity].tagBg, color: RARITY_COLOR[it.rarity].tagFg }}>
                        {RARITY_LABEL[it.rarity]}
                      </span>
                      {known.has(it.key) ? (
                        <span className="chest__tag chest__tag--dup">Duplikat</span>
                      ) : (
                        <span className="chest__tag chest__tag--new">Neu</span>
                      )}
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{it.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      {known.has(it.key) ? `Für einen Stern in der Werft oder für ${sellPrice(it.rarity)} Gold verkaufen` : `${SLOT_LABEL[it.slot]} · ${it.stats}`}
                    </div>
                    {!known.has(it.key) && <ItemExtras itemKey={it.key} />}
                  </div>
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

/** Verfluchte Truhe: erst der Waechter, sonst versinkt sie */
function Cursed({ title, onFight, onLeave }: { title: string; onFight?: () => void; onLeave?: () => void }) {
  return (
    <div className="chest chest--cursed">
      <div className="chest__content">
        <div className="kicker" style={{ color: '#d0bfff' }}>
          Verfluchte Truhe · {title}
        </div>
        <div className="display chest__title">Eine verfluchte Truhe</div>
        <motion.img
          src={CHEST_ART.verflucht}
          alt=""
          className="chest__img"
          style={{ marginTop: 18 }}
          draggable={false}
          animate={{ rotate: [0, -2, 2, 0], y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, repeatDelay: 0.8 }}
        />
        <div className="chest__curse card">
          <div style={{ fontWeight: 900, fontSize: 17 }}>Ein Wächter bewacht die Truhe</div>
          <p>
            Besiegst du ihn, gehört dir die Beute: <b>mindestens ein episches Item</b>, mit etwas Glück ein legendäres, dazu viel Gold.
          </p>
          <p>
            <b>Verlierst du, versinkt die Truhe.</b> Ein zweiter Versuch ist nicht möglich.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="button" className="btn-wood" style={{ flex: 1 }} onClick={onLeave}>
              Liegen lassen
            </button>
            <button type="button" className="btn-gold" style={{ flex: 1 }} onClick={onFight}>
              Kämpfen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
