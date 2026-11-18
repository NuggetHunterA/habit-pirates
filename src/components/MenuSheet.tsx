import { useState } from 'react'
import type { Game } from '../game/store'
import Sheet from './Sheet'

export default function MenuSheet({ game, onClose, say }: { game: Game; onClose: () => void; say: (m: string) => void }) {
  const [confirmReset, setConfirmReset] = useState(false)
  const inv = game.save?.game.inventory ?? []
  return (
    <Sheet onClose={onClose} label="Menü">
      <h2>Ahoi, {game.profile}!</h2>
      <div style={{ fontSize: 14, fontWeight: 800 }}>
        Laderaum: {inv.length ? `${inv.length} ${inv.length === 1 ? 'Item' : 'Items'} · ansehen unter Ausrüstung` : 'noch leer'}
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
