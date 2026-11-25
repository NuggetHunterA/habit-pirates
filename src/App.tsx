import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ART } from './assets'
import { useGame } from './game/store'
import { chapterOf } from './game/map'
import { ENCOUNTERS, crewName, farmEncounter, ghostShipEvent, guardianEncounter, seaMonster, type CrewId, type CrewSetup } from './game/foes'
import { chestAt } from './game/loot'
import { fighters } from './game/crewinfo'
import { STORIES } from './game/story'
import { crewStats, levelFor } from './game/progress'
import { gearBonus } from './game/equipment'
import { crewExtras } from './game/schools'
import { blocked } from './game/store'
import FightScene from './fight/FightScene'
import StoryScene from './components/StoryScene'
import EventScene, { type EventResult } from './components/EventScene'
import { EVENT_AFTER_FARM, rollEvent, type RolledEvent } from './game/events'
import type { FightRequest } from './components/MapPanel'
import type { Item } from './game/types'
import ProfilePick from './components/ProfilePick'
import Intro from './components/Intro'
import { freshBuildNotice, useUpdateCheck } from './game/update'
import WeekStart from './components/WeekStart'
import Today from './components/Today'
import MapPanel from './components/MapPanel'
import ChestScene from './components/ChestScene'
import HabitSheet from './components/HabitSheet'
import Logbuch from './components/Logbuch'
import { FlameIcon, RingIcon } from './components/Streak'
import { streakInfo, type PendingReward } from './game/motivation'
import Equipment from './components/Equipment'
import Shop from './components/Shop'
import TabBar, { type Tab } from './components/TabBar'
import { RULES, windAvailable } from './game/rules'
import { BACK, useBack } from './game/back'

type Left = 'woche' | 'tag'
type Right = 'karte' | 'truhe'
type Scene =
  | { k: 'fight'; req: FightRequest; n: number }
  | { k: 'story'; id: string }
  | { k: 'reward'; r: PendingReward }
  /** Zufallsereignis. key: Story-id des Sturm-Felds */
  | { k: 'event'; ev: RolledEvent; key: string | null; n: number }

/** Aufgeklappt (Fold innen) ab dieser Breite: zwei Spalten */
const WIDE = '(min-width: 680px)'

