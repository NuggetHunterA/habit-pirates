import { useState } from 'react'
import type { Item, Stats } from '../game/types'
import type { Game } from '../game/store'
import { STAT_LABEL, STAT_ORDER, isPercent, itemBonus, itemDef, sellPrice } from '../game/items'
import { diffIfEquipped } from '../game/equipment'
import { RARITY_LABEL, SLOT_LABEL } from '../game/loot'
import ItemIcon, { RARITY_COLOR } from './ItemIcon'
import StatIcon from './StatIcon'
import Sheet from './Sheet'

export function StatLines({ bonus, diff }: { bonus: Partial<Stats>; diff?: Partial<Stats> }) {
  const keys = STAT_ORDER.filter((k) => bonus[k] || diff?.[k])
  if (!keys.length) return null
  return (
    <div className="statlines">
      {keys.map((k) => (
        <div key={k} className="statlines__row">
          <StatIcon stat={k} size={18} />
          <span>{STAT_LABEL[k]}</span>
          <b>{bonus[k] ? `+${bonus[k]}${isPercent(k) ? ' %' : ''}` : '–'}</b>
          {diff && diff[k] ? <em className={diff[k]! > 0 ? 'up' : 'down'}>{diff[k]! > 0 ? `▲ ${diff[k]}` : `▼ ${-diff[k]!}`}</em> : diff ? <em /> : null}
        </div>
      ))}
    </div>
  )
}

/** Detailansicht eines Items im Laderaum: Anlegen, Ablegen, Verkaufen */
export default function ItemSheet({ game, item, onClose, say }: { game: Game; item: Item; onClose: () => void; say: (m: string) => void }) {
  const save = game.save!
  const [confirmSell, setConfirmSell] = useState(false)
  const equipped = save.game.equipped[item.slot] === item.uid
  const def = itemDef(item.key)
  const c = RARITY_COLOR[item.rarity]
  const diff = equipped ? undefined : diffIfEquipped(save, item)
  return (
    <Sheet onClose={onClose} label={item.name}>
      <div className="itemsheet__head">
        <ItemIcon itemKey={item.key} slot={item.slot} rarity={item.rarity} size={96} />
        <div style={{ minWidth: 0 }}>
          <span className="rarity-tag" style={{ background: c.tagBg, color: c.tagFg }}>
            {RARITY_LABEL[item.rarity]}
          </span>
          <h2 style={{ fontSize: 28, lineHeight: 1.05, marginTop: 4 }}>{item.name}</h2>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-soft)' }}>
            {SLOT_LABEL[item.slot]}
            {item.slot === 'schiff' ? ' · gilt für die ganze Crew' : ''}
          </div>
        </div>
      </div>
      {def && <div style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--ink-soft)' }}>„{def.text}“</div>}
      <StatLines bonus={itemBonus(item)} diff={diff} />
      {diff && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Pfeile: Unterschied zu deiner jetzigen Ausrüstung.</div>}
      <div style={{ display: 'flex', gap: 10 }}>
        {equipped ? (
          <button
            type="button"
            className="btn-wood"
            style={{ flex: 1, minHeight: 52 }}
            onClick={() => {
              game.unequip(item.slot)
              onClose()
            }}
          >
            Ablegen
          </button>
        ) : (
          <button
            type="button"
            className="btn-gold"
            style={{ flex: 1 }}
            onClick={() => {
              game.equip(item.uid)
              say(`${item.name} angelegt!`)
              onClose()
            }}
          >
            Anlegen
          </button>
        )}
        <button
          type="button"
          className={`small-btn ${confirmSell ? 'small-btn--danger' : ''}`}
          style={{ height: 52, minWidth: 120 }}
          onClick={() => {
            if (!confirmSell) return setConfirmSell(true)
            game.sellItem(item.uid)
            say(`Verkauft: +${sellPrice(item.rarity)} Gold`)
            onClose()
          }}
        >
          {confirmSell ? 'Wirklich verkaufen?' : `Verkaufen · ${sellPrice(item.rarity)}`}
          {!confirmSell && <span className="coin coin--sm" />}
        </button>
      </div>
    </Sheet>
  )
}
