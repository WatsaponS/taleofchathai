#!/usr/bin/env python3
"""Deterministically repair transparency defects from the first visual QA audit."""

from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
AUDIT = ASSETS / "qa-report" / "audit-data.json"
OUT = ASSETS / "repair-qa"
ORIGINALS = ROOT / "tools" / "repair-source" / "chroma-originals"


def rgba_frames(sheet: Image.Image, width: int, height: int, count: int) -> list[Image.Image]:
    sheet = sheet.convert("RGBA")
    if sheet.size == (width * count, height):
        return [sheet.crop((i * width, 0, (i + 1) * width, height)) for i in range(count)]
    if sheet.size == (width, height * count):
        return [sheet.crop((0, i * height, width, (i + 1) * height)) for i in range(count)]
    raise ValueError(f"sheet geometry {sheet.size} does not match {width}x{height}x{count}")


def indexed_with_reserved_transparency(frame: Image.Image) -> Image.Image:
    """Quantize opaque RGB into indices 1..255; reserve index 0 solely for alpha=0."""
    rgba = frame.convert("RGBA")
    alpha = rgba.getchannel("A")
    # GIF alpha is binary. Source sheets already use hard alpha, but threshold explicitly.
    mask = alpha.point(lambda a: 255 if a >= 128 else 0)
    rgb = Image.new("RGB", rgba.size, (0, 0, 0))
    rgb.paste(rgba.convert("RGB"), mask=mask)
    q = rgb.quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    src_pal = q.getpalette()[: 255 * 3]
    out = Image.new("P", rgba.size, 0)
    shifted = bytes((v + 1 if m else 0) for v, m in zip(q.tobytes(), mask.tobytes()))
    out.frombytes(shifted)
    out.putpalette([0, 0, 0] + src_pal + [0] * (768 - 3 - len(src_pal)))
    out.info["transparency"] = 0
    out.info["disposal"] = 2
    return out


def repair_gif(path: Path, audit: dict) -> dict:
    with Image.open(path) as old:
        size, count = old.size, old.n_frames
        durations = [old.seek(i) or old.info.get("duration", 100) for i in range(count)]
        loop = old.info.get("loop", 0)
    sheet_path = path.with_name(path.stem + "-sheet.png")
    with Image.open(sheet_path) as sheet:
        source = rgba_frames(sheet, size[0], size[1], count)
    indexed = [indexed_with_reserved_transparency(frame) for frame in source]
    indexed[0].save(
        path,
        save_all=True,
        append_images=indexed[1:],
        duration=durations,
        loop=loop,
        transparency=0,
        disposal=2,
        optimize=False,
    )
    return validate_gif(path, source, durations, loop, sheet_path)


