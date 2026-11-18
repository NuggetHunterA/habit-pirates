import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { SPEAKERS, STORIES, type Reward } from '../game/story'
import { rollItem } from '../game/loot'
import type { Item } from '../game/types'
import { ABILITIES } from '../game/combat'
import { CREW } from '../game/foes'
import { FIGHT_ART, figure, portraitFor } from '../fight/art'
import LootList from './LootList'
import './StoryScene.css'

interface Props {
  id: string
  chapter?: number
  onDone: (gold: number, items: Item[]) => void
}

/** Figuren, deren Bild nach links schaut (werden links gespiegelt, damit sich alle ansehen) */
const FACES_LEFT: string[] = ['kanonier', 'navigatorin', 'smutje', 'ausguck', 'schalbart', 'grauhand']

type Step = { k: 'line'; i: number } | { k: 'choice' } | { k: 'outcome'; o: number } | { k: 'join' } | { k: 'reward' }

function rewardOf(r: Reward | undefined, chapter = 1): { gold: number; items: Item[] } {
  return { gold: r?.gold ?? 0, items: r?.item ? [rollItem('gewoehnlich', chapter)] : [] }
}

export default function StoryScene({ id, chapter = 1, onDone }: Props) {
  const st = STORIES[id]
  const [step, setStep] = useState<Step>({ k: 'line', i: 0 })
  const [choice, setChoice] = useState<number | null>(null)
  // Belohnung einmal auswuerfeln, sobald sie feststeht
  const base = useMemo(() => rewardOf(st.reward, chapter), [st, chapter])
  const [picked, setPicked] = useState<{ gold: number; items: Item[] } | null>(null)
  const total = { gold: base.gold + (picked?.gold ?? 0), items: [...base.items, ...(picked?.items ?? [])] }

  const hasReward = total.gold > 0 || total.items.length > 0

  const finish = () => onDone(total.gold, total.items)
  // Nach der Choice steht die Belohnung erst nach dem Klick fest, darum hier extra pruefen
  const end = (gold: number) => (st.join ? { k: 'join' as const } : gold > 0 || total.items.length > 0 ? { k: 'reward' as const } : null)

  const advance = () => {
    if (step.k === 'line') {
      if (step.i < st.lines.length - 1) setStep({ k: 'line', i: step.i + 1 })
      else if (st.choice) setStep({ k: 'choice' })
      else {
        const n = end(total.gold)
        if (n) setStep(n)
        else finish()
      }
    } else if (step.k === 'outcome') setStep(st.join ? { k: 'join' } : { k: 'reward' })
    else if (step.k === 'join') {
      if (hasReward) setStep({ k: 'reward' })
      else finish()
    }
  }

  const line = step.k === 'line' ? st.lines[step.i] : null
  const speaker = line?.who
  const [left, right] = st.cast
  const name = speaker ? SPEAKERS[speaker] ?? speaker : ''

  return (
    <div className="story" style={{ backgroundImage: `url(${FIGHT_ART.backgrounds[st.bg]})` }}>
      <div className={`story__shade story__shade--${st.bg}`} />
      <motion.div className="story__title display" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        {st.title}
      </motion.div>

      <div className="story__cast">
        {[left, right].map((look, i) =>
          look ? (
            <motion.img
              key={look}
              src={figure(look)}
              alt={SPEAKERS[look] ?? look}
              className={`story__fig story__fig--${i ? 'r' : 'l'} ${look === 'schalbart' || look === 'grauhand' ? 'story__fig--big' : ''} ${speaker === look ? 'is-talking' : speaker && speaker !== 'erzaehler' ? 'is-quiet' : ''}`}
              style={{ scaleX: FACES_LEFT.includes(look) === (i === 0) ? -1 : 1 }}
              initial={{ x: i ? 80 : -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.15 + i * 0.15, type: 'spring', stiffness: 160, damping: 18 }}
            />
          ) : null,
        )}
      </div>

      <AnimatePresence mode="wait">
        {line && (
          <motion.button
            type="button"
            key={'l' + (step.k === 'line' ? step.i : 0)}
            className={`story__box ${speaker === 'erzaehler' ? 'story__box--narr' : ''}`}
            onClick={advance}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {name && <span className="story__name">{name}</span>}
            <span className="story__text">{line.text}</span>
            <span className="story__next">Weiter ▸</span>
          </motion.button>
        )}

        {step.k === 'choice' && st.choice && (
          <motion.div key="choice" className="story__box story__box--panel" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
            <span className="story__name">{st.choice.prompt}</span>
            <div className="story__choices">
              {st.choice.options.map((o, i) => (
                <button
                  key={o.label}
                  type="button"
                  className="btn-sea"
                  onClick={() => {
                    setChoice(i)
                    setPicked(rewardOf(o.reward, chapter))
                    setStep({ k: 'outcome', o: i })
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step.k === 'outcome' && st.choice && choice != null && (
          <motion.button type="button" key="outcome" className="story__box story__box--narr" onClick={advance} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
            <span className="story__text">{st.choice.options[choice].text}</span>
            <span className="story__next">Weiter ▸</span>
          </motion.button>
        )}

        {step.k === 'join' && st.join && (
          <motion.div key="join" className="story__join" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 15 }}>
            <div className="story__join-rays" aria-hidden="true" />
            <img src={portraitFor(st.join)} alt="" />
            <div className="kicker">Neu an Bord</div>
            <div className="display story__join-name">{CREW[st.join].title}</div>
            <ul>
              {CREW[st.join].abilities.map((a) => (
                <li key={a}>
                  <b>{ABILITIES[a].name}</b> {ABILITIES[a].text}
                </li>
              ))}
            </ul>
            <button type="button" className="btn-gold" onClick={advance}>
              Willkommen!
            </button>
          </motion.div>
        )}

        {step.k === 'reward' && (
          <motion.div key="reward" className="story__box story__box--panel" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            {hasReward ? (
              <>
                <span className="story__name">Gefunden</span>
                <LootList gold={total.gold} items={total.items} />
              </>
            ) : (
              <span className="story__text">Auf geht’s!</span>
            )}
            <button type="button" className="btn-gold" onClick={finish}>
              Weiter
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
