import type { Item, Rarity, School, SetId, Slot, Stats } from './types'
import type { Mods } from './combat'

const art = import.meta.glob('../assets/items/*.webp', { eager: true, import: 'default' }) as Record<string, string>
const ART: Record<string, string> = Object.fromEntries(Object.entries(art).map(([k, v]) => [k.split('/').pop()!.replace('.webp', ''), v]))

export interface ItemDef {
  key: string
  name: string
  slot: Slot
  rarity: Rarity
  /** Ab welchem Kapitel das Item als Beute und im Laden auftaucht */
  chapter: number
  bonus: Partial<Stats>
  /** Kurzer Flavour-Text fuer Detailansicht und Laden */
  text: string
  /** Schule (nur episch und legendaer) */
  school?: School
  /** Set-Teil (ab Kapitel 2) */
  set?: SetId
  /** Effekt (episch: einer, legendaer: ein einzigartiger) */
  effect?: { text: string; mods: Mods }
}

/** Alle Items im Spiel. Bilder: src/assets/items/<key>.webp (Anime-Stil C). */
export const CATALOG: ItemDef[] = [
  // Waffen
  { key: 'entersaebel', name: 'Rostiger Entersäbel', slot: 'waffe', rarity: 'gewoehnlich', chapter: 1, bonus: { angriff: 4 }, text: 'Hat schon bessere Tage gesehen. Schneidet trotzdem.' },
  { key: 'dolch', name: 'Matrosendolch', slot: 'waffe', rarity: 'gewoehnlich', chapter: 1, bonus: { angriff: 3 }, text: 'Leicht und schnell zur Hand.' },
  { key: 'enteraxt', name: 'Enteraxt', slot: 'waffe', rarity: 'selten', chapter: 1, bonus: { angriff: 8 }, text: 'Für Taue, Planken und freche Krabben.' },
  { key: 'schlitzer', name: 'Wellenschlitzer', slot: 'waffe', rarity: 'selten', chapter: 1, bonus: { angriff: 7, krit: 5 }, text: 'Die Klinge glänzt wie die Brandung.' },
  { key: 'pistole', name: 'Steinschlosspistole', slot: 'waffe', rarity: 'selten', chapter: 1, bonus: { angriff: 6, tempo: 3 }, text: 'Ein Schuss, aber der sitzt.' },
  { key: 'korallendegen', name: 'Korallendegen', slot: 'waffe', rarity: 'episch', chapter: 1, bonus: { angriff: 11, krit: 8 }, text: 'Aus einem Riff gewachsen, das nie stillsteht.', school: 'klinge', effect: { text: 'Kritische Treffer verursachen Blutung.', mods: { critBleed: true } } },
  { key: 'gezeitenklinge', name: 'Klinge der Gezeiten', slot: 'waffe', rarity: 'legendaer', chapter: 1, bonus: { angriff: 16, krit: 10, tempo: 4 }, text: 'Wer sie führt, hat das Meer auf seiner Seite.', school: 'klinge', effect: { text: 'Gegen blutende Ziele +30 % Krit-Chance. Jeder 3. Angriff trifft zweimal.', mods: { critVsBlutung: 30, doubleEvery: 3 } } },
  // Hüte
  { key: 'kopftuch', name: 'Rotes Kopftuch', slot: 'hut', rarity: 'gewoehnlich', chapter: 1, bonus: { leben: 6 }, text: 'Hält Sonne und Schweiß aus den Augen.' },
  { key: 'dreispitz', name: 'Alter Dreispitz', slot: 'hut', rarity: 'gewoehnlich', chapter: 1, bonus: { ruestung: 2 }, text: 'Zerbeult, aber stolz.' },
  { key: 'federhut', name: 'Hut mit Möwenfeder', slot: 'hut', rarity: 'selten', chapter: 1, bonus: { ruestung: 4, tempo: 4 }, text: 'Die Möwe wollte die Feder nicht zurück.' },
  { key: 'kapitaenshut', name: 'Goldener Kapitänshut', slot: 'hut', rarity: 'episch', chapter: 1, bonus: { ruestung: 6, leben: 15 }, text: 'Jeder an Bord weiß sofort, wer hier das Sagen hat.', school: 'gezeiten', effect: { text: 'Kampfstart: Schild über 10 % Leben.', mods: { startShield: 0.1 } } },
  // Kleidung
  { key: 'weste', name: 'Leinenweste', slot: 'kleidung', rarity: 'gewoehnlich', chapter: 1, bonus: { ruestung: 3 }, text: 'Luftig und robust.' },
  { key: 'stiefel', name: 'Deckstiefel', slot: 'kleidung', rarity: 'gewoehnlich', chapter: 1, bonus: { leben: 8 }, text: 'Rutschfest auf nassen Planken.' },
  { key: 'schaerpe', name: 'Rote Schärpe', slot: 'kleidung', rarity: 'gewoehnlich', chapter: 1, bonus: { tempo: 2 }, text: 'Macht flink und sieht gut aus.' },
  { key: 'lederwams', name: 'Gehärtetes Lederwams', slot: 'kleidung', rarity: 'selten', chapter: 1, bonus: { ruestung: 6, leben: 8 }, text: 'Dreifach geschnallt, doppelt sicher.' },
  { key: 'sturmmantel', name: 'Sturmmantel', slot: 'kleidung', rarity: 'episch', chapter: 2, bonus: { ruestung: 9, ausweichen: 5 }, text: 'Im Saum knistern kleine Blitze.', school: 'glueck', effect: { text: 'Nach dem Ausweichen: Konter mit 60 % Schaden.', mods: { counter: 0.6 } } },
  // Talismane
  { key: 'muschel', name: 'Glatte Muschel', slot: 'talisman', rarity: 'gewoehnlich', chapter: 1, bonus: { ausweichen: 2 }, text: 'Wer hineinhorcht, hört das Meer.' },
  { key: 'gluecksmuenze', name: 'Glücksmünze', slot: 'talisman', rarity: 'selten', chapter: 1, bonus: { ausweichen: 3, krit: 2 }, text: 'Kopf oder Totenkopf?' },
  { key: 'haizahn', name: 'Haizahnkette', slot: 'talisman', rarity: 'selten', chapter: 1, bonus: { angriff: 3, krit: 4 }, text: 'Der Hai brauchte sie nicht mehr.' },
  { key: 'sturmkompass', name: 'Sturmkompass', slot: 'talisman', rarity: 'episch', chapter: 2, bonus: { tempo: 8, ausweichen: 4 }, text: 'Zeigt immer dahin, wo der Wind herkommt.', school: 'gezeiten', effect: { text: 'Die ersten 2 Treffer verlangsamen das Ziel.', mods: { slowHits: 2 } } },
  { key: 'perle', name: 'Herz der Tiefe', slot: 'talisman', rarity: 'legendaer', chapter: 2, bonus: { leben: 30, ruestung: 4, ausweichen: 8 }, text: 'Eine Perle, die im Dunkeln leise leuchtet.', school: 'gezeiten', effect: { text: 'Einmal pro Kampf: Fällt das Leben unter 30 %, heilt der Träger 40 %.', mods: { lastStand: { below: 0.3, heal: 0.4 } } } },
  // Schiffsteile (gelten fuer die ganze Crew)
  { key: 'segeltuch', name: 'Geflicktes Segeltuch', slot: 'schiff', rarity: 'gewoehnlich', chapter: 1, bonus: { tempo: 1 }, text: 'Mehr Flicken als Segel, aber es fängt Wind.' },
  { key: 'messingkanone', name: 'Messingkanone', slot: 'schiff', rarity: 'selten', chapter: 1, bonus: { angriff: 3 }, text: 'Klein, laut und blank geputzt.' },
  { key: 'galionsfigur', name: 'Meerjungfrau-Galionsfigur', slot: 'schiff', rarity: 'episch', chapter: 1, bonus: { leben: 20, ruestung: 4 }, text: 'Sie wacht über Schiff und Crew.', school: 'gezeiten', effect: { text: 'Jeder Pirat heilt bei jedem 4. Zug 5 % Leben.', mods: { regen: { every: 4, pct: 0.05 } } } },
  // Erweiterung Phase 3 (Kapitel 1 bis 3)
  { key: 'bootshaken', name: 'Bootshaken', slot: 'waffe', rarity: 'gewoehnlich', chapter: 1, bonus: { angriff: 4 }, text: 'Zieht Boote heran und Gegner von den Füßen.' },
  { key: 'belegnagel', name: 'Belegnagel-Knüppel', slot: 'waffe', rarity: 'gewoehnlich', chapter: 1, bonus: { angriff: 4 }, text: 'Eigentlich hält er Taue fest. Eigentlich.' },
  { key: 'zwillingsdolche', name: 'Zwillingsdolche', slot: 'waffe', rarity: 'selten', chapter: 1, bonus: { angriff: 7, tempo: 4 }, text: 'Zwei Klingen, doppelt so frech.' },
  { key: 'glutsaebel', name: 'Glutsäbel', slot: 'waffe', rarity: 'episch', chapter: 1, bonus: { angriff: 11, krit: 8 }, text: 'Die Klinge glüht, als hätte sie in der Kombüse geschlafen.', school: 'pulver', effect: { text: 'Treffer setzen mit 25 % Chance Brand.', mods: { burnChance: 0.25 } } },
  { key: 'fischerharpune', name: 'Fischerharpune', slot: 'waffe', rarity: 'gewoehnlich', chapter: 2, bonus: { angriff: 5 }, text: 'Für große Fische und kleine Probleme.' },
  { key: 'riffmachete', name: 'Riff-Machete', slot: 'waffe', rarity: 'gewoehnlich', chapter: 2, bonus: { krit: 3 }, text: 'Schneidet sich durch Tang und Ausreden.' },
  { key: 'krummsaebel', name: 'Krummsäbel', slot: 'waffe', rarity: 'selten', chapter: 2, bonus: { angriff: 9, krit: 6 }, text: 'Gebogen wie eine Welle, scharf wie ihr Kamm.' },
  { key: 'donnerrohr', name: 'Donnerrohr', slot: 'waffe', rarity: 'selten', chapter: 2, bonus: { angriff: 9, kritSchaden: 17 }, text: 'Laut, ungenau und trotzdem gefürchtet.' },
  { key: 'moewenschnabel', name: 'Möwenschnabel-Degen', slot: 'waffe', rarity: 'episch', chapter: 2, bonus: { angriff: 14, krit: 9 }, text: 'Pickt dort zu, wo es glitzert.', school: 'glueck', set: 'goldene_moewe', effect: { text: 'Nach jedem Krit: +5 % Ausweichen bis Kampfende, höchstens 3-mal.', mods: { critDodge: 5 } } },
  { key: 'sturmjaegerklinge', name: 'Sturmjäger-Klinge', slot: 'waffe', rarity: 'legendaer', chapter: 2, bonus: { angriff: 20, krit: 12, tempo: 4 }, text: 'Wer sie zieht, hört den Sturm pfeifen.', school: 'klinge', set: 'sturmjaeger', effect: { text: 'Treffer verursachen mit 30 % Chance Blutung. Gegen blutende Ziele +20 % Krit-Schaden.', mods: { bleedChance: 0.3, kritVsBlutung: 20 } } },
  { key: 'wellenbrecher', name: 'Wellenbrecher', slot: 'waffe', rarity: 'episch', chapter: 2, bonus: { angriff: 14, ruestung: 10 }, text: 'Schwer wie ein Anker, aber schneller zurück.', school: 'gezeiten', effect: { text: 'Treffer verlangsamen das Ziel mit 25 % Chance.', mods: { slowChance: 0.25 } } },
  { key: 'enterbeil', name: 'Enterbeil', slot: 'waffe', rarity: 'gewoehnlich', chapter: 3, bonus: { angriff: 6 }, text: 'Das Lieblingswerkzeug beim Entern.' },
  { key: 'altemuskete', name: 'Alte Muskete', slot: 'waffe', rarity: 'gewoehnlich', chapter: 3, bonus: { angriff: 6 }, text: 'Riecht nach Pulver und alten Geschichten.' },
  { key: 'korallendreizack', name: 'Korallendreizack', slot: 'waffe', rarity: 'selten', chapter: 3, bonus: { angriff: 11, leben: 22 }, text: 'Drei Zinken, drei Chancen.' },
  { key: 'doppelpistole', name: 'Doppelläufige Pistole', slot: 'waffe', rarity: 'selten', chapter: 3, bonus: { angriff: 11, krit: 6 }, text: 'Für alle, die nicht nachladen wollen.' },
  { key: 'pulverbuechse', name: 'Pulverteufel-Büchse', slot: 'waffe', rarity: 'episch', chapter: 3, bonus: { angriff: 18, kritSchaden: 32 }, text: 'Mehr Pulver als Verstand.', school: 'pulver', set: 'pulverteufel', effect: { text: 'Gegen brennende Ziele +20 % Krit-Chance.', mods: { critVsBrand: 20 } } },
  { key: 'nebeldolch', name: 'Nebeldolch', slot: 'waffe', rarity: 'episch', chapter: 3, bonus: { angriff: 18, ausweichen: 6 }, text: 'Man sieht ihn erst, wenn es zu spät ist.', school: 'fluch', set: 'nebelgaenger', effect: { text: 'Treffer vergiften mit 25 % Chance.', mods: { poisonChance: 0.25 } } },
  { key: 'schwurklinge', name: 'Schwurklinge der Tiefe', slot: 'waffe', rarity: 'legendaer', chapter: 3, bonus: { angriff: 24, krit: 13, leben: 29 }, text: 'Auf diese Klinge schwört man nur einmal.', school: 'fluch', set: 'tiefseeschwur', effect: { text: 'Treffer gegen vergiftete Ziele heilen 15 % des Schadens. Treffer vergiften mit 20 % Chance.', mods: { lifestealVsGift: 0.15, poisonChance: 0.2 } } },
  { key: 'feuerspeier', name: 'Feuerspeier-Mörser', slot: 'waffe', rarity: 'episch', chapter: 3, bonus: { angriff: 18, kritSchaden: 32 }, text: 'Klein, rund und sehr, sehr heiß.', school: 'pulver', effect: { text: 'Brand von diesem Piraten macht 50 % mehr Schaden.', mods: { brandBonus: 0.5 } } },
  { key: 'strohhut', name: 'Zerfranster Strohhut', slot: 'hut', rarity: 'gewoehnlich', chapter: 1, bonus: { leben: 8 }, text: 'Schützt vor Sonne. Und vor sonst nichts.' },
  { key: 'lederkappe', name: 'Lederkappe', slot: 'hut', rarity: 'gewoehnlich', chapter: 1, bonus: { ruestung: 3 }, text: 'Robust, wenn auch etwas eng.' },
  { key: 'bandana', name: 'Blaues Bandana', slot: 'hut', rarity: 'selten', chapter: 1, bonus: { ruestung: 5, tempo: 4 }, text: 'Hält die Haare aus dem Gesicht und den Kopf kühl.' },
  { key: 'fischerhut', name: 'Fischerhut', slot: 'hut', rarity: 'gewoehnlich', chapter: 2, bonus: { leben: 10 }, text: 'Riecht ein bisschen nach Hering.' },
  { key: 'wollmuetze', name: 'Wollmütze', slot: 'hut', rarity: 'gewoehnlich', chapter: 2, bonus: { ruestung: 4 }, text: 'Für kalte Nächte im Krähennest.' },
  { key: 'offiziershut', name: 'Offiziershut', slot: 'hut', rarity: 'selten', chapter: 2, bonus: { ruestung: 6, leben: 18 }, text: 'Mit Kokarde, auch wenn keiner mehr weiß, wofür.' },
  { key: 'ausgucksmuetze', name: 'Ausgucksmütze', slot: 'hut', rarity: 'selten', chapter: 2, bonus: { krit: 6, ausweichen: 5 }, text: 'Mit Fernrohr-Halterung an der Seite.' },
  { key: 'sturmjaegerhut', name: 'Sturmjäger-Hut', slot: 'hut', rarity: 'episch', chapter: 2, bonus: { tempo: 9, krit: 9 }, text: 'Der Rand flattert auch bei Windstille.', school: 'klinge', set: 'sturmjaeger', effect: { text: 'Gegen blutende Ziele +15 % Krit-Schaden.', mods: { kritVsBlutung: 15 } } },
  { key: 'moewenhut', name: 'Hut der Goldenen Möwe', slot: 'hut', rarity: 'episch', chapter: 2, bonus: { krit: 9, ausweichen: 6 }, text: 'Eine goldene Feder, die nie verbleicht.', school: 'glueck', set: 'goldene_moewe', effect: { text: '+10 % Chance auf ein Extra-Item nach Kämpfen.', mods: { extraItem: 0.1 } } },
  { key: 'korallenkrone', name: 'Korallenkrone', slot: 'hut', rarity: 'legendaer', chapter: 2, bonus: { leben: 39, ruestung: 13, ausweichen: 6 }, text: 'Gewachsen, nicht geschmiedet.', school: 'gezeiten', set: 'korallenwacht', effect: { text: 'Kampfstart: Die ganze Crew bekommt einen Schild über 6 % Leben.', mods: { teamShield: 0.06 } } },
  { key: 'kapitaensdreispitz', name: 'Dreispitz des Admirals', slot: 'hut', rarity: 'legendaer', chapter: 2, bonus: { ruestung: 13, leben: 39, krit: 7 }, text: 'Einst gehörte er jemandem, der nie verlor.', school: 'gezeiten', effect: { text: 'Stärkende Fähigkeiten des Trägers heilen die Crew zusätzlich um 10 % Leben.', mods: { buffHeal: 0.1 } } },
  { key: 'kopftuchbunt', name: 'Buntes Kopftuch', slot: 'hut', rarity: 'gewoehnlich', chapter: 3, bonus: { tempo: 3 }, text: 'Leuchtet so bunt, dass Möwen ausweichen.' },
  { key: 'helm', name: 'Verbeulter Helm', slot: 'hut', rarity: 'gewoehnlich', chapter: 3, bonus: { ruestung: 5 }, text: 'Jede Beule eine Geschichte.' },
  { key: 'federhelm', name: 'Federhelm', slot: 'hut', rarity: 'selten', chapter: 3, bonus: { ruestung: 8, tempo: 6 }, text: 'Leicht wie eine Feder, hart wie ein Kiel.' },
  { key: 'rauchhut', name: 'Rußgeschwärzter Hut', slot: 'hut', rarity: 'selten', chapter: 3, bonus: { leben: 22, kritSchaden: 20 }, text: 'Hat schon einige Explosionen überlebt.' },
  { key: 'pulverhut', name: 'Pulverteufel-Hut', slot: 'hut', rarity: 'episch', chapter: 3, bonus: { angriff: 18, ruestung: 13 }, text: 'Mit Zündschnur statt Hutband.', school: 'pulver', set: 'pulverteufel', effect: { text: 'Treffer setzen mit 20 % Chance Brand.', mods: { burnChance: 0.2 } } },
  { key: 'nebelkapuze', name: 'Nebelkapuze', slot: 'hut', rarity: 'episch', chapter: 3, bonus: { ausweichen: 6, tempo: 11 }, text: 'Unter ihr verschwimmen die Umrisse.', school: 'fluch', set: 'nebelgaenger', effect: { text: 'Treffer schwächen das Ziel mit 25 % Chance.', mods: { weakChance: 0.25 } } },
  { key: 'schattenhut', name: 'Hut der tausend Schatten', slot: 'hut', rarity: 'legendaer', chapter: 3, bonus: { ausweichen: 10, krit: 13, tempo: 5 }, text: 'Wirft einen Schatten, auch ohne Licht.', school: 'fluch', effect: { text: 'Die ersten 2 Angriffe gegen den Träger gehen ins Leere.', mods: { veils: 2 } } },
  { key: 'flickenhemd', name: 'Flickenhemd', slot: 'kleidung', rarity: 'gewoehnlich', chapter: 1, bonus: { leben: 8 }, text: 'Mehr Flicken als Hemd.' },
  { key: 'lederguertel', name: 'Breiter Ledergürtel', slot: 'kleidung', rarity: 'gewoehnlich', chapter: 1, bonus: { ruestung: 3 }, text: 'Hält Hose, Säbel und Würde zusammen.' },
  { key: 'seemannsjacke', name: 'Seemannsjacke', slot: 'kleidung', rarity: 'selten', chapter: 1, bonus: { ruestung: 5, leben: 14 }, text: 'Wasserdicht, solange es nicht regnet.' },
  { key: 'wollpullover', name: 'Dicker Wollpullover', slot: 'kleidung', rarity: 'gewoehnlich', chapter: 2, bonus: { leben: 10 }, text: 'Von Hand gestrickt, von Salz gegerbt.' },
  { key: 'segeltuchhose', name: 'Segeltuchhose', slot: 'kleidung', rarity: 'gewoehnlich', chapter: 2, bonus: { tempo: 3 }, text: 'Aus einem alten Segel. Fängt noch Wind.' },
  { key: 'kettenhemd', name: 'Rostiges Kettenhemd', slot: 'kleidung', rarity: 'selten', chapter: 2, bonus: { ruestung: 6, leben: 18 }, text: 'Klirrt bei jedem Schritt.' },
  { key: 'fechtweste', name: 'Fechtweste', slot: 'kleidung', rarity: 'selten', chapter: 2, bonus: { ausweichen: 5, tempo: 5 }, text: 'Gepolstert an den richtigen Stellen.' },
  { key: 'sturmjaegermantel', name: 'Sturmjäger-Mantel', slot: 'kleidung', rarity: 'episch', chapter: 2, bonus: { ruestung: 10, tempo: 9 }, text: 'Der Saum knallt wie ein Segel im Sturm.', school: 'klinge', set: 'sturmjaeger', effect: { text: 'Nach jedem Krit: +4 Tempo bis Kampfende, höchstens 3-mal.', mods: { critTempo: 4 } } },
  { key: 'korallenpanzer', name: 'Korallenpanzer', slot: 'kleidung', rarity: 'episch', chapter: 2, bonus: { ruestung: 10, leben: 29 }, text: 'Wächst nach, wenn er bricht.', school: 'gezeiten', set: 'korallenwacht', effect: { text: 'Kampfstart: Schild über 12 % Leben.', mods: { startShield: 0.12 } } },
  { key: 'kapitaensrock', name: 'Prachtvoller Kapitänsrock', slot: 'kleidung', rarity: 'legendaer', chapter: 2, bonus: { leben: 39, ruestung: 13, angriff: 12 }, text: 'Rot wie der Sonnenuntergang, schwer wie die Verantwortung.', school: 'klinge', effect: { text: 'Die Crew bekommt +10 % Krit-Schaden für jeden Gegner, der fällt.', mods: { killRush: 10 } } },
  { key: 'wachstuchmantel', name: 'Wachstuchmantel', slot: 'kleidung', rarity: 'gewoehnlich', chapter: 3, bonus: { ruestung: 5 }, text: 'Glänzt wie nasser Fels.' },
  { key: 'schaerpe2', name: 'Goldbestickte Schärpe', slot: 'kleidung', rarity: 'gewoehnlich', chapter: 3, bonus: { krit: 4 }, text: 'Ein wenig Glanz für den Alltag.' },
  { key: 'brustpanzer', name: 'Brustpanzer', slot: 'kleidung', rarity: 'selten', chapter: 3, bonus: { ruestung: 8, leben: 22 }, text: 'Schwer, aber beruhigend.' },
  { key: 'rauchmantel', name: 'Rauchmantel', slot: 'kleidung', rarity: 'selten', chapter: 3, bonus: { ausweichen: 5, ruestung: 8 }, text: 'Riecht nach Lagerfeuer und Abenteuer.' },
  { key: 'pulverweste', name: 'Pulverteufel-Weste', slot: 'kleidung', rarity: 'episch', chapter: 3, bonus: { ruestung: 13, angriff: 18 }, text: 'Mit vielen Taschen. Nicht fragen, was drin ist.', school: 'pulver', set: 'pulverteufel', effect: { text: 'Wird der Träger getroffen, fängt der Angreifer mit 30 % Chance Feuer.', mods: { burnBack: 0.3 } } },
  { key: 'tiefseeharnisch', name: 'Tiefseeharnisch', slot: 'kleidung', rarity: 'episch', chapter: 3, bonus: { ruestung: 13, leben: 35 }, text: 'Kalt wie das Wasser, aus dem er kam.', school: 'fluch', set: 'tiefseeschwur', effect: { text: '5 % Lebensraub.', mods: { lifesteal: 0.05 } } },
  { key: 'nebelmantel', name: 'Mantel des Nebelgängers', slot: 'kleidung', rarity: 'legendaer', chapter: 3, bonus: { ausweichen: 10, leben: 48, tempo: 5 }, text: 'Wer ihn trägt, ist nie ganz da.', school: 'fluch', set: 'nebelgaenger', effect: { text: 'Nach jedem Ausweichen heilt der Träger 6 % Leben.', mods: { dodgeHeal: 0.06 } } },
  { key: 'flammenrock', name: 'Flammenrock', slot: 'kleidung', rarity: 'legendaer', chapter: 3, bonus: { angriff: 24, ruestung: 16, leben: 29 }, text: 'Die Säume züngeln wie Feuer.', school: 'pulver', effect: { text: 'Kampfstart: Alle Gegner brennen.', mods: { startBurn: true } } },
  { key: 'dornenwams', name: 'Dornenwams', slot: 'kleidung', rarity: 'episch', chapter: 3, bonus: { ruestung: 13, leben: 35 }, text: 'Wer zuschlägt, sticht sich.', school: 'fluch', effect: { text: 'Angreifer erleiden 15 % ihres Schadens selbst.', mods: { thorns: 0.15 } } },
  { key: 'knochenwuerfel', name: 'Knochenwürfel', slot: 'talisman', rarity: 'gewoehnlich', chapter: 1, bonus: { krit: 3 }, text: 'Zeigt öfter die Sechs, als er sollte.' },
  { key: 'seemannsknoten', name: 'Seemannsknoten', slot: 'talisman', rarity: 'gewoehnlich', chapter: 1, bonus: { ruestung: 3 }, text: 'Hält alles. Auch Glück.' },
  { key: 'kompassnadel', name: 'Kompassnadel', slot: 'talisman', rarity: 'gewoehnlich', chapter: 1, bonus: { tempo: 2 }, text: 'Zittert immer Richtung Abenteuer.' },
  { key: 'flaschenschiff', name: 'Flaschenschiff', slot: 'talisman', rarity: 'selten', chapter: 1, bonus: { leben: 14, ausweichen: 4 }, text: 'Wie kam es da nur hinein?' },
  { key: 'ankeranhaenger', name: 'Ankeranhänger', slot: 'talisman', rarity: 'selten', chapter: 1, bonus: { ruestung: 5, leben: 14 }, text: 'Hält dich fest, wenn alles wackelt.' },
  { key: 'blutstein', name: 'Blutstein', slot: 'talisman', rarity: 'episch', chapter: 1, bonus: { krit: 8, angriff: 11 }, text: 'Pulsiert leise im Takt deines Herzens.', school: 'klinge', effect: { text: 'Krits verursachen Blutung.', mods: { critBleed: true } } },
  { key: 'seesternamulett', name: 'Seestern-Amulett', slot: 'talisman', rarity: 'gewoehnlich', chapter: 2, bonus: { leben: 10 }, text: 'Wächst nach, wenn ein Zacken fehlt.' },
  { key: 'rabenfeder', name: 'Rabenfeder', slot: 'talisman', rarity: 'gewoehnlich', chapter: 2, bonus: { ausweichen: 2 }, text: 'Leicht wie ein Flüstern.' },
  { key: 'silberloeffel', name: 'Silberlöffel', slot: 'talisman', rarity: 'selten', chapter: 2, bonus: { krit: 6, ausweichen: 5 }, text: 'Glück ist, wer ihn besitzt.' },
  { key: 'zahnkette', name: 'Kette aus Walzähnen', slot: 'talisman', rarity: 'selten', chapter: 2, bonus: { angriff: 9, leben: 18 }, text: 'Riesig, schwer und ein wenig stolz.' },
  { key: 'jaegerauge', name: 'Auge des Sturmjägers', slot: 'talisman', rarity: 'episch', chapter: 2, bonus: { krit: 9, tempo: 9 }, text: 'Sieht, wo der nächste Treffer sitzt.', school: 'klinge', set: 'sturmjaeger', effect: { text: 'Gegen blutende Ziele +20 % Krit-Chance.', mods: { critVsBlutung: 20 } } },
  { key: 'korallenherz', name: 'Korallenherz', slot: 'talisman', rarity: 'episch', chapter: 2, bonus: { leben: 29, ruestung: 10 }, text: 'Schlägt langsam, aber unaufhaltsam.', school: 'gezeiten', set: 'korallenwacht', effect: { text: 'Heilt bei jedem 3. Zug 4 % Leben.', mods: { regen: { every: 3, pct: 0.04 } } } },
  { key: 'goldmoewe', name: 'Goldene Möwenfigur', slot: 'talisman', rarity: 'legendaer', chapter: 2, bonus: { krit: 12, ausweichen: 9, angriff: 12 }, text: 'Aus purem Gold, mit einem frechen Blick.', school: 'glueck', set: 'goldene_moewe', effect: { text: 'Nach jedem Ausweichen: nächster Treffer ist kritisch.', mods: { dodgeCrit: true } } },
  { key: 'glimmstein', name: 'Glimmstein', slot: 'talisman', rarity: 'gewoehnlich', chapter: 3, bonus: { angriff: 6 }, text: 'Bleibt warm, auch auf Eis.' },
  { key: 'muschelkette', name: 'Muschelkette', slot: 'talisman', rarity: 'gewoehnlich', chapter: 3, bonus: { ausweichen: 3 }, text: 'Klappert leise beim Laufen.' },
  { key: 'pulverhorn', name: 'Pulverhorn', slot: 'talisman', rarity: 'selten', chapter: 3, bonus: { angriff: 11, kritSchaden: 20 }, text: 'Trocken halten! Immer!' },
  { key: 'totenkopfring', name: 'Totenkopfring', slot: 'talisman', rarity: 'selten', chapter: 3, bonus: { krit: 6, angriff: 11 }, text: 'Grinst dich an. Freundlich, hoffentlich.' },
  { key: 'nebelperle', name: 'Nebelperle', slot: 'talisman', rarity: 'episch', chapter: 3, bonus: { ausweichen: 6, leben: 35 }, text: 'Trüb wie Nebel, kalt wie Mondlicht.', school: 'fluch', set: 'nebelgaenger', effect: { text: 'Wer den Träger verfehlt, wird geschwächt.', mods: { weakOnMiss: true } } },
  { key: 'schwurring', name: 'Ring des Tiefseeschwurs', slot: 'talisman', rarity: 'episch', chapter: 3, bonus: { angriff: 18, leben: 35 }, text: 'Ein Versprechen aus der Tiefe.', school: 'fluch', set: 'tiefseeschwur', effect: { text: 'Gegen vergiftete Ziele +15 % Schaden.', mods: { dmgVsGift: 0.15 } } },
  { key: 'phoenixfeder', name: 'Glutvogelfeder', slot: 'talisman', rarity: 'legendaer', chapter: 3, bonus: { angriff: 24, leben: 48, tempo: 5 }, text: 'Brennt, ohne zu verbrennen.', school: 'pulver', effect: { text: 'Einmal pro Kampf: Fällt der Träger, steht er mit 30 % Leben wieder auf.', mods: { revive: 0.3 } } },
  { key: 'zunderdose', name: 'Zunderdose', slot: 'talisman', rarity: 'episch', chapter: 3, bonus: { kritSchaden: 32, angriff: 18 }, text: 'Ein Funke genügt.', school: 'pulver', effect: { text: 'Gegen brennende Ziele +20 % Krit-Chance.', mods: { critVsBrand: 20 } } },
  { key: 'rettungsboot', name: 'Kleines Rettungsboot', slot: 'schiff', rarity: 'gewoehnlich', chapter: 1, bonus: { leben: 4 }, text: 'Beruhigt die Crew ungemein.' },
  { key: 'neuesteuerrad', name: 'Neues Steuerrad', slot: 'schiff', rarity: 'gewoehnlich', chapter: 1, bonus: { tempo: 1 }, text: 'Dreht sich leicht wie ein Kreisel.' },
  { key: 'ballisten', name: 'Bordschleudern', slot: 'schiff', rarity: 'selten', chapter: 1, bonus: { angriff: 4, krit: 2 }, text: 'Schießen Fässer, Ketten und manchmal Fisch.' },
  { key: 'ankerkette', name: 'Doppelte Ankerkette', slot: 'schiff', rarity: 'gewoehnlich', chapter: 2, bonus: { ruestung: 2 }, text: 'Hält auch im Sturm.' },
  { key: 'kraehennest', name: 'Größeres Krähennest', slot: 'schiff', rarity: 'gewoehnlich', chapter: 2, bonus: { krit: 2 }, text: 'Mehr Platz, mehr Weitblick.' },
  { key: 'kupferrumpf', name: 'Kupferbeschlag', slot: 'schiff', rarity: 'selten', chapter: 2, bonus: { ruestung: 3, tempo: 3 }, text: 'Muscheln rutschen einfach ab.' },
  { key: 'vorratskammer', name: 'Volle Vorratskammer', slot: 'schiff', rarity: 'selten', chapter: 2, bonus: { leben: 9, angriff: 5 }, text: 'Eine satte Crew kämpft besser.' },
  { key: 'korallenkiel', name: 'Korallenkiel', slot: 'schiff', rarity: 'episch', chapter: 2, bonus: { leben: 14, ruestung: 5 }, text: 'Wächst mit jeder Fahrt ein Stück.', school: 'gezeiten', set: 'korallenwacht', effect: { text: 'Heilungen der Crew sind 15 % stärker.', mods: { healBonus: 0.15 } } },
  { key: 'goldsegel', name: 'Goldene Segel', slot: 'schiff', rarity: 'episch', chapter: 2, bonus: { tempo: 5, krit: 5 }, text: 'Glänzen in jeder Sonne.', school: 'glueck', set: 'goldene_moewe', effect: { text: '+15 % Gold aus Kämpfen.', mods: { goldBonus: 0.15 } } },
  { key: 'glocke', name: 'Schiffsglocke', slot: 'schiff', rarity: 'episch', chapter: 2, bonus: { tempo: 5, leben: 14 }, text: 'Ihr Klang macht Mut.', school: 'gezeiten', effect: { text: 'Kampfstart: Die Crew lädt 20 % Energie auf.', mods: { startEnergy: 20 } } },
  { key: 'sturmsegel', name: 'Sturmsegel', slot: 'schiff', rarity: 'legendaer', chapter: 2, bonus: { tempo: 3, angriff: 10, krit: 3 }, text: 'Fangen jeden Wind, auch den, der nicht weht.', school: 'glueck', effect: { text: 'Kampfstart: Die Crew handelt schneller (+30 Zugleiste).', mods: { startGauge: 30 } } },
  { key: 'kanonendeck', name: 'Zweites Kanonendeck', slot: 'schiff', rarity: 'gewoehnlich', chapter: 3, bonus: { angriff: 3 }, text: 'Doppelt so laut wie vorher.' },
  { key: 'teerfass', name: 'Teerfässer', slot: 'schiff', rarity: 'gewoehnlich', chapter: 3, bonus: { ruestung: 2 }, text: 'Dichtet alles ab. Klebt an allem.' },
  { key: 'rammsporn', name: 'Rammsporn', slot: 'schiff', rarity: 'selten', chapter: 3, bonus: { angriff: 6, ruestung: 4 }, text: 'Wer nicht ausweicht, hat Pech.' },
  { key: 'signalflaggen', name: 'Signalflaggen', slot: 'schiff', rarity: 'selten', chapter: 3, bonus: { tempo: 3, krit: 3 }, text: 'Sagen dem Gegner, dass er verloren hat.' },
  { key: 'schwurgaleone', name: 'Galionsfigur des Schwurs', slot: 'schiff', rarity: 'episch', chapter: 3, bonus: { leben: 18, angriff: 9 }, text: 'Ihr Blick folgt dir, wohin du auch gehst.', school: 'fluch', set: 'tiefseeschwur', effect: { text: 'Kampfstart: Alle Gegner sind vergiftet.', mods: { startPoison: true } } },
  { key: 'pulverkammer', name: 'Große Pulverkammer', slot: 'schiff', rarity: 'legendaer', chapter: 3, bonus: { angriff: 12, kritSchaden: 20, leben: 14 }, text: 'Bitte nicht rauchen.', school: 'pulver', set: 'pulverteufel', effect: { text: 'Brennende Gegner erleiden 25 % mehr Schaden.', mods: { dmgVsBrand: 0.25 } } },
  { key: 'nebelmaschine', name: 'Nebelkessel', slot: 'schiff', rarity: 'episch', chapter: 3, bonus: { ausweichen: 3, ruestung: 6 }, text: 'Brodelt leise unter Deck.', school: 'fluch', effect: { text: 'Die Crew hat 5 % mehr Ausweichen.', mods: { teamDodge: 5 } } },
  { key: 'feuerkanone', name: 'Feuerkanone', slot: 'schiff', rarity: 'episch', chapter: 3, bonus: { angriff: 9, kritSchaden: 16 }, text: 'Ihre Kugeln glühen schon im Rohr.', school: 'pulver', effect: { text: 'Treffer setzen mit 10 % Chance Brand.', mods: { burnChance: 0.1 } } },
  { key: 'tiefseeanker', name: 'Anker der Tiefe', slot: 'schiff', rarity: 'legendaer', chapter: 3, bonus: { ruestung: 8, leben: 24, angriff: 7 }, text: 'Er sinkt nicht, er wartet.', school: 'gezeiten', effect: { text: 'Jeder Pirat startet mit einem Schild über 10 % Leben.', mods: { startShield: 0.1 } } },
  { key: 'kristallkompass', name: 'Kristallkompass', slot: 'schiff', rarity: 'legendaer', chapter: 3, bonus: { tempo: 4, krit: 6, ausweichen: 3 }, text: 'Zeigt auf das, was du am meisten brauchst.', school: 'glueck', effect: { text: 'Nach jedem Ausweichen: Konter mit 40 % Schaden.', mods: { counter: 0.4 } } },
]

