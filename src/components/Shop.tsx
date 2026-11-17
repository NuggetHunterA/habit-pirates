import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import type { Game } from '../game/store'
import { PRICE, itemBonus, shopOffer } from '../game/items'
import { diffIfEquipped } from '../game/equipment'
import { RARITY_LABEL, SLOT_LABEL } from '../game/loot'
import ItemIcon, { RARITY_COLOR } from './ItemIcon'
import { StatLines } from './ItemSheet'
import './Gear.css'

/** Laden des Haendlers: vier Tagesangebote, neu ab Mitternacht */
export default function Shop({ game, say, onGear }: { game: Game; say: (m: string) => void; onGear: () => void }) {
  const save = game.save!
  const offer = useMemo(() => shopOffer(save.profile, game.today), [save.profile, game.today])
  const bought = save.game.shop.day === game.today ? save.game.shop.bought : []
  const [flash, setFlash] = useState<string | null>(null)

  return (
    <motion.div className="shop" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="shop__sign">
        <div className="shop__awning" aria-hidden="true" />
        <div className="shop__board">
          <div className="display" style={{ fontSize: 34, lineHeight: 1 }}>
            Hafenladen
          </div>
          <div style={{ fontSize: 13, fontWeight: 800 }}>Tagesangebot · ab Mitternacht gibt es neue Ware</div>
        </div>
      </div>

      <div className="shop__list">
        {offer.map((def, i) => {
          const sold = bought.includes(def.key)
          const price = PRICE[def.rarity]
          const afford = save.game.gold >= price
          const c = RARITY_COLOR[def.rarity]
          const diff = diffIfEquipped(save, { key: def.key, slot: def.slot, uid: '', name: def.name, rarity: def.rarity, stats: '' })
          return (
            <motion.div
              key={def.key}
              className={`shop__card card ${sold ? 'shop__card--sold' : ''}`}
              style={{ borderColor: c.ring }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, scale: flash === def.key ? [1, 1.05, 1] : 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <ItemIcon itemKey={def.key} slot={def.slot} rarity={def.rarity} size={84} />
              <div className="shop__info">
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="rarity-tag" style={{ background: c.tagBg, color: c.tagFg }}>
                    {RARITY_LABEL[def.rarity]}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-soft)' }}>{SLOT_LABEL[def.slot]}</span>
                </div>
                <div className="shop__name">{def.name}</div>
                <StatLines bonus={itemBonus(def)} diff={diff} />
              </div>
              <button
                type="button"
                className={`shop__buy ${afford && !sold ? '' : 'shop__buy--off'}`}
                disabled={sold}
                onClick={() => {
                  if (!afford) return say(`Dir fehlen ${price - save.game.gold} Gold.`)
                  const it = game.buyItem(def.key)
                  if (it) {
                    setFlash(def.key)
                    say(`${def.name} gekauft! Liegt im Laderaum.`)
                  }
                }}
              >
                {sold ? (
                  'Gekauft'
                ) : (
                  <>
                    <span className="coin coin--sm" />
                    {price}
                  </>
                )}
              </button>
              <AnimatePresence>
                {sold && (
                  <motion.span className="shop__stamp" initial={{ scale: 2.4, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: -12 }}>
                    Verkauft
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      <div className="shop__foot">
        <p>Du willst etwas loswerden? Im Laderaum kannst du jedes Item für ein Drittel des Preises verkaufen.</p>
        <button type="button" className="btn-wood" onClick={onGear}>
          Zum Laderaum
        </button>
      </div>
    </motion.div>
  )
}
