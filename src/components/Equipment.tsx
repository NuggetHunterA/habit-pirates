import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useRef, useState } from 'react'
import type { Item, Rarity, Slot } from '../game/types'
import type { Game } from '../game/store'
import { SLOTS, equippedItems, power, wearer } from '../game/equipment'
import { STAT_LABEL, STAT_ORDER, isPercent } from '../game/items'
import { SLOT_LABEL } from '../game/loot'
import { CREW, type CrewId } from '../game/foes'
import { ROLE, fullName, onBoard, pirateStats } from '../game/crewinfo'
import { portraitFor } from '../fight/art'
import ItemIcon from './ItemIcon'
import ItemSheet from './ItemSheet'
import CrewFigure from './CrewFigure'
import StatIcon from './StatIcon'
import Collection from './Collection'
import CrewOverview from './CrewOverview'
import CrewBoni from './CrewBoni'
import './Gear.css'

const ORDER: Rarity[] = ['legendaer', 'episch', 'selten', 'gewoehnlich']
type View = 'ausruesten' | 'sammelbuch' | 'crew'
const VIEW_LABEL: Record<View, string> = { ausruesten: 'Ausrüsten', sammelbuch: 'Sammelbuch', crew: 'Crew' }

/** Ausruestungs-Tab: Ausruesten je Pirat, Sammelbuch und Crewuebersicht */
export default function Equipment({ game, say, onShop }: { game: Game; say: (m: string) => void; onShop: () => void }) {
  const [view, setView] = useState<View>('ausruesten')
  const crew = onBoard(game.save!)
  const [who, setWho] = useState<CrewId>('jonte')
  const current = crew.includes(who) ? who : crew[0]
  return (
    <div className="gear">
      <div className="seg seg--dark gear__views" role="group" aria-label="Ansicht">
        {(Object.keys(VIEW_LABEL) as View[]).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
            {VIEW_LABEL[v]}
          </button>
        ))}
      </div>
      {view === 'ausruesten' ? (
        <Outfit game={game} say={say} onShop={onShop} who={current} setWho={setWho} />
      ) : view === 'sammelbuch' ? (
        <Collection game={game} />
      ) : (
        <CrewOverview
          game={game}
          onOutfit={(id) => {
            setWho(id)
            setView('ausruesten')
          }}
        />
      )}
    </div>
  )
}