const BY_KEY: Record<string, ItemDef> = Object.fromEntries(CATALOG.map((d) => [d.key, d]))

export function itemDef(key: string): ItemDef | undefined {
  return BY_KEY[key]
}

export function itemArt(key: string): string | undefined {
  return ART[key]
}

export const STAT_LABEL: Record<keyof Stats, string> = {
  leben: 'Leben',
  angriff: 'Angriff',
  ruestung: 'Rüstung',
  tempo: 'Tempo',
  krit: 'Krit',
  ausweichen: 'Ausweichen',
  kritSchaden: 'Krit-Schaden',
}

export const STAT_ORDER: (keyof Stats)[] = ['leben', 'angriff', 'ruestung', 'tempo', 'krit', 'kritSchaden', 'ausweichen']

export const isPercent = (k: keyof Stats) => k === 'krit' || k === 'ausweichen' || k === 'kritSchaden'

export function bonusText(b: Partial<Stats>): string {
  return STAT_ORDER.filter((k) => b[k])
    .map((k) => `+${b[k]}${isPercent(k) ? ' %' : ''} ${STAT_LABEL[k]}`)
    .join(', ')
}

/** Werte eines Items, mit Sternen aus der Werft (+5 % je Stern, aufgerundet) */
export function itemBonus(it: Pick<Item, 'key'> & { stars?: number }): Partial<Stats> {
  const b = BY_KEY[it.key]?.bonus ?? {}
  const s = it.stars ?? 0
  if (!s) return b
  const out: Partial<Stats> = {}
  for (const [k, v] of Object.entries(b) as [keyof Stats, number][]) out[k] = Math.ceil(v * (1 + 0.05 * s) - 1e-9)
  return out
}

