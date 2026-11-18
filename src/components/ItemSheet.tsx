import { useState } from 'react'
import type { Item, Stats } from '../game/types'
import type { Game } from '../game/store'
import { STAT_LABEL, STAT_ORDER, isPercent, itemBonus, itemDef, sellPrice } from '../game/items'
import { copiesOf, diffIfEquipped, equippedItems, sellableCopy, wearer, wornUids } from '../game/equipment'
import { CREW, type CrewId } from '../game/foes'
import { portraitFor } from '../fight/art'
import { RARITY_LABEL, SLOT_LABEL } from '../game/loot'
import ItemIcon, { RARITY_COLOR } from './ItemIcon'
import StatIcon from './StatIcon'
import Sheet from './Sheet'
import ItemExtras from './ItemExtras'

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

/**
 * Detailansicht eines Items im Laderaum (gestapelt nach Item-Art): Anlegen beim gewaehlten Piraten,
 * Ablegen, Doppelte verkaufen. Das letzte Exemplar laesst sich nicht verkaufen.
 */
export default function ItemSheet({ game, item, who, onClose, say }: { game: Game; item: Item; who: CrewId; onClose: () => void; say: (m: string) => void }) {
  const save = game.save!
  const g = save.game
  const [confirmSell, setConfirmSell] = useState(false)
  const ship = item.slot === 'schiff'
  const mine = equippedItems(save, who)[item.slot]
  const wornByMe = mine?.key === item.key
  const copies = copiesOf(g, item.key)
  const worn = wornUids(g)
  const free = copies.filter((c) => !worn.has(c.uid)).sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
  const others = Array.from(new Set(copies.map((c) => wearer(g, c.uid)).filter((w): w is CrewId => !!w && w !== 'schiff' && w !== who)))
  const sellable = sellableCopy(g, item.key)
  const def = itemDef(item.key)
  const c = RARITY_COLOR[item.rarity]
  const diff = wornByMe ? undefined : diffIfEquipped(save, item, who)
  const name = CREW[who].name
  return (
    <Sheet onClose={onClose} label={item.name}>
      <div className="itemsheet__head">
        <ItemIcon itemKey={item.key} slot={item.slot} rarity={item.rarity} size={96} stars={item.stars} />
        <div style={{ minWidth: 0 }}>
          <span className="rarity-tag" style={{ background: c.tagBg, color: c.tagFg }}>
            {RARITY_LABEL[item.rarity]}
          </span>
          {copies.length > 1 && (
            <span className="rarity-tag" style={{ background: '#e7ebfa', color: 'var(--ink)', marginLeft: 6 }}>
              ×{copies.length} im Laderaum
            </span>
          )}
          <h2 style={{ fontSize: 28, lineHeight: 1.05, marginTop: 4 }}>{item.name}</h2>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-soft)' }}>
            {SLOT_LABEL[item.slot]}
            {ship ? ' · gilt für die ganze Crew' : ''}
          </div>
        </div>
      </div>
      {def && <div style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--ink-soft)' }}>„{def.text}“</div>}
      <StatLines bonus={itemBonus(item)} diff={diff} />
      <ItemExtras itemKey={item.key} save={save} who={who} />
      {diff && !ship && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Pfeile: Unterschied zu {name}s jetziger Ausrüstung.</div>}
      {!wornByMe && !ship && others.length > 0 && free.length === 0 && (
        <div className="itemsheet__note">
          <img src={portraitFor(others[0])} alt="" />
          <span>
            <b>Trägt gerade {CREW[others[0]].name}.</b> Beim Anlegen wechselt es zu {name}.
          </span>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {wornByMe ? (
          <button
            type="button"
            className="btn-wood"
            style={{ minHeight: 52 }}
            onClick={() => {
              game.unequip(item.slot, who)
              onClose()
            }}
          >
            {ship ? 'Vom Schiff nehmen' : `Bei ${name} ablegen`}
          </button>
        ) : (
          <button
            type="button"
            className="btn-gold"
            onClick={() => {
              game.equip((free[0] ?? item).uid, who)
              say(ship ? `${item.name} ist am Schiff!` : `${name} trägt jetzt ${item.name}!`)
              onClose()
            }}
          >
            {ship ? 'Ans Schiff bauen' : `Bei ${name} anlegen`}
          </button>
        )}
        <button
          type="button"
          className={`small-btn ${confirmSell ? 'small-btn--danger' : ''}`}
          style={{ height: 48 }}
          disabled={!sellable}
          onClick={() => {
            if (!confirmSell) return setConfirmSell(true)
            const sold = game.sellDuplicate(item.key)
            if (sold) say(`Doppeltes verkauft: +${sellPrice(sold.rarity)} Gold`)
            onClose()
          }}
        >
          {!sellable ? (
            copies.length < 2 ? (
              'Letztes Exemplar, bleibt im Laderaum'
            ) : (
              'Alle Exemplare sind angelegt'
            )
          ) : confirmSell ? (
            'Wirklich verkaufen?'
          ) : (
            <>
              1 Doppeltes verkaufen · {sellPrice(item.rarity)}
              <span className="coin coin--sm" />
            </>
          )}
        </button>
      </div>
    </Sheet>
  )
}
