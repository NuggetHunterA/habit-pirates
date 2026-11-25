import { useState } from 'react'
import { BACK, useBack } from '../game/back'
import type { Game, SyncState } from '../game/store'
import { ART } from '../assets'
import { StreakPanel } from './Streak'
import { RULES } from '../game/rules'
import { CHANGELOG } from '../game/changelog'

const TEST_KEY = 'hp.testmode'

function testModeStored(): boolean {
  try {
    return localStorage.getItem(TEST_KEY) === '1'
  } catch {
    return false
  }
}

function ago(at: number | null): string {
  if (!at) return ''
  const min = Math.floor((Date.now() - at) / 60_000)
  return min < 1 ? ' · gerade eben' : min < 60 ? ` · vor ${min} Min.` : ` · vor ${Math.floor(min / 60)} Std.`
}

function SyncLine({ sync, at }: { sync: SyncState; at: number | null }) {
  const [color, text] =
    sync === 'synced'
      ? ['#2fb344', `Spielstand gesichert${ago(at)}`]
      : sync === 'offline'
        ? ['#f08c00', 'Offline · wird später gesichert']
        : ['#9aa8e0', 'Spielstand wird gesichert …']
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flex: 'none' }} />
      {text}
    </div>
  )
}

interface Props {
  game: Game
  say: (m: string) => void
  /** Einfuehrung nochmal ansehen */
  onIntro: () => void
  /** Wochenplanung oeffnen */
  onWeek: () => void
}

/** Logbuch: Serie, Woche und die Kajuete (Einstellungen). Ersetzt das fruehere Menue. */
export default function Logbuch({ game, say, onIntro, onWeek }: Props) {
  const [confirmReset, setConfirmReset] = useState(false)
  const [news, setNews] = useState(false)
  useBack(confirmReset, BACK.view, () => setConfirmReset(false))
  // Testmodus: in der Vorschau immer, sonst per 7-mal Tippen auf die Versionszeile
  const [testMode, setTestMode] = useState(() => __PREVIEW__ || testModeStored())
  const [taps, setTaps] = useState(0)
  const tapVersion = () => {
    if (__PREVIEW__) return
    const n = taps + 1
    setTaps(n >= 7 ? 0 : n)
    if (n < 7) return
    const on = !testMode
    try {
      if (on) localStorage.setItem(TEST_KEY, '1')
      else localStorage.removeItem(TEST_KEY)
    } catch {
      /* egal */
    }
    setTestMode(on)
    say(on ? 'Testmodus an' : 'Testmodus aus')
  }
  const inv = game.save?.game.inventory ?? []
  return (
    <div className="logbuch">
      <div className="logbuch__page">
        <div className="logbuch__head">
          <img src={ART.portrait} alt="" className="logbuch__avatar" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="logbuch__title">Logbuch</h1>
            <div className="logbuch__sub">
              Kapitän {game.profile} · Laderaum: {inv.length ? `${inv.length} ${inv.length === 1 ? 'Item' : 'Items'}` : 'noch leer'}
            </div>
          </div>
        </div>
        <SyncLine sync={game.sync} at={game.syncedAt} />

        <section className="logbuch__section" aria-label="Serie und Woche">
          <StreakPanel game={game} />
          <button type="button" className="btn-wood" onClick={onWeek}>
            Woche planen
          </button>
        </section>

        <section className="logbuch__section" aria-label="Kajüte">
          <h2 className="logbuch__h2">Kajüte</h2>
          {testMode && (
            <div className="logbuch__test">
              <button
                type="button"
                className="logbuch__row"
                onClick={() => {
                  game.testWind()
                  say(`Testmodus: +${RULES.windPerField} Wind`)
                }}
              >
                Testmodus: +{RULES.windPerField} Wind
              </button>
              <button
                type="button"
                className="logbuch__row"
                onClick={() => {
                  game.testGold()
                  say('Testmodus: +100 Gold')
                }}
              >
                Testmodus: +100 Gold
              </button>
              <button
                type="button"
                className="logbuch__row"
                onClick={() => {
                  game.testXp()
                  say('Testmodus: +100 Erfahrung')
                }}
              >
                Testmodus: +100 Erfahrung
              </button>
            </div>
          )}
          <button type="button" className="logbuch__row" aria-expanded={news} onClick={() => setNews((v) => !v)}>
            Was ist neu?
          </button>
          {news &&
            CHANGELOG.map((c) => (
              <div key={c.version} className="logbuch__news">
                <div style={{ fontWeight: 900, marginBottom: 4 }}>
                  Version {c.version} · {c.date}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {c.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          <button type="button" className="logbuch__row" onClick={onIntro}>
            Einführung ansehen
          </button>
          <button type="button" className="logbuch__row" onClick={() => game.logoutProfile()}>
            Profil wechseln
          </button>
          {confirmReset ? (
            <button type="button" className="logbuch__row logbuch__row--danger" onClick={() => game.resetGame()}>
              Wirklich alles löschen und neu starten?
            </button>
          ) : (
            <button type="button" className="logbuch__row" onClick={() => setConfirmReset(true)}>
              Spielstand zurücksetzen
            </button>
          )}
        </section>

        <button type="button" className="logbuch__version" onClick={tapVersion}>
          Version {__APP_VERSION__} · {__BUILD_DATE__}
        </button>
      </div>
    </div>
  )
}
