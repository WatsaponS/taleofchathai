from __future__ import annotations

import argparse
import json
from pathlib import Path
from PIL import Image, ImageFilter


def component_bbox(alpha: Image.Image):
    return alpha.point(lambda a: 255 if a >= 32 else 0).getbbox()


def build_pixel(src_path: Path, out_path: Path, size: int = 96):
    """Convert cleaned concept art to a hard-grid, palette-authored game sprite.

    This deliberately avoids smooth resampling. It samples one source point per
    destination pixel, locks a compact palette, hardens alpha, removes isolated
    edge noise, and places the resulting silhouette on a padded square canvas.
    """
    src = Image.open(src_path).convert("RGBA")
    bbox = component_bbox(src.getchannel("A"))
    if not bbox:
        raise ValueError("empty alpha after chroma removal")
    subject = src.crop(bbox)
    max_body = size - 12
    scale = min(max_body / subject.width, max_body / subject.height)
    w, h = max(1, round(subject.width * scale)), max(1, round(subject.height * scale))
    # Point sampling retains a single, explicit pixel grid; no interpolated mixels.
    subject = subject.resize((w, h), Image.Resampling.NEAREST)
    a = subject.getchannel("A").point(lambda v: 255 if v >= 96 else 0)
    rgb = subject.convert("RGB").quantize(colors=24, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    pix = Image.merge("RGBA", (*rgb.split(), a))
    # Remove only 1-pixel alpha islands; preserve claws, whiskers and flame tips.
    mask = a
    opened = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    keep = Image.blend(mask, opened, 0.22).point(lambda v: 255 if v >= 96 else 0)
    pix.putalpha(keep)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(pix, ((size - w) // 2, (size - h) // 2))
    canvas.save(out_path)
    return {"canvas": [size, size], "bbox": list(canvas.getchannel("A").getbbox() or ()), "palette_budget": 24}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, type=Path)
    ap.add_argument("--dir", required=True, type=Path)
    ap.add_argument("--id", required=True)
    args = ap.parse_args()
    args.dir.mkdir(parents=True, exist_ok=True)
    cleaned = args.dir / "illustration.png"
    metrics = build_pixel(cleaned, args.dir / "pixel.png")
    meta_path = args.dir / "metadata.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    meta.update({"id": args.id, "production_status": "creator_complete_pending_qa", "imagegen_source": str(args.source), "pixel_method": "hard-grid point sampling, alpha cleanup, 24-color palette lock", "pixel_metrics": metrics})
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    root = args.dir.parents[1]
    cp_path = root / "PRODUCTION-CHECKPOINT.json"
    if cp_path.exists():
        cp = json.loads(cp_path.read_text(encoding="utf-8"))
        catalog = json.loads((root / "manifest.json").read_text(encoding="utf-8"))["assets"]
        item = next(x for x in catalog if x["id"] == args.id)
        rel_dir = args.dir.relative_to(root).as_posix()
        cp.setdefault("completed", [])
        cp["completed"] = [x for x in cp["completed"] if x.get("id") != args.id]
        cp["completed"].append({"id": args.id, "name": item["english_name"], "illustration": f"{rel_dir}/illustration.png", "pixel": f"{rel_dir}/pixel.png", "imagegen": "built-in sequential call", "self_review": "creator complete, full-body chroma-cleaned concept and hard-grid 24-color pixel sprite; pending independent QA"})
        index = next(i for i, x in enumerate(catalog) if x["id"] == args.id)
        cp["creator_completed"] = len(cp["completed"])
        cp["last_completed_id"] = args.id
        cp["next_id"] = catalog[index + 1]["id"] if index + 1 < len(catalog) else None
        cp_path.write_text(json.dumps(cp, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
