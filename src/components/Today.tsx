import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BACK, useBack } from '../game/back'
import type { Game } from '../game/store'
import { activeHabits, afterPause, currentRhythm, dayResult, freeHabits, isDone, nextDueText, rhythmText, windAvailable, RULES } from '../game/rules'
import { focusGoldPossible, nextMilestone, pendingRewards, streakInfo, type PendingReward } from '../game/motivation'
import { CHEST_LABEL } from '../game/loot'
import { RARITY_LABEL } from '../game/loot'
import { addDays, longDate, weekStartOf } from '../game/dates'
import { chapterOf } from '../game/map'
import HabitCard from './HabitCard'
import SailStrip from './SailStrip'
import { CoinFlight, FullSail } from './Celebrate'

interface Props {
  game: Game
  onMap: () => void
  onAddHabit: () => void
  onEditHabit: (id: string) => void
  /** Serien- oder Fokus-Truhe oeffnen */
  onReward: (r: PendingReward) => void
}

/** Bis zu dieser Stunde laesst sich der Vortag nachtragen */
const CATCH_UP_UNTIL = 12

/** Aktuelle Stunde, alle 30 Sekunden neu */
function useHour(): number {
  const [h, setH] = useState(() => new Date().getHours())
  useEffect(() => {
    const t = setInterval(() => setH(new Date().getHours()), 30_000)
    return () => clearInterval(t)
  }, [])
  return h
}

export default function Today({ game, onMap, onAddHabit, onEditHabit, onReward }: Props) {
  const save = game.save!
  const hour = useHour()
  const yesterday = addDays(game.today, -1)
  const yHabits = activeHabits(save, yesterday)
  const yOpen = yHabits.filter((h) => !isDone(h, save.logs[yesterday])).length
  const canCatchUp = hour < CATCH_UP_UNTIL && yHabits.length > 0
  const [wantPast, setWantPast] = useState(false)
  const [freeOpen, setFreeOpen] = useState(false)
  /** Gestern nachtragen: nur bis Mittag */
  const past = wantPast && canCatchUp
  useBack(past, BACK.view, () => setWantPast(false))
  const day = past ? yesterday : game.today
  const dayPlan = save.weeks[weekStartOf(day)]
  const habits = activeHabits(save, day)
  const free = past ? [] : freeHabits(save, day)
  const log = save.logs[day]
  const res = dayResult(save, day)
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
  // Wind-Zuwachs durch das letzte Abhaken (fuer "+x Wind" an der Karte)
  const prevWind = useRef({ day, wind: res.wind })
  const gain = prevWind.current.day === day ? res.wind - prevWind.current.wind : 0
  useEffect(() => {
    prevWind.current = { day, wind: res.wind }
  })
  // "Volle Segel!", sobald der letzte Habit des Tages erledigt ist (nicht beim Oeffnen der App)
  const [fullSail, setFullSail] = useState(false)
  const wasAll = useRef({ day, all: res.allDone })
  useEffect(() => {
    if (wasAll.current.day === day && !wasAll.current.all && res.allDone && res.total > 0) setFullSail(true)
    wasAll.current = { day, all: res.allDone }
  }, [day, res.allDone, res.total])
  const closeFull = useCallback(() => setFullSail(false), [])

  return (
    <div className="screen">
      {!past && (
        <SailStrip
          wind={wind}
          next={ship < fields.length - 1 ? next.name : null}
          day={
            res.total > 0
              ? res.allDone
                ? `Heute ${res.wind} Wind · voller Tag geschafft`
                : `Heute ${res.wind} von ${res.max} Wind · voller Tag +${RULES.fullDayBonus}`
              : 'Heute ist nichts fällig'
          }
          onSail={onMap}
        />
      )}

      {past && (
        <button type="button" className="btn-wood" style={{ alignSelf: 'flex-start' }} onClick={() => setWantPast(false)}>
          ‹ Zurück zu heute
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div className="kicker">
            {longDate(day)}
            {past ? ` · noch bis ${CATCH_UP_UNTIL}:00` : ''}
          </div>
          <h1 className="h1">{past ? 'Gestern nachtragen' : 'Heute an Deck'}</h1>
        </div>
        {!past && res.total > 0 && (
          <div className="today__count" aria-label={`${res.done} von ${res.total} erledigt`}>
            {res.done} / {res.total}
          </div>
        )}
      </div>

      {!past && canCatchUp && yOpen > 0 && (
        <button type="button" className="catchup-chip" onClick={() => setWantPast(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
          </svg>
          <span>
            Gestern noch {yOpen} offen · nachtragen bis {CATCH_UP_UNTIL} Uhr
          </span>
          <span aria-hidden="true">›</span>
        </button>
      )}

      {past && (
        <div className="banner-wind" role="status">
          <div>Hier kannst du gestern abhaken oder Haken zurücknehmen. Wind, Serie und Rettungsring rechnen sich automatisch neu.</div>
        </div>
      )}

      {!past && rewards.map((r) => (
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

      {!past && pause && res.total > 0 && (
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

      {!past && !pause && streak.days > 0 && toNext <= 3 && (
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {habits.map((h) => {
          const r = currentRhythm(h)
          return (
            <HabitCard
              key={`${day}|${h.id}`}
              habit={h}
              done={isDone(h, log)}
              focus={!!dayPlan?.focusIds.includes(h.id)}
              glasses={log?.glasses ?? []}
              rhythm={r.kind === 'daily' ? undefined : rhythmText(r)}
              onToggle={() => game.toggleDone(h.id, day)}
              onAddGlass={(g) => game.addGlass(g, day)}
              onPopGlass={() => game.popGlass(day)}
              onEdit={() => onEditHabit(h.id)}
              gain={gain}
            />
          )
        })}
        {!habits.length && free.length > 0 && <div className="muted">Heute ist nichts fällig. Ein Ruhetag zählt weder für noch gegen deine Serie.</div>}
      </div>

      {free.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" className="free-toggle" aria-expanded={freeOpen} onClick={() => setFreeOpen((o) => !o)}>
            <span>Heute frei ({free.length})</span>
            <span aria-hidden="true" style={{ transform: freeOpen ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }}>
              ▾
            </span>
          </button>
          <AnimatePresence initial={false}>
            {freeOpen &&
              free.map((h) => (
                <motion.div key={h.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <HabitCard
                    habit={h}
                    done={false}
                    focus={!!dayPlan?.focusIds.includes(h.id)}
                    glasses={log?.glasses ?? []}
                    freeText={nextDueText(save, h, day)}
                    onToggle={() => game.toggleDone(h.id, day)}
                    onAddGlass={(g) => game.addGlass(g, day)}
                    onPopGlass={() => game.popGlass(day)}
                    onEdit={() => onEditHabit(h.id)}
                    gain={gain}
                  />
                </motion.div>
              ))}
          </AnimatePresence>
          {freeOpen && <div className="muted" style={{ fontSize: 13 }}>Hakst du einen freien Habit ab, zählt er heute ganz normal mit.</div>}
        </div>
      )}

      {!past && (
      <button type="button" className="btn-dashed" onClick={onAddHabit}>
        + Habit für diese Woche
      </button>
      )}

      <CoinFlight />
      <FullSail show={fullSail} bonus={RULES.fullDayBonus} onClose={closeFull} />
    </div>
  )
}
