#!/usr/bin/env python3
"""make-pptx-deck.py: build a .pptx deck whose figures are svg-library components
embedded as native vector SVG (PowerPoint 2016+/365, Mac and Online), with a
high-res PNG fallback for clients that ignore SVG (Google Slides, Keynote, old
Office). All text stays native: titles in real title placeholders, bullets in
body placeholders, captions in caption placeholders, notes in the notes page.

    python3 bin/make-pptx-deck.py spec.json -o deck.pptx [--theme light|dark] [--base corp.pptx]

  spec     JSON (or YAML if PyYAML is installed), see templates/deck/README.md:
             {"title": "...", "theme": "light",
              "slides": [
                {"layout": "title", "title": "...", "subtitle": "..."},
                {"layout": "section", "title": "...", "subtitle": "..."},
                {"layout": "figure", "title": "...", "figure": "food-web",
                 "caption": "...", "alt": "...", "notes": "..."},
                {"layout": "two-figures", "title": "...",
                 "figures": [{"svg": "ocean-zones", "caption": "..."}, "water-cycle"]},
                {"layout": "bullets", "title": "...", "bullets": ["a", ["sub", "sub"], "b"]}]}
           a figure is an svg-library component name or a path to a .svg
           (token-driven or already baked; it is baked again for the deck theme).
  --theme  overrides spec "theme" (default light); picks the house base and
           the svg-export palette.
  --base   a corporate .pptx to build on instead of templates/deck/house-<theme>.pptx.
           Its existing slides are dropped; layouts are matched by house name,
           then by layout type (title / secHead / titleOnly / obj).

Deps (optional, deck builder only): python-pptx, lxml, cairosvg; node for bin/svg-export.js.
"""
import argparse, io, json, os, re, subprocess, sys, tempfile

from lxml import etree
from pptx import Presentation
from pptx.enum.shapes import PP_PLACEHOLDER
from pptx.opc.constants import RELATIONSHIP_TYPE as RT
from pptx.opc.package import Part
from pptx.oxml.ns import qn
from pptx.util import Emu

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECK_DIR = os.path.join(ROOT, "templates", "deck")
SVG_NS = "http://schemas.microsoft.com/office/drawing/2016/SVG/main"
SVG_EXT = "{96DAC541-7B7A-43D3-8B79-37D633B846F1}"
DECOR_NS = "http://schemas.microsoft.com/office/drawing/2017/decorative"
DECOR_EXT = "{C183D7F6-B498-43B3-948B-1728B52AA6E4}"

# layout kind -> (house layout name, OOXML layout type used for --base fallback)
LAYOUTS = {
    "title": ("Title", "title"),
    "section": ("Section", "secHead"),
    "figure": ("Figure", "titleOnly"),
    "two-figures": ("Two Figures", "titleOnly"),
    "bullets": ("Bullets", "obj"),
}
N_FIGS = {"figure": 1, "two-figures": 2}
TITLE_TYPES = (PP_PLACEHOLDER.TITLE, PP_PLACEHOLDER.CENTER_TITLE)

PIC_XML = (
    '<p:pic xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    '<p:nvPicPr><p:cNvPr id="{id}" name="{name}" descr="{descr}"/>'
    '<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>'
    '<p:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>'
    '<p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>'
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>'
)


def bake(ref, theme, workdir):
    """svg-library name or .svg path -> renderer-safe SVG bytes (bin/svg-export.js)."""
    out = subprocess.run(
        ["node", os.path.join(ROOT, "bin", "svg-export.js"), ref, "--theme", theme, "--out", workdir],
        capture_output=True, text=True)
    if out.returncode:
        sys.exit(f"svg-export failed for {ref!r}: {out.stderr.strip() or out.stdout.strip()}")
    with open(out.stdout.strip().splitlines()[-1], "rb") as f:
        return f.read()


def svg_size(svg):
    m = re.search(rb'<svg[^>]*\bwidth="([\d.]+)"[^>]*\bheight="([\d.]+)"', svg)
    return float(m.group(1)), float(m.group(2))


