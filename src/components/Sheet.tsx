import { motion } from 'motion/react'
import type { ReactNode } from 'react'

export default function Sheet({ onClose, children, label }: { onClose: () => void; children: ReactNode; label: string }) {
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
