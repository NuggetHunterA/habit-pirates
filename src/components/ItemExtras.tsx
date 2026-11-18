import type { Save } from '../game/types'
import { itemDef } from '../game/items'
import { SCHOOLS, SETS, schoolCounts, schoolTier, setCounts, setTier } from '../game/schools'
import { fighters } from '../game/crewinfo'
import { CREW, type CrewId } from '../game/foes'

/** Schul-Chip in der Farbe der Schule */
export function SchoolChip({ school, children }: { school: keyof typeof SCHOOLS; children?: React.ReactNode }) {
  return (
    <span className="school-chip" style={{ background: SCHOOLS[school].color }}>
      {children ?? SCHOOLS[school].name}
    </span>
  )
}

/**
 * Effekt, Schule und Set eines Items. Mit save und who zeigt es auch,
 * wie weit Crew und Pirat schon sind.
 */
export default function ItemExtras({ itemKey, save, who }: { itemKey: string; save?: Save; who?: CrewId }) {
  const def = itemDef(itemKey)
  if (!def || (!def.effect && !def.school && !def.set)) return null
  const sc = def.school && save ? schoolCounts(save, Array.from(new Set([...fighters(save), ...(who ? [who] : [])])))[def.school] : null
  const set = def.set ? SETS[def.set] : null
  const sn = set && save && who ? (setCounts(save, who)[set.id] ?? 0) : null
  return (
    <div className="itemx">
      {def.effect && (
        <div className="itemx__fx">
          <b>Effekt:</b> {def.effect.text}
        </div>
      )}
      {def.school && (
        <div className="itemx__row">
          <SchoolChip school={def.school}>Schule {SCHOOLS[def.school].name}</SchoolChip>
          {sc != null && (
            <span className="itemx__note">
              Crew trägt {sc} von {sc >= 3 ? 6 : 3}
              {schoolTier(sc) ? ' · Bonus aktiv' : ''}
            </span>
          )}
        </div>
      )}
      {set && (
        <div className="itemx__set">
          <div className="itemx__row">
            <b>Set {set.name}</b>
            {sn != null && who && (
              <span className="itemx__note">
                {sn} von 4 bei {CREW[who].name}
              </span>
            )}
          </div>
          <div className={sn != null && setTier(sn) >= 2 ? 'on' : ''}>2 Teile: {set.at2.text}</div>
          <div className={sn != null && setTier(sn) >= 4 ? 'on' : ''}>4 Teile: {set.at4.text}</div>
        </div>
      )}
    </div>
  )
}
