from PIL import Image, ImageDraw
from pathlib import Path
import json, math, hashlib

ROOT=Path(r'C:/Users/Admin/Desktop/Project/TaleofChaThai/assets/monsters-original-100')
CATS=[('beast','อสูร'),('bird','วิหค'),('aquatic','วารีสัตว์'),('dragon','มังกร'),('insect','แมลง'),('plant','พฤกษา'),('spirit','วิญญาณ'),('mineral','ศิลา'),('machine','จักรกล'),('mythic','เทพอสูร')]
ELS=[('fire','เพลิง',(225,70,36)),('water','วารี',(35,132,211)),('grass','พฤกษ์',(55,158,76)),('electric','อัสนี',(238,194,37)),('ice','เหมันต์',(82,191,218)),('dark','รัตติกาล',(91,59,125)),('steel','เหล็ก',(105,130,145)),('rock','ผา',(142,96,60)),('poison','พิษ',(143,54,153)),('psychic','จิต',(210,75,154))]
PREFIX=['Cinder','Tide','Bramble','Volt','Frost','Gloam','Rivet','Crag','Miasma','Dream']
SUFFIX=['Prowler','Skyrill','Finback','Drakelet','Carapace','Bloomkin','Wispborn','Shardling','Gearling','Runeguard']

def shade(c,f): return tuple(max(0,min(255,int(v*f))) for v in c)
def poly(d, pts, fill, out, w): d.polygon(pts,fill=fill); d.line(pts+[pts[0]],fill=out,width=w,joint='curve')
def body(draw, cat, color, boss, seed, S):
    out=(25,22,34,255); c=color+(255,); hi=shade(color,1.35)+(255,); dk=shade(color,.52)+(255,); w=max(2,S//80)
    cx,cy=S//2,S*56//100; k=1.18 if boss else .88
    # anatomy-specific silhouette
    if cat=='bird':
        poly(draw,[(cx,cy-70*k),(cx-170*k,cy-5*k),(cx-70*k,cy+10*k),(cx-40*k,cy+105*k),(cx+35*k,cy+55*k),(cx+170*k,cy-5*k),(cx+55*k,cy-20*k)],dk,out,w)
        draw.ellipse((cx-62*k,cy-100*k,cx+62*k,cy+65*k),fill=c,outline=out,width=w)
        poly(draw,[(cx-20*k,cy-95*k),(cx+40*k,cy-150*k),(cx+25*k,cy-70*k)],hi,out,w)
    elif cat in ('insect','machine'):
        draw.ellipse((cx-145*k,cy-70*k,cx+145*k,cy+85*k),fill=c,outline=out,width=w)
        draw.ellipse((cx-60*k,cy-125*k,cx+70*k,cy+110*k),fill=hi,outline=out,width=w)
        for side in (-1,1):
            for yy in (-45,15,70): draw.line((cx+side*70*k,cy+yy*k,cx+side*(185+yy/3)*k,cy+(yy+60)*k),fill=out,width=w*3)
        if cat=='machine':
            for a in range(0,360,45):
                x=cx+math.cos(math.radians(a))*90*k;y=cy+math.sin(math.radians(a))*70*k
                draw.rectangle((x-12*k,y-12*k,x+12*k,y+12*k),fill=dk,outline=out,width=w)
    elif cat=='aquatic':
        draw.ellipse((cx-160*k,cy-85*k,cx+125*k,cy+80*k),fill=c,outline=out,width=w)
        poly(draw,[(cx+100*k,cy-40*k),(cx+205*k,cy-125*k),(cx+180*k,cy),(cx+205*k,cy+125*k),(cx+95*k,cy+40*k)],dk,out,w)
        poly(draw,[(cx-20*k,cy-75*k),(cx+25*k,cy-155*k),(cx+60*k,cy-65*k)],hi,out,w)
    elif cat=='plant':
        draw.ellipse((cx-95*k,cy-25*k,cx+95*k,cy+130*k),fill=c,outline=out,width=w)
        for a in range(-150,31,36):
            x=cx+math.cos(math.radians(a))*115*k;y=cy-45*k+math.sin(math.radians(a))*90*k
            draw.ellipse((x-38*k,y-65*k,x+38*k,y+20*k),fill=hi,outline=out,width=w)
        for side in (-1,1): draw.line((cx+side*45*k,cy+90*k,cx+side*95*k,cy+170*k),fill=out,width=w*5)
    elif cat=='spirit':
        poly(draw,[(cx,cy-150*k),(cx-105*k,cy-45*k),(cx-65*k,cy+85*k),(cx-120*k,cy+145*k),(cx-20*k,cy+115*k),(cx+30*k,cy+165*k),(cx+65*k,cy+75*k),(cx+120*k,cy+125*k),(cx+100*k,cy-50*k)],c,out,w)
        draw.ellipse((cx-80*k,cy-100*k,cx+80*k,cy+65*k),fill=hi,outline=out,width=w)
    elif cat=='mineral':
        pts=[]
        for i in range(12):
            a=math.radians(i*30);r=(150 if i%2==0 else 105)*k;pts.append((cx+math.cos(a)*r,cy+math.sin(a)*r))
        poly(draw,pts,c,out,w)
        for a in (210,270,330): poly(draw,[(cx,cy),(cx+math.cos(math.radians(a))*135*k,cy+math.sin(math.radians(a))*135*k),(cx+math.cos(math.radians(a+25))*95*k,cy+math.sin(math.radians(a+25))*95*k)],hi,out,w)
    elif cat in ('dragon','mythic'):
        draw.ellipse((cx-115*k,cy-85*k,cx+105*k,cy+100*k),fill=c,outline=out,width=w)
        draw.ellipse((cx-105*k,cy-170*k,cx+35*k,cy-35*k),fill=hi,outline=out,width=w)
        poly(draw,[(cx-70*k,cy-140*k),(cx-135*k,cy-210*k),(cx-110*k,cy-105*k)],dk,out,w)
        poly(draw,[(cx+55*k,cy-30*k),(cx+180*k,cy-135*k),(cx+150*k,cy+20*k)],dk,out,w)
        draw.line((cx+75*k,cy+45*k,cx+205*k,cy+115*k,cx+235*k,cy+55*k),fill=out,width=w*5)
        for side in (-1,1): draw.line((cx+side*55*k,cy+70*k,cx+side*85*k,cy+165*k),fill=out,width=w*6)
        if cat=='mythic': draw.arc((cx-150*k,cy-230*k,cx+90*k,cy+10*k),190,350,fill=(245,215,95,255),width=w*5)
    else:
        draw.ellipse((cx-150*k,cy-80*k,cx+130*k,cy+100*k),fill=c,outline=out,width=w)
        draw.ellipse((cx-145*k,cy-145*k,cx+15*k,cy+20*k),fill=hi,outline=out,width=w)
        for side in (-1,1):
            draw.line((cx+side*75*k,cy+65*k,cx+side*105*k,cy+165*k),fill=out,width=w*7)
        draw.line((cx+110*k,cy,cx+210*k,cy-60*k,cx+225*k,cy+10*k),fill=out,width=w*6)
    # face and elemental crest/details
    ex=cx-45*k; ey=cy-65*k
    draw.ellipse((ex-14*k,ey-10*k,ex+15*k,ey+22*k),fill=(248,244,212,255),outline=out,width=w)
    draw.ellipse((ex-3*k,ey-2*k,ex+7*k,ey+14*k),fill=out)
    for a in range(6 if boss else 3):
        ang=math.radians(-150+a*(300/max(1,(5 if boss else 2))))
        x=cx+math.cos(ang)*125*k;y=cy+math.sin(ang)*110*k
        draw.ellipse((x-10*k,y-10*k,x+10*k,y+10*k),fill=hi,outline=out,width=max(1,w//2))

def render(item, pix=False):
    # Both outputs share the exact same 768px silhouette master. Pixel export is
    # reduced once with nearest-neighbour so anatomy can never drift or crop.
    S=768
    im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    body(d,item['anatomy_motion_class'],tuple(item['color']),item['class']=='boss',item['id'],S)
    im=im.resize((128,128),Image.Resampling.NEAREST) if pix else im.resize((512,512),Image.Resampling.LANCZOS)
    return im

def build():
    records=[]
    for cls in ('wild','boss'):
      for i in range(50):
        cat=CATS[i%10]; el=ELS[(i*3+(0 if cls=='wild' else 5))%10]
        no=i+1; ident=('w' if cls=='wild' else 'b')+f'{no:03d}'
        en=(PREFIX[(i*3)%10]+SUFFIX[(i*7+(0 if cls=='wild' else 3))%10]) if cls=='wild' else ('Sovereign '+PREFIX[(i*7+2)%10]+SUFFIX[(i*3+4)%10])
        th=('เจ้าแห่ง' if cls=='boss' else '')+el[1]+cat[1]+f' {no:02d}'
        item={'id':ident,'english_name':en,'thai_name':th,'class':cls,'type':cat[0],'element':el[0],
              'concept':f"An original {el[0]}-aligned {cat[0]} {'apex guardian' if cls=='boss' else 'wild creature'} with a distinct elemental crest and readable battle silhouette.",
              'anatomy_motion_class':cat[0],'color':list(el[2]),
              'illustration':'illustration.png','pixel':'pixel.png','source_mapping':'illustration.png -> deterministic anatomy-matched pixel.png'}
        p=ROOT/cls/ident; p.mkdir(parents=True,exist_ok=True)
        render(item).save(p/'illustration.png'); render(item,True).save(p/'pixel.png')
        (p/'metadata.json').write_text(json.dumps(item,ensure_ascii=False,indent=2),encoding='utf-8')
        records.append(item)
    ROOT.mkdir(parents=True,exist_ok=True)
    (ROOT/'manifest.json').write_text(json.dumps({'count':len(records),'wild':50,'boss':50,'originality':'Original designs; no franchise images or character-specific traits used.','assets':records},ensure_ascii=False,indent=2),encoding='utf-8')
    (ROOT/'progress.json').write_text(json.dumps({'requested':100,'illustrations':100,'pixel_png':100,'metadata':100,'status':'ready_for_independent_visual_qa'},indent=2),encoding='utf-8')
    # paired visual-review contact sheets
    for cls in ('wild','boss'):
        sheet=Image.new('RGBA',(1000,1250),(32,35,42,255)); sd=ImageDraw.Draw(sheet)
        for i in range(50):
            ident=('w' if cls=='wild' else 'b')+f'{i+1:03d}'; x=(i%5)*200; y=(i//5)*125
            a=Image.open(ROOT/cls/ident/'illustration.png').convert('RGBA'); p=Image.open(ROOT/cls/ident/'pixel.png').convert('RGBA')
            a.thumbnail((92,92),Image.Resampling.LANCZOS); p=p.resize((92,92),Image.Resampling.NEAREST)
            sheet.alpha_composite(a,(x+5,y+20)); sheet.alpha_composite(p,(x+103,y+20)); sd.text((x+6,y+3),ident,fill=(240,240,240,255))
        sheet.convert('RGB').save(ROOT/f'{cls}-pairs-contact-sheet.jpg',quality=92)
    print('built',len(records))
if __name__=='__main__': build()