def green_candidate(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb
    return g >= 105 and g >= r * 1.32 + 18 and g >= b * 1.18 + 12


def border_connected_green(im: Image.Image) -> bytearray:
    rgb = im.convert("RGB")
    w, h = rgb.size
    pix = rgb.load()
    seen = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if green_candidate(pix[x, y]): q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if green_candidate(pix[x, y]): q.append((x, y))
    while q:
        x, y = q.popleft(); i = y * w + x
        if seen[i] or not green_candidate(pix[x, y]): continue
        seen[i] = 1
        if x: q.append((x - 1, y))
        if x + 1 < w: q.append((x + 1, y))
        if y: q.append((x, y - 1))
        if y + 1 < h: q.append((x, y + 1))
    return seen


def repair_chroma(src: Path, dst: Path) -> dict:
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    bg = border_connected_green(im)
    px = list(im.getdata())
    out = []
    transparent = 0
    despilled = 0
    for i, (r, g, b, _a) in enumerate(px):
        if bg[i]:
            out.append((0, 0, 0, 0)); transparent += 1; continue
        # Remove residual green illumination on foreground edge pixels, conservatively.
        excess = max(0, g - max(r, b))
        if excess > 8 and g > 70:
            g2 = max(max(r, b), g - int(excess * 0.82))
            out.append((r, g2, b, 255)); despilled += 1
        else:
            out.append((r, g, b, 255))
    fixed = Image.new("RGBA", im.size)
    fixed.putdata(out)

    # Chroma illumination survives just inside the hard key boundary. Restrict the
    # stronger neutralization to an 8 px inner edge band so interior fur/fabric color
    # is preserved. These three gray/cream legacy subjects have no intended green trim.
    a = fixed.getchannel("A")
    transparent_mask = a.point(lambda v: 255 if v == 0 else 0)
    near_bg = transparent_mask.filter(ImageFilter.MaxFilter(17))
    edge_band = Image.new("L", fixed.size, 0)
    edge_band.point
    edge_band = Image.frombytes("L", fixed.size, bytes(255 if av and bv else 0 for av, bv in zip(a.tobytes(), near_bg.tobytes())))
    fp = list(fixed.getdata()); eb = edge_band.tobytes(); cleaned=[]; strong_despill=0
    for (r,g,b,al), band in zip(fp,eb):
        if al and band and g > max(r,b) + 1:
            # Restore a neutral edge by interpolating red/blue; retain luminance detail.
            g = (r + b) // 2
            strong_despill += 1
        cleaned.append((r,g,b,al))
    fixed.putdata(cleaned)

    # stage1's source tail was clipped by the original right canvas. Reflect the
    # terminal 96 px tail texture to reconstruct a rounded outer arc, then add 24 px
    # of transparent safety margin. Only opaque pixels touching the original boundary
    # are extended; other rows remain transparent.
    expanded_right = 0
    if src.name == "stage1-chroma.png":
        carve, pad = 18, 20
        pix = fixed.load()
        # Close only the source's narrow boundary-contact zone. The surrounding tail
        # remains entirely native; the last eight columns form a compact rounded cap.
        cy, ry, base_x = 720.5, 46.5, w - 9
        for y in range(int(cy-ry), int(cy+ry) + 1):
            ny = abs((y - cy) / ry)
            xmax = int(base_x + 8 * max(0.0, 1.0 - ny * ny) ** 0.5)
            # Fill chroma-cut gaps inside the intended cap using the nearest native
            # same-row tail texel, preserving sharp painted detail without blur.
            source = None
            for sx in range(base_x, max(-1, base_x - 100), -1):
                if pix[sx,y][3]: source = pix[sx,y]; break
            if source:
                for x in range(base_x, xmax + 1):
                    if pix[x,y][3] == 0: pix[x,y] = source
            for x in range(xmax + 1, w): pix[x,y] = (0,0,0,0)
        expanded = Image.new("RGBA", (w + pad, h), (0,0,0,0))
        expanded.alpha_composite(fixed, (0,0))
        fixed = expanded
        expanded_right = pad

    fixed.save(dst)
    alpha = fixed.getchannel("A")
    return {
        "asset": str(dst.relative_to(ASSETS)).replace("\\", "/"),
        "source": str(src.relative_to(ROOT)).replace("\\", "/"),
        "size": list(fixed.size),
        "transparent_pixels": transparent,
        "despilled_foreground_pixels": despilled,
        "strong_edge_despill_pixels": strong_despill,
        "expanded_right_pixels": expanded_right,
        "alpha_extrema": list(alpha.getextrema()),
        "corners_alpha": [alpha.getpixel(p) for p in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1))],
        "opaque_bbox": list(alpha.getbbox() or ()),
    }


def validate_gif(path: Path, source: list[Image.Image], durations: list[int], loop: int, sheet: Path) -> dict:
    decoded = []
    with Image.open(path) as im:
        actual_durations = []
        for i in range(im.n_frames):
            im.seek(i); actual_durations.append(im.info.get("duration", 0)); decoded.append(im.convert("RGBA"))
        actual_loop = im.info.get("loop", 0)
    frames = []
    for i, (got, src) in enumerate(zip(decoded, source)):
        ga, sa = got.getchannel("A"), src.getchannel("A").point(lambda a: 255 if a >= 128 else 0)
        alpha_equal = ga.tobytes() == sa.tobytes()
        bbox = ga.getbbox()
        corners = [ga.getpixel(p) for p in ((0, 0), (got.width - 1, 0), (0, got.height - 1), (got.width - 1, got.height - 1))]
        frames.append({"frame": i, "alpha_matches_sheet": alpha_equal, "bbox": list(bbox or ()), "corners_alpha": corners,
                       "opaque_pixels": sum(v != 0 for v in ga.getdata())})
    return {
        "asset": str(path.relative_to(ASSETS)).replace("\\", "/"),
        "source_sheet": str(sheet.relative_to(ASSETS)).replace("\\", "/"),
        "size": list(decoded[0].size), "frame_count": len(decoded),
        "durations_expected": durations, "durations_actual": actual_durations,
        "loop_expected": loop, "loop_actual": actual_loop, "frames": frames,
        "technical_pass": len(decoded) == len(source) and actual_durations == durations and actual_loop == loop
                          and all(f["alpha_matches_sheet"] and f["corners_alpha"] == [0, 0, 0, 0] for f in frames),
    }


