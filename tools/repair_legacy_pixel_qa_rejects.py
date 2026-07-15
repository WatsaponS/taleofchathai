from pathlib import Path
from PIL import Image
import json

ROOT=Path(r'C:\Users\Admin\Desktop\Project\TaleofChaThai\assets\monsters-legacy-pixel')
LEGACY=Path(r'C:\Users\Admin\Desktop\Project\TaleofChaThai\assets\monsters-legacy-chathaithecat')
PHASE=[0,1,2,1,0,-1,-2,-1]
BOB=[0,-1,-1,0,0,1,1,0]

def bbox(im): return im.getchannel('A').getbbox()
def shift_masked(base, rect, dx, dy):
    x0,y0,x1,y1=map(int,rect); layer=base.crop((x0,y0,x1,y1))
    # Keep the anchored body underneath and overdraw the articulated extremity.
    # This behaves like layered sprite puppeting and avoids exposing rectangular
    # seams where a selection overlaps the torso/wing root.
    base.alpha_composite(layer,(x0+dx,y0+dy))

def clean_largest(im):
    im=im.copy(); a=im.getchannel('A'); w,h=im.size; pix=a.load(); seen=set(); comps=[]
    for y in range(h):
        for x in range(w):
            if pix[x,y]<128 or (x,y) in seen: continue
            q=[(x,y)]; seen.add((x,y)); c=[]
            while q:
                u,v=q.pop(); c.append((u,v))
                for n in ((u-1,v),(u+1,v),(u,v-1),(u,v+1)):
                    if 0<=n[0]<w and 0<=n[1]<h and n not in seen and pix[n[0],n[1]]>=128: seen.add(n); q.append(n)
            comps.append(c)
    if not comps:return im
    keep=set(max(comps,key=len)); p=im.load()
    for c in comps:
        if set(c)==keep: continue
        for x,y in c:p[x,y]=(0,0,0,0)
    return im

def fusion_frames(master,name):
    """Clean one-to-one local deformation, not layered crop duplication.

    Each destination pixel samples exactly one source pixel through a continuous
    joint-weight field. The torso receives zero displacement; extremities receive
    species-specific arcs. This retains one silhouette and clean joint occlusion.
    """
    b=bbox(master); x0,y0,x1,y1=b; w=x1-x0; h=y1-y0; src=master.load(); out=[]
    qx=[0,1,2,1,0,-1,-2,-1]; qy=[-1,-1,0,1,2,1,0,-1]
    def control(x,y,cx,cy,rx,ry,vx,vy):
        dx=(x-cx)/rx; dy=(y-cy)/ry; d=dx*dx+dy*dy
        if d>=1:return (0.0,0.0)
        weight=(1-d)**2
        return vx*weight,vy*weight
    for i in range(8):
        px,py=qx[i],qy[i]; f=Image.new('RGBA',master.size); dst=f.load()
        for y in range(128):
            for x in range(128):
                ox=oy=0.0
                if name in ('fusion_fn','fusion_nw'):
                    # canopy/ears sway; fore and rear paw load in opposition; tail lags.
                    cs=[(.52,.13,.58,.26,px,py),(.18,.30,.20,.20,qx[(i-1)%8],py),
                        (.25,.84,.18,.20,-px*.7,py*.35),(.73,.85,.20,.18,px*.7,-py*.25),
                        (.86,.52,.23,.30,-qx[(i-1)%8],qy[(i-1)%8])]
                elif name=='fusion_nf':
                    # crown/tail fire follow different arcs; arms settle oppositely.
                    cs=[(.50,.08,.26,.20,px,py),(.88,.68,.25,.36,-qx[(i-1)%8],qy[(i-1)%8]),
                        (.18,.53,.19,.27,0,py*.8),(.72,.48,.20,.27,0,-py*.8)]
                else:
                    # wing beat, trailing tail/effect, and near arm counter-motion.
                    cs=[(.80,.34,.34,.36,px,py*1.5),(.79,.77,.32,.30,-qx[(i-1)%8],qy[(i-1)%8]),
                        (.18,.59,.20,.28,0,-py*.7),(.45,.10,.22,.15,qx[(i-2)%8]*.5,0)]
                for cx,cy,rx,ry,vx,vy in cs:
                    ax,ay=control(x,y,x0+cx*w,y0+cy*h,rx*w,ry*h,vx,vy); ox+=ax; oy+=ay
                sx=round(x-ox); sy=round(y-oy)
                if 0<=sx<128 and 0<=sy<128:dst[x,y]=src[sx,sy]
        out.append(f)
    return out

