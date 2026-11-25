import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { BACK, useBack } from '../game/back'
import type { Game } from '../game/store'
import { PRICE, itemBonus, shopOffer, traderOpen } from '../game/items'
import Werft from './Werft'
import Trader from './Trader'
import { diffIfEquipped } from '../game/equipment'
import { RARITY_LABEL, SLOT_LABEL } from '../game/loot'
import ItemIcon, { RARITY_COLOR } from './ItemIcon'
import ItemExtras from './ItemExtras'
import { StatLines } from './ItemSheet'
import './Gear.css'
import strand from '../assets/kampf/strand.webp'

type View = 'laden' | 'werft' | 'haendler'
const VIEW_LABEL: Record<View, string> = { laden: 'Laden', werft: 'Werft', haendler: 'Händler' }
const STAND_SUB: Record<View, (open: boolean) => string> = {
  laden: () => 'Neue Ware täglich',
  werft: () => 'Ausrüstung verbessern',
  haendler: (open) => (open ? 'Heute da!' : 'Donnerstags'),
}

/** Laden-Tab: Hafenladen, Werft und Spezialhaendler */
export default function Shop({ game, say, onGear }: { game: Game; say: (m: string) => void; onGear: () => void }) {
  const [view, setView] = useState<View>('laden')
  useBack(view !== 'laden', BACK.view, () => setView('laden'))
  return (
    <div className="gear hafen">
      <div className="hafen__hero">
        <img src={strand} alt="" />
        <h1 className="place-title">Hafen</h1>
      </div>
      <div className="hafen__stands" role="group" aria-label="Stand wählen">
        {(Object.keys(VIEW_LABEL) as View[]).map((v) => (
          <button key={v} type="button" className="hafen__stand" aria-pressed={view === v} onClick={() => setView(v)}>
            <span className="hafen__stand-name">{VIEW_LABEL[v]}</span>
            <span className="hafen__stand-sub">{STAND_SUB[v](traderOpen(new Date()))}</span>
            {v === 'haendler' && traderOpen(new Date()) && <span className="seg__dot" aria-label="geöffnet" />}
          </button>
        ))}
      </div>
      {view === 'laden' ? <Harbor game={game} say={say} onGear={onGear} /> : view === 'werft' ? <Werft game={game} say={say} /> : <Trader game={game} say={say} />}
    </div>
  )
}

/** Hafenladen: vier Tagesangebote, neu ab Mitternacht */
function Harbor({ game, say, onGear }: { game: Game; say: (m: string) => void; onGear: () => void }) {
  const save = game.save!
  const offer = useMemo(() => shopOffer(save.profile, game.today, save.game.chapter), [save.profile, game.today, save.game.chapter])
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
          const diff = diffIfEquipped(save, { key: def.key, slot: def.slot })
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
                <ItemExtras itemKey={def.key} />
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
        <p>Du willst etwas loswerden? Doppelte Items kannst du im Laderaum für ein Drittel des Preises verkaufen oder in der Werft zum Verstärken nutzen.</p>
        <button type="button" className="btn-wood" onClick={onGear}>
          Zum Laderaum
        </button>
      </div>
    </motion.div>
  )
}