/** Hoechste Sternzahl je Seltenheit */
export const MAX_STARS: Record<Rarity, number> = { gewoehnlich: 2, selten: 3, episch: 4, legendaer: 5 }

/** Gold fuer Stern n: n mal der halbe Ladenpreis */
export const starGold = (r: Rarity, n: number) => n * Math.round(PRICE[r] / 2)

/** Ab Stern 3 braucht es Gold und ein Duplikat, davor Gold oder ein Duplikat */
export const starNeedsBoth = (n: number) => n >= 3

let n = 0
export function makeItem(def: ItemDef): Item {
  return { uid: `${def.key}-${Date.now().toString(36)}-${(n++).toString(36)}`, key: def.key, name: def.name, slot: def.slot, rarity: def.rarity, stats: bonusText(def.bonus) }
}

/** Preise im Laden. Verkauf bringt ein Drittel. */
export const PRICE: Record<Rarity, number> = { gewoehnlich: 30, selten: 80, episch: 200, legendaer: 450 }
export const sellPrice = (r: Rarity) => Math.round(PRICE[r] / 3)

/** Kleiner, deterministischer Zufall (gleiches Angebot den ganzen Tag) */
function seeded(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Tagesangebot des Hafenladens: 2 gewöhnlich und 2 selten, nur bis zum aktuellen Kapitel. Episches gibt es beim Spezialhändler. */
export function shopOffer(profile: string, day: string, chapter = 1): ItemDef[] {
  const rnd = seeded(`${profile}|${day}`)
  const pick = (r: Rarity[], taken: ItemDef[]) => {
    const pool = CATALOG.filter((d) => r.includes(d.rarity) && d.chapter <= chapter && !taken.includes(d))
    return pool[Math.floor(rnd() * pool.length)]
  }
  const out: ItemDef[] = []
  out.push(pick(['gewoehnlich'], out))
  out.push(pick(['gewoehnlich'], out))
  out.push(pick(['selten'], out))
  out.push(pick(['selten'], out))
  return out.filter(Boolean)
}

/** Spezialhaendler: Preis, Tag und Uhrzeit (Donnerstag 10 bis 22 Uhr) */
export const TRADER_PRICE = 300
export const TRADER_DAY = 4
export const TRADER_FROM = 10
export const TRADER_TO = 22

export function traderOpen(now: Date): boolean {
  const h = now.getHours()
  return now.getDay() === TRADER_DAY && h >= TRADER_FROM && h < TRADER_TO
}

/** Naechster Besuch des Haendlers (Beginn) oder, waehrend er da ist, wann er ablegt */
export function traderTimes(now: Date): { opens: Date; closes: Date } {
  const d = new Date(now)
  d.setHours(TRADER_FROM, 0, 0, 0)
  let add = (TRADER_DAY - d.getDay() + 7) % 7
  if (add === 0 && now.getHours() >= TRADER_TO) add = 7
  d.setDate(d.getDate() + add)
  const closes = new Date(d)
  closes.setHours(TRADER_TO)
  return { opens: d, closes }
}

/** 3 epische Items aus dem aktuellen Kapitel, bevorzugt noch nicht gefundene. Gleich fuer die ganze Woche. */
export function traderOffer(profile: string, week: string, chapter: number, found: string[]): ItemDef[] {
  const rnd = seeded(`${profile}|haendler|${week}|${chapter}`)
  const pool = CATALOG.filter((d) => d.rarity === 'episch' && d.chapter === chapter)
  const mix = (a: ItemDef[]) => a.map((d) => [rnd(), d] as const).sort((x, y) => x[0] - y[0]).map((x) => x[1])
  const fresh = mix(pool.filter((d) => !found.includes(d.key)))
  const known = mix(pool.filter((d) => found.includes(d.key)))
  return [...fresh, ...known].slice(0, 3)
}

/** Fester Zufallswert 0..1 fuer einen Schluessel (z. B. verfluchte Truhen) */
export const seededRoll = (key: string) => seeded(key)()
