import { AnimatePresence } from 'motion/react'
import { useState } from 'react'
import type { Game } from '../game/store'
import type { Rarity, Slot } from '../game/types'
import { CATALOG, itemBonus, type ItemDef } from '../game/items'
import { RARITY_LABEL, SLOT_LABEL } from '../game/loot'
import { SLOTS, copiesOf } from '../game/equipment'
import ItemIcon, { RARITY_COLOR } from './ItemIcon'
import ItemExtras from './ItemExtras'
import { StatLines } from './ItemSheet'
import Sheet from './Sheet'

const ORDER: Rarity[] = ['gewoehnlich', 'selten', 'episch', 'legendaer']
const GROUP: Record<Slot, string> = { waffe: 'Waffen', hut: 'Hüte', kleidung: 'Kleidung', talisman: 'Talismane', schiff: 'Schiffsteile' }

/** Sammelbuch: alle Items, gefundene in Farbe, die anderen als Umriss in ihrer Seltenheitsfarbe */
export default function Collection({ game }: { game: Game }) {
  const g = game.save!.game
  const found = new Set(g.found ?? [])
  const total = CATALOG.length
  const have = CATALOG.filter((d) => found.has(d.key)).length
  const [open, setOpen] = useState<ItemDef | null>(null)
  return (
    <div className="book">
      <div className="book__head">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 className="h2">
            {have} von {total} gefunden
          </h2>
          <span className="muted">{Math.round((100 * have) / total)} %</span>
        </div>
        <div className="xpbar book__bar">
          <span style={{ width: `${(100 * have) / total}%` }} />
        </div>
      </div>
      {SLOTS.map((slot) => {
        const defs = CATALOG.filter((d) => d.slot === slot).sort((a, b) => ORDER.indexOf(a.rarity) - ORDER.indexOf(b.rarity))
        const n = defs.filter((d) => found.has(d.key)).length
        return (
          <section key={slot} className="book__group">
            <div className="book__group-head">
              <h3 className="display">{GROUP[slot]}</h3>
              <span className="muted">
                {n} / {defs.length}
              </span>
            </div>
            <div className="book__grid">
              {defs.map((d) =>
                found.has(d.key) ? (
                  <button key={d.key} type="button" className="book__tile" onClick={() => setOpen(d)}>
                    <ItemIcon itemKey={d.key} slot={d.slot} rarity={d.rarity} size={60} />
                    <span className="book__name">{d.name}</span>
                  </button>
                ) : (
                  <div key={d.key} className="book__tile" aria-label={`Noch nicht gefunden, ${RARITY_LABEL[d.rarity]}`}>
                    <span className="book__unknown" style={{ borderColor: RARITY_COLOR[d.rarity].ring, color: RARITY_COLOR[d.rarity].ring }}>
                      ?
                    </span>
                    <span className="book__name">???</span>
                  </div>
                ),
              )}
            </div>
          </section>
        )
      })}
      <AnimatePresence>
        {open && (
          <Sheet onClose={() => setOpen(null)} label={open.name}>
            <div className="itemsheet__head">
              <ItemIcon itemKey={open.key} slot={open.slot} rarity={open.rarity} size={96} />
              <div style={{ minWidth: 0 }}>
                <span className="rarity-tag" style={{ background: RARITY_COLOR[open.rarity].tagBg, color: RARITY_COLOR[open.rarity].tagFg }}>
                  {RARITY_LABEL[open.rarity]}
                </span>
                <h2 style={{ fontSize: 28, lineHeight: 1.05, marginTop: 4 }}>{open.name}</h2>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-soft)' }}>{SLOT_LABEL[open.slot]}</div>
              </div>
            </div>
            <div style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--ink-soft)' }}>„{open.text}“</div>
            <StatLines bonus={itemBonus(open)} />
            <ItemExtras itemKey={open.key} />
            <div style={{ fontSize: 14, fontWeight: 800 }}>Im Laderaum: {copiesOf(g, open.key).length}</div>
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  )
}
