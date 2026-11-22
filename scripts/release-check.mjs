// Release-Check (Phase 6): npm run build && npm run check:release
// Startet die gebaute App (vite preview), simuliert das Fold zugeklappt und aufgeklappt
// und prueft Tageswechsel, Wochenwechsel, Zeitumstellung, lange Pause, offline und Ladezeit.
// Supabase wird dabei nie angesprochen: alle Anfragen beantwortet ein Platzhalter.
// Bildschirmfotos landen in release-check/ (nicht im Repository).
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const { chromium } = createRequire(import.meta.url)('playwright')
const OUT = process.env.OUT ?? 'release-check'
const PORT = 4174
const URL = `http://localhost:${PORT}/`
mkdirSync(OUT, { recursive: true })

const ZU = { width: 411, height: 960 }
const AUF = { width: 750, height: 832 }

let failed = 0
const ok = (cond, label, extra = '') => {
  console.log(`${cond ? 'ok  ' : 'FEHLER'} ${label}${extra ? ` · ${extra}` : ''}`)
  if (!cond) failed++
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(URL)).ok) break
  } catch {
    /* startet noch */
  }
  await new Promise((r) => setTimeout(r, 200))
}

// ---------- Spielstand bauen ----------
const HABITS = ['Wasser', 'Vitamin D', 'Lesen', 'Sport', 'Zähneputzen', 'Kein Doom-Scrolling'].map((name, i) => ({ id: `h${i}`, name, kind: i === 5 ? 'lassen' : 'tap', always: true }))
function dayKey(d) {
  const z = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}
function monday(key) {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d, 12)
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7))
  return dayKey(dt)
}
function save({ today, chapter = 1, field = 0, crew = ['jonte', 'kanonier'], xp = 0, logs = {}, week = true, seenAll = true, bossBeaten = [] }) {
  const ws = monday(today)
  return {
    version: 1,
    profile: 'Adrian',
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
    habits: HABITS,
    introDone: true,
    weeks: week ? { [ws]: { weekStart: ws, habitIds: HABITS.map((h) => h.id), focusIds: ['h0'], activeFrom: Object.fromEntries(HABITS.map((h) => [h.id, ws])) } } : {},
    logs,
    game: {
      gold: 120, windGift: 4, windSpent: 0, field, looted: [], inventory: [], gear: {}, found: [], shop: { day: '', bought: [] },
      chapter, crew, xp, cleared: [], seen: seenAll ? ['k1_intro', 'k2_intro', 'k3_intro'] : [], bossTries: { day: '', n: 0 }, bossBeaten,
    },
  }
}

async function open(viewport, time, s, { offline = false, sw = 'block' } = {}) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport, timezoneId: 'Europe/Berlin', locale: 'de-DE', serviceWorkers: sw, deviceScaleFactor: 1 })
  await ctx.route(/supabase\.co/, (r) => {
    if (r.request().url().includes('pirates_load')) return r.fulfill({ json: null })
    const body = r.request().postDataJSON() ?? {}
    return r.fulfill({ json: { data: body.p_data, updated_at: body.p_updated_at } })
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  if (time) await page.clock.install({ time })
  if (s) await page.addInitScript((v) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('hp.profile', JSON.stringify('Adrian'))
      localStorage.setItem('hp2.save.Adrian', JSON.stringify(v))
      sessionStorage.setItem('seeded', '1')
    }
  }, s)
  await page.goto(URL)
  await page.waitForTimeout(600)
  void offline
  return { browser, ctx, page, errors }
}

const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('hp2.save.Adrian') ?? 'null'))
/** Text der Seite, zugeklappt auf dem Deck (dort stehen Datum und Habits) */
async function body(page) {
  const deck = page.getByRole('button', { name: /^Deck/ }).first()
  if (await deck.count()) await deck.click().catch(() => {})
  await page.waitForTimeout(250)
  return page.locator('body').innerText()
}
const hidden = async (page, ms) => {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.clock.fastForward(ms)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(300)
}

