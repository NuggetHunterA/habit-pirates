import { motion } from 'motion/react'
import type { Game } from '../game/store'
import { activeHabits, afterPause, dayResult, isDone, windAvailable, RULES } from '../game/rules'
import { focusGoldPossible, nextMilestone, pendingRewards, streakInfo, type PendingReward } from '../game/motivation'
import { CHEST_LABEL } from '../game/loot'
import { RARITY_LABEL } from '../game/loot'
import { longDate } from '../game/dates'
import { chapterOf } from '../game/map'
import { doneFields } from '../game/store'
import HabitCard from './HabitCard'
import SailMeter from './SailMeter'
import SeaMap from './SeaMap'

interface Props {
  game: Game
  wide: boolean
  onMap: () => void
  onWeek: () => void
  onAddHabit: () => void
  /** Serien- oder Fokus-Truhe oeffnen */
  onReward: (r: PendingReward) => void
}

export default function Today({ game, wide, onMap, onWeek, onAddHabit, onReward }: Props) {
  const save = game.save!
  const habits = activeHabits(save, game.today)
  const log = save.logs[game.today]
  const res = dayResult(save, game.today)
  const wind = windAvailable(save)
  const ship = save.game.field
  const chapter = chapterOf(save.game.chapter)
  const fields = chapter.fields
  const next = fields[Math.min(ship + 1, fields.length - 1)]
  const rewards = pendingRewards(save, game.today)
  const streak = streakInfo(save, game.today)
  const pause = afterPause(save, game.today)
  const goldHint = focusGoldPossible(save, game.today)
  const toNext = nextMilestone(streak.days) - streak.days
  const dayPct = res.max ? Math.min(1, res.wind / (res.max + (res.backwind ? RULES.backwindBonus : 0))) : 0

  return (
    <div className="screen">
      {!wide && (
        <div style={{ position: 'relative', height: 190, borderRadius: 18, border: '3px solid var(--brass)', overflow: 'hidden', boxShadow: '0 6px 0 #062631', flex: 'none' }}>
          <SeaMap key={chapter.n} chapter={chapter} field={ship} done={doneFields(save)} mini />
          <div className="minimap-label">
            Kapitel {chapter.n} · Feld {ship + 1} von {fields.length}{ship < fields.length - 1 ? ` · nächstes: ${next.name}` : ''}
          </div>
          <button type="button" className="btn-gold" onClick={onMap} style={{ position: 'absolute', right: 10, bottom: 10, minHeight: 42, fontSize: 14, padding: '0 14px', boxShadow: '0 4px 0 var(--gold-lo)' }}>
            Zur Karte
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div className="kicker">{longDate(game.today)}</div>
          <h1 className="h1">Heute an Deck</h1>
        </div>
        {!wide && (
          <button type="button" className="btn-wood" onClick={onWeek}>
            Woche planen
          </button>
        )}
      </div>

      {rewards.map((r) => (
        <motion.button
          key={r.key}
          type="button"
          className="reward-card"
          onClick={() => onReward(r)}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <span className={`reward-card__chest reward-card__chest--${r.chest.kind}`} aria-hidden="true" />
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
            <span className="reward-card__title">{r.title}</span>
            <span className="reward-card__text">
              {r.text} {CHEST_LABEL[r.chest.kind]}
              {r.chest.sure ? ` mit sicherem ${RARITY_LABEL[r.chest.sure].toLowerCase()}em Item` : ''}.
            </span>
            {goldHint && r.key.startsWith('fokus|') && <span className="reward-card__text" style={{ fontWeight: 900 }}>Hakst du heute deinen Fokus ab, wird es eine Goldtruhe!</span>}
          </span>
          <span className="btn-gold reward-card__btn">Öffnen</span>
        </motion.button>
      ))}

      {pause && res.total > 0 && (
        <div className={`banner-wind ${res.backwind ? 'banner-wind--on' : ''}`} role="status">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h7" />
          </svg>
          <div>
            <b className="display" style={{ fontSize: 18, fontWeight: 400 }}>Rückenwind!</b>
            <br />
            {res.backwind
              ? `Willkommen zurück! +${RULES.backwindBonus} Wind sind in den Segeln.`
              : `Willkommen zurück. Schaffst du heute ${Math.ceil(res.total / 2)} von ${res.total} Habits, gibt es +${RULES.backwindBonus} Wind.`}
          </div>
        </div>
      )}

      {!pause && streak.days > 0 && toNext <= 3 && (
        <div className="banner-wind" role="status">
          <span className="streak-flame" aria-hidden="true" />
          <div>
            <b className="display" style={{ fontSize: 18, fontWeight: 400 }}>
              Noch {toNext} {toNext === 1 ? 'Tag' : 'Tage'} bis zur Serien-Truhe
            </b>
            <br />
            {streak.todayOk ? 'Heute ist schon geschafft.' : `Schaffst du heute ${RULES.streakMin} Habits, hält deine Serie.`}
          </div>
        </div>
      )}

      <SailMeter wind={wind} onSail={onMap} label={wide ? 'Zur Karte' : 'Segeln!'} />

      {res.total > 0 && (
        <div className="daywind" aria-label={`Tageswind heute: ${res.wind} von ${res.max}`}>
          <div className="daywind__row">
            <span>Tageswind heute</span>
            <b>
              {res.wind} von {res.max}
              {res.backwind ? ` + ${RULES.backwindBonus}` : ''}
            </b>
          </div>
          <div className="daywind__bar">
            <motion.span initial={false} animate={{ width: `${dayPct * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} />
          </div>
          {res.total < RULES.fullWindHabits && (
            <div className="daywind__hint">Mit {RULES.fullWindHabits} oder mehr Habits gibt ein voller Tag {RULES.dayWind + RULES.fullDayBonus} Wind.</div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {habits.map((h) => (
          <HabitCard
            key={h.id}
            habit={h}
            done={isDone(h, log)}
            focus={!!game.plan?.focusIds.includes(h.id)}
            glasses={log?.glasses ?? []}
            onToggle={() => game.toggleDone(h.id)}
            onAddGlass={game.addGlass}
            onPopGlass={game.popGlass}
          />
        ))}
      </div>

      <motion.div
        className={`full-wind ${res.allDone ? 'full-wind--on' : ''}`}
        animate={res.allDone ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {res.allDone
          ? `Voller Wind! Alles erledigt: +${RULES.fullDayBonus} Bonus-Wind.`
          : `Voller Wind bei allen ${res.total} Habits: +${RULES.fullDayBonus} Bonus · ${res.done} von ${res.total} erledigt`}
      </motion.div>

      <button type="button" className="btn-dashed" onClick={onAddHabit}>
        + Habit für diese Woche
      </button>
    </div>
  )
}
