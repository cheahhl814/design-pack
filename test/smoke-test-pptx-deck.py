#!/usr/bin/env python3
"""Structural QA for bin/make-pptx-deck.py + the house bases (templates/deck/).

Builds a 5-layout deck on house-light, house-dark and a 4:3 stand-in corporate
base (python-pptx's default template), reloads each with python-pptx and checks:
every svgBlip resolves to an image/svg+xml part (renderer-safe, PNG blip
alongside), titles live in real title placeholders, no empty or unfilled
placeholders, nothing off-slide, alt text on figures, decorative flag on decor,
notes, PNG fallback resolution; plus the bases' size, layouts, theme and fonts.
Skips (exit 0) when the optional Python deps are missing.
"""
import importlib.util, io, json, os, subprocess, sys, tempfile

try:
    from lxml import etree
    from PIL import Image
    from pptx import Presentation
    from pptx.enum.shapes import MSO_SHAPE_TYPE, PP_PLACEHOLDER
    from pptx.oxml.ns import qn
    import cairosvg  # noqa: F401
except ImportError as e:
    print(f"  SKIP: optional deck-builder deps missing ({e.name}); pip install python-pptx lxml cairosvg pillow")
    sys.exit(0)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILDER = os.path.join(ROOT, "bin", "make-pptx-deck.py")
SVG_NS = "http://schemas.microsoft.com/office/drawing/2016/SVG/main"
DECOR_NS = "http://schemas.microsoft.com/office/drawing/2017/decorative"
A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
TITLES = (PP_PLACEHOLDER.TITLE, PP_PLACEHOLDER.CENTER_TITLE)

passed = failed = 0


def check(ok, msg):
    global passed, failed
    if ok:
        passed += 1
    else:
        failed += 1
        print(f"  ✗ {msg}")


SPEC = {
    "title": "Smoke deck",
    "slides": [
        {"layout": "title", "title": "Deck title", "subtitle": "Sub", "notes": "note one"},
        {"layout": "section", "title": "Section A"},  # no subtitle: placeholder must be removed
        {"layout": "figure", "title": "One figure", "figure": "food-web", "caption": "Cap", "notes": "note three"},
        {"layout": "two-figures", "title": "Two figures",
         "figures": [{"svg": "water-cycle", "alt": "Custom alt"}, {"svg": "ocean-zones", "caption": "Right"}]},
        {"layout": "bullets", "title": "Bullets", "bullets": ["a", ["a.1"], "b"]},
        # v0.19.0 layouts
        {"layout": "agenda", "items": ["one", "two", "three"]},
        {"layout": "quote", "quote": "Kill bad programmes early.", "attribution": "Someone, CSO"},
        {"layout": "table", "title": "Table", "header": ["A", "B", "C"],
         "rows": [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]]},
        {"layout": "kpi", "title": "KPI", "value": "92%", "label": "hit rate", "delta": "-3 pts",
         "stats": [{"value": "48 h", "label": "turnaround"}]},
        {"layout": "image-text", "title": "Image text", "figure": "food-web", "side": "right", "bullets": ["x", "y"]},
        {"layout": "closing", "contact": ["team@example.org"], "credits": "slide credit"},
    ],
    "footer": "Smoke footer", "date": "auto", "credits": ["deck credit"],
}
LAYOUT_NAMES = ["Title", "Section", "Figure", "Two Figures", "Bullets",
                "Agenda", "Quote", "Table", "KPI", "Image + Text", "Closing"]
NO_FIELDS = ("title", "section", "closing")  # cover-style slides carry no footer fields
DEFAULT_TITLES = {"agenda": "Agenda", "closing": "Thank you"}


def svg_blips(part):
    return list(etree.fromstring(part.blob).iter(f"{{{SVG_NS}}}svgBlip")) if part.partname.endswith(".xml") else []


def check_package(prs, label):
    for part in prs.part.package.iter_parts():
        for sb in svg_blips(part):
            rid = sb.get(qn("r:embed"))
            target = part.related_part(rid)
            check(target.content_type == "image/svg+xml", f"{label} {part.partname}: svgBlip {rid} -> {target.content_type}")
            check(b"var(" not in target.blob and b"color-mix" not in target.blob, f"{label} {target.partname}: unbaked SVG")
            png = part.related_part(sb.getparent().getparent().getparent().get(qn("r:embed")))
            check(png.content_type == "image/png", f"{label} {part.partname}: fallback blip is {png.content_type}")


def in_bounds(shape, sw, sh):
    return shape.left >= 0 and shape.top >= 0 and shape.left + shape.width <= sw and shape.top + shape.height <= sh


