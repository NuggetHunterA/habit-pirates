import { motion } from 'motion/react'
import type { Game } from '../game/store'
import { activeHabits, dayResult, habitWind, isDone, windAvailable, RULES } from '../game/rules'
import { longDate } from '../game/dates'
import { CHAPTER_1 } from '../game/map'
import HabitCard from './HabitCard'
import SailMeter from './SailMeter'
import SeaMap from './SeaMap'

interface Props {
  game: Game
  wide: boolean
  onMap: () => void
  onWeek: () => void
  onAddHabit: () => void
}

export default function Today({ game, wide, onMap, onWeek, onAddHabit }: Props) {
  const save = game.save!
  const habits = activeHabits(save, game.today)
  const log = save.logs[game.today]
  const res = dayResult(save, game.today)
  const wind = windAvailable(save)
  const ship = save.game.field
  const next = CHAPTER_1[Math.min(ship + 1, CHAPTER_1.length - 1)]

  return (
    <div className="screen">
      {!wide && (
        <div style={{ position: 'relative', height: 190, borderRadius: 18, border: '3px solid var(--brass)', overflow: 'hidden', boxShadow: '0 6px 0 #062631', flex: 'none' }}>
          <SeaMap field={ship} looted={save.game.looted} mini />
          <div className="minimap-label">
            Feld {ship + 1} von {CHAPTER_1.length} · nächstes: {next.name}
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

      <SailMeter wind={wind} onSail={onMap} label={wide ? 'Zur Karte' : 'Segeln!'} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {habits.map((h) => (
          <HabitCard
            key={h.id}
            habit={h}
            done={isDone(h, log)}
            focus={!!game.plan?.focusIds.includes(h.id)}
            wind={habitWind(game.plan, h)}
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
          : `Voller Wind bei allen ${res.total} Habits: +${RULES.fullDayBonus} Bonus · ${res.done} von ${res.total}`}
      </motion.div>

      <button type="button" className="btn-dashed" onClick={onAddHabit}>
        + Habit für diese Woche
      </button>
    </div>
  )
}
