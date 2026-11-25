import type { Game } from '../game/store'
import { daysOfWeek, weekStartOf } from '../game/dates'
import { streakDay, RULES } from '../game/rules'
import { MILESTONES, milestoneChest, nextMilestone, streakInfo } from '../game/motivation'
import { CHEST_LABEL } from '../game/loot'
import silber from '../assets/truhen/truhe_silber.webp'
import gold from '../assets/truhen/truhe_gold.webp'

const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export function RingIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="#ff6b6b" strokeWidth="4" />
      <path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4" stroke="#fff" strokeWidth="2.4" />
    </svg>
  )
}

export function FlameIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#ff922b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z" />
    </svg>
  )
}

/** Serie: Stand, naechste Truhe, Rettungsring und die laufende Woche (im Logbuch) */
export function StreakPanel({ game }: { game: Game }) {
  const save = game.save!
  const info = streakInfo(save, game.today)
  const next = nextMilestone(info.days)
  const nextChest = milestoneChest(next)
  const marks = [...MILESTONES, ...(next > 60 ? [next] : [])]
  // Meilensteine gleichmaessig verteilt, die Fuellung laeuft stueckweise dazwischen
  const pos = (i: number) => (i + 1) / marks.length
  const fill = (() => {
    let prev = 0
    for (let i = 0; i < marks.length; i++) {
      if (info.days < marks[i]) return (i ? pos(i - 1) : 0) + ((info.days - prev) / (marks[i] - prev)) * (pos(i) - (i ? pos(i - 1) : 0))
      prev = marks[i]
    }
    return 1
  })()
  const week = daysOfWeek(weekStartOf(game.today))
  const rescued = new Set(info.rescued)

  return (
      <div className="streak-panel">
        <div style={{ textAlign: 'center' }}>
          <div className="kicker" style={{ color: '#e8590c' }}>
            Deine Serie
          </div>
          <div className="display" style={{ fontSize: 44, lineHeight: 1 }}>
            {info.days} {info.days === 1 ? 'Tag' : 'Tage'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Tage in Folge mit mindestens {RULES.streakMin} erledigten Habits</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-soft)' }}>
            <span>Nächste Truhe</span>
            <b style={{ color: 'var(--ink)' }}>
              {CHEST_LABEL[nextChest.kind]} bei {next} Tagen · noch {next - info.days}
            </b>
          </div>
          <div className="streak-track">
            <div className="streak-track__line" />
            <div className="streak-track__fill" style={{ width: `${Math.min(1, Math.max(0, fill)) * 100}%` }} />
            <div className="streak-track__marks">
              {marks.map((m, i) => {
                const c = milestoneChest(m)
                return (
                  <div key={m} className={`streak-track__mark ${info.days >= m ? 'streak-track__mark--done' : ''}`} style={{ left: `${pos(i) * 100}%` }}>
                    <img src={c.kind === 'gold' ? gold : silber} alt="" className={c.sure ? `glow-${c.sure}` : ''} />
                    <span>{m}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', textAlign: 'center' }}>30 Tage: sicher episch · 60 Tage: sicher legendär · danach alle 30 Tage episch</div>
        </div>

        <div className={`ring-box ${info.ringFree ? '' : 'ring-box--used'}`}>
          <RingIcon size={40} />
          <div style={{ flex: 1 }}>
            <div className="display" style={{ fontSize: 18 }}>
              {info.ringFree ? 'Rettungsring bereit' : 'Rettungsring verbraucht'}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.35 }}>
              {info.ringFree
                ? `Schaffst du an einem Tag dieser Woche weniger als ${RULES.streakMin} Habits, fängt er ihn auf und die Serie hält.`
                : 'Er hat diese Woche schon einen Tag gerettet. Montag gibt es einen neuen.'}
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 6 }}>Diese Woche</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {week.map((d, i) => {
              const state = d > game.today ? 'future' : rescued.has(d) ? 'ring' : streakDay(save, d) ? 'ok' : d === game.today ? 'today' : 'miss'
              return (
                <div key={d} className={`week-dot week-dot--${state}`}>
                  <span>{state === 'ok' ? '✓' : state === 'ring' ? <RingIcon size={22} /> : ''}</span>
                  {WD[i]}
                </div>
              )
            })}
          </div>
        </div>
      </div>
  )
}