def check_deck(path, label, house):
    prs = Presentation(path)
    sw, sh = prs.slide_width, prs.slide_height
    check(len(prs.slides) == len(SPEC["slides"]), f"{label}: slide count")
    check(prs.core_properties.title == SPEC["title"], f"{label}: core title")
    check_package(prs, label)
    for n, (slide, s) in enumerate(zip(prs.slides, SPEC["slides"]), 1):
        t = slide.shapes.title
        want_title = s.get("title") or DEFAULT_TITLES.get(s["layout"])
        if want_title:
            check(t is not None and t.placeholder_format.type in TITLES and t.text == want_title,
                  f"{label} slide {n}: title not in a title placeholder")
        else:
            check(t is None, f"{label} slide {n}: untitled slide kept an empty title placeholder")
        for p in slide.placeholders:
            check(p.placeholder_format.type != PP_PLACEHOLDER.PICTURE, f"{label} slide {n}: unfilled picture placeholder")
            check(not p.has_text_frame or p.text_frame.text.strip(), f"{label} slide {n}: empty placeholder {p.name}")
        for shp in slide.shapes:
            check(in_bounds(shp, sw, sh), f"{label} slide {n}: {shp.name} off-slide")
            if house:
                check(shp.shape_type != MSO_SHAPE_TYPE.TEXT_BOX, f"{label} slide {n}: free textbox {shp.name} on house base")
        pics = [p for p in slide.shapes if p.shape_type == MSO_SHAPE_TYPE.PICTURE]
        want = {"figure": 1, "two-figures": 2, "image-text": 1}.get(s["layout"], 0)
        check(len(pics) == want, f"{label} slide {n}: {len(pics)} pictures, want {want}")
        for p in pics:
            descr = p._element.find(".//" + qn("p:cNvPr")).get("descr")
            check(bool(descr), f"{label} slide {n}: {p.name} has no alt text")
            check(len(svg_blips(slide.part)) == want, f"{label} slide {n}: svgBlip count")
            w = Image.open(io.BytesIO(p.image.blob)).width
            full = p.width > sw / 2
            check(w == (2400 if full else 1800), f"{label} slide {n}: PNG fallback {w}px wide (full={full})")
        if s["layout"] == "two-figures":
            check(pics[0]._element.find(".//" + qn("p:cNvPr")).get("descr") == "Custom alt", f"{label}: spec alt ignored")
        if s.get("notes"):
            check(slide.has_notes_slide and slide.notes_slide.notes_text_frame.text == s["notes"], f"{label} slide {n}: notes")
        check_fields(slide, n, s, label)
        check_kind(slide, s, label, house, sw)
        if s["layout"] == "bullets":
            body = [p for p in slide.placeholders if p.placeholder_format.idx == 1][0]
            check([(q.text, q.level) for q in body.text_frame.paragraphs] == [("a", 0), ("a.1", 1), ("b", 0)],
                  f"{label}: bullet levels")
    last = prs.slides[len(prs.slides) - 1]
    notes = last.notes_slide.notes_text_frame.text if last.has_notes_slide else ""
    check("- slide credit" in notes and "- deck credit" in notes and notes.startswith("Credits:"),
          f"{label}: slide + deck credits not in the last slide's notes")
    return prs


def fld(slide, typ):
    return [f for f in slide.shapes._spTree.iter(qn("a:fld")) if f.get("type") == typ]


def check_fields(slide, n, s, label):
    types = {p.placeholder_format.type: p for p in slide.placeholders}
    if s["layout"] in NO_FIELDS:
        check(not fld(slide, "slidenum") and PP_PLACEHOLDER.FOOTER not in types,
              f"{label} slide {n}: footer fields on a cover-style slide")
        return
    num = fld(slide, "slidenum")
    check(len(num) == 1 and num[0].findtext(qn("a:t")) == str(n) and num[0].get("id"),
          f"{label} slide {n}: native slide-number field missing/wrong")
    check(PP_PLACEHOLDER.SLIDE_NUMBER in types, f"{label} slide {n}: slide number not in a sldNum placeholder")
    check(types.get(PP_PLACEHOLDER.FOOTER) is not None and types[PP_PLACEHOLDER.FOOTER].text_frame.text == "Smoke footer",
          f"{label} slide {n}: footer text")
    check(len(fld(slide, "datetime1")) == 1, f"{label} slide {n}: live date field (date: auto)")


