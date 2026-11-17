"""Schneidet die Item-Boegen (items_a.png, items_b.png, 4x3 auf Weiss) in Einzelbilder mit Transparenz.
Quelle: Projektordner pirate-habits/designs/anime/items. Aufruf im Ordner mit den Boegen; danach als WebP nach src/assets/items."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage
def cut(path, names, outdir):
    im = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    H, W, _ = im.shape
    for idx, name in enumerate(names):
        r, c = divmod(idx, 4)
        y0, y1 = round(r*H/3), round((r+1)*H/3); x0, x1 = round(c*W/4), round((c+1)*W/4)
        cell = im[y0:y1, x0:x1]
        a = (255 - cell.min(axis=2)) / 255.0          # color-to-alpha (weiss)
        light = a < 0.45
        lab, _ = ndimage.label(light)
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:,0], lab[:,-1]]))) - {0}
        bg = np.isin(lab, list(edge))
        holes, n = ndimage.label(a < 0.035)
        sizes = ndimage.sum(np.ones_like(a), holes, range(1, n+1))
        for i, sz in enumerate(sizes, 1):
            if sz > 80 and name not in ("muschel","perle"): bg |= holes == i
        alpha = np.where(bg, a, 1.0)
        alpha = ndimage.gaussian_filter(alpha, 0.6)
        alpha = np.where(bg, np.minimum(alpha, a*1.0+0.02), np.maximum(alpha, 0)) if False else alpha
        al = np.clip(alpha, 1e-3, 1)[..., None]
        rgb = np.where(bg[...,None], np.clip((cell - 255*(1-al))/al, 0, 255), cell)
        rgba = np.dstack([rgb, np.clip(alpha*255, 0, 255)]).astype(np.uint8)
        img = Image.fromarray(rgba, 'RGBA')
        bb = Image.fromarray((alpha > 0.06).astype(np.uint8)*255).getbbox()
        img = img.crop(bb)
        side = max(img.size) + 16
        sq = Image.new('RGBA', (side, side), (0,0,0,0)); sq.alpha_composite(img, ((side-img.width)//2, (side-img.height)//2))
        sq = sq.resize((192,192), Image.LANCZOS)
        sq.save(f'{outdir}/{name}.png')
A = 'entersaebel dolch schlitzer pistole korallendegen gezeitenklinge enteraxt kopftuch dreispitz federhut kapitaenshut weste'.split()
B = 'stiefel lederwams sturmmantel schaerpe muschel gluecksmuenze haizahn sturmkompass perle segeltuch messingkanone galionsfigur'.split()
import os; os.makedirs('items', exist_ok=True)
cut('items_a.png', A, 'items'); cut('items_b.png', B, 'items')
# Vorschau auf dunklem und hellem Grund
names = A + B
prev = Image.new('RGBA', (8*200, 6*200), (11,58,74,255))
for i, n in enumerate(names):
    t = Image.open(f'items/{n}.png'); x, y = (i%8)*200, (i//8)*200
    if (i//8)%2: prev.paste((244,228,193,255), (x, y, x+200, y+200))
    prev.alpha_composite(t, (x+4, y+4))
prev.save('preview.png')
