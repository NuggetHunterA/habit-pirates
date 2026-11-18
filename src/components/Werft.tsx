import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import type { Game } from '../game/store'
import type { Item, Rarity } from '../game/types'
import { MAX_STARS, STAT_LABEL, STAT_ORDER, isPercent, itemBonus, starGold, starNeedsBoth } from '../game/items'
import { copiesOf, sellableCopy, wearer } from '../game/equipment'
import { RARITY_LABEL } from '../game/loot'
import ItemIcon, { RARITY_COLOR } from './ItemIcon'
import StatIcon from './StatIcon'
import './Gear.css'

const ORDER: Rarity[] = ['legendaer', 'episch', 'selten', 'gewoehnlich']

/** Je Item-Art das Exemplar, das verstaerkt wird: meiste Sterne, sonst ein getragenes */
function pieces(inv: Item[], wornBy: (uid: string) => string | null): Item[] {
  const best = new Map<string, Item>()
  for (const it of inv) {
    const cur = best.get(it.key)
    const score = (x: Item) => (x.stars ?? 0) * 10 + (wornBy(x.uid) ? 1 : 0)
    if (!cur || score(it) > score(cur)) best.set(it.key, it)
  }
  return [...best.values()].sort((a, b) => ORDER.indexOf(a.rarity) - ORDER.indexOf(b.rarity) || a.name.localeCompare(b.name))
}

const stars = (n: number, max: number) => '★'.repeat(n) + '☆'.repeat(Math.max(0, max - n))

/** Werft: Items mit Gold und Duplikaten um Sterne verstaerken (+5 % je Stern auf die Werte) */
export default function Werft({ game, say }: { game: Game; say: (m: string) => void }) {
  const g = game.save!.game
  const list = useMemo(() => pieces(g.inventory, (u) => wearer(g, u)), [g])
  const [sel, setSel] = useState<string | null>(null)
  const item = list.find((x) => x.uid === sel) ?? list.find((x) => (x.stars ?? 0) < MAX_STARS[x.rarity]) ?? list[0]
  if (!item) {
    return <p className="muted" style={{ padding: 20, textAlign: 'center' }}>Noch keine Items im Laderaum. Truhen und Kämpfe bringen welche.</p>
  }
  const n = item.stars ?? 0
  const max = MAX_STARS[item.rarity]
  const next = n + 1
  const full = n >= max
  const both = starNeedsBoth(next)
  const gold = starGold(item.rarity, next)
  const dup = sellableCopy(g, item.key, item.uid)
  const dups = copiesOf(g, item.key).length - 1
  const now = itemBonus(item)
  const after = itemBonus({ key: item.key, stars: next })
  const c = RARITY_COLOR[item.rarity]

  const up = (pay: 'gold' | 'dup') => {
    const err = game.upgradeStar(item.uid, pay)
    if (err) return say(err)
    setSel(item.uid)
    say(`${item.name} hat jetzt ${next} ${next === 1 ? 'Stern' : 'Sterne'}!`)
  }

  return (
    <motion.div className="werft" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="werft__main card" style={{ borderColor: c.ring }}>
        <div className="werft__head">
          <ItemIcon itemKey={item.key} slot={item.slot} rarity={item.rarity} size={84} stars={n} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <span className="rarity-tag" style={{ background: c.tagBg, color: c.tagFg }}>
              {RARITY_LABEL[item.rarity]}
            </span>
            <div className="display" style={{ fontSize: 24, lineHeight: 1.05, marginTop: 4 }}>
              {item.name}
            </div>
            <div className="werft__stars" aria-label={`${n} von ${max} Sternen`}>
              {stars(n, max)}
              {!full && <span className="werft__arrow"> → {'★'.repeat(next)}</span>}
            </div>
          </div>
        </div>
        {full ? (
          <p style={{ margin: 0, fontWeight: 800 }}>Voll verstärkt: +{n * 5} % auf alle Werte.</p>
        ) : (
          <>
            <div className="werft__rows">
              {STAT_ORDER.filter((k) => now[k]).map((k) => (
                <div key={k} className="werft__row">
                  <StatIcon stat={k} size={18} />
                  <span>{STAT_LABEL[k]}</span>
                  <b>
                    {now[k]}
                    {isPercent(k) ? ' %' : ''}
                  </b>
                  <span>→</span>
                  <b className={after[k]! > now[k]! ? 'werft__up' : ''}>
                    {after[k]}
                    {isPercent(k) ? ' %' : ''}
                  </b>
                </div>
              ))}
              <div className="werft__row">
                <span />
                <span>Bonus auf die Werte</span>
                <b>+{n * 5} %</b>
                <span>→</span>
                <b className="werft__up">+{next * 5} %</b>
              </div>
            </div>
            <div className="werft__cost">
              <div>
                <span className="coin coin--sm" /> Gold <b>{gold}</b> <span className="muted">· du hast {g.gold}</span>
              </div>
              <div>
                Duplikat {both ? '(nötig ab Stern 3)' : '(statt Gold)'} <b>{dup ? `${dups} vorhanden` : 'keins frei'}</b>
              </div>
            </div>
            {both ? (
              <button type="button" className={`btn-gold ${g.gold >= gold && dup ? '' : 'btn-gold--off'}`} onClick={() => up('gold')}>
                Auf {next} Sterne verstärken
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className={`btn-gold ${g.gold >= gold ? '' : 'btn-gold--off'}`} style={{ flex: '1 1 140px' }} onClick={() => up('gold')}>
                  Für {gold} Gold
                </button>
                <button type="button" className={`btn-sea ${dup ? '' : 'btn-sea--off'}`} style={{ flex: '1 1 140px' }} onClick={() => up('dup')}>
                  Mit Duplikat
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="werft__title display">Weitere Items</div>
      <div className="werft__list">
        {list.map((it) => {
          const s = it.stars ?? 0
          const m = MAX_STARS[it.rarity]
          const done = s >= m
          const nx = s + 1
          return (
            <button key={it.uid} type="button" className={`werft__item ${it.uid === item.uid ? 'werft__item--on' : ''}`} onClick={() => setSel(it.uid)}>
              <ItemIcon itemKey={it.key} slot={it.slot} rarity={it.rarity} size={48} stars={s} />
              <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <span style={{ display: 'block', fontWeight: 900 }}>{it.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }} className="muted">
                  {done ? 'voll verstärkt' : starNeedsBoth(nx) ? `${starGold(it.rarity, nx)} Gold und Duplikat` : `${starGold(it.rarity, nx)} Gold oder Duplikat`}
                </span>
              </span>
              <span className="werft__mini">{stars(s, m)}</span>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}