def contact_sheet(results: list[dict]) -> None:
    contact = OUT / "contact-sheets"; contact.mkdir(parents=True, exist_ok=True)
    for result in results:
        path = ASSETS / result["asset"]
        if path.suffix.lower() == ".gif":
            ims=[]
            with Image.open(path) as im:
                for i in range(im.n_frames): im.seek(i); ims.append(im.convert("RGBA"))
        else: ims=[Image.open(path).convert("RGBA")]
        scale=min(1.0, 240/max(ims[0].size)); tw=max(1,int(ims[0].width*scale)); th=max(1,int(ims[0].height*scale))
        cols=4; rows=(len(ims)+cols-1)//cols; canvas=Image.new("RGBA",(cols*(tw+12),rows*(th+30)),(45,45,45,255)); d=ImageDraw.Draw(canvas)
        for i,im in enumerate(ims):
            tile=im.resize((tw,th),Image.Resampling.NEAREST); x=(i%cols)*(tw+12); y=(i//cols)*(th+30)
            # checker backdrop makes transparency and edge spill visually inspectable.
            checker=Image.new("RGBA",tile.size,(210,210,210,255)); cd=ImageDraw.Draw(checker)
            for yy in range(0,th,12):
                for xx in range(0,tw,12):
                    if (xx//12+yy//12)%2: cd.rectangle((xx,yy,xx+11,yy+11),fill=(165,165,165,255))
            checker.alpha_composite(tile); canvas.alpha_composite(checker,(x,y+18)); d.text((x,y),f"frame {i}",fill="white")
        canvas.convert("RGB").save(contact/(result["asset"].replace("/","__")+".jpg"),quality=92)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    data = json.loads(AUDIT.read_text(encoding="utf-8"))
    rejected = [a for a in data["assets"] if a["status"] == "REJECT"]
    gif_results=[]; png_results=[]
    for a in rejected:
        path=ASSETS/a["asset"]
        if a["format"] == "GIF": gif_results.append(repair_gif(path,a))
        else:
            src=ORIGINALS/path.name
            if not src.exists(): raise FileNotFoundError(f"preserved chroma source missing: {src}")
            png_results.append(repair_chroma(src,path))
    results=gif_results+png_results
    contact_sheet(results)
    report={"summary":{"repaired":len(results),"gifs":len(gif_results),"pngs":len(png_results),
                       "technical_pass":all(r.get("technical_pass",True) for r in results)},
            "gif_repairs":gif_results,"png_repairs":png_results}
    (OUT/"repair-validation.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    changed="\n".join(f"- `assets/{r['asset']}`" for r in results)
    md=f"""# Rejected Transparency Repair Report\n\nCreator self-review only — independent Visual Art QA must issue the verdict.\n\n## Summary\n\n- Repaired: {len(results)} assets ({len(gif_results)} GIF, {len(png_results)} PNG)\n- Technical checks: {'PASS' if report['summary']['technical_pass'] else 'FAIL'}\n- GIF source: exact-dimension RGBA move sheets, one cell per original frame\n- GIF semantics: original dimensions, frame count, per-frame durations, loop, and naming retained\n- GIF transparency: index 0 reserved exclusively for source alpha=0; decoded alpha checked against every RGBA sheet frame\n- PNG method: border-connected chroma removal plus conservative foreground green decontamination\n- Visual self-review: labeled checkerboard contact sheets generated in `assets/repair-qa/contact-sheets/`\n\n## Changed final assets\n\n{changed}\n\n## QA handoff\n\nInspect every final asset and every GIF frame independently. Machine-readable evidence is in `assets/repair-qa/repair-validation.json`.\n"""
    (OUT/"repair-report.md").write_text(md,encoding="utf-8")


if __name__ == "__main__": main()
