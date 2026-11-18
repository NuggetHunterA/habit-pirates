"""Bereitet die abgenommenen Grafiken (Anime-Stil C) fuer die App auf.
Quelle: Projektordner pirate-habits/designs/anime. Ausgabe: public/assets (WebP)."""
import json, sys
from pathlib import Path
from PIL import Image, ImageFilter, ImageDraw

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else '/mnt/project-files/pirate-habits/designs/anime')
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'assets'

def webp(im, path, q=86):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'WEBP', quality=q, method=6)

# Seekarte: gemaltes Schiff aus der Karte entfernen (das echte Schiff faehrt im Code)
m = Image.open(SRC / 'welt/seekarte.png').convert('RGB')
patch = m.crop((530, 380, 660, 515))
mask = Image.new('L', patch.size, 0)
ImageDraw.Draw(mask).rounded_rectangle((8, 8, patch.width - 8, patch.height - 8), 30, fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(5))
m.paste(patch, (398, 380), mask)
webp(m, OUT / 'seekarte.webp', 84)

# Schiff aus Einzelteilen (Box 760 x 800, Bug zeigt nach rechts)
LAYERS = [(5, 495, 220, .85), (1, 200, 15, .85), (8, 520, 440, .85), (6, 20, 220, 1.0)]
ship = Image.new('RGBA', (760, 800), (0, 0, 0, 0))
for t, x, y, s in LAYERS:
    p = Image.open(SRC / f'welt/schiff_teile/teil_{t:02d}.png').convert('RGBA')
    if s != 1:
        p = p.resize((round(p.width * s), round(p.height * s)), Image.LANCZOS)
    ship.alpha_composite(p, (x, y))
ship = ship.crop(ship.getbbox())
ship.thumbnail((360, 360), Image.LANCZOS)
webp(ship, OUT / 'ship/schiff.webp', 90)

