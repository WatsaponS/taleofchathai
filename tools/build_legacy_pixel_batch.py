from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
import hashlib, json, math, re, shutil

ROOT=Path(r"C:\Users\Admin\Desktop\Project\TaleofChaThai")
SRC=ROOT/'assets'/'monsters-legacy-chathaithecat'
OUT=ROOT/'assets'/'monsters-legacy-pixel'
FRAME_RE=re.compile(r'^(.*)-f(\d+)$')
DERIV_RE=re.compile(r'^(.*?)-(static|clean|chroma)$')

def logical_key(p:Path):
    stem=p.stem
    m=FRAME_RE.match(stem)
    if m: stem=m.group(1)
    m=DERIV_RE.match(stem)
    if m: stem=m.group(1)
    # elemental legacy sets use stageN.png + stageN-fN.png
    return (p.parent.relative_to(SRC).as_posix(),stem)

def alpha_subject(im:Image.Image):
    im=im.convert('RGBA')
    a=im.getchannel('A')
    if a.getextrema() != (255,255):
        return im
    # Remove corner-connected near-background. This preserves internal light colors.
    pix=im.load(); w,h=im.size
    corners=[pix[0,0][:3],pix[w-1,0][:3],pix[0,h-1][:3],pix[w-1,h-1][:3]]
    bg=tuple(sum(c[i] for c in corners)//4 for i in range(3))
    seen=set(); stack=[(0,0),(w-1,0),(0,h-1),(w-1,h-1)]
    while stack:
        x,y=stack.pop()
        if (x,y) in seen: continue
        c=pix[x,y][:3]
        if max(abs(c[i]-bg[i]) for i in range(3))>28: continue
        seen.add((x,y)); pix[x,y]=(c[0],c[1],c[2],0)
        if x: stack.append((x-1,y))
        if x+1<w: stack.append((x+1,y))
        if y: stack.append((x,y-1))
        if y+1<h: stack.append((x,y+1))
    return im

def opaque_bbox(im): return im.getchannel('A').point(lambda x:255 if x>=128 else 0).getbbox()

def process_group(paths:list[Path]):
    # prefer actual motion frames, then static, clean, plain, chroma
    framed=[]
    for p in paths:
        m=FRAME_RE.match(p.stem)
        if m: framed.append((int(m.group(2)),p))
    if framed:
        selected=[p for _,p in sorted(framed)]
    else:
        rank=lambda p:(0 if p.stem.endswith('-static') else 1 if p.stem.endswith('-clean') else 2 if not p.stem.endswith('-chroma') else 3,p.name)
        selected=[sorted(paths,key=rank)[0]]
    ims=[alpha_subject(Image.open(p)) for p in selected]
    boxes=[opaque_bbox(im) for im in ims]
    boxes=[b for b in boxes if b]
    if not boxes: raise ValueError('empty source')
    # normalize each whole silhouette to one scale and baseline; hard alpha + limited palette
    maxw=max(b[2]-b[0] for b in boxes); maxh=max(b[3]-b[1] for b in boxes)
    scale=min(92/maxw,92/maxh,1.0)
    frames=[]
    for im,b in zip(ims,[opaque_bbox(i) for i in ims]):
        if not b: continue
        crop=im.crop(b)
        nw=max(1,round(crop.width*scale)); nh=max(1,round(crop.height*scale))
        crop=crop.resize((nw,nh),Image.Resampling.NEAREST)
        aa=crop.getchannel('A').point(lambda x:255 if x>=128 else 0)
        rgb=crop.convert('RGB').quantize(colors=24,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).convert('RGB')
        crop=Image.merge('RGBA',(*rgb.split(),aa))
        can=Image.new('RGBA',(128,128))
        x=(128-nw)//2; y=110-nh
        can.alpha_composite(crop,(x,y)); frames.append(can)
    return frames, selected

def anatomy(name):
    n=name.lower()
    if any(x in n for x in ('bat','owl','manta','moth','roc','wyvern','dragon','wing')): return 'flying'
    if any(x in n for x in ('ghost','spirit','shade','oracle','wisp','phantom')): return 'spirit'
    if any(x in n for x in ('frog','toad','hare','rabbit','hopper')): return 'hopper'
    if any(x in n for x in ('golem','duelist','monarch','knight')): return 'biped'
    return 'quadruped'

def deform(im,kind,i):
    # deterministic inverse row mapping: coherent silhouette, no holes, visible secondary sway.
    phase=[0,1,2,1,0,-1,-2,-1][i]
    bob=[0,-1,-2,-1,0,1,2,1][i]
    src=im.load(); out=Image.new('RGBA',im.size); dst=out.load(); w,h=im.size
    for y in range(h):
        for x in range(w):
            dx=0; sy=y-bob
            if kind=='flying': dx=round(phase*(112-y)/112) if y<112 else 0
            elif kind=='spirit': dx=round(phase*math.sin(y/13))
            elif kind=='hopper': sy=y-([1,0,-2,-1,1,2,0,-1][i] if y<112 else 0)
            elif kind=='biped': dx=phase if 75<y<112 else (phase//2 if y<=75 else 0)
            else: dx=round(phase*(y-64)/96) if 55<y<112 else 0
            sx=x-dx
            if 0<=sx<w and 0<=sy<h: dst[x,y]=src[sx,sy]
    return out

def eight(frames,kind):
    if len(frames)==1: return [deform(frames[0],kind,i) for i in range(8)]
    if len(frames)>=8:
        return [frames[round(i*(len(frames)-1)/7)].copy() for i in range(8)]
    seq=list(range(len(frames)))+list(range(len(frames)-2,0,-1))
    if not seq: seq=[0]
    return [frames[seq[i%len(seq)]].copy() for i in range(8)]

def enforce_safe_margin(im, safe=16):
    b=opaque_bbox(im)
    if not b: return im
    dx=0; dy=0
    if b[0]<safe: dx=safe-b[0]
    if b[2]+dx>128-safe: dx+=(128-safe)-(b[2]+dx)
    if b[1]<safe: dy=safe-b[1]
    if b[3]+dy>128-safe: dy+=(128-safe)-(b[3]+dy)
    if not dx and not dy: return im
    out=Image.new('RGBA',im.size); out.alpha_composite(im,(dx,dy)); return out

def preserve_gif_cels(frames):
    # Pillow coalesces identical cels. Encode an imperceptible deterministic color bit
    # on an existing interior opaque pixel so the required eight timing cels survive.
    out=[]
    from collections import Counter
    for i,im in enumerate(frames):
        im=im.copy(); b=opaque_bbox(im)
        if b:
            p=im.load(); counts=Counter(p[x,y][:3] for y in range(b[1],b[3]) for x in range(b[0],b[2]) if p[x,y][3]==255)
            common=[c for c,_ in counts.most_common(3)]
            if len(common)>1:
                candidates=[(x,y) for y in range(b[1]+2,b[3]-2) for x in range(b[0]+2,b[2]-2) if p[x,y][3]==255 and p[x,y][:3]==common[0]]
                if candidates:
                    x,y=candidates[(i*17)%len(candidates)]; p[x,y]=(*common[1],255)
        out.append(im)
    return out

def margin(im):
    b=opaque_bbox(im)
    return 128 if not b else min(b[0],b[1],128-b[2],128-b[3])

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    allp=sorted(SRC.rglob('*.png'))
    groups={}
    for p in allp: groups.setdefault(logical_key(p),[]).append(p)
    subjects=[]; accounting=[]; failures=[]
    for (rel,slug),paths in sorted(groups.items()):
        try:
            base,used=process_group(paths); kind=anatomy(slug); fs=preserve_gif_cels([enforce_safe_margin(f) for f in eight(base,kind)])
            dest=OUT/rel/slug; dest.mkdir(parents=True,exist_ok=True)
            master=fs[0]; master.save(dest/f'{slug}.png',optimize=True)
            fs[0].save(dest/f'{slug}.gif',save_all=True,append_images=fs[1:],duration=120,loop=0,disposal=2,transparency=0,optimize=False)
            sheet=Image.new('RGBA',(128*4,128*2))
            for i,f in enumerate(fs): sheet.alpha_composite(f,((i%4)*128,(i//4)*128))
            sheet.save(dest/f'{slug}-sheet.png',optimize=True)
            meta={'name':slug,'source_group':rel,'anatomy':kind,'frame_width':128,'frame_height':128,'frames':8,'duration_ms':120,'loop':0,'layout':{'columns':4,'rows':2},'safe_margin_px':min(margin(f) for f in fs),'sources':[str(p.relative_to(SRC)).replace('\\','/') for p in paths]}
            (dest/f'{slug}.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
            subjects.append({'id':f'{rel}/{slug}','output':str(dest.relative_to(OUT)).replace('\\','/'),'anatomy':kind,'input_count':len(paths),'motion_sources':[str(p.relative_to(SRC)).replace('\\','/') for p in used],'min_margin':meta['safe_margin_px']})
            usedset=set(used)
            for p in paths:
                role='source' if p in usedset else ('derivative' if FRAME_RE.match(p.stem) or DERIV_RE.match(p.stem) else 'duplicate_variant')
                accounting.append({'path':str(p.relative_to(SRC)).replace('\\','/'),'subject':f'{rel}/{slug}','role':role})
        except Exception as e:
            failures.append({'subject':f'{rel}/{slug}','error':repr(e)})
    manifest={'input_root':str(SRC),'output_root':str(OUT),'input_png_count':len(allp),'logical_subject_count':len(groups),'built_count':len(subjects),'failed_count':len(failures),'subjects':subjects,'failures':failures}
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    (OUT/'input-accounting.json').write_text(json.dumps({'count':len(accounting),'files':accounting},indent=2),encoding='utf-8')
    print(json.dumps({k:manifest[k] for k in ('input_png_count','logical_subject_count','built_count','failed_count')},indent=2))

if __name__=='__main__': main()
