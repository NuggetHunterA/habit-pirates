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
