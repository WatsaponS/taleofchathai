import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageSequence

ROOT = Path(r"C:\Users\Admin\Desktop\Project\TaleofChaThai\assets\monsters-legacy-pixel")
OUT = ROOT / "qa-report" / "frame-pages"
OUT.mkdir(parents=True, exist_ok=True)
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
font = ImageFont.load_default()
rows_per_page = 10
cell = 112
label_w = 330
row_h = 140
page_w = label_w + cell * 8
records = []

for page_no, start in enumerate(range(0, len(manifest["subjects"]), rows_per_page), 1):
    subset = manifest["subjects"][start:start + rows_per_page]
    page = Image.new("RGB", (page_w, row_h * len(subset)), (28, 32, 35))
    draw = ImageDraw.Draw(page)
    for row, subject in enumerate(subset):
        dest = ROOT / subject["output"]
        slug = Path(subject["output"]).name
        gif_path = dest / f"{slug}.gif"
        frames = [f.convert("RGBA") for f in ImageSequence.Iterator(Image.open(gif_path))]
        unique = len({f.tobytes() for f in frames})
        durations = [f.info.get("duration") for f in ImageSequence.Iterator(Image.open(gif_path))]
        y0 = row * row_h
        draw.text((6, y0 + 8), f"{start+row+1:03d} {subject['id']}", fill="white", font=font)
        draw.text((6, y0 + 24), f"{subject['anatomy']} | source={subject['input_count']} | unique={unique} | ms={durations}", fill=(180,210,220), font=font)
        for i, frame in enumerate(frames):
            checker = Image.new("RGB", (128, 128), (53, 58, 62))
            tile = frame.copy()
            checker.paste(tile, mask=tile.getchannel("A"))
            thumb = checker.resize((96, 96), Image.Resampling.NEAREST)
            x = label_w + i * cell
            page.paste(thumb, (x, y0 + 20))
            draw.text((x + 2, y0 + 119), f"F{i}", fill=(255,220,110), font=font)
        records.append({"id": subject["id"], "gif": str(gif_path), "frame_count": len(frames), "unique": unique, "durations": durations})
    page.save(OUT / f"frames-{page_no:02d}.png")

(ROOT / "qa-report" / "frame-metrics.json").write_text(json.dumps(records, indent=2), encoding="utf-8")
print(json.dumps({"subjects": len(records), "pages": page_no}, indent=2))
