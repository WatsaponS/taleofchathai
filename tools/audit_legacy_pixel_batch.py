from pathlib import Path
from PIL import Image,ImageDraw
import json,statistics

ROOT=Path(r'C:\Users\Admin\Desktop\Project\TaleofChaThai\assets\monsters-legacy-pixel')
def bbox(im): return im.convert('RGBA').getchannel('A').point(lambda x:255 if x>=128 else 0).getbbox()
def margin(b,w=128,h=128): return min(b[0],b[1],w-b[2],h-b[3]) if b else 999

def main():
    manifest=json.loads((ROOT/'manifest.json').read_text(encoding='utf-8'))
    rows=[]; bad=[]; thumbs=[]
    for s in manifest['subjects']:
        d=ROOT/s['output']; slug=d.name
        gif=d/f'{slug}.gif'; png=d/f'{slug}.png'; sheet=d/f'{slug}-sheet.png'; meta=d/f'{slug}.json'
        reasons=[]
        for p in (gif,png,sheet,meta):
            if not p.exists(): reasons.append('missing:'+p.name)
        frames=[]; durations=[]
        if gif.exists():
            im=Image.open(gif)
            try:
                while True:
                    frames.append(im.convert('RGBA').copy()); durations.append(im.info.get('duration'))
                    im.seek(im.tell()+1)
            except EOFError: pass
            if len(frames)!=8: reasons.append(f'frames={len(frames)}')
            if set(durations)!={120}: reasons.append(f'durations={sorted(set(durations))}')
            if im.info.get('loop',0)!=0: reasons.append('not-loop-forever')
            for i,f in enumerate(frames):
                b=bbox(f)
                if not b: reasons.append(f'empty-f{i}')
                elif margin(b)<16: reasons.append(f'margin-f{i}={margin(b)}')
                if f.getchannel('A').getextrema()[0]!=0: reasons.append(f'opaque-bg-f{i}')
            if frames:
                areas=[sum(1 for a in f.getchannel('A').getdata() if a>=128) for f in frames]
                ratio=max(areas)/max(1,min(areas))
                if ratio>1.45: reasons.append(f'area-ratio={ratio:.2f}')
                thumbs.append((s['id'],frames[0]))
        rec={'id':s['id'],'verdict':'TECH_PASS' if not reasons else 'TECH_REVIEW','reasons':reasons}
        rows.append(rec)
        if reasons: bad.append(rec)
    # labeled contact sheets, 40 subjects/page
    report=ROOT/'qa-handoff'; report.mkdir(exist_ok=True)
    pages=[]
    for page,start in enumerate(range(0,len(thumbs),40),1):
        chunk=thumbs[start:start+40]; cs=Image.new('RGB',(5*180,8*170),(35,38,42)); dr=ImageDraw.Draw(cs)
        for i,(name,im) in enumerate(chunk):
            x=(i%5)*180; y=(i//5)*170
            bg=Image.new('RGBA',(128,128),(53,57,63,255)); bg.alpha_composite(im)
            cs.paste(bg.convert('RGB'),(x+26,y)); dr.text((x+4,y+132),name[-27:],fill='white')
        p=report/f'contact-sheet-{page:02d}.jpg'; cs.save(p,quality=92); pages.append(str(p))
    data={'subjects':len(rows),'tech_pass':len(rows)-len(bad),'tech_review':len(bad),'issues':bad,'contact_sheets':pages}
    (report/'technical-audit.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
    (report/'README.md').write_text(f"# Creator QA handoff\n\nSubjects: {len(rows)}\n\nTechnical pass: {len(rows)-len(bad)}\n\nTechnical review: {len(bad)}\n\nCreator self-review only; independent Visual Art QA verdict required.\n",encoding='utf-8')
    print(json.dumps({k:data[k] for k in ('subjects','tech_pass','tech_review')},indent=2))
    if bad:
        for x in bad[:20]: print(x)

if __name__=='__main__': main()
