import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ART } from '../assets'
import { GUST_EVENT } from './SailStrip'

/** Ereignis beim Abhaken: Startpunkt der Muenze auf dem Bildschirm */
export const COIN_EVENT = 'hp:coin'

export function sendCoin(from: Element | null) {
  if (!from) return
  const r = from.getBoundingClientRect()
  window.dispatchEvent(new CustomEvent(COIN_EVENT, { detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }))
}

interface Flight {
  id: number
  x: number
  y: number
  dx: number
  dy: number
}

/** Kleine Muenzen fliegen vom Haken ins Segel (#sail-target) */
export function CoinFlight() {
  const [flights, setFlights] = useState<Flight[]>([])
  useEffect(() => {
    const on = (e: Event) => {
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail
      const t = document.getElementById('sail-target')
      if (!t) return
      const r = t.getBoundingClientRect()
      // Segel nicht zu sehen (weggescrollt): kein Flug, nur das Leuchten
      if (r.bottom < 0 || r.width === 0) return
      const id = Date.now() + Math.random()
      setFlights((f) => [...f, { id, x, y, dx: r.left + r.width * 0.6 - x, dy: r.top + r.height / 2 - y }])
    }
    window.addEventListener(COIN_EVENT, on)
    return () => window.removeEventListener(COIN_EVENT, on)
  }, [])
  return createPortal(
    <div className="coinflight" aria-hidden="true">
      {flights.map((f) => (
        <motion.span
          key={f.id}
          className="coinflight__coin"
          style={{ left: f.x - 15, top: f.y - 15 }}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{ x: f.dx, y: f.dy, scale: 0.45, opacity: [1, 1, 0] }}
          transition={{ duration: 0.55, delay: 0.22, ease: [0.5, 0, 0.8, 0.6] }}
          onAnimationComplete={() => {
            window.dispatchEvent(new Event(GUST_EVENT))
            setFlights((all) => all.filter((x) => x.id !== f.id))
          }}
        />
      ))}
    </div>,
    document.body,
  )
}

/** "Volle Segel!": Szene, wenn der letzte Habit des Tages abgehakt ist */
export function FullSail({ show, bonus, onClose }: { show: boolean; bonus: number; onClose: () => void }) {
  useEffect(() => {
    if (!show) return
    const t = setTimeout(onClose, 4200)
    return () => clearTimeout(t)
  }, [show, onClose])
  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          className="fullsail"
          role="dialog"
          aria-label="Volle Segel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.65, duration: 0.3 } }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          onClick={onClose}
        >
          {Array.from({ length: 14 }, (_, i) => (
            <span
              key={i}
              className="fullsail__coin"
              aria-hidden="true"
              style={{ left: `${(i * 37) % 100}%`, animationDuration: `${1.6 + (i % 4) * 0.35}s`, animationDelay: `${0.7 + (i % 5) * 0.18}s` }}
            />
          ))}
          <motion.div
            className="fullsail__card"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: { delay: 0.75, type: 'spring', stiffness: 260, damping: 14 } }}
          >
            <div className="fullsail__rays" aria-hidden="true" />
            <motion.img
              src={ART.schiff}
              alt=""
              className="fullsail__ship"
              animate={{ rotate: [0, -5, 3, 0], y: [0, -6, 1, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
            />
            <div className="fullsail__title">Volle Segel!</div>
            <div className="fullsail__text">Alle Habits für heute geschafft</div>
            {bonus > 0 && <div className="fullsail__bonus">+{bonus} Bonuswind</div>}
            <button type="button" className="btn-wood fullsail__btn" onClick={onClose}>
              Weiter
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
