import { useMemo } from 'react'
import type { Item, Rarity, Slot } from '../game/types'
import type { Game } from '../game/store'
import { copiesOf, diffIfEquipped, equippedItems, wearer, wornUids } from '../game/equipment'
import { STAT_LABEL, STAT_ORDER, isPercent } from '../game/items'
import { RARITY_LABEL, SLOT_LABEL } from '../game/loot'
import { CREW, type CrewId } from '../game/foes'
import ItemIcon, { RARITY_COLOR } from './ItemIcon'
import Sheet from './Sheet'

const ORDER: Rarity[] = ['legendaer', 'episch', 'selten', 'gewoehnlich']

/**
 * Auswahl fuer einen Ausruestungsplatz: alles Passende aus dem Laderaum mit Vergleich
 * zur jetzigen Ausruestung, Anlegen und Ablegen mit einem Tipp.
 */
export default function SlotPicker({ game, slot, who, say, onClose, onDetails }: { game: Game; slot: Slot; who: CrewId; say: (m: string) => void; onClose: () => void; onDetails: (it: Item) => void }) {
  const save = game.save!
  const g = save.game
  const ship = slot === 'schiff'
  const cur = equippedItems(save, who)[slot]
  const name = CREW[who].name

  /** Eine Zeile pro Item-Art, das Exemplar mit den meisten Sternen vorne */
  const stacks = useMemo(() => {
    const by = new Map<string, Item[]>()
    for (const it of g.inventory) if (it.slot === slot) by.set(it.key, [...(by.get(it.key) ?? []), it])
    return Array.from(by.values(), (l) => [...l].sort((x, y) => (y.stars ?? 0) - (x.stars ?? 0))).sort(
      (a, b) => Number(b[0].key === cur?.key) - Number(a[0].key === cur?.key) || ORDER.indexOf(a[0].rarity) - ORDER.indexOf(b[0].rarity) || a[0].name.localeCompare(b[0].name),
    )
  }, [g.inventory, slot, cur?.key])

  const worn = wornUids(g)
  const wear = (items: Item[]) => {
    const free = items.find((c) => !worn.has(c.uid)) ?? copiesOf(g, items[0].key).find((c) => !worn.has(c.uid)) ?? items[0]
    game.equip(free.uid, who)
    say(ship ? `${free.name} ist am Schiff!` : `${name} trägt jetzt ${free.name}!`)
  }

  return (
    <Sheet onClose={onClose} label={`${SLOT_LABEL[slot]} wählen`}>
      <div className="picker__head">
        <div>
          <div className="kicker" style={{ color: 'var(--red)' }}>
            {ship ? 'gilt für die ganze Crew' : `für ${name}`}
          </div>
          <h2>{SLOT_LABEL[slot]} wählen</h2>
        </div>
        <button type="button" className="picker__close" onClick={onClose} aria-label="Schließen">
          ×
        </button>
      </div>

      <div className="picker__list">
        {stacks.length === 0 && <div className="picker__empty">Noch nichts für diesen Platz im Laderaum. Truhen, Kämpfe und der Hafen bringen Nachschub.</div>}
        {stacks.map((items) => {
          const it = items[0]
          const isCur = cur?.key === it.key
          const diff = isCur ? {} : diffIfEquipped(save, it, who)
          const keys = STAT_ORDER.filter((k) => diff[k])
          const other = !isCur && !ship ? (items.map((c) => wearer(g, c.uid)).find((w) => w && w !== who && w !== 'schiff') as CrewId | undefined) : undefined
          const c = RARITY_COLOR[it.rarity]
          return (
            <div key={it.key} className={`picker__row ${isCur ? 'picker__row--cur' : ''}`}>
              <button type="button" className="picker__item" onClick={() => onDetails(it)} aria-label={`${it.name}: Details`}>
                <ItemIcon itemKey={it.key} slot={it.slot} rarity={it.rarity} size={56} stars={it.stars} />
                <span className="picker__text">
                  <span className="picker__rarity" style={{ color: c.ring }}>
                    {RARITY_LABEL[it.rarity]}
                    {items.length > 1 ? ` · ×${items.length}` : ''}
                  </span>
                  <span className="picker__name">{it.name}</span>
                  <span className="picker__diffs">
                    {isCur
                      ? 'Angelegt'
                      : keys.length
                        ? keys.map((k) => (
                            <em key={k} className={diff[k]! > 0 ? 'up' : 'down'}>
                              {diff[k]! > 0 ? '▲' : '▼'} {STAT_LABEL[k]} {diff[k]! > 0 ? '+' : ''}
                              {diff[k]}
                              {isPercent(k) ? ' %' : ''}
                            </em>
                          ))
                        : 'gleiche Werte'}
                    {other && <span className="picker__other">trägt {CREW[other].name}</span>}
                  </span>
                </span>
              </button>
              {isCur ? (
                <button type="button" className="btn-wood picker__btn" onClick={() => game.unequip(slot, who)}>
                  Ablegen
                </button>
              ) : (
                <button type="button" className="btn-gold picker__btn" onClick={() => wear(items)}>
                  Anlegen
                </button>
              )}
            </div>
          )
        })}
      </div>
      <button type="button" className="btn-wood" onClick={onClose}>
        Fertig
      </button>
    </Sheet>
  )
}