function Outfit({ game, say, onShop, who, setWho }: { game: Game; say: (m: string) => void; onShop: () => void; who: CrewId; setWho: (id: CrewId) => void }) {
  const save = game.save!
  const g = save.game
  const crew = onBoard(save)
  const [filter, setFilter] = useState<Slot | 'alle'>('alle')
  const [open, setOpen] = useState<Item | null>(null)
  const [dir, setDir] = useState(1)
  const eq = equippedItems(save, who)
  const { stats, base } = pirateStats(save, who)

  /** Laderaum gestapelt: ein Feld pro Item-Art, mit Anzahl */
  const stacks = useMemo(() => {
    const by = new Map<string, Item[]>()
    for (const it of g.inventory) if (filter === 'alle' || it.slot === filter) by.set(it.key, [...(by.get(it.key) ?? []), it])
    // Im Stapel liegt das Exemplar mit den meisten Sternen vorne (wird angezeigt und angelegt)
    return Array.from(by.values(), (list) => [...list].sort((x, y) => (y.stars ?? 0) - (x.stars ?? 0))).sort(
      (a, b) => ORDER.indexOf(a[0].rarity) - ORDER.indexOf(b[0].rarity) || SLOTS.indexOf(a[0].slot) - SLOTS.indexOf(b[0].slot) || a[0].name.localeCompare(b[0].name),
    )
  }, [g.inventory, filter])

  const go = (step: number) => {
    if (crew.length < 2) return
    const i = crew.indexOf(who)
    setDir(step)
    setWho(crew[(i + step + crew.length) % crew.length])
  }
  const swipe = useRef<{ x: number; y: number } | null>(null)

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
        <ItemIcon itemKey={it?.key} slot={s} rarity={it?.rarity} size={62} stars={it?.stars} />
        <span className="gear-slot__label">{SLOT_LABEL[s]}</span>
      </button>
    )
  }

  /** Wer traegt etwas aus diesem Stapel? Eigener Pirat zuerst. */
  const stackBadge = (items: Item[]) => {
    const ws = items.map((i) => wearer(g, i.uid)).filter(Boolean) as string[]
    if (ws.includes(who) || (items[0].slot === 'schiff' && ws.includes('schiff'))) return { mine: true, text: 'Angelegt' }
    const other = ws.find((w) => w !== 'schiff') as CrewId | undefined
    return other ? { mine: false, text: CREW[other].name } : null
  }

  return (
    <>
      {crew.length > 1 && (
        <div className="gear__picker" role="tablist" aria-label="Pirat auswählen">
          {crew.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={id === who}
              className="gear__pick"
              onClick={() => {
                setDir(crew.indexOf(id) > crew.indexOf(who) ? 1 : -1)
                setWho(id)
              }}
            >
              <img src={portraitFor(id)} alt="" />
              <span>{CREW[id].name}</span>
            </button>
          ))}
          <span className="gear__pick-hint">Antippen oder über die Figur wischen</span>
        </div>
      )}

      <div
        className="gear__stage"
        onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          const s = swipe.current
          swipe.current = null
          if (!s) return
          const dx = e.clientX - s.x
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) go(dx < 0 ? 1 : -1)
        }}
      >
        <div className="gear__title">
          <div className="kicker">{ROLE[who]}</div>
          <div className="display" style={{ fontSize: 30, lineHeight: 1, color: '#fff' }}>
            {fullName(who)}
          </div>
        </div>
        <div className="gear__power" aria-label={`Kampfkraft ${power(stats)}`}>
          <StatIcon stat="krit" size={18} />
          <motion.span key={who + power(stats)} initial={{ scale: 1.6 }} animate={{ scale: 1 }}>
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
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={who}
              className="gear__hero-fig"
              custom={dir}
              initial={{ opacity: 0, x: dir * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -dir * 60 }}
              transition={{ duration: 0.22 }}
            >
              <CrewFigure look={who} label={CREW[who].title} />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="gear__col">
          {slotBtn('kleidung')}
          {slotBtn('talisman')}
        </div>
        <div className="gear__ship">
          {slotBtn('schiff')}
          <span className="gear__ship-note">gilt für alle</span>
        </div>
      </div>

      <div className="gear__stats">
        {STAT_ORDER.map((k) => {
          const extra = Math.round(((stats[k] ?? 0) - (base[k] ?? 0)) * 10) / 10
          return (
            <div key={k} className="gear__stat">
              <StatIcon stat={k} />
              <span className="gear__stat-label">{STAT_LABEL[k]}</span>
              <b>
                {Math.round((stats[k] ?? 0) * 10) / 10}
                {isPercent(k) ? ' %' : ''}
              </b>
              {extra > 0 && <em>+{extra}</em>}
            </div>
          )
        })}
      </div>

      <CrewBoni save={save} who={who} />

      <div className="gear__hold">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 className="h2">Laderaum</h2>
          <span className="muted">{g.inventory.length} Items</span>
        </div>
        <div className="chips" role="group" aria-label="Filter">
          {(['alle', ...SLOTS] as const).map((s) => (
            <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}>
              {s === 'alle' ? 'Alle' : SLOT_LABEL[s]}
            </button>
          ))}
        </div>
        {stacks.length === 0 ? (
          <div className="gear__empty">
            <p>{g.inventory.length ? 'Nichts in dieser Kategorie.' : 'Der Laderaum ist noch leer. Öffne Truhen auf der Karte oder schau im Hafenladen vorbei.'}</p>
            <button type="button" className="btn-gold" onClick={onShop}>
              Zum Hafenladen
            </button>
          </div>
        ) : (
          <div className="gear__grid">
            <AnimatePresence initial={false}>
              {stacks.map((items) => {
                const it = items[0]
                const badge = stackBadge(items)
                return (
                  <motion.button
                    layout
                    key={it.key}
                    type="button"
                    className="gear__tile"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    onClick={() => setOpen(it)}
                  >
                    <ItemIcon itemKey={it.key} slot={it.slot} rarity={it.rarity} size={68} stars={it.stars} />
                    {items.length > 1 && <span className="gear__count">×{items.length}</span>}
                    {badge && <span className={`gear__worn ${badge.mine ? '' : 'gear__worn--other'}`}>{badge.text}</span>}
                    <span className="gear__tile-name">{it.name}</span>
                  </motion.button>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>{open && <ItemSheet game={game} item={open} who={who} say={say} onClose={() => setOpen(null)} />}</AnimatePresence>
    </>
  )
}
