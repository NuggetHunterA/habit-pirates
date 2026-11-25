import { motion, useAnimationControls } from 'motion/react'
import { useEffect } from 'react'
import { ART } from '../assets'
import { RULES } from '../game/rules'

interface Props {
  wind: number
  /** Name des naechsten Felds, null am Kapitelende */
  next: string | null
  /** Kleine Zeile zum Tageswind */
  day: string
  onSail: () => void
}

/** Ereignis, wenn eine Muenze im Segel ankommt (von CoinFlight) */
export const GUST_EVENT = 'hp:gust'

/**
 * Segel oben auf dem Deck: Schiff, Wind fuer das naechste Feld und der Segeln-Knopf.
 * Ersetzt Mini-Karte, Wind-Box und Tageswind-Balken.
 */
export default function SailStrip({ wind, next, day, onSail }: Props) {
  const w = Math.max(0, wind)
  const fields = Math.floor(w / RULES.windPerField)
  const pct = Math.min(1, w / RULES.windPerField)
  const box = useAnimationControls()
  const ship = useAnimationControls()
  const num = useAnimationControls()

  // Muenze angekommen: Rahmen leuchtet, Schiff schaukelt, Zahl huepft
  useEffect(() => {
    const on = () => {
      box.start({ boxShadow: ['0 5px 0 #062631', '0 5px 0 #062631, 0 0 0 4px #ffe9a8, 0 0 30px 8px rgba(255,233,168,0.85)', '0 5px 0 #062631'], transition: { duration: 0.7 } })
      ship.start({ rotate: [0, -7, 3, 0], y: [0, -7, 1, 0], transition: { duration: 0.9, ease: 'easeInOut' } })
      num.start({ scale: [1, 1.4, 1], transition: { duration: 0.42 } })
    }
    window.addEventListener(GUST_EVENT, on)
    return () => window.removeEventListener(GUST_EVENT, on)
  }, [box, ship, num])

  return (
    <motion.section className="sailstrip" aria-label="Segel und nächstes Feld" animate={box}>
      <div className="sailstrip__ship">
        <motion.img src={ART.schiff} alt="" animate={ship} style={{ transformOrigin: '50% 90%' }} />
      </div>
      <div className="sailstrip__info">
        <div className="sailstrip__kicker">Wind im Segel</div>
        <div className="sailstrip__count">
          <motion.b animate={num}>{w}</motion.b>
          <span>{fields > 0 ? `genug für ${fields} ${fields === 1 ? 'Feld' : 'Felder'}` : `von ${RULES.windPerField} für das nächste Feld`}</span>
        </div>
        <div className="sailstrip__bar" id="sail-target">
          <motion.span initial={false} animate={{ width: `${pct * 100}%` }} transition={{ type: 'spring', stiffness: 140, damping: 14, delay: 0.15 }} />
        </div>
        <div className="sailstrip__day">{day}</div>
        <button type="button" className={`btn-gold sailstrip__btn ${fields > 0 ? '' : 'sailstrip__btn--off'}`} onClick={onSail}>
          {fields > 0 ? (next ? `Segeln · ${next}` : 'Zur Karte') : `Noch ${RULES.windPerField - (w % RULES.windPerField)} Wind`}
        </button>
      </div>
    </motion.section>
  )
}
