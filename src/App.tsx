import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ART } from './assets'
import { useGame } from './game/store'
import { chapterOf } from './game/map'
import { ENCOUNTERS, crewName, type CrewId, type CrewSetup } from './game/foes'
import { STORIES } from './game/story'
import { crewStats, levelFor } from './game/progress'
import { gearBonus } from './game/equipment'
import { blocked } from './game/store'
import FightScene from './fight/FightScene'
import StoryScene from './components/StoryScene'
import type { FightRequest } from './components/MapPanel'
import type { Item } from './game/types'
import ProfilePick from './components/ProfilePick'
import WeekStart from './components/WeekStart'
import Today from './components/Today'
import MapPanel from './components/MapPanel'
import ChestScene from './components/ChestScene'
import AddHabitSheet from './components/AddHabitSheet'
import MenuSheet from './components/MenuSheet'
import Equipment from './components/Equipment'
import Shop from './components/Shop'
import TabBar, { type Tab } from './components/TabBar'
import { RULES, windAvailable } from './game/rules'

type Left = 'woche' | 'tag'
type Right = 'karte' | 'truhe'
type Scene = { k: 'fight'; req: FightRequest; n: number } | { k: 'story'; id: string }

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
  const [tab, setTab] = useState<Tab>('deck')
  const [toast, setToast] = useState('')
  const [sheet, setSheet] = useState<null | 'add' | 'menu'>(null)
  const addCb = useRef<((id: string) => void) | null>(null)
  const toastT = useRef<number>(0)
  const [scene, setScene] = useState<Scene | null>(null)

  const say = useCallback((m: string) => {
    setToast(m)
    clearTimeout(toastT.current)
    toastT.current = window.setTimeout(() => setToast(''), 2600)
  }, [])

  const needsWeek = !!game.save && !game.plan
  const leftShown: Left = needsWeek ? 'woche' : left

  const save = game.save
  const field = save?.game.field ?? 0
  const chapter = chapterOf(save?.game.chapter)
  const here = chapter.fields[field]
  const chestAvailable = !!save && here.kind === 'truhe' && !save.game.looted.includes(field)
  const actionHere = !!save && ((here.story && !save.game.seen.includes(here.story)) || blocked(save))
  const level = save ? levelFor(save.game.xp, chapter.cap) : 1
  const crew = (save?.game.crew ?? []) as CrewId[]
  const rightShown: Right = right === 'truhe' && chestAvailable ? 'truhe' : 'karte'

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

  const endFight = (req: FightRequest, r: { sieg: boolean; xp: number; gold: number; items: Item[] } | null) => {
    setScene(null)
    if (!r?.sieg) return
    game.winFight({ field: req.field, boss: req.boss, farm: req.farm, xp: r.xp, gold: r.gold, items: r.items })
    if (req.boss) window.setTimeout(() => setScene({ k: 'story', id: chapter.outro }), 250)
    else if (r.items.length) say(`${r.items[0].name} liegt jetzt im Laderaum!`)
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

  return (
    <div className={`app ${wide ? 'app--open' : ''}`}>
      <header className="topbar">
        <div className="topbar__title">Habit Pirates</div>
        {game.save && (
          <div className="topbar__right">
            <div className="pill pill--wind" aria-label={`${Math.max(0, wind)} Wind`}>
              <svg className="pill__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h7" />
              </svg>
              <motion.span key={wind} initial={{ scale: 1.5 }} animate={{ scale: 1 }}>
                {Math.max(0, wind)}
              </motion.span>
            </div>
            <div className="pill" aria-label={`${game.save.game.gold} Gold`}>
              <span className="coin" />
              <motion.span key={game.save.game.gold} initial={{ scale: 1.5 }} animate={{ scale: 1 }}>
                {game.save.game.gold}
              </motion.span>
            </div>
            <button type="button" className="avatar-btn" onClick={() => setSheet('menu')} aria-label="Menü und Profil">
              <img src={ART.portrait} alt="" />
            </button>
          </div>
        )}
      </header>

      {!game.save && game.profile ? (
        <div className="muted" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800 }}>
          Spielstand wird geladen …
        </div>
      ) : !game.save ? (
        <ProfilePick onPick={game.chooseProfile} />
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
                    <WeekStart game={game} say={say} onAddHabit={(cb) => openAdd(cb)} onDone={() => setLeft('tag')} />
                  ) : (
                    <Today game={game} wide={wide} onMap={goMap} onWeek={() => setLeft('woche')} onAddHabit={() => openAdd()} />
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
                  encounter={ENCOUNTERS[scene.req.enc]}
                  crew={crew}
                  level={level}
                  bonus={fightBonus()}
                  initialSetup={save!.game.setup as CrewSetup | undefined}
                  onSetup={(s) => game.saveSetup(s)}
                  canStart={scene.req.boss ? () => (game.bossTry() ? null : 'Heute sind keine Boss-Versuche mehr übrig. Morgen geht es weiter!') : undefined}
                  xp={save!.game.xp}
                  cap={chapter.cap}
                  onExit={(r) => endFight(scene.req, r)}
                />
              ) : rightTab === 'karte' && scene?.k === 'story' ? (
                <StoryScene key={scene.id} id={scene.id} onDone={(gold, items) => endStory(scene.id, gold, items)} />
              ) : rightTab === 'ausruestung' ? (
                <Equipment game={game} say={say} onShop={() => setTab('laden')} />
              ) : rightTab === 'laden' ? (
                <Shop game={game} say={say} onGear={() => setTab('ausruestung')} />
              ) : rightShown === 'truhe' ? (
                <ChestScene
                  key={field}
                  title={here.name}
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
                  onShop={() => setTab('laden')}
                  onFight={(req) => setScene({ k: 'fight', req, n: Date.now() })}
                  onStory={(id) => setScene({ k: 'story', id })}
                />
              )}
            </div>
          )}
        </main>
      )}

      {game.save && (
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
          <AddHabitSheet
            midWeek={!!game.plan}
            onClose={() => setSheet(null)}
            onAdd={(name, kind, always) => {
              const id = game.addHabit(name, kind, always, { addToWeek: !addCb.current })
              addCb.current?.(id)
              say(`${name.trim()} ist an Bord.`)
            }}
          />
        )}
        {sheet === 'menu' && <MenuSheet game={game} say={say} onClose={() => setSheet(null)} />}
      </AnimatePresence>
    </div>
  )
}
