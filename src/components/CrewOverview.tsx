import type { Game } from '../game/store'
import { CREW, type CrewId } from '../game/foes'
import { ABILITIES } from '../game/combat'
import { FULL_CREW } from '../game/foes'
import { PIRATE_SLOTS, equippedItems, power } from '../game/equipment'
import { STAT_LABEL, STAT_ORDER, isPercent } from '../game/items'
import { SLOT_LABEL } from '../game/loot'
import { ROLE, crewLevel, fullName, missingCount, onBoard, pickOf, pirateStats } from '../game/crewinfo'
import { portraitFor } from '../fight/art'
import silhouette from '../assets/crew/silhouette.webp'
import ItemIcon from './ItemIcon'

/** Crewuebersicht: jeder Pirat mit Stufe, Werten, Faehigkeiten und Ausruestung. Wer noch fehlt, bleibt "???". */
export default function CrewOverview({ game, onOutfit }: { game: Game; onOutfit: (id: CrewId) => void }) {
  const save = game.save!
  const crew = onBoard(save)
  const level = crewLevel(save)
  const missing = missingCount(save)
  return (
    <div className="crewlist">
      <div className="crewlist__head">
        <h2 className="h2">Deine Crew</h2>
        <span className="muted">
          {crew.length} von {FULL_CREW.length} an Bord
        </span>
      </div>
      {crew.map((id) => {
        const { stats } = pirateStats(save, id)
        const pick = pickOf(save, id)
        const eq = equippedItems(save, id)
        return (
          <article key={id} className="crewcard">
            <div className="crewcard__head">
              <img src={portraitFor(id)} alt="" />
              <div style={{ minWidth: 0 }}>
                <div className="crewcard__role">
                  {ROLE[id]}
                  {pick.row ? ` · ${pick.row}` : ' · an Bord'}
                </div>
                <div className="display crewcard__name">{fullName(id)}</div>
              </div>
              <span className="crewcard__level">Stufe {level}</span>
            </div>
            <div className="crewcard__vals">
              {STAT_ORDER.map((k) => (
                <span key={k}>
                  {STAT_LABEL[k]}
                  <b>
                    {Math.round((stats[k] ?? 0) * 10) / 10}
                    {isPercent(k) ? ' %' : ''}
                  </b>
                </span>
              ))}
              <span>
                Kampfkraft<b>{power(stats)}</b>
              </span>
            </div>
            <div className="crewcard__abilities">
              {CREW[id].abilities.map((a) => (
                <div key={a} className={`crewcard__ability ${pick.ability === a ? 'is-on' : ''}`}>
                  {pick.ability === a && <span className="crewcard__mark">Im Kampf</span>}
                  <b>{ABILITIES[a].name}</b>
                  <div>{ABILITIES[a].text}</div>
                </div>
              ))}
            </div>
            <div className="crewcard__gear">
              {PIRATE_SLOTS.map((s) => {
                const it = eq[s]
                return (
                  <span key={s} title={it ? it.name : `${SLOT_LABEL[s]}: leer`}>
                    <ItemIcon itemKey={it?.key} slot={s} rarity={it?.rarity} size={44} />
                  </span>
                )
              })}
              <button type="button" className="btn-gold crewcard__btn" onClick={() => onOutfit(id)}>
                Ausrüsten
              </button>
            </div>
          </article>
        )
      })}
      <div className="crewlist__hint">Die Fähigkeit für den Kampf wählst du in der Kampfvorbereitung.</div>
      {Array.from({ length: missing }).map((_, i) => (
        <div key={i} className="crewcard crewcard--secret" aria-label="Noch nicht an Bord">
          <img src={silhouette} alt="" />
          <div>
            <div className="display crewcard__name">???</div>
            <div className="muted">Noch nicht an Bord</div>
          </div>
        </div>
      ))}
    </div>
  )
}
