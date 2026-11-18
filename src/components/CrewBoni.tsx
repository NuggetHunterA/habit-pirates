import { useState } from 'react'
import type { Save, SetId } from '../game/types'
import { SCHOOLS, SCHOOL_ORDER, SETS, schoolCounts, schoolTier, setCounts, setTier } from '../game/schools'
import { fighters } from '../game/crewinfo'
import { CREW, type CrewId } from '../game/foes'
import { SchoolChip } from './ItemExtras'

/** Schul-Boni der kaempfenden Crew und Set-Boni des gewaehlten Piraten */
export default function CrewBoni({ save, who }: { save: Save; who: CrewId }) {
  const [all, setAll] = useState(false)
  const team = fighters(save)
  const counts = schoolCounts(save, team)
  const shown = all ? SCHOOL_ORDER : SCHOOL_ORDER.filter((s) => counts[s] > 0)
  const sets = Object.entries(setCounts(save, who)) as [SetId, number][]
  return (
    <div className="boni">
      <div className="boni__box">
        <div className="boni__head">
          <span className="boni__title">Schulen der Crew</span>
          <button type="button" className="boni__more" onClick={() => setAll((v) => !v)} aria-expanded={all}>
            {all ? 'Weniger' : 'Alle 5 zeigen'}
          </button>
        </div>
        {shown.length === 0 && <p className="boni__hint">Epische und legendäre Items gehören zu einer Schule. Ab 3 Items einer Schule in der kämpfenden Crew bekommen alle einen Bonus.</p>}
        {shown.map((s) => {
          const n = counts[s]
          const tier = schoolTier(n)
          const d = SCHOOLS[s]
          return (
            <div key={s} className="boni__row">
              <SchoolChip school={s}>
                {d.name} {n} / {tier >= 3 ? 6 : 3}
              </SchoolChip>
              {all ? (
                <span className="boni__txt">
                  <span className={tier >= 3 ? 'on' : ''}>3: {d.at3.text}</span>
                  <span className={tier >= 6 ? 'on' : ''}>6: {d.at6.text}</span>
                </span>
              ) : tier >= 6 ? (
                <span className="boni__txt on">Beide Boni aktiv</span>
              ) : tier >= 3 ? (
                <span className="boni__txt on">{d.at3.text}</span>
              ) : (
                <span className="boni__txt">noch {3 - n} bis zum Bonus</span>
              )}
            </div>
          )
        })}
        {!team.includes(who) && <p className="boni__hint">{CREW[who].name} kämpft gerade nicht mit und zählt nicht für die Schulen.</p>}
      </div>
      <div className="boni__box">
        <div className="boni__head">
          <span className="boni__title">Sets bei {CREW[who].name}</span>
          <span className="boni__hint">ab Kapitel 2</span>
        </div>
        {sets.length === 0 ? (
          <p className="boni__hint">Noch keine Set-Teile. Ab 2 Teilen desselben Sets steht hier der Bonus.</p>
        ) : (
          sets.map(([id, n]) => {
            const d = SETS[id]
            const tier = setTier(n)
            return (
              <div key={id} className="boni__row">
                <SchoolChip school={d.school}>
                  {d.name} {n} / {tier >= 2 ? 4 : 2}
                </SchoolChip>
                <span className="boni__txt">
                  <span className={tier >= 2 ? 'on' : ''}>2: {d.at2.text}</span>
                  <span className={tier >= 4 ? 'on' : ''}>4: {d.at4.text}</span>
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