def check_kind(slide, s, label, house, sw):
    kind, tag = s["layout"], f"{label} {s['layout']}"
    texts = [p.text_frame.text for p in slide.placeholders if p.has_text_frame]
    if kind == "agenda":
        body = [p for p in slide.placeholders if p.placeholder_format.idx == 1][0]
        check([q.text for q in body.text_frame.paragraphs] == s["items"], f"{tag}: items")
        if house:
            check(body._base_placeholder._element.find(".//" + qn("a:buAutoNum")) is not None,
                  f"{tag}: layout lacks native auto-numbering")
    elif kind == "quote":
        joined = "\n".join(texts)
        check(s["quote"] in joined and "\u2014 " + s["attribution"] in joined, f"{tag}: quote/attribution")
    elif kind == "table":
        frames = [g for g in slide.shapes if getattr(g, "has_table", False) and g.has_table]
        check(len(frames) == 1, f"{tag}: one native table")
        if frames:
            tbl = frames[0].table
            got = [[c.text for c in r.cells] for r in tbl.rows]
            check(got == [s["header"]] + s["rows"], f"{tag}: cell text")
            fills = [tbl.cell(r, 0)._tc.find(f"{qn('a:tcPr')}/{qn('a:solidFill')}/{qn('a:schemeClr')}")
                     for r in range(len(tbl.rows))]
            vals = [f.get("val") if f is not None else None for f in fills]
            check(vals[0] == "accent6", f"{tag}: header strip not accent6 ({vals[0]})")
            check(vals[1] is None and vals[2] == "bg2", f"{tag}: zebra rows ({vals[1:3]})")
            check(all(p.placeholder_format.type != PP_PLACEHOLDER.TABLE for p in slide.placeholders),
                  f"{tag}: table placeholder left behind")
    elif kind == "kpi":
        if house:
            by = {p.placeholder_format.idx: p for p in slide.placeholders}
            check(by[13].text_frame.text == s["value"] and by[15].text_frame.text == s["label"], f"{tag}: value/label")
            chip = by[14]._element.spPr.find(qn("a:solidFill"))
            check(by[14].text_frame.text == s["delta"] and chip is not None and chip[0].get("val") == "accent4",
                  f"{tag}: negative delta chip must be accent4 (coral)")
            check(by[16].text_frame.text == "48 h" and 18 not in by, f"{tag}: stats filled / unused stats removed")
        else:
            check(any(s["value"] in t for t in texts), f"{tag}: --base fallback lost the hero value")
    elif kind == "image-text":
        pics = [p for p in slide.shapes if p.shape_type == MSO_SHAPE_TYPE.PICTURE]
        text = [p for p in slide.shapes if p.has_text_frame and p.text_frame.text.startswith("x")]
        check(pics and text and pics[0].left > text[0].left, f"{tag}: side=right must put the figure right of the text")
        check(pics and pics[0].left + pics[0].width <= sw, f"{tag}: mirrored figure off-slide")


