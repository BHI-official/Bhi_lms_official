# Regenerate favicons/app icons from assets/brand/bhi-logo-white-source.png. Run from the repo root: python3 scripts/seo_icons.py (needs Pillow).
from PIL import Image, ImageDraw
import os
SRC='assets/brand/bhi-logo-white-source.png'
OUT='public'
os.makedirs(f'{OUT}/icons',exist_ok=True); os.makedirs(f'{OUT}/brand',exist_ok=True)
PINE=(31,78,70,255); PINE_DARK=(23,59,53,255)
logo=Image.open(SRC).convert('RGBA')
# square-pad logo (4900x4880)
s=max(logo.size); sq=Image.new('RGBA',(s,s),(0,0,0,0)); sq.paste(logo,((s-logo.width)//2,(s-logo.height)//2)); logo=sq

def badge(size, shape='circle', scale=0.80, ss=4):
    S=size*ss
    im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    if shape=='circle': d.ellipse((0,0,S-1,S-1),fill=PINE)
    else: d.rectangle((0,0,S,S),fill=PINE)
    L=int(S*scale); lg=logo.resize((L,L),Image.LANCZOS)
    im.alpha_composite(lg,((S-L)//2,(S-L)//2))
    return im.resize((size,size),Image.LANCZOS)

# Favicons: pine disc with the logo (transparent corners)
for n in (16,32,48,96):
    badge(n,'circle',0.84).save(f'{OUT}/icons/favicon-{n}.png',optimize=True)
badge(256,'circle',0.84).save(f'{OUT}/favicon.ico',sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
# Apple touch: iOS paints transparency black and rounds corners itself -> full square
badge(180,'square',0.80).save(f'{OUT}/apple-touch-icon.png',optimize=True)
# PWA icons
badge(192,'circle',0.84).save(f'{OUT}/icons/icon-192.png',optimize=True)
badge(512,'circle',0.84).save(f'{OUT}/icons/icon-512.png',optimize=True)
# Maskable: logo inside 80% safe zone
badge(512,'square',0.66).save(f'{OUT}/icons/maskable-512.png',optimize=True)
badge(192,'square',0.66).save(f'{OUT}/icons/maskable-192.png',optimize=True)
# Brand assets
w=logo.resize((512,512),Image.LANCZOS); w.save(f'{OUT}/brand/bhi-logo-white.png',optimize=True)
badge(1200,'square',0.78).convert('RGB').save(f'{OUT}/brand/bhi-logo-square.png',optimize=True)  # JSON-LD logo / social avatar
badge(160,'circle',0.84).save(f'{OUT}/brand/bhi-badge.png',optimize=True)
# preview sheet
