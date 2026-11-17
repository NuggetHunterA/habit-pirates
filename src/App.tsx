import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ART } from './assets'
import { useGame } from './game/store'
import { CHAPTER_1 } from './game/map'
import ProfilePick from './components/ProfilePick'
import WeekStart from './components/WeekStart'
import Today from './components/Today'
import MapPanel from './components/MapPanel'
import ChestScene from './components/ChestScene'
import AddHabitSheet from './components/AddHabitSheet'
import MenuSheet from './components/MenuSheet'

type Left = 'woche' | 'tag'
type Right = 'karte' | 'truhe'

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
  /** zugeklappt: welche Seite gerade sichtbar ist */
  const [focusSide, setFocusSide] = useState<'left' | 'right'>('left')
  const [toast, setToast] = useState('')
  const [sheet, setSheet] = useState<null | 'add' | 'menu'>(null)
  const addCb = useRef<((id: string) => void) | null>(null)
  const toastT = useRef<number>(0)

  const say = useCallback((m: string) => {
    setToast(m)
    clearTimeout(toastT.current)
    toastT.current = window.setTimeout(() => setToast(''), 2600)
  }, [])

  const needsWeek = !!game.save && !game.plan
  const leftShown: Left = needsWeek ? 'woche' : left

  const save = game.save
  const field = save?.game.field ?? 0
  const chestAvailable = !!save && CHAPTER_1[field].kind === 'truhe' && !save.game.looted.includes(field)
  const rightShown: Right = right === 'truhe' && chestAvailable ? 'truhe' : 'karte'

  const openAdd = (cb?: (id: string) => void) => {
    addCb.current = cb ?? null
    setSheet('add')
  }

  const goMap = () => {
    setRight('karte')
    setFocusSide('right')
  }

  const showLeft = wide || focusSide === 'left' || needsWeek
  const showRight = wide || (!needsWeek && focusSide === 'right')

  return (
    <div className={`app ${wide ? 'app--open' : ''}`}>
      <header className="topbar">
        <div className="topbar__title">Habit Pirates</div>
        {game.save && (
          <div className="topbar__right">
            <div className="pill" aria-label={`${game.save.game.gold} Gold`}>
              <span className="coin" />
              <motion.span key={game.save.game.gold} initial={{ scale: 1.5, color: '#FFFFFF' }} animate={{ scale: 1, color: '#F4D58D' }}>
                {game.save.game.gold}
              </motion.span>
            </div>
            <button type="button" className="avatar-btn" onClick={() => setSheet('menu')} aria-label="Menü und Profil">
              <img src={ART.portrait} alt="" />
            </button>
          </div>
        )}
      </header>

      {!game.save ? (
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
            <div className="col-right">
              {rightShown === 'truhe' ? (
                <ChestScene
                  key={field}
                  title={CHAPTER_1[field].name}
                  onCollect={(gold, items) => {
                    game.collectChest(field, gold, items)
                    setRight('karte')
                    say(`+${gold} Gold und ${items.length} Items im Laderaum!`)
                  }}
                />
              ) : (
                <MapPanel game={game} say={say} onChest={() => setRight('truhe')} onBack={wide ? undefined : () => setFocusSide('left')} />
              )}
            </div>
          )}
        </main>
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
