import { motion, useIsPresent } from 'motion/react'
import type { ReactNode } from 'react'
import { BACK, useBack } from '../game/back'

export default function Sheet({ onClose, children, label }: { onClose: () => void; children: ReactNode; label: string }) {
  // Während der Schließ-Animation zählt das Blatt schon als zu
  useBack(useIsPresent(), BACK.sheet, onClose)
  return (
    <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