# App-Icons aus dem Schiff
for size in (192, 512):
    ic = Image.new('RGBA', (size, size), (11, 58, 74, 255))
    s = ship.copy(); s.thumbnail((int(size * .82), int(size * .82)), Image.LANCZOS)
    ic.alpha_composite(s, ((size - s.width) // 2, (size - s.height) // 2 + size // 40))
    ic.convert('RGB').save(ROOT / 'public' / f'icon-{size}.png')

# Krabbenbandit (Portraet fuer die Karte)
k = Image.open(SRC / 'welt/krabbe.png').convert('RGB')
k = k.crop((112, 112, 912, 912)).resize((256, 256), Image.LANCZOS)
webp(k, OUT / 'krabbe.webp', 85)

# Jonte: Einzelteile halb aufgeloest + Rig
rig = json.loads((SRC / 'jonte_teile/rigC.json').read_text())
S = 0.5
out_rig = {}
for name, r in rig.items():
    p = Image.open(SRC / f"jonte_teile/{r['img']}.png").convert('RGBA')
    p = p.resize((max(1, round(p.width * S)), max(1, round(p.height * S))), Image.LANCZOS)
    webp(p, OUT / f"jonte/{r['img']}.webp", 90)
    out_rig[name] = {**r, 'x': r['x'] * S, 'y': r['y'] * S, 'px': r['px'] * S, 'py': r['py'] * S}
(OUT / 'jonte/rig.json').write_text(json.dumps(out_rig, indent=1))

# Portrait fuer Kopfleiste
j = Image.open(SRC / 'jonte_c_neutral.png').convert('RGB').crop((340, 95, 640, 395)).resize((160, 160), Image.LANCZOS)
webp(j, OUT / 'jonte/portrait.webp', 88)
print('ok')

# ---------- Kampf: Krabbenbandit aus Einzelteilen (Rig wie bei Jonte) ----------
KRIG = {
  "bein_1": {"img": "teil_08", "x": 270, "y": 560, "px": 90, "py": 10, "z": 1},
  "bein_2": {"img": "teil_10", "x": 380, "y": 585, "px": 40, "py": 10, "z": 1},
  "bein_3": {"img": "teil_11", "x": 560, "y": 585, "px": 40, "py": 10, "z": 1},
  "bein_4": {"img": "teil_09", "x": 660, "y": 560, "px": 20, "py": 10, "z": 1},
  "arm_b": {"img": "teil_04", "x": 170, "y": 420, "px": 120, "py": 260, "z": 2, "r": -0.9},
  "saebel": {"img": "teil_03", "x": 120, "y": 530, "px": 60, "py": 66, "z": 2.5, "r": -1.85},
  "koerper": {"img": "teil_02", "x": 250, "y": 335, "px": 235, "py": 300, "z": 3},
  "tuch": {"img": "teil_01", "x": 330, "y": 240, "px": 200, "py": 120, "z": 4, "parent": "koerper"},
  "arm_f": {"img": "teil_07", "x": 600, "y": 430, "px": 120, "py": 20, "z": 5},
  "schild": {"img": "teil_06", "x": 630, "y": 430, "px": 110, "py": 150, "z": 6, "parent": "arm_f", "s": 0.9},
}
S = 0.4
krig = {}
for name, r in KRIG.items():
    p = Image.open(SRC / f"welt/krabbe_teile/{r['img']}.png").convert('RGBA')
    p = p.resize((max(1, round(p.width * S)), max(1, round(p.height * S))), Image.LANCZOS)
    webp(p, OUT / f"krabbe/{r['img']}.webp", 90)
    krig[name] = {**r, 'x': r['x'] * S, 'y': r['y'] * S, 'px': r['px'] * S, 'py': r['py'] * S}
(OUT / 'krabbe/rig.json').write_text(json.dumps(krig, indent=1))

# Zweiter Pirat (Startcrew) bleibt in der Vorschau eine Silhouette, damit die Crew eine Ueberraschung bleibt
for rolle, datei in [('kanonier', 'silhouette'), ('navigatorin', 'silhouette_navigatorin'), ('smutje', 'silhouette_smutje'), ('ausguck', 'silhouette_ausguck')]:
    kn = Image.open(SRC / f'crew-geheim/{rolle}.png').convert('RGB')
    g = kn.convert('L').point(lambda v: 255 if v < 238 else 0).filter(ImageFilter.MedianFilter(5))
    bg = g.copy(); ImageDraw.floodfill(bg, (0, 0), 128)  # Loecher in der Figur fuellen
    g = bg.point(lambda v: 0 if v == 128 else 255)
    g = g.crop(g.getbbox())
    sil = Image.new('RGBA', g.size, (14, 30, 40, 255)); sil.putalpha(g)
    sil.thumbnail((300, 300), Image.LANCZOS)
    webp(sil, OUT / f'crew/{datei}.webp', 90)
print('kampf ok')

# Kampf-Hintergrund Kapitel 1 (Strand)
bg = Image.open(SRC / 'kampf/kampf_strand.png').convert('RGB')
bg.thumbnail((1200, 1200), Image.LANCZOS)
webp(bg, OUT / 'kampf/strand.webp', 80)

# ---------- Kapitel 1 und 2: ganze Figuren freigestellt (Gegner, Bosse, Crew) ----------
def freistellen(path, height):
    """Weissen Hintergrund vom Rand her entfernen, Kante weich, auf Hoehe skalieren."""
    im = Image.open(path).convert('RGB')
    w, h = im.size
    # Hintergrund-Maske: alles fast-weisse, das vom Rand aus erreichbar ist
    near = im.convert('L').point(lambda v: 255 if v >= 236 else 0)
    flood = near.copy()
    for xy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        if flood.getpixel(xy) == 255:
            ImageDraw.floodfill(flood, xy, 128)
    alpha = flood.point(lambda v: 0 if v == 128 else 255).filter(ImageFilter.GaussianBlur(1.2))
    rgba = im.convert('RGBA'); rgba.putalpha(alpha)
    rgba = rgba.crop(alpha.point(lambda v: 255 if v > 40 else 0).getbbox())
    s = height / rgba.height
    return rgba.resize((max(1, round(rgba.width * s)), height), Image.LANCZOS)

SPRITES = [
    ('gegner/moewenpirat.png', 'figuren/moewenpirat', 300, (0.02, 0.5)),
    ('gegner/nebelqualle.png', 'figuren/nebelqualle', 300),
    ('gegner/geisterpirat.png', 'figuren/geisterpirat', 320),
    ('gegner/irrlicht.png', 'figuren/irrlicht', 260, (0.18, 0.55)),
    ('boss/schalbart.png', 'figuren/schalbart', 460, (0.22, 0.42)),
    ('boss/grauhand.png', 'figuren/grauhand', 460),
    ('crew-geheim/kanonier.png', 'figuren/kanonier', 400),
    ('crew-geheim/navigatorin.png', 'figuren/navigatorin', 400),
    ('crew-geheim/smutje.png', 'figuren/smutje', 400),
    ('crew-geheim/ausguck.png', 'figuren/ausguck', 400),
    ('jonte_c_neutral.png', 'figuren/jonte', 400),
    ('welt/krabbe.png', 'figuren/krabbenbandit', 300, (0.12, 0.62)),
    # Phase 4: neue Gegner (verdeckt) und das Seeungeheuer aus den Ereignissen
    ('gegner-geheim/seeigel.png', 'figuren/seeigel', 260, (0.12, 0.62)),
    ('gegner-geheim/einsiedlerkrebs.png', 'figuren/einsiedlerkrebs', 260, (0.25, 0.55)),
    ('gegner-geheim/nebelaal.png', 'figuren/nebelaal', 300, (0.0, 0.42)),
    ('gegner-geheim/laternenfisch.png', 'figuren/laternenfisch', 220, (0.1, 0.7)),
    ('gegner-geheim/seeungeheuer.png', 'figuren/seeungeheuer', 420, (0.05, 0.5)),
]
for src, out, hgt, *por_opt in SPRITES:
    webp(freistellen(SRC / src, hgt), OUT / f'{out}.webp', 88)
    # Portraet: oberes Drittel, quadratisch
    sp = freistellen(SRC / src, hgt)
    y0f, sf = por_opt[0] if por_opt else (0.0, 0.36)
    side = min(sp.width, int(sp.height * sf))
    y0 = int(sp.height * y0f)
    top = sp.getchannel('A').crop((0, y0 + int(sp.height * 0.04), sp.width, y0 + int(sp.height * 0.2))).getbbox()
    cx = (top[0] + top[2]) // 2 if top else sp.width // 2
    cx = max(side // 2, min(sp.width - side // 2, cx))
    por = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    por.alpha_composite(sp.crop((cx - side // 2, y0, cx - side // 2 + side, y0 + side)))
    webp(por.resize((128, 128), Image.LANCZOS), OUT / f'{out}_portrait.webp', 86)

bg = Image.open(SRC / 'kampf/kampf_nebel.png').convert('RGB')
bg.thumbnail((1200, 1200), Image.LANCZOS)
webp(bg, OUT / 'kampf/nebel.webp', 80)
for k, f in [(2, 'seekarte_kap2_nebelriff.png'), (3, 'seekarte_kap3_glutinseln.png')]:
    m = Image.open(SRC / f'welt/{f}').convert('RGB')
    webp(m, OUT / f'seekarte_kap{k}.webp', 84)
print('kapitel ok')

# Phase 4: Bilder der Zufallsereignisse
for name in ['flaschenpost', 'haendler_nebel', 'geisterschiff', 'seeungeheuer', 'delfine', 'treibgut']:
    ev = Image.open(SRC / f'ereignisse/{name}.png').convert('RGB')
    ev.thumbnail((960, 960), Image.LANCZOS)
    webp(ev, OUT / f'ereignisse/{name}.webp', 80)
print('ereignisse ok')
