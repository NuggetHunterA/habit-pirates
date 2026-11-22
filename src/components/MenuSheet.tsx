import { useState } from 'react'
import type { Game, SyncState } from '../game/store'
import Sheet from './Sheet'
import { RULES } from '../game/rules'

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

export default function MenuSheet({ game, onClose, say, onIntro }: { game: Game; onClose: () => void; say: (m: string) => void; onIntro: () => void }) {
  const [confirmReset, setConfirmReset] = useState(false)
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
    <Sheet onClose={onClose} label="Menü">
      <h2>Ahoi, {game.profile}!</h2>
      <div style={{ fontSize: 14, fontWeight: 800 }}>
        Laderaum: {inv.length ? `${inv.length} ${inv.length === 1 ? 'Item' : 'Items'} · ansehen unter Ausrüstung` : 'noch leer'}
      </div>
      <SyncLine sync={game.sync} at={game.syncedAt} />
      {testMode && (
        <>
          <button
            type="button"
            className="small-btn"
            style={{ height: 48 }}
            onClick={() => {
              game.testWind()
              say(`Testmodus: +${RULES.windPerField} Wind`)
            }}
          >
            Testmodus: +{RULES.windPerField} Wind
          </button>
          <button
            type="button"
            className="small-btn"
            style={{ height: 48 }}
            onClick={() => {
              game.testGold()
              say('Testmodus: +100 Gold')
            }}
          >
            Testmodus: +100 Gold
          </button>
          <button
            type="button"
            className="small-btn"
            style={{ height: 48 }}
            onClick={() => {
              game.testXp()
              say('Testmodus: +100 Erfahrung')
            }}
          >
            Testmodus: +100 Erfahrung
          </button>
        </>
      )}
      <button
        type="button"
        className="small-btn"
        style={{ height: 48 }}
        onClick={() => {
          onIntro()
          onClose()
        }}
      >
        Einführung ansehen
      </button>
      {confirmReset ? (
        <button
          type="button"
          className="small-btn"
          style={{ height: 48, borderColor: '#8A2E1E', color: '#8A2E1E' }}
          onClick={() => {
            game.resetGame()
            onClose()
          }}
        >
          Wirklich alles löschen und neu starten?
        </button>
      ) : (
        <button type="button" className="small-btn" style={{ height: 48 }} onClick={() => setConfirmReset(true)}>
          Spielstand zurücksetzen
        </button>
      )}
      <button
        type="button"
        className="small-btn"
        style={{ height: 48 }}
        onClick={() => {
          game.logoutProfile()
          onClose()
        }}
      >
        Profil wechseln
      </button>
      <button
        type="button"
        onClick={tapVersion}
        style={{ background: 'none', border: 'none', padding: 4, marginTop: 4, textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#6b7399' }}
      >
        Version {__APP_VERSION__} · {__BUILD_DATE__}
      </button>
    </Sheet>
  )
}