function useWide() {
  const [wide, setWide] = useState(() => matchMedia(WIDE).matches)
  useEffect(() => {
    const m = matchMedia(WIDE)
    const on = () => setWide(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return wide
}

export default function App() {
  const game = useGame()
  const wide = useWide()
  const [left, setLeft] = useState<Left>('tag')
  const [right, setRight] = useState<Right>('karte')
  /** Untere Tab-Leiste. Aufgeklappt steht "Deck" immer links, rechts die anderen Tabs. */
  const [tab, setTabNow] = useState<Tab>('deck')
  /** Zuvor besuchte Orte, für die Zurück-Taste. Das Deck ist der Start und leert die Spur. */
  const trail = useRef<Tab[]>([])
  /** Aufgeklappt zeigen Deck und Karte dasselbe */
  const same = (a: Tab, b: Tab) => a === b || (wide && a !== b && (a === 'deck' || a === 'karte') && (b === 'deck' || b === 'karte'))
  const setTab = (t: Tab) => {
    if (!same(t, tab)) trail.current = t === 'deck' ? [] : [...trail.current.filter((x) => !same(x, t) && !same(x, tab)), tab].slice(-8)
    setTabNow(t)
  }
  const [toast, setToast] = useState('')
  const [sheet, setSheet] = useState<null | 'add'>(null)
  /** Habit, der gerade bearbeitet wird */
  const [editId, setEditId] = useState<string | null>(null)
  /** Einfuehrung aus dem Menue nochmal ansehen */
  const [introReplay, setIntroReplay] = useState(false)
  const addCb = useRef<((id: string) => void) | null>(null)
  const toastT = useRef<number>(0)
  const [scene, setScene] = useState<Scene | null>(null)

  const say = useCallback((m: string) => {
    setToast(m)
    clearTimeout(toastT.current)
    toastT.current = window.setTimeout(() => setToast(''), 2600)
  }, [])

  // Update-Hinweis: einmal nach dem Start einer neuen Version, und Neuladen nach langer Pause
  useEffect(() => {
    const msg = freshBuildNotice()
    if (msg) setTimeout(() => say(msg), 600)
  }, [say])
  useUpdateCheck(!!scene || !!sheet || !!editId)

  const needsWeek = !!game.save && !game.plan
  const leftShown: Left = needsWeek ? 'woche' : left

  const save = game.save
  const field = save?.game.field ?? 0
  const chapter = chapterOf(save?.game.chapter)
  const here = chapter.fields[field]
  const chestAvailable = !!save && here.kind === 'truhe' && !save.game.looted.includes(field) && !blocked(save)
  const actionHere = !!save && ((here.story && !save.game.seen.includes(here.story)) || blocked(save))
  const level = save ? levelFor(save.game.xp, chapter.cap) : 1
  const crew = (save?.game.crew ?? []) as CrewId[]
  const rightShown: Right = right === 'truhe' && chestAvailable ? 'truhe' : 'karte'

  const editHabit = editId ? save?.habits.find((h) => h.id === editId && !h.removedAt) : undefined

  const openAdd = (cb?: (id: string) => void) => {
    addCb.current = cb ?? null
    setSheet('add')
  }

  const goMap = () => {
    setRight('karte')
    setTab('karte')
  }

  const rightTab: Tab = tab === 'deck' ? 'karte' : tab

  const fightBonus = () => {
    const g = gearBonus(save!)
    return crewStats(level, g.crew, g.ship)
  }

  /** Kampf zur Anfrage: Beutezug-Stufe, Truhenwaechter oder fester Kampf */
  const encounterFor = (req: FightRequest) => {
    if (req.guard) return guardianEncounter(chapter.n)
    if (req.enc === 'ereignis_seeungeheuer') return seaMonster(chapter.n)
    if (req.enc === 'ereignis_geisterschiff') return ghostShipEvent()
    if (!req.tier) return ENCOUNTERS[req.enc]
    const enc = farmEncounter(req.enc, req.tier)
    // Hinweis aus der Flaschenpost: sicher ein Item, mindestens selten
    if (!req.hint) return enc
    const min = enc.reward.min === 'gewoehnlich' || !enc.reward.min ? 'selten' : enc.reward.min
    return { ...enc, reward: { ...enc.reward, itemChance: 1, min } }
  }

  /** Szene oder, auf Sturm-Feldern, ein Zufallsereignis */
  const openStory = (id: string) => {
    const i = chapter.fields.findIndex((f) => f.kind === 'sturm' && f.story === id)
    if (i < 0 || !save) return setScene({ k: 'story', id })
    setScene({ k: 'event', ev: rollEvent(save, chapter.n, 'feld', chapter.fields[i].name, `${save.profile}|ereignis|${chapter.n}|${i}`), key: id, n: Date.now() })
  }

  /** Nach einem Beutezug: mit 25 % Chance ein Zufallsereignis */
  const maybeEvent = () => {
    if (!save || Math.random() >= EVENT_AFTER_FARM) return
    const ev = rollEvent(save, chapter.n, 'beutezug', '')
    window.setTimeout(() => setScene({ k: 'event', ev, key: null, n: Date.now() }), 350)
  }

  const endEvent = (sc: Extract<Scene, { k: 'event' }>, r: EventResult) => {
    if (!game.finishEvent(sc.key, r)) return say('Dafür reicht das Gold nicht.')
    setScene(null)
    if (r.item) say(`${r.item.name} liegt jetzt im Laderaum!`)
    else if (r.gold) say(`+${r.gold} Gold!`)
    else if (r.wind) say(`+${r.wind} Wind von den Delfinen!`)
    else if (r.hint) say('Hinweis gespeichert: Der nächste Beutezug bringt bessere Beute.')
  }

  /** Mehr Gold aus Truhen (Goldene-Moewe-Set) */
  const chestGoldBonus = () => {
    const ex = crewExtras(save!, fighters(save!))
    return Math.max(0, ...Object.values(ex).map((e) => e?.mods.goldBonus ?? 0))
  }

  const endFight = (req: FightRequest, r: { sieg: boolean; xp: number; gold: number; items: Item[] } | null) => {
    setScene(null)
    if (req.guard && r) {
      if (r.sieg) {
        game.winFight({ field: null, boss: false, farm: false, xp: r.xp, gold: 0, items: [] })
        game.guardWin(req.field!)
        setRight('truhe')
      } else {
        game.sinkChest(req.field!)
        say('Der Wächter war zu stark. Die Truhe ist versunken.')
      }
      return
    }
    // Kampf aus einem Zufallsereignis: Niederlage kostet nichts
    if (req.event && r && !r.sieg) {
      say('Rückzug! Die Crew segelt davon. Es hat nichts gekostet.')
      return
    }
    // Beutezug verloren: der Wind ist weg, es gibt die halbe Erfahrung
    if (req.tier && r && !r.sieg) {
      const xp = Math.round(encounterFor(req).reward.xp / 2)
      game.gainXp(xp)
      say(`Verloren. Die Crew lernt trotzdem dazu: +${xp} Erfahrung.`)
      maybeEvent()
      return
    }
    if (!r?.sieg) return
    game.winFight({ field: req.field, boss: req.boss, farm: req.farm, xp: r.xp, gold: r.gold, items: r.items })
    if (req.boss) window.setTimeout(() => setScene({ k: 'story', id: chapter.outro }), 250)
    // Bewachte Truhe: nach dem Sieg geht die Truhe auf
    else if (req.field != null && chapter.fields[req.field]?.kind === 'truhe') setRight('truhe')
    else if (r.items.length) say(`${r.items[0].name} liegt jetzt im Laderaum!`)
    if (req.tier) maybeEvent()
  }

  const endStory = (id: string, gold: number, items: Item[]) => {
    setScene(null)
    game.finishStory(id, gold, items)
    const join = STORIES[id]?.join
    if (join) say(`${crewName(join, false)} ist jetzt an Bord! Stell die Crew vor dem nächsten Kampf auf.`)
  }
  const showLeft = wide || tab === 'deck'
  const showRight = wide || tab !== 'deck'
  const wind = save ? windAvailable(save) : 0
  const streak = save ? streakInfo(save, game.today) : null

  // Android-Zurück-Taste: erst Truhe, Wochenplanung oder Einführung schließen, dann zum vorherigen Ort
  const chestOpen = showRight && rightTab === 'karte' && !scene && rightShown === 'truhe'
  const weekOpen = showLeft && left === 'woche' && !needsWeek
  const home = same(tab, 'deck')
  const inGame = !!save && save.introDone !== false
  useBack(inGame && (introReplay || chestOpen || weekOpen || !home), BACK.place, () => {
    if (introReplay) return setIntroReplay(false)
    if (chestOpen) return setRight('karte')
    if (weekOpen) return setLeft('tag')
    let prev = trail.current.pop()
    while (prev && same(prev, tab)) prev = trail.current.pop()
    setTabNow(prev ?? 'deck')
  })
  // Geschichten, Ereignisse und Belohnungen laufen zu Ende; Zurück schließt dort nicht die App
  useBack(showRight && rightTab === 'karte' && !!scene && scene.k !== 'fight', BACK.scene, () => {})

  const openReward = (r: PendingReward) => {
    setTab('karte')
    setRight('karte')
    setScene({ k: 'reward', r })
  }

  return (
    <div className={`app ${wide ? 'app--open' : ''}`}>
      <header className="topbar">
        <div className="topbar__brand">
          <img src={ART.logo} alt="" className="topbar__logo" />
          <div className="topbar__title">Habit Pirates</div>
        </div>
        {game.save && (
          <div className="topbar__right">
            <button
              type="button"
              className="pill pill--streak"
              onClick={() => setTab('logbuch')}
              aria-label={`Serie: ${streak?.days ?? 0} Tage${streak?.ringFree ? ', Rettungsring bereit' : ''}. Logbuch öffnen`}
            >
              <FlameIcon />
              {streak?.days ?? 0}
              {streak?.ringFree && <RingIcon size={16} />}
            </button>
            <div className="pill" aria-label={`${game.save.game.gold} Gold`}>
              <span className="coin" />
              <motion.span key={game.save.game.gold} initial={{ scale: 1.5 }} animate={{ scale: 1 }}>
                {game.save.game.gold}
              </motion.span>
            </div>
          </div>
        )}
      </header>

      {!game.save && game.profile ? (
        <div className="splash">
          <motion.img src={ART.logo} alt="" className="splash__logo" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }} />
          <div className="display splash__title">Habit Pirates</div>
          <div className="muted">Spielstand wird geladen …</div>
        </div>
      ) : !game.save ? (
        <ProfilePick onPick={game.chooseProfile} />
      ) : game.save.introDone === false || introReplay ? (
        <main className="main main--intro">
          <Intro
            replay={introReplay}
            onDone={(habits) => {
              if (introReplay) return setIntroReplay(false)
              game.finishIntro(habits)
              setTab('deck')
            }}
          />
        </main>
      ) : (
        <main className="main">
          {showLeft && (
            <div className="col-left">
              {wide && !needsWeek && (
                <div style={{ padding: '12px 14px 0' }}>
                  <div className="seg seg--dark">
                    <button type="button" aria-pressed={leftShown === 'woche'} onClick={() => setLeft('woche')}>
                      Woche
                    </button>
                    <button type="button" aria-pressed={leftShown === 'tag'} onClick={() => setLeft('tag')}>
                      Heute
                    </button>
                  </div>
                </div>
              )}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={leftShown + game.week} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.18 }}>
                  {leftShown === 'woche' ? (
                    <WeekStart game={game} say={say} onAddHabit={(cb) => openAdd(cb)} onEditHabit={setEditId} onDone={() => setLeft('tag')} />
                  ) : (
                    <Today game={game} onMap={goMap} onAddHabit={() => openAdd()} onEditHabit={setEditId} onReward={openReward} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
          {showRight && (
            <div className={`col-right ${rightTab === 'karte' && scene?.k !== 'fight' ? '' : 'col-right--scroll'}`}>
              {rightTab === 'karte' && scene?.k === 'fight' ? (
                <FightScene
                  key={scene.n}
                  encounter={encounterFor(scene.req)}
                  crew={crew}
                  level={level}
                  bonus={fightBonus()}
                  extras={(ids) => crewExtras(save!, ids)}
                  initialSetup={save!.game.setup as CrewSetup | undefined}
                  onSetup={(s) => game.saveSetup(s)}
                  canStart={
                    scene.req.boss
                      ? () => (game.bossTry() ? null : 'Heute sind keine Boss-Versuche mehr übrig. Morgen geht es weiter!')
                      : scene.req.tier
                        ? () => (game.startFarm() ? null : `Ein Beutezug braucht ${RULES.windPerField} Wind. Hake Habits ab!`)
                        : undefined
                  }
                  xp={save!.game.xp}
                  cap={chapter.cap}
                  chapter={chapter.n}
                  onExit={(r) => endFight(scene.req, r)}
                />
              ) : rightTab === 'karte' && scene?.k === 'reward' ? (
                <ChestScene
                  key={scene.r.key}
                  title={scene.r.title}
                  kicker={scene.r.title}
                  kind={scene.r.chest.kind}
                  sure={scene.r.chest.sure}
                  chapter={chapter.n}
                  goldBonus={chestGoldBonus()}
                  found={save!.game.found}
                  onCollect={(gold, items) => {
                    game.claimReward(scene.r.key, gold, items)
                    setScene(null)
                    setTab('deck')
                    say(`+${gold} Gold und ${items.length} Items im Laderaum!`)
                  }}
                />
              ) : rightTab === 'karte' && scene?.k === 'event' ? (
                <EventScene
                  key={scene.n}
                  ev={scene.ev}
                  gold={save!.game.gold}
                  onDone={(r) => endEvent(scene, r)}
                  onFight={(enc) => {
                    // Das Sturm-Feld ist erledigt, sobald die Crew sich entschieden hat
                    game.finishEvent(scene.key, {})
                    setScene({ k: 'fight', req: { enc, field: null, boss: false, farm: false, event: true }, n: Date.now() })
                  }}
                />
              ) : rightTab === 'karte' && scene?.k === 'story' ? (
                <StoryScene key={scene.id} id={scene.id} chapter={chapter.n} onDone={(gold, items) => endStory(scene.id, gold, items)} />
              ) : rightTab === 'crew' ? (
                <Equipment game={game} say={say} onShop={() => setTab('hafen')} />
              ) : rightTab === 'hafen' ? (
                <Shop game={game} say={say} onGear={() => setTab('crew')} />
              ) : rightTab === 'logbuch' ? (
                <Logbuch
                  game={game}
                  say={say}
                  onIntro={() => setIntroReplay(true)}
                  onWeek={() => {
                    setLeft('woche')
                    setTab('deck')
                  }}
                />
              ) : rightShown === 'truhe' ? (
                <ChestScene
                  key={`${field}-${(save!.game.guardWon ?? []).includes(field)}`}
                  title={here.name}
                  kind={chestAt(save!.profile, chapter.n, field)}
                  chapter={chapter.n}
                  goldBonus={chestGoldBonus()}
                  found={save!.game.found}
                  guardWon={(save!.game.guardWon ?? []).includes(field)}
                  onGuardian={() => {
                    setRight('karte')
                    setScene({ k: 'fight', req: { enc: 'waechter', field, boss: false, farm: false, guard: true }, n: Date.now() })
                  }}
                  onLeave={() => {
                    game.sinkChest(field)
                    setRight('karte')
                    say('Ihr lasst die Truhe liegen. Sie versinkt langsam im Meer.')
                  }}
                  onCollect={(gold, items) => {
                    game.collectChest(field, gold, items)
                    setRight('karte')
                    say(`+${gold} Gold und ${items.length} Items im Laderaum!`)
                  }}
                />
              ) : (
                <MapPanel
                  game={game}
                  say={say}
                  onChest={() => setRight('truhe')}
                  onShop={() => setTab('hafen')}
                  onFight={(req) => setScene({ k: 'fight', req, n: Date.now() })}
                  onStory={openStory}
                />
              )}
            </div>
          )}
        </main>
      )}

      {game.save && game.save.introDone !== false && !introReplay && (
        <TabBar
          tab={wide && tab === 'deck' ? 'karte' : tab}
          wide={wide}
          onTab={setTab}
          badges={{ karte: chestAvailable || actionHere || wind >= RULES.windPerField, deck: needsWeek }}
        />
      )}

      <AnimatePresence>
        {toast && (
          <motion.div className="toast" role="status" initial={{ opacity: 0, y: -16, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -16, x: '-50%' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet === 'add' && (
          <HabitSheet
            midWeek={!!game.plan}
            today={game.today}
            onClose={() => setSheet(null)}
            onSave={({ name, kind, always, rhythm }) => {
              const id = game.addHabit(name, kind, always, { addToWeek: !addCb.current, rhythm })
              addCb.current?.(id)
              say(`${name.trim()} ist an Bord.`)
            }}
          />
        )}
        {editHabit && (
          <HabitSheet
            key={editHabit.id}
            habit={editHabit}
            midWeek={!!game.plan}
            today={game.today}
            onClose={() => setEditId(null)}
            onSave={(v) => {
              game.editHabit(editHabit.id, v)
              say('Gespeichert.')
            }}
            onDelete={() => {
              game.removeHabit(editHabit.id)
              say(`${editHabit.name} ist von Bord.`)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