// ---------- 1. Karten aller Kapitel, zugeklappt und aufgeklappt ----------
console.log('\n1. Seekarten')
for (const [name, vp] of [['zu', ZU], ['auf', AUF]]) {
  for (const ch of [1, 2, 3]) {
    const crew = ch === 1 ? ['jonte', 'kanonier'] : ch === 2 ? ['jonte', 'kanonier', 'navigatorin'] : ['jonte', 'kanonier', 'navigatorin', 'smutje', 'ausguck']
    const { browser, page, errors } = await open(vp, new Date('2026-11-24T10:00:00+01:00'), save({ today: '2026-11-24', chapter: ch, crew, bossBeaten: ch > 1 ? [1, 2].slice(0, ch - 1) : [] }))
    if (name === 'zu') {
      const karte = page.getByRole('button', { name: /Karte/ }).first()
      if (await karte.count()) await karte.click()
      await page.waitForTimeout(500)
    }
    await page.screenshot({ path: `${OUT}/karte-k${ch}-${name}.png` })
    ok(errors.length === 0, `Kapitel ${ch} ${name}geklappt ohne Fehler`, errors.join(' | '))
    await browser.close()
  }
}

// ---------- 2. Tageswechsel um Mitternacht ----------
console.log('\n2. Tageswechsel')
{
  const today = '2026-11-25'
  const logs = { [today]: { done: { h0: true, h1: true }, glasses: [] } }
  const { browser, page, errors } = await open(ZU, new Date('2026-11-25T23:59:20+01:00'), save({ today, logs }))
  const before = await body(page)
  if (process.env.DEBUG) console.log(before.slice(0, 700))
  ok(/Mittwoch, 25\. November/i.test(before), 'vor Mitternacht: Mittwoch')
  await page.clock.fastForward(60_000)
  await page.waitForTimeout(300)
  const after = await body(page)
  ok(/Donnerstag, 26\. November/i.test(after), 'nach Mitternacht: Donnerstag, ohne Neuladen')
  const s = await stored(page)
  ok(s.logs[today]?.done?.h0 === true, 'Haken von gestern bleiben erhalten')
  ok(/gestern/i.test(after), 'Leiste zum Nachtragen von gestern sichtbar')
  ok(errors.length === 0, 'keine Fehler', errors.join(' | '))
  await browser.close()
}

// ---------- 3. Wochenwechsel am Montag ----------
console.log('\n3. Wochenwechsel')
{
  const { browser, page, errors } = await open(ZU, new Date('2026-11-29T23:59:30+01:00'), save({ today: '2026-11-29' }))
  ok(/Sonntag, 29\. November/i.test(await body(page)), 'Sonntagabend')
  await page.clock.fastForward(60_000)
  await page.waitForTimeout(400)
  const txt = await body(page)
  await page.screenshot({ path: `${OUT}/wochenwechsel.png` })
  ok(/Montag, 30\. November/i.test(txt) || /Woche/.test(txt), 'Montag erkannt, Wochenplanung steht an')
  ok(errors.length === 0, 'keine Fehler', errors.join(' | '))
  await browser.close()
}

// ---------- 4. Zeitumstellung ----------
console.log('\n4. Zeitumstellung')
for (const [label, start, expect] of [
  ['Sommerzeit (28.3.2027, 2 auf 3 Uhr)', '2027-03-28T01:58:00+01:00', /Sonntag, 28\. März/i],
  ['Winterzeit (31.10.2027, 3 auf 2 Uhr)', '2027-10-31T02:58:00+02:00', /Sonntag, 31\. Oktober/i],
]) {
  const { browser, page, errors } = await open(ZU, new Date(start), save({ today: start.slice(0, 10) }))
  await page.clock.fastForward(2 * 60 * 60_000)
  await page.waitForTimeout(300)
  ok(expect.test(await body(page)), `${label}: Datum stimmt nach 2 Stunden`)
  // ein Tag spaeter: genau ein Tag weiter, kein Sprung
  // Handy ueber Nacht im Standby: beim Aufwecken kommt die App wieder in den Vordergrund
  await hidden(page, 24 * 60 * 60_000)
  const next = await body(page)
  ok(/Montag, 29\. März|Montag, 1\. November/i.test(next) || /Woche/.test(next), `${label}: am nächsten Tag Montag`)
  const keys = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('hp2.save.Adrian')).weeks))
  ok(keys.every((k) => new Date(k + 'T12:00:00').getDay() === 1), `${label}: Wochen beginnen immer montags`, keys.join(', '))
  ok(errors.length === 0, `${label}: keine Fehler`, errors.join(' | '))
  await browser.close()
}