def save_subject(rel,slug,frames,repair):
    d=ROOT/rel/slug; frames=[f.convert('RGBA') for f in frames]
    frames[0].save(d/f'{slug}.png',optimize=True)
    frames[0].save(d/f'{slug}.gif',save_all=True,append_images=frames[1:],duration=[120]*8,loop=0,disposal=2,optimize=False)
    sheet=Image.new('RGBA',(512,256))
    for i,f in enumerate(frames): sheet.alpha_composite(f,((i%4)*128,(i//4)*128))
    sheet.save(d/f'{slug}-sheet.png',optimize=True)
    mp=d/f'{slug}.json'; meta=json.loads(mp.read_text(encoding='utf-8'))
    meta['repair']=repair; meta['safe_margin_px']=min(min(b[0],b[1],128-b[2],128-b[3]) for b in map(bbox,frames))
    mp.write_text(json.dumps(meta,indent=2),encoding='utf-8')

def main():
    fragments=[('wild/shadow-cave','09-smoke-raven-stage1'),('wild/thunder-plains','02-storm-hare-stage1'),('wild/thunder-plains','04-cloud-ram-stage1')]
    for rel,slug in fragments:
        d=ROOT/rel/slug; sh=Image.open(d/f'{slug}-sheet.png').convert('RGBA')
        fs=[clean_largest(sh.crop(((i%4)*128,(i//4)*128,(i%4+1)*128,(i//4+1)*128))) for i in range(8)]
        save_subject(rel,slug,fs,'QA: removed unintended detached source fragments; retained primary connected anatomy.')
    for slug in ('fusion_es','fusion_fn','fusion_nf','fusion_nw','fusion_sn','fusion_we'):
        # Always rebuild from the untouched legacy source, not from a prior repaired cel.
        import sys
        sys.path.insert(0,str(Path(__file__).parent))
        from build_legacy_pixel_batch import process_group
        master=process_group([LEGACY/'fusion'/f'{slug}.png'])[0][0]
        fs=fusion_frames(master,slug)
        save_subject('fusion',slug,fs,'QA: rebuilt anatomy-aware idle with independent secondary-part articulation; no global silhouette deformation.')
    repaired=fragments+[('fusion',s) for s in ('fusion_es','fusion_fn','fusion_nf','fusion_nw','fusion_sn','fusion_we')]
    hand=ROOT/'qa-handoff'; hand.mkdir(exist_ok=True)
    from PIL import ImageDraw
    contact=Image.new('RGB',(8*128,9*150),(34,37,41)); draw=ImageDraw.Draw(contact)
    records=[]
    for row,(rel,slug) in enumerate(repaired):
        d=ROOT/rel/slug; gif=Image.open(d/f'{slug}.gif'); fs=[]
        try:
            while True: fs.append(gif.convert('RGBA').copy()); gif.seek(gif.tell()+1)
        except EOFError: pass
        for i,f in enumerate(fs):
            bg=Image.new('RGBA',(128,128),(52,56,62,255)); bg.alpha_composite(f); contact.paste(bg.convert('RGB'),(i*128,row*150))
        draw.text((4,row*150+130),f'{rel}/{slug}',fill='white')
        records.append({'id':f'{rel}/{slug}','frames':len(fs),'duration_ms':120,'loop':0,'sheet':str((d/f'{slug}-sheet.png').relative_to(ROOT)).replace('\\','/')})
    contact.save(hand/'qa-repair-9-all-frames.png')
    (hand/'qa-repair-9.json').write_text(json.dumps({'status':'CREATOR_REPAIRED_PENDING_INDEPENDENT_QA','subjects':records},indent=2),encoding='utf-8')
    (hand/'qa-repair-9.md').write_text('# Creator repair handoff\n\nNine rejected subjects rebuilt. Technical regression: run `audit_legacy_pixel_batch.py`. Independent QA verdict still required.\n',encoding='utf-8')
    fusion_records=[r for r in records if r['id'].startswith('fusion/')]
    (hand/'qa-pass-3-creator-handoff.json').write_text(json.dumps({'status':'PENDING_INDEPENDENT_QA_PASS_3','repair_method':'continuous one-to-one local joint displacement; no crop overlays','fusion_subjects':fusion_records,'expected_frames':48},indent=2),encoding='utf-8')
    print('repaired 9 subjects')

if __name__=='__main__':main()