def check_base(theme):
    path = os.path.join(ROOT, "templates", "deck", f"house-{theme}.pptx")
    prs = Presentation(path)
    label = f"house-{theme}"
    check((prs.slide_width, prs.slide_height) == (12192000, 6858000), f"{label}: not 13.333x7.5 in")
    check([l.name for l in prs.slide_layouts] == LAYOUT_NAMES, f"{label}: layout set")
    for l in prs.slide_layouts:
        kinds = {p.placeholder_format.type for p in l.placeholders}
        has = {PP_PLACEHOLDER.DATE, PP_PLACEHOLDER.FOOTER, PP_PLACEHOLDER.SLIDE_NUMBER} <= kinds
        cover = l.name in ("Title", "Section", "Closing")
        check(has != cover, f"{label} {l.name}: footer-field placeholders {'present' if has else 'missing'}")
    check(len(prs.slide_master.placeholders) == 5, f"{label}: master needs title/body/dt/ftr/sldNum")
    check_package(prs, label)
    master = prs.slide_master
    for owner in [master] + list(prs.slide_layouts):
        for shp in owner.shapes:
            check(in_bounds(shp, prs.slide_width, prs.slide_height), f"{label} {owner.name}: {shp.name} off-slide")
            if shp.shape_type == MSO_SHAPE_TYPE.PICTURE:
                check(shp._element.find(f".//{{{DECOR_NS}}}decorative") is not None, f"{label}: decor {shp.name} not flagged decorative")
    theme_xml = etree.fromstring(master.part.part_related_by(
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme").blob)
    acc1 = theme_xml.find(f".//{A}accent1/{A}srgbClr").get("val")
    check(acc1 == ("0D9488" if theme == "light" else "14B8A6"), f"{label}: accent1 {acc1}")
    for tag in ("majorFont", "minorFont"):
        f = theme_xml.find(f".//{A}{tag}")
        check(all(f.find(A + k) is not None for k in ("latin", "ea", "cs")) and f.find(A + "latin").get("typeface"),
              f"{label}: {tag} latin/ea/cs")
    clr = master._element.find(qn("p:clrMap"))
    check(clr.get("bg1") == ("lt1" if theme == "light" else "dk1"), f"{label}: clrMap bg1")
    title_latin = master._element.find(".//" + qn("p:titleStyle")).find(".//" + qn("a:latin")).get("typeface")
    check(title_latin == "+mj-lt", f"{label}: titleStyle font {title_latin}")


def run(args):
    return subprocess.run([sys.executable, BUILDER] + args, capture_output=True, text=True)


with tempfile.TemporaryDirectory(prefix="pptxdeck-test-") as tmp:
    spec = os.path.join(tmp, "spec.json")
    with open(spec, "w") as f:
        json.dump(SPEC, f)
    for theme in ("light", "dark"):
        check_base(theme)
        out = os.path.join(tmp, f"{theme}.pptx")
        r = run([spec, "-o", out, "--theme", theme])
        check(r.returncode == 0, f"build {theme}: {r.stderr.strip()}")
        if r.returncode == 0:
            check_deck(out, theme, house=True)

    # a 4:3 base with the stock Office layout names stands in for a corporate template
    import pptx
    corp = os.path.join(os.path.dirname(pptx.__file__), "templates", "default.pptx")
    out = os.path.join(tmp, "corp.pptx")
    r = run([spec, "-o", out, "--base", corp])
    check(r.returncode == 0, f"build --base: {r.stderr.strip()}")
    if r.returncode == 0:
        prs = check_deck(out, "corp", house=False)
        check([s.slide_layout.name for s in prs.slides] ==
              ["Title Slide", "Section Header", "Title Only", "Title Only", "Title and Content",
               "Title and Content", "Title and Content", "Title Only", "Title and Content", "Title Only", "Title Slide"],
              "corp: layout fallback by type")

    # bad specs fail loudly, not silently
    for bad, why in (({"slides": [{"layout": "poster", "title": "x"}]}, "unknown layout"),
                     ({"slides": [{"layout": "figure", "title": "x"}]}, "missing figure"),
                     ({"slides": [{"layout": "figure", "title": "x", "figure": "no-such-component"}]}, "unknown component"),
                     ({"slides": [{"layout": "table", "header": ["a", "b"], "rows": [["1"]]}]}, "ragged table row"),
                     ({"slides": [{"layout": "kpi", "value": "1", "stats": [{"value": "1"}] * 4}]}, "4 KPI stats"),
                     ({"slides": [{"layout": "agenda", "items": list("abcdefg")}]}, "7 agenda items"),
                     ({"slides": [{"layout": "image-text", "figure": "food-web", "side": "up", "text": "t"}]}, "bad side")):
        with open(spec, "w") as f:
            json.dump(bad, f)
        check(run([spec, "-o", os.path.join(tmp, "bad.pptx")]).returncode != 0, f"bad spec accepted: {why}")

    # proxy preview renders every slide (HTML only; screenshots need Chrome)
    spec_mod = importlib.util.spec_from_file_location("preview", os.path.join(ROOT, "bin", "pptx-preview.py"))
    preview = importlib.util.module_from_spec(spec_mod)
    spec_mod.loader.exec_module(preview)
    files = preview.render(os.path.join(tmp, "dark.pptx"), os.path.join(tmp, "preview"), screenshot=False)
    check(len(files) == len(SPEC["slides"]), "preview: one HTML per slide")
    check("data:image/svg+xml" in open(files[2]).read(), "preview: figure drawn from the embedded SVG")

    # preview treats the pptx as untrusted: hostile typeface/colour values must not reach the HTML
    evil = Presentation(os.path.join(tmp, "light.pptx"))
    run0 = evil.slides[0].shapes.title.text_frame.paragraphs[0].runs[0]._r
    rpr = run0.get_or_add_rPr()
    payload = '"></p><script>alert(1)</script>'
    etree.SubElement(etree.SubElement(rpr, qn("a:solidFill")), qn("a:srgbClr"), val="000000;}</style><script>x</script>")
    etree.SubElement(rpr, qn("a:latin"), typeface=payload)
    evil.save(os.path.join(tmp, "evil.pptx"))
    html_out = open(preview.render(os.path.join(tmp, "evil.pptx"), os.path.join(tmp, "evil"), screenshot=False)[0]).read()
    check("<script>alert" not in html_out and "<script>x" not in html_out, "preview: injected markup from pptx attributes")

print(f"  pptx deck: 2 house bases × 11 layouts + 3 decks (light, dark, --base 4:3) × {len(SPEC['slides'])} slides")
print(f"  TOTAL: {passed} passed · {failed} failed")
sys.exit(1 if failed else 0)