def svg_label(svg):
    m = re.search(rb'aria-label="([^"]*)"', svg) or re.search(rb"<title>([^<]*)</title>", svg)
    return m.group(1).decode() if m else ""


def raster(svg, width_px):
    import cairosvg
    w, h = svg_size(svg)
    return cairosvg.svg2png(bytestring=svg, output_width=width_px, output_height=round(width_px * h / w))


def add_svg_picture(part, sp_tree, svg, png, box, name, descr="", decorative=False, back=False):
    """Add a picture (PNG blip + svgBlip extension) to any slide/layout/master part.

    box = (x, y, cx, cy) in EMU. back=True inserts behind every other shape.
    """
    _, rid_png = part.get_or_add_image_part(io.BytesIO(png))
    svg_part = Part(part.package.next_partname("/ppt/media/image%d.svg"), "image/svg+xml", part.package, svg)
    rid_svg = part.relate_to(svg_part, RT.IMAGE)
    sid = 1 + max(int(e.get("id")) for e in sp_tree.iter(qn("p:cNvPr")))
    x, y, cx, cy = (int(v) for v in box)
    pic = etree.fromstring(PIC_XML.format(id=sid, name=name, descr="", rid=rid_png, x=x, y=y, cx=cx, cy=cy))
    pic.find(".//" + qn("p:cNvPr")).set("descr", descr)  # one XML set; lxml escapes it
    if decorative:
        ext = etree.SubElement(etree.SubElement(pic.find(".//" + qn("p:cNvPr")), qn("a:extLst")), qn("a:ext"), uri=DECOR_EXT)
        etree.SubElement(ext, f"{{{DECOR_NS}}}decorative", nsmap={"adec": DECOR_NS}, val="1")
    ext = etree.SubElement(etree.SubElement(pic.find(".//" + qn("a:blip")), qn("a:extLst")), qn("a:ext"), uri=SVG_EXT)
    etree.SubElement(ext, f"{{{SVG_NS}}}svgBlip", nsmap={"asvg": SVG_NS}).set(qn("r:embed"), rid_svg)
    if back:
        sp_tree.insert(2, pic)  # after nvGrpSpPr + grpSpPr
    else:
        sp_tree.append(pic)
    return pic


def contain(box, aspect):
    x, y, cx, cy = box
    w, h = (cx, cx / aspect) if cx / cy < aspect else (cy * aspect, cy)
    return x + (cx - w) / 2, y + (cy - h) / 2, w, h


def pick_layout(prs, kind):
    name, typ = LAYOUTS[kind]
    layouts = list(prs.slide_layouts)
    for test in (lambda l: l.name == name, lambda l: l._element.get("type") == typ,
                 lambda l: any(p.placeholder_format.type in TITLE_TYPES for p in l.placeholders)):
        hit = next((l for l in layouts if test(l)), None)
        if hit:
            return hit
    sys.exit(f"--base has no usable layout for {kind!r}")


def drop_all_slides(prs):
    lst = prs.slides._sldIdLst
    for sld in list(lst):
        prs.part.drop_rel(sld.rId)
        lst.remove(sld)


def remove(shape):
    shape._element.getparent().remove(shape._element)


def fill_text(tf, items, level=0):
    """items: str or nested list of str (nested list = one level deeper)."""
    first = not any(p.text for p in tf.paragraphs)
    for it in items:
        if isinstance(it, list):
            fill_text(tf, it, level + 1)
            continue
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.text, p.level = str(it), level


def norm_figures(s):
    figs = s.get("figures") or ([s["figure"]] if "figure" in s else [])
    figs = [{"svg": f} if isinstance(f, str) else dict(f) for f in figs]
    if len(figs) == 1 and "caption" in s and "caption" not in figs[0]:
        figs[0]["caption"] = s["caption"]
    if len(figs) == 1 and "alt" in s and "alt" not in figs[0]:
        figs[0]["alt"] = s["alt"]
    return figs


