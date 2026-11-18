import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import type { Game } from '../game/store'
import { TRADER_FROM, TRADER_PRICE, itemBonus, itemDef, traderOffer, traderOpen, traderTimes } from '../game/items'
import { diffIfEquipped } from '../game/equipment'
import { RARITY_LABEL, SLOT_LABEL } from '../game/loot'
import ItemIcon, { RARITY_COLOR } from './ItemIcon'
import ItemExtras from './ItemExtras'
import { StatLines } from './ItemSheet'
import './Gear.css'

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])
  return now
}

const left = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(m / 60)
  return h ? `${h} Std ${m % 60} Min` : `${m} Min`
}

/** Spezialhaendler: donnerstags 10 bis 22 Uhr, 3 epische Items aus dem Kapitel, ein Kauf pro Woche */
export default function Trader({ game, say }: { game: Game; say: (m: string) => void }) {
  const save = game.save!
  const g = save.game
  const now = useNow()
  const open = traderOpen(now)
  const t = traderTimes(now)
  const bought = g.trader?.week === game.week ? g.trader.bought : null
  // Angebot fuer die Woche festhalten: "neu" bezieht sich auf den Stand vor dem Kauf
  const offer = useMemo(() => traderOffer(save.profile, game.week, g.chapter, g.found.filter((k) => k !== bought)), [save.profile, game.week, g.chapter, g.found, bought])

  return (
    <motion.div className="shop" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="shop__sign">
        <div className="shop__awning shop__awning--trader" aria-hidden="true" />
        <div className="shop__board">
          <div className="display" style={{ fontSize: 30, lineHeight: 1 }}>
            Spezialhändler
          </div>
          <div style={{ fontSize: 13, fontWeight: 800 }}>Nur donnerstags, {TRADER_FROM} bis 22 Uhr</div>
        </div>
      </div>

      {!open ? (
        <div className="card trader__note">
          <div className="display" style={{ fontSize: 20 }}>
            Nächster Besuch: Donnerstag, {TRADER_FROM} Uhr
          </div>
          <p>Er bringt 3 epische Items aus dem aktuellen Kapitel mit. Eines davon kannst du kaufen, für {TRADER_PRICE} Gold.</p>
          <p className="muted">Noch {left(t.opens.getTime() - now.getTime())}.</p>
        </div>
      ) : bought ? (
        <div className="card trader__note">
          <div className="display" style={{ fontSize: 20 }}>
            Danke für den Einkauf!
          </div>
          <p>Du hast diese Woche {itemDef(bought)?.name} gekauft. Nächsten Donnerstag bringt er neue Ware.</p>
        </div>
      ) : (
        <>
          <div className="card trader__note">
            <div className="display" style={{ fontSize: 19 }}>
              Der Spezialhändler hat angelegt
            </div>
            <p>
              Ein episches Item pro Woche. Er legt ab in <b>{left(t.closes.getTime() - now.getTime())}</b>.
            </p>
          </div>
          <div className="shop__list">
            {offer.map((def, i) => {
              const afford = g.gold >= TRADER_PRICE
              const c = RARITY_COLOR[def.rarity]
              const have = g.found.includes(def.key)
              return (
                <motion.div key={def.key} className="shop__card card" style={{ borderColor: c.ring }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <ItemIcon itemKey={def.key} slot={def.slot} rarity={def.rarity} size={84} />
                  <div className="shop__info">
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="rarity-tag" style={{ background: c.tagBg, color: c.tagFg }}>
                        {RARITY_LABEL[def.rarity]}
                      </span>
                      <span className={`chest__tag ${have ? 'chest__tag--dup' : 'chest__tag--new'}`}>{have ? 'Hast du' : 'Neu'}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-soft)' }}>{SLOT_LABEL[def.slot]}</span>
                    </div>
                    <div className="shop__name">{def.name}</div>
                    <StatLines bonus={itemBonus(def)} diff={diffIfEquipped(save, { key: def.key, slot: def.slot })} />
                    <ItemExtras itemKey={def.key} />
                  </div>
                  <button
                    type="button"
                    className={`shop__buy ${afford ? '' : 'shop__buy--off'}`}
                    onClick={() => {
                      if (!afford) return say(`Dir fehlen ${TRADER_PRICE - g.gold} Gold.`)
                      const it = game.buyTrader(def.key)
                      if (it) say(`${def.name} gekauft! Liegt im Laderaum.`)
                    }}
                  >
                    <span className="coin coin--sm" />
                    {TRADER_PRICE}
                  </button>
                </motion.div>
              )
            })}
          </div>
          <p className="muted" style={{ textAlign: 'center', fontSize: 13, margin: '0 16px 16px' }}>
            Nach dem Kauf sind die anderen beiden für diese Woche weg.
          </p>
        </>
      )}
    </motion.div>
  )
}
