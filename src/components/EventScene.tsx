import { motion } from 'motion/react'
import type { EventId, RolledEvent } from '../game/events'
import type { Item } from '../game/types'
import { RARITY_LABEL } from '../game/loot'
import { CREW } from '../game/foes'
import { portraitFor } from '../fight/art'
import { RARITY_COLOR } from './ItemIcon'
import LootList from './LootList'
import flaschenpost from '../assets/ereignisse/flaschenpost.webp'
import haendler from '../assets/ereignisse/haendler_nebel.webp'
import geisterschiff from '../assets/ereignisse/geisterschiff.webp'
import seeungeheuer from '../assets/ereignisse/seeungeheuer.webp'
import delfine from '../assets/ereignisse/delfine.webp'
import treibgut from '../assets/ereignisse/treibgut.webp'
import './EventScene.css'

const IMAGE: Record<EventId, string> = { flaschenpost, haendler, geisterschiff, seeungeheuer, delfine, treibgut }

export interface EventResult {
  gold?: number
  wind?: number
  hint?: boolean
  item?: Item
  price?: number
}

interface Props {
  ev: RolledEvent
  /** Gold an Bord (fuer den Haendler) */
  gold: number
  onDone: (r: EventResult) => void
  onFight: (enc: string) => void
}

/** Zufallsereignis: Bild, ein Satz aus der Crew und was es bringt */
export default function EventScene({ ev, gold, onDone, onFight }: Props) {
  const o = ev.outcome
  const name = CREW[ev.speaker].name

  return (
    <div className="event">
      <div className="event__hero">
        <motion.img src={IMAGE[ev.id]} alt="" initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 1.2 }} />
        <div className="event__fade" />
        <div className="event__chip">{ev.origin === 'feld' ? `${ev.place} · Ereignis` : 'Nach dem Beutezug · Ereignis'}</div>
      </div>
      <div className="event__head">
        <div className="event__kicker">Zufallsereignis</div>
        <motion.div className="display event__title" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          {ev.title}
        </motion.div>
      </div>

      <div className="event__body">
        <motion.div className="event__note" initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <img src={portraitFor(ev.speaker)} alt="" />
          <div>
            <b>{name}:</b> {ev.line}
          </div>
        </motion.div>

        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
          {o.k === 'gold' && (
            <div className="card event__card">
              <div className="display event__card-title">Gefunden</div>
              <div className="event__text">{o.text}</div>
              <LootList gold={o.gold} items={[]} />
            </div>
          )}
          {o.k === 'hint' && (
            <div className="card event__card event__card--map">
              <div className="display event__card-title">Eine alte Schatzkarte</div>
              <div className="event__text">
                Ein Kreuz markiert eine Stelle in diesem Kapitel. Dein nächster Beutezug findet dort bessere Beute: sicher ein Item, mindestens <b style={{ color: RARITY_COLOR.selten.ring }}>selten</b>.
              </div>
              <div className="event__tags">
                <span className="event__tag" style={{ background: '#1c7ed6' }}>
                  Hinweis gespeichert
                </span>
                <span className="event__small">gilt für 1 Beutezug</span>
              </div>
            </div>
          )}
          {o.k === 'wind' && (
            <div className="card event__card">
              <div className="display event__card-title">Rückenwind</div>
              <div className="event__text">Die Delfine ziehen das Schiff ein Stück mit: +{o.wind} Wind, genug für ein Feld.</div>
            </div>
          )}
          {o.k === 'trade' && (
            <div className="card event__card">
              <div className="event__row">
                <div className="display event__card-title">Nur jetzt im Angebot</div>
                <span className="event__tag" style={{ background: RARITY_COLOR[o.item.rarity].ring }}>
                  {RARITY_LABEL[o.item.rarity]}
                </span>
              </div>
              <LootList items={[o.item]} />
              <div className="event__text">Sobald ihr weitersegelt, verschwindet der Händler wieder im Nebel.</div>
              <button
                type="button"
                className="btn-gold event__btn"
                disabled={gold < o.price}
                onClick={() => onDone({ item: o.item, price: o.price })}
              >
                Kaufen · {o.price} Gold
              </button>
              {gold < o.price && <div className="event__small" style={{ textAlign: 'center' }}>Dir fehlen {o.price - gold} Gold.</div>}
            </div>
          )}
          {o.k === 'fight' && (
            <div className="card event__card">
              <div className="event__row">
                <div className="display event__card-title">Angreifen</div>
                <span className="event__tag" style={{ background: o.hard ? '#ff4d6d' : '#f08c00' }}>
                  {o.hard ? 'Schwer' : 'Mittel'}
                </span>
              </div>
              <div className="event__text">
                {o.hard ? (
                  <>
                    Stärker als ein schwerer Beutezug. Sieg: viel Gold und ein Item, mindestens <b style={{ color: RARITY_COLOR.selten.ring }}>selten</b>. Niederlage kostet nichts.
                  </>
                ) : (
                  'So stark wie ein normaler Kampf in diesem Kapitel. Sieg: Gold und sicher ein Item. Niederlage kostet nichts.'
                )}
              </div>
              <button type="button" className="btn-gold event__btn" onClick={() => onFight(o.enc)}>
                Kampf annehmen
              </button>
            </div>
          )}
        </motion.div>
      </div>

      <div className="event__foot">
        {o.k === 'fight' || o.k === 'trade' ? (
          <button type="button" className="btn-sea event__btn" onClick={() => onDone({})}>
            {o.k === 'fight' ? 'Umfahren · kostet nichts' : 'Weitersegeln'}
          </button>
        ) : (
          <button
            type="button"
            className="btn-gold event__btn"
            onClick={() => onDone(o.k === 'gold' ? { gold: o.gold } : o.k === 'wind' ? { wind: o.wind } : { hint: true })}
          >
            {o.k === 'gold' ? 'Einsammeln' : 'Weitersegeln'}
          </button>
        )}
      </div>
    </div>
  )
}