def build(spec, out, theme=None, base=None):
    theme = theme or spec.get("theme", "light")
    if theme not in ("light", "dark"):
        sys.exit(f"theme must be light or dark, not {theme!r}")
    prs = Presentation(base or os.path.join(DECK_DIR, f"house-{theme}.pptx"))
    drop_all_slides(prs)
    if spec.get("title"):
        prs.core_properties.title = spec["title"]
    sw, sh = prs.slide_width, prs.slide_height
    work = tempfile.mkdtemp(prefix="pptxdeck-")

    for n, s in enumerate(spec["slides"], 1):
        kind = s.get("layout")
        if kind not in LAYOUTS:
            sys.exit(f"slide {n}: layout must be one of {sorted(LAYOUTS)}, not {kind!r}")
        figs = norm_figures(s)
        if len(figs) != N_FIGS.get(kind, 0):
            sys.exit(f"slide {n} ({kind}): expected {N_FIGS.get(kind, 0)} figure(s), got {len(figs)}")
        slide = prs.slides.add_slide(pick_layout(prs, kind))
        phs = list(slide.placeholders)
        title = next((p for p in phs if p.placeholder_format.type in TITLE_TYPES), None)
        if title is not None and s.get("title"):
            title.text = s["title"]
        elif s.get("title"):
            sys.exit(f"slide {n}: layout {slide.slide_layout.name!r} has no title placeholder")
        body = [p for p in phs if p is not title and p.placeholder_format.type in
                (PP_PLACEHOLDER.BODY, PP_PLACEHOLDER.OBJECT, PP_PLACEHOLDER.SUBTITLE)]
        pics = sorted((p for p in phs if p.placeholder_format.type == PP_PLACEHOLDER.PICTURE), key=lambda p: p.left)

        if kind in ("title", "section") and s.get("subtitle") and body:
            body[0].text = s["subtitle"]
        elif kind == "bullets" and body:
            fill_text(body[0].text_frame, s.get("bullets", []))
        elif kind in N_FIGS:
            # caption placeholders = body placeholders, left to right (house layouts: idx 14/16)
            caps = sorted(body, key=lambda p: p.left)
            if len(pics) >= len(figs):
                boxes = [(p.left, p.top, p.width, p.height) for p in pics]
            else:  # --base without picture placeholders: split the area below the title
                top = (title.top + title.height if title is not None else sh // 10) + sh // 30
                cap_h = sh // 12 if len(caps) < len(figs) else 0
                gap, margin = sw // 40, sw // 20
                w = (sw - 2 * margin - gap * (len(figs) - 1)) // len(figs)
                boxes = [(margin + i * (w + gap), top, w, sh - top - sh // 20 - cap_h) for i in range(len(figs))]
            for i, f in enumerate(figs):
                svg = bake(f["svg"], theme, work)
                aw, ah = svg_size(svg)
                x, y, cx, cy = contain(boxes[i], aw / ah)
                png = raster(svg, 2400 if cx > sw / 2 else 1800)
                add_svg_picture(slide.part, slide.shapes._spTree, svg, png, (x, y, cx, cy),
                                name=f"Figure {i + 1}", descr=f.get("alt") or svg_label(svg))
                if f.get("caption"):
                    if i < len(caps):
                        caps[i].text = f["caption"]
                    else:
                        tb = slide.shapes.add_textbox(Emu(boxes[i][0]), Emu(int(y + cy)), Emu(boxes[i][2]), Emu(sh // 14))
                        tb.text_frame.text = f["caption"]
                        tb.text_frame.word_wrap = True
            for p in pics:
                remove(p)

        # placeholders left empty would show "Click to add ..." in edit view
        for p in slide.placeholders:
            if p.placeholder_format.type == PP_PLACEHOLDER.PICTURE or (p.has_text_frame and not p.text_frame.text.strip()):
                remove(p)
        if s.get("notes"):
            slide.notes_slide.notes_text_frame.text = s["notes"]

    prs.save(out)
    return out


def load_spec(path):
    with open(path, encoding="utf-8") as f:
        if path.endswith((".yaml", ".yml")):
            import yaml
            return yaml.safe_load(f)
        return json.load(f)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("spec")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--theme", choices=("light", "dark"))
    ap.add_argument("--base", help="corporate .pptx to build on (default: house base for the theme)")
    a = ap.parse_args()
    print(build(load_spec(a.spec), a.out, a.theme, a.base))
