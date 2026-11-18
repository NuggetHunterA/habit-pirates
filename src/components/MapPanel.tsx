import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { ART } from '../assets'
import type { Game } from '../game/store'
import { CHAPTER_1, FIELD_TEXT } from '../game/map'
import { RULES, windAvailable } from '../game/rules'
import SeaMap from './SeaMap'

/** Text fuer den Hafen kommt von hier, weil der Laden jetzt existiert */
const fieldText = (k: keyof typeof FIELD_TEXT) => (k === 'hafen' ? 'Ein Handelsschiff mit Hafenladen. Hier kannst du einkaufen.' : FIELD_TEXT[k])

interface Props {
  game: Game
  onShop: () => void
  onChest: () => void
  say: (m: string) => void
}

export default function MapPanel({ game, onChest, onShop, say }: Props) {
  const save = game.save!
  const ship = save.game.field
  const [sailing, setSailing] = useState(false)
  const wind = windAvailable(save)
  const here = CHAPTER_1[ship]
  const atChest = here.kind === 'truhe' && !save.game.looted.includes(ship)
  const atEnd = ship >= CHAPTER_1.length - 1
  const next = CHAPTER_1[Math.min(ship + 1, CHAPTER_1.length - 1)]
  const canSail = wind >= RULES.windPerField && !atEnd && !sailing

  const sail = () => {
    if (atEnd) return say('Der Boss wartet. Die Kämpfe kommen im nächsten Bauabschnitt.')
    if (wind < RULES.windPerField) return say(`Noch ${RULES.windPerField - Math.max(0, wind)} Wind nötig. Hake Habits ab!`)
    game.sail()
  }

  const arrive = (i: number) => {
    const f = CHAPTER_1[i]
    if (f.kind === 'truhe') say('Truhe in Sicht!')
    else if (f.kind === 'hafen') say(`${f.name} erreicht. Der Hafenladen hat geöffnet!`)
    else if (f.kind !== 'start') say(`${f.name} erreicht. ${fieldText(f.kind)}`)
  }

  const kicker = sailing ? 'Unterwegs' : atChest ? 'Du bist hier' : atEnd ? 'Ende des Kapitels' : 'Nächstes Feld'
  const title = sailing ? `Kurs auf ${next.name}` : atChest ? here.name : atEnd ? here.name : next.name
  const text = sailing ? 'Volle Fahrt voraus!' : atChest ? 'Öffne sie und sieh, was drin ist.' : atEnd ? fieldText('boss') : fieldText(next.kind)
  const showEnemy = !sailing && !atChest && !atEnd && next.kind === 'gegner'

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <SeaMap field={ship} looted={save.game.looted} onArrive={arrive} onSailingChange={setSailing} />

      <div style={{ position: 'absolute', left: 12, right: 12, top: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, pointerEvents: 'none' }}>
        <div style={{ padding: '6px 14px', borderRadius: 12, background: 'linear-gradient(var(--wood-2), var(--wood-1))', border: '2px solid var(--brass)', color: 'var(--gold-text)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
          <div className="display" style={{ fontSize: 22, lineHeight: 1 }}>
            Kapitel 1
          </div>
          <div style={{ fontSize: 12, fontWeight: 800 }}>
            Feld {ship + 1} von {CHAPTER_1.length}
          </div>
        </div>
      </div>

      <motion.div
        className="card"
        layout
        style={{ position: 'absolute', left: 12, right: 12, bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', padding: 12, borderRadius: 18, borderWidth: 3, boxShadow: '0 6px 0 var(--wood-2), 0 10px 24px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520, margin: '0 auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <AnimatePresence>
            {showEnemy && (
              <motion.img
                src={ART.krabbe}
                alt="Krabbenbandit"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 12, border: '2px solid var(--wood-3)', flex: 'none', background: '#fff' }}
              />
            )}
          </AnimatePresence>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kicker}</span>
            <span className="display" style={{ fontSize: 26, lineHeight: 1.1 }}>
              {title}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{text}</span>
          </div>
        </div>
        {atChest && !sailing ? (
          <motion.button type="button" className="btn-gold" onClick={onChest} animate={{ scale: [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}>
            Truhe öffnen!
          </motion.button>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {here.kind === 'hafen' && !sailing && (
              <button type="button" className="btn-gold" style={{ minHeight: 48, fontSize: 16 }} onClick={onShop}>
                Hafenladen
              </button>
            )}
            <button type="button" className={`btn-sea ${canSail ? '' : 'btn-sea--off'}`} onClick={sail} disabled={sailing}>
              Segeln · {RULES.windPerField} Wind
            </button>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{Math.max(0, wind)} Wind an Bord</div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
