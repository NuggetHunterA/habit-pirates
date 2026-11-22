import { motion } from 'motion/react'
import { RULES } from '../game/rules'

interface Props {
  wind: number
  onSail?: () => void
  label?: string
}

/** Segel, das sich mit Wind fuellt. Voll bei RULES.windPerField Wind (= ein Feld). */
export default function SailMeter({ wind, onSail, label = 'Segeln!' }: Props) {
  const fields = Math.floor(Math.max(0, wind) / RULES.windPerField)
  const rest = Math.max(0, wind) % RULES.windPerField
  const pct = fields > 0 ? 1 : rest / RULES.windPerField
  const hint =
    fields > 0
      ? `Genug für ${fields} ${fields === 1 ? 'Feld' : 'Felder'}!`
      : `Noch ${RULES.windPerField - rest} Wind bis zum nächsten Feld`
  return (
    <div className="windbar">
      <svg width="54" height="62" viewBox="0 0 54 62" aria-hidden="true" style={{ flex: 'none' }}>
        <rect x="25" y="1" width="4" height="60" rx="2" fill="#5A3720" />
        <rect x="6" y="6" width="42" height="3" rx="1.5" fill="#5A3720" />
        <motion.path
          initial={false}
          animate={{ d: `M8 9 H46 Q ${46 + pct * 9} 28 46 48 Q 27 ${50 + pct * 7} 8 48 Q ${8 + pct * 9} 28 8 9 Z` }}
          transition={{ type: 'spring', stiffness: 90, damping: 10 }}
          fill="#F4E4C1"
          stroke="#8B5A2B"
          strokeWidth="2"
        />
        <clipPath id="sailclip">
          <path d="M8 9 H52 V60 H8 Z" />
        </clipPath>
        <motion.rect
          x="9"
          width="44"
          initial={false}
          animate={{ y: 48 - pct * 39, height: pct * 39 + 2 }}
          transition={{ type: 'spring', stiffness: 80, damping: 14 }}
          fill="#5FB3D3"
          opacity="0.75"
          clipPath="url(#sailclip)"
        />
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', color: '#fff' }}>
        <motion.span key={wind} initial={{ scale: 1.25, color: '#FFE9A8' }} animate={{ scale: 1, color: '#FFFFFF' }} style={{ fontWeight: 900, fontSize: 17, transformOrigin: 'left' }}>
          {Math.max(0, wind)} Wind
        </motion.span>
        <span style={{ fontSize: 12, color: '#BFDCE5', fontWeight: 800 }}>in den Segeln · {hint}</span>
      </div>
      {fields > 0 && onSail && (
        <motion.button type="button" className="btn-gold" style={{ minHeight: 44, fontSize: 15, padding: '0 14px' }} onClick={onSail} initial={{ scale: 0.6 }} animate={{ scale: 1 }}>
          {label}
        </motion.button>
      )}
    </div>
  )
}
