import { motion } from 'motion/react'
import { ART } from '../assets'

const PROFILES = ['Adrian', 'Ulrike']

export default function ProfilePick({ onPick }: { onPick: (p: string) => void }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', height: 300, flex: 'none', overflow: 'hidden', borderBottom: '3px solid var(--brass)', background: 'linear-gradient(#f7c98b, #f2a07a 38%, #7fb7c4 62%, #2f7f93)' }}>
        <svg viewBox="0 0 400 80" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: 90 }} aria-hidden="true">
          <motion.path
            d="M0 40 Q 50 20 100 40 T 200 40 T 300 40 T 400 40 T 500 40 V80 H0Z"
            fill="#1F6F8B"
            animate={{ x: [0, -100] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
          />
          <motion.path
            d="M0 55 Q 50 40 100 55 T 200 55 T 300 55 T 400 55 T 500 55 V80 H0Z"
            fill="#0B3A4A"
            animate={{ x: [-100, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          />
        </svg>
        <motion.img
          src={ART.schiff}
          alt="Das Piratenschiff"
          initial={{ x: -260 }}
          animate={{ x: 0, y: [0, -8, 0], rotate: [-2, 2, -2] }}
          transition={{ x: { type: 'spring', stiffness: 40, damping: 12 }, y: { repeat: Infinity, duration: 2.8 }, rotate: { repeat: Infinity, duration: 2.8 } }}
          style={{ position: 'absolute', left: '50%', bottom: 26, width: 230, marginLeft: -115 }}
        />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: 24, textAlign: 'center' }}>
        <div className="display" style={{ fontSize: 42, color: 'var(--gold-text)', lineHeight: 1 }}>
          Wer segelt hier?
        </div>
        <div style={{ fontSize: 15, maxWidth: 300 }}>Einmal auswählen, danach merkt sich das Handy deinen Namen. Jedes Profil hat ein eigenes Spiel.</div>
        <div style={{ display: 'flex', gap: 16 }}>
          {PROFILES.map((p, i) => (
            <motion.button
              key={p}
              type="button"
              onClick={() => onPick(p)}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.12 }}
              whileTap={{ scale: 0.94 }}
              className="card"
              style={{ width: 140, height: 150, borderWidth: 3, borderRadius: 18, boxShadow: '0 6px 0 var(--wood-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, fontWeight: 900, fontSize: 18 }}
            >
              <span className="coin display" style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, color: 'var(--wood-2)' }}>
                {p[0]}
              </span>
              {p}
            </motion.button>
          ))}
        </div>
        <div className="muted">Kein Passwort nötig.</div>
      </div>
    </div>
  )
}
