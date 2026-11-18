import { motion } from 'motion/react'
import type { Item } from '../game/types'
import { RARITY_LABEL } from '../game/loot'
import ItemIcon, { RARITY_COLOR } from './ItemIcon'

/** Gold und Items als kleine Karten, z. B. nach Kampf oder Szene */
export default function LootList({ gold, items, xp }: { gold?: number; items: Item[]; xp?: number }) {
  return (
    <div className="loot">
      {!!xp && (
        <motion.div className="loot__chip" initial={{ scale: 0 }} animate={{ scale: 1 }}>
          <b>+{xp}</b> Erfahrung
        </motion.div>
      )}
      {!!gold && (
        <motion.div className="loot__chip" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }}>
          <span className="coin" /> <b>+{gold}</b> Gold
        </motion.div>
      )}
      {items.map((it, i) => (
        <motion.div
          key={it.uid}
          className="loot__item"
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.25 + i * 0.15, type: 'spring', stiffness: 300, damping: 14 }}
          style={{ borderColor: RARITY_COLOR[it.rarity].ring, boxShadow: `0 0 16px ${RARITY_COLOR[it.rarity].glow}` }}
        >
          <ItemIcon itemKey={it.key} slot={it.slot} rarity={it.rarity} size={46} />
          <span>
            <b>{it.name}</b>
            <small style={{ background: RARITY_COLOR[it.rarity].tagBg, color: RARITY_COLOR[it.rarity].tagFg }}>{RARITY_LABEL[it.rarity]}</small>
          </span>
        </motion.div>
      ))}
    </div>
  )
}
