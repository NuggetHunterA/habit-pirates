import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import type { Item, Rarity, Slot } from '../game/types'
import type { Game } from '../game/store'
import { BASE_STATS, SLOTS, equippedItems, heroStats, power } from '../game/equipment'
import { STAT_LABEL, STAT_ORDER, isPercent } from '../game/items'
import { SLOT_LABEL } from '../game/loot'
import ItemIcon from './ItemIcon'
import ItemSheet from './ItemSheet'
import Jonte from './Jonte'
import StatIcon from './StatIcon'
import './Gear.css'

const ORDER: Rarity[] = ['legendaer', 'episch', 'selten', 'gewoehnlich']

export default function Equipment({ game, say, onShop }: { game: Game; say: (m: string) => void; onShop: () => void }) {
  const save = game.save!
  const [filter, setFilter] = useState<Slot | 'alle'>('alle')
  const [open, setOpen] = useState<Item | null>(null)
  const eq = equippedItems(save)
  const stats = heroStats(save)
  const inv = useMemo(
    () =>
      save.game.inventory
        .filter((it) => filter === 'alle' || it.slot === filter)
        .slice()
        .sort((a, b) => ORDER.indexOf(a.rarity) - ORDER.indexOf(b.rarity) || SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot)),
    [save.game.inventory, filter],
  )
  const equippedUids = new Set(Object.values(save.game.equipped))
  const slotBtn = (s: Slot) => {
    const it = eq[s]
    return (
      <button
        key={s}
        type="button"
        className={`gear-slot gear-slot--${s}`}
        onClick={() => (it ? setOpen(it) : setFilter(s))}
        aria-label={it ? `${SLOT_LABEL[s]}: ${it.name}` : `${SLOT_LABEL[s]}: leer`}
      >
        <ItemIcon itemKey={it?.key} slot={s} rarity={it?.rarity} size={62} />
        <span className="gear-slot__label">{SLOT_LABEL[s]}</span>
      </button>
    )
  }

  return (
    <motion.div className="gear" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="gear__stage">
        <div className="gear__title">
          <div className="kicker">Kapitän</div>
          <div className="display" style={{ fontSize: 30, lineHeight: 1, color: '#fff' }}>
            Jonte Rotrock
          </div>
        </div>
        <div className="gear__power" aria-label={`Kampfkraft ${power(stats)}`}>
          <StatIcon stat="krit" size={18} />
          <motion.span key={power(stats)} initial={{ scale: 1.6 }} animate={{ scale: 1 }}>
            {power(stats)}
          </motion.span>
          <small>Kampfkraft</small>
        </div>
        <div className="gear__col">
          {slotBtn('waffe')}
          {slotBtn('hut')}
        </div>
        <div className="gear__hero">
          <div className="gear__halo" />
          <Jonte />
        </div>
        <div className="gear__col">
          {slotBtn('kleidung')}
          {slotBtn('talisman')}
        </div>
        <div className="gear__ship">{slotBtn('schiff')}</div>
      </div>

      <div className="gear__stats">
        {STAT_ORDER.map((k) => {
          const extra = stats[k] - BASE_STATS[k]
          return (
            <div key={k} className="gear__stat">
              <StatIcon stat={k} />
              <span className="gear__stat-label">{STAT_LABEL[k]}</span>
              <b>
                {stats[k]}
                {isPercent(k) ? ' %' : ''}
              </b>
              {extra > 0 && <em>+{extra}</em>}
            </div>
          )
        })}
      </div>

      <div className="gear__hold">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 className="h2">Laderaum</h2>
          <span className="muted">{save.game.inventory.length} Items</span>
        </div>
        <div className="chips" role="group" aria-label="Filter">
          {(['alle', ...SLOTS] as const).map((s) => (
            <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}>
              {s === 'alle' ? 'Alle' : SLOT_LABEL[s]}
            </button>
          ))}
        </div>
        {inv.length === 0 ? (
          <div className="gear__empty">
            <p>{save.game.inventory.length ? 'Nichts in dieser Kategorie.' : 'Der Laderaum ist noch leer. Öffne Truhen auf der Karte oder schau im Hafenladen vorbei.'}</p>
            <button type="button" className="btn-gold" onClick={onShop}>
              Zum Hafenladen
            </button>
          </div>
        ) : (
          <div className="gear__grid">
            <AnimatePresence initial={false}>
              {inv.map((it) => (
                <motion.button
                  layout
                  key={it.uid}
                  type="button"
                  className="gear__tile"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  onClick={() => setOpen(it)}
                >
                  <ItemIcon itemKey={it.key} slot={it.slot} rarity={it.rarity} size={68} />
                  {equippedUids.has(it.uid) && <span className="gear__worn">Angelegt</span>}
                  <span className="gear__tile-name">{it.name}</span>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>{open && <ItemSheet game={game} item={open} say={say} onClose={() => setOpen(null)} />}</AnimatePresence>
    </motion.div>
  )
}
