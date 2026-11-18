import { useState } from 'react'
import type { Game } from '../game/store'
import Sheet from './Sheet'
import { applyLook, currentLook, type Look } from '../look'

export default function MenuSheet({ game, onClose, say }: { game: Game; onClose: () => void; say: (m: string) => void }) {
  const [confirmReset, setConfirmReset] = useState(false)
  const [look, setLook] = useState<Look>(currentLook)
  const inv = game.save?.game.inventory ?? []
  return (
    <Sheet onClose={onClose} label="Menü">
      <h2>Ahoi, {game.profile}!</h2>
      <div style={{ fontSize: 14, fontWeight: 800 }}>
        Laderaum: {inv.length ? `${inv.length} ${inv.length === 1 ? 'Item' : 'Items'} · ansehen unter Ausrüstung` : 'noch leer'}
      </div>
      <div style={{ fontSize: 14, fontWeight: 800 }}>Look</div>
      <div className="seg" role="group" aria-label="Look">
        {(
          [
            ['klassisch', 'Klassisch'],
            ['a', 'A · Arena'],
            ['b', 'B · Lagune'],
          ] as [Look, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={look === k}
            onClick={() => {
              applyLook(k)
              setLook(k)
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="small-btn"
        style={{ height: 48 }}
        onClick={() => {
          game.testWind()
          say('Testmodus: +3 Wind')
        }}
      >
        Testmodus: +3 Wind
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
    </Sheet>
  )
}
