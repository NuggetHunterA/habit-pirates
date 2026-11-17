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
kn = Image.open(SRC / 'crew-geheim/kanonier.png').convert('RGB')
g = kn.convert('L').point(lambda v: 255 if v < 238 else 0).filter(ImageFilter.MedianFilter(5))
g = g.crop(g.getbbox())
sil = Image.new('RGBA', g.size, (14, 30, 40, 255)); sil.putalpha(g)
sil.thumbnail((300, 300), Image.LANCZOS)
webp(sil, OUT / 'crew/silhouette.webp', 90)
print('kampf ok')

# Kampf-Hintergrund Kapitel 1 (Strand)
bg = Image.open(SRC / 'kampf/kampf_strand.png').convert('RGB')
bg.thumbnail((1200, 1200), Image.LANCZOS)
webp(bg, OUT / 'kampf/strand.webp', 80)