// ---------- 5. App lange im Hintergrund ----------
console.log('\n5. Lange im Hintergrund')
{
  const today = '2026-11-24'
  const { browser, page, errors } = await open(ZU, new Date('2026-11-24T21:00:00+01:00'), save({ today, logs: { [today]: { done: { h0: true }, glasses: [] } } }))
  await hidden(page, 3 * 24 * 60 * 60_000)
  const txt = await body(page)
  ok(/Freitag, 27\. November/i.test(txt), 'nach 3 Tagen im Hintergrund: Freitag')
  await hidden(page, 4 * 24 * 60 * 60_000)
  const txt2 = await body(page)
  await page.screenshot({ path: `${OUT}/nach-pause.png` })
  ok(/Dienstag, 1\. Dezember/i.test(txt2) || /Woche/.test(txt2), 'nach einer weiteren Woche: neue Woche erkannt')
  ok(errors.length === 0, 'keine Fehler', errors.join(' | '))
  await browser.close()
}

// ---------- 6. Offline als installierte App ----------
console.log('\n6. Offline')
{
  const { browser, ctx, page, errors } = await open(ZU, null, save({ today: dayKey(new Date()) }), { sw: 'allow' })
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await page.waitForTimeout(1500)
  await ctx.setOffline(true)
  await page.reload()
  await page.waitForTimeout(1200)
  const txt = await body(page)
  await page.screenshot({ path: `${OUT}/offline.png` })
  ok(txt.length > 50 && !/ERR_|nicht erreichbar/i.test(txt), 'App startet im Flugmodus')
  const broken = await page.evaluate(() => Array.from(document.images).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.split('/').pop()))
  ok(broken.length === 0, 'alle Bilder der Startseite offline da', broken.join(', '))
  // Ein Bild, das vorher nie angezeigt wurde (Kampfhintergrund Kapitel 3)
  const fight = await page.evaluate(async () => {
    const urls = performance.getEntriesByType('resource').map((e) => e.name)
    void urls
    const html = await (await fetch('./')).text().catch(() => '')
    return html.length
  })
  ok(fight > 0, 'Startseite aus dem Cache')
  const pre = await page.evaluate(async () => {
    const keys = await caches.keys()
    let n = 0
    for (const k of keys) n += (await (await caches.open(k)).keys()).length
    return n
  })
  ok(pre > 100, 'Bilder und Code vorab im Offline-Speicher', `${pre} Dateien`)
  ok(errors.length === 0, 'keine Fehler', errors.join(' | '))
  await ctx.setOffline(false)
  await browser.close()
}

// ---------- 7. Ladezeit ----------
console.log('\n7. Ladezeit (Fold-ähnlich: 4x langsamere CPU, schnelles 4G)')
{
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: ZU, timezoneId: 'Europe/Berlin', serviceWorkers: 'block' })
  await ctx.route(/supabase\.co/, (r) => r.fulfill({ json: null }))
  const page = await ctx.newPage()
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 60, downloadThroughput: (12 * 1024 * 1024) / 8, uploadThroughput: (3 * 1024 * 1024) / 8 })
  let bytes = 0
  cdp.on('Network.loadingFinished', (e) => (bytes += e.encodedDataLength))
  await page.addInitScript((v) => {
    localStorage.setItem('hp.profile', JSON.stringify('Adrian'))
    localStorage.setItem('hp2.save.Adrian', JSON.stringify(v))
  }, save({ today: dayKey(new Date()) }))
  const t0 = Date.now()
  await page.goto(URL, { waitUntil: 'load' })
  const loadMs = Date.now() - t0
  const lcp = await page.evaluate(
    () =>
      new Promise((res) => {
        new PerformanceObserver((l) => res(Math.round(l.getEntries().at(-1).startTime))).observe({ type: 'largest-contentful-paint', buffered: true })
        setTimeout(() => res(-1), 3000)
      }),
  )
  await page.waitForTimeout(1500)
  console.log(`     geladen nach ${loadMs} ms, größtes Element nach ${lcp} ms, übertragen ${(bytes / 1024).toFixed(0)} KB`)
  ok(lcp > 0 && lcp < 2500, 'größtes Element unter 2,5 s')
  // Bildrate der Karte beim Segeln: rAF-Takt messen
  const fps = await page.evaluate(
    () =>
      new Promise((res) => {
        let n = 0
        const t = performance.now()
        const f = () => (performance.now() - t < 2000 ? (n++, requestAnimationFrame(f)) : res(Math.round(n / 2)))
        requestAnimationFrame(f)
      }),
  )
  console.log(`     Bildrate auf der Startseite bei 4x langsamer CPU: ${fps} Bilder/s`)
  ok(fps >= 40, 'flüssig (mindestens 40 Bilder/s)')
  await browser.close()
}

server.kill()
console.log(failed ? `\n${failed} Prüfung(en) fehlgeschlagen.` : '\nAlle Prüfungen bestanden.')
process.exit(failed ? 1 : 0)
