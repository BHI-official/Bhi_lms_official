# Regenerate the social/SEO banners in public/og. Run from the repo root: python3 scripts/seo_banners.py (needs Pillow + the Public Sans font below).
from PIL import Image, ImageDraw, ImageFont
import os
OUT='public/og'; os.makedirs(OUT,exist_ok=True)
FONT='scripts/fonts/PublicSans.ttf'  # download: https://raw.githubusercontent.com/google/fonts/main/ofl/publicsans/PublicSans%5Bwght%5D.ttf
def font(sz,w):
    f=ImageFont.truetype(FONT,sz); f.set_variation_by_axes([w]); return f
PINE8=(23,59,53); PINE9=(15,41,37); MARI=(224,165,38); WHITE=(255,255,255)
logo=Image.open('assets/brand/bhi-logo-white-source.png').convert('RGBA')
s=max(logo.size); sq=Image.new('RGBA',(s,s)); sq.paste(logo,((s-logo.width)//2,(s-logo.height)//2)); logo=sq

def wrap(d,text,f,maxw):
    lines=[];cur=''
    for w in text.split():
        t=(cur+' '+w).strip()
        if d.textlength(t,font=f)<=maxw: cur=t
        else: lines.append(cur);cur=w
    lines.append(cur);return lines

def banner(name,headline,sub,W=1200,H=630,ss=2):
    W2,H2=W*ss,H*ss
    im=Image.new('RGBA',(W2,H2),PINE8+(255,)); d=ImageDraw.Draw(im,'RGBA')
    hz=int(H2*0.80)           # horizon line
    cx=int(W2*0.765); L=int(330*ss); cy=hz-int(40*ss)-L//2
    # rising-sun rings around the badge
    for r,a,wd in [(208,255,4),(250,170,3),(292,105,3),(334,55,3)]:
        r*=ss; d.ellipse((cx-r,cy-r,cx+r,cy+r),outline=MARI+(a,),width=wd*ss)
    d.ellipse((cx-L//2-6*ss,cy-L//2-6*ss,cx+L//2+6*ss,cy+L//2+6*ss),fill=PINE8+(255,))
    d.rectangle((0,hz,W2,H2),fill=PINE9+(255,))
    d.line((0,hz,W2,hz),fill=MARI+(255,),width=3*ss)
    lg=logo.resize((L,L),Image.LANCZOS)
    im.alpha_composite(lg,(cx-L//2,cy-L//2))
    # text
    x=72*ss; maxw=int(W2*0.41)
    hf=font(52*ss,750); sf=font(24*ss,420); bf=font(22*ss,600); ff=font(20*ss,450)
    d.text((x,64*ss),'Bright Horizon Institute',font=bf,fill=MARI+(255,))
    hl=wrap(d,headline,hf,maxw); y=118*ss
    for ln in hl: d.text((x,y),ln,font=hf,fill=WHITE+(255,)); y+=62*ss
    y+=16*ss
    for ln in wrap(d,sub,sf,maxw): d.text((x,y),ln,font=sf,fill=WHITE+(205,)); y+=34*ss
    d.text((x,hz+int(36*ss)),'Jersey City, New Jersey, since 2009',font=ff,fill=WHITE+(190,))
    dom='brighthorizoninstitute.com'; d.text((W2-72*ss-d.textlength(dom,font=ff),hz+int(36*ss)),dom,font=ff,fill=WHITE+(190,))
    im=im.resize((W,H),Image.LANCZOS).convert('RGB')
    im.save(f'{OUT}/{name}.png',optimize=True); return im

B=[
 ('og-default','Your enrollment and learning portal','Apply, complete your forms and documents, and follow your classes online.'),
 ('og-login','Sign in to your BHI account','Students, instructors and staff use the same sign-in.'),
 ('og-register','Start your enrollment online','Create a student account, choose your course and submit your application.'),
 ('og-instructor','Teach with Bright Horizon','Sign up as an instructor to take attendance and write monthly progress reports.'),
 ('og-password','Reset your password','We’ll email a 6-digit code to the address on your account.'),
 ('og-student','Your student portal','Track your application, classes and attendance after you sign in.'),
 ('og-instructor-portal','Your instructor portal','Your courses, students, attendance sheets and progress reports.'),
 ('og-admin','BHI staff portal','Applications, students, classes, instructors and attendance.'),
]
for b in B: banner(*b)
# Twitter/X large-card variant (2:1) of the default
banner('twitter-default',B[0][1],B[0][2],W=1200,H=600)
print(os.listdir(OUT))
