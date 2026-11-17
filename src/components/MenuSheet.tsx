import { useState } from 'react'
import type { Game } from '../game/store'
import { SLOT_LABEL, RARITY_LABEL } from '../game/loot'
import Sheet from './Sheet'

export default function MenuSheet({ game, onClose, say }: { game: Game; onClose: () => void; say: (m: string) => void }) {
  const [confirmReset, setConfirmReset] = useState(false)
  const inv = game.save?.game.inventory ?? []
  return (
    <Sheet onClose={onClose} label="Menü">
      <h2>Ahoi, {game.profile}!</h2>
      <div style={{ fontSize: 14, fontWeight: 800 }}>
        Laderaum: {inv.length ? `${inv.length} ${inv.length === 1 ? 'Item' : 'Items'}` : 'noch leer'}
      </div>
      {inv.length > 0 && (
        <div style={{ maxHeight: 140, overflowY: 'auto', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {inv
            .slice()
            .reverse()
            .map((it) => (
              <div key={it.uid}>
                {it.name} · {SLOT_LABEL[it.slot]} · {RARITY_LABEL[it.rarity]}
              </div>
            ))}
        </div>
      )}
      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Ausrüsten kommt mit dem Ausrüstungs-Tab.</div>
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
