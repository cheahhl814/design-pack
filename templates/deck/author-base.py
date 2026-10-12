#!/usr/bin/env python3
"""author-base.py: (re)author the house deck bases house-light.pptx / house-dark.pptx.

Run once per theme release; the outputs are committed binary assets and
bin/make-pptx-deck.py only ever opens them. Starts from python-pptx's default
template and patches its OOXML with lxml:

  - slide size 13.333 x 7.5 in (16:9); every placeholder re-authored at 16:9
    (python-pptx's default layouts are 4:3 and do not move when the size changes)
  - theme1.xml: library tokens -> dk1/lt1/dk2/lt2/accent1-6, theme fonts with
    latin/ea/cs set; dark = same layouts, flipped clrMap (bg1=dk1, tx1=lt1)
  - master: title + body placeholders, txStyles (title/body/other) pointing at
    +mj-*/+mn-* theme fonts, footer-strip decor
  - the 11 stock layouts re-authored as: Title, Section, Figure, Two Figures, Bullets
    (v0.18.0) + Agenda, Quote, Table, KPI, Image + Text, Closing (v0.19.0)
  - native date / footer / slide-number placeholders on the master and every
    inner layout (the builder fills them per slide)
  - decor from chrome/*.svg baked per theme and drawn onto the master/layouts
    (native SVG + PNG fallback, flagged decorative)

    python3 templates/deck/author-base.py      # writes templates/deck/house-{light,dark}.pptx
"""
import importlib.util, os, tempfile

from lxml import etree
from pptx import Presentation
from pptx.opc.constants import RELATIONSHIP_TYPE as RT
from pptx.oxml import parse_xml
from pptx.oxml.ns import qn

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("mpd", os.path.join(HERE, "..", "..", "bin", "make-pptx-deck.py"))
mpd = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(mpd)

PX = 9525  # EMU per px on the 1280x720 design grid (96 dpi)
NS = ('xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
      'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"')

# svg-library tokens -> theme colour slots (light values = library fallbacks;
# dark values = bin/svg-export.js dark palette, so baked figures sit seamlessly
# on the slide background)
ACCENTS = {"accent1": "0D9488", "accent2": "2C4A7C", "accent3": "F59E0B",
           "accent4": "EF4444", "accent5": "10B981", "accent6": "1A2744"}
THEMES = {
    "light": dict(dk1="0F172A", lt1="FFFFFF", dk2="64748B", lt2="F1F5F9", **ACCENTS,
                  hlink="0D9488", folHlink="2C4A7C"),
    "dark": dict(dk1="131820", lt1="F8FAFC", dk2="232A35", lt2="94A3B8",
                 **dict(ACCENTS, accent1="14B8A6"), hlink="14B8A6", folHlink="94A3B8"),
}
# Theme fonts: one typeface per slot, so pick ones every renderer has (Office
# Win/Mac/Online, Google Slides, LibreOffice via metric-compatible Liberation).
# ea stays empty on purpose: the per-script <a:font script="Jpan|Hans|..."> list
# below then picks a proper CJK face; a non-empty ea would force one face on all.
FONT_LATIN, FONT_CS = "Arial", "Arial"

GRP = ('<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
       '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>'
       '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>')


def bullet_lvl(n, marl, sz):
    return (f'<a:lvl{n}pPr marL="{marl}" indent="-285750" algn="l">'
            '<a:lnSpc><a:spcPct val="100000"/></a:lnSpc><a:spcBef><a:spcPts val="1000"/></a:spcBef>'
            '<a:buClr><a:schemeClr val="accent1"/></a:buClr><a:buFont typeface="Arial"/><a:buChar char="&#8226;"/>'
            f'{rpr(sz, "tx1")}</a:lvl{n}pPr>')


def rpr(sz=None, clr=None, b=None, font="mn", i=None):
    attrs = (f' sz="{sz}"' if sz else "") + (f' b="{b}"' if b is not None else "") + (f' i="{i}"' if i else "")
    fill = f'<a:solidFill><a:schemeClr val="{clr}"/></a:solidFill>' if clr else ""
    fonts = f'<a:latin typeface="+{font}-lt"/><a:ea typeface="+{font}-ea"/><a:cs typeface="+{font}-cs"/>'
    return f'<a:defRPr{attrs}>{fill}{fonts}</a:defRPr>'


def plain_lvl1(sz, clr, algn="l", b=None, font="mn", i=None, lnspc=None):
    """lvl1 paragraph props without bullets (subtitles, captions, quotes, stats)."""
    ln = f'<a:lnSpc><a:spcPct val="{lnspc}"/></a:lnSpc>' if lnspc else ""
    return (f'<a:lvl1pPr marL="0" indent="0" algn="{algn}">{ln}<a:buNone/>'
            f'{rpr(sz, clr, b, font, i)}</a:lvl1pPr>')


SLIDENUM = ('<a:fld id="{B6F15528-21DE-4FAA-801E-634DDDAF4B2B}" type="slidenum">'
            '<a:rPr lang="en-US"/><a:t>&#8249;#&#8250;</a:t></a:fld>')


def ph(sid, name, ph_attrs, box, anchor="t", lst="", prompt="", shape="", body=""):
    """Placeholder <p:sp>. shape = extra spPr children (geometry/fill); body = extra bodyPr attrs."""
    x, y, w, h = (v * PX for v in box)
    text = SLIDENUM if prompt == SLIDENUM else (f'<a:r><a:rPr lang="en-US"/><a:t>{prompt}</a:t></a:r>' if prompt else "")
    return (f'<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{name}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>'
            f'<p:nvPr><p:ph {ph_attrs}/></p:nvPr></p:nvSpPr>'
            f'<p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm>{shape}</p:spPr>'
            f'<p:txBody><a:bodyPr anchor="{anchor}"{body}><a:normAutofit/></a:bodyPr><a:lstStyle>{lst}</a:lstStyle>'
            f'<a:p>{text}<a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp>')


def glyph(sid, name, char, box, sz, clr):
    """Static (non-placeholder) native text shape on a layout, e.g. the quote mark."""
    x, y, w, h = (v * PX for v in box)
    return (f'<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{name}"/><p:cNvSpPr txBox="1"/><p:nvPr userDrawn="1"/></p:nvSpPr>'
            f'<p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm>'
            '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>'
            '<p:txBody><a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t"/><a:lstStyle/>'
            f'<a:p><a:r><a:rPr lang="en-US" sz="{sz}" b="1"><a:solidFill><a:schemeClr val="{clr}"/></a:solidFill>'
            f'<a:latin typeface="+mj-lt"/></a:rPr><a:t>{char}</a:t></a:r></a:p></p:txBody></p:sp>')


TITLE_BOX = (64, 36, 1152, 84)
TITLE_CORNER = (64, 36, 960, 84)       # leaves x 1040-1220 free for the molecule-corner decor
BODY_BOX = (64, 140, 1152, 520)
CAPTION = plain_lvl1(1400, "tx2", "ctr")
CORNER = ("molecule-corner", (1040, 28, 180, 90))
NO_INSET = ' lIns="0" tIns="0" rIns="0" bIns="0"'


def fields(first_id, master=False):
    """Native date / footer / slide-number placeholders. Master idx 2-4, layouts idx
    10-12 (PowerPoint's convention); the builder copies them onto inner slides."""
    idx = (2, 3, 4) if master else (10, 11, 12)
    return [
        ph(first_id, "Date Placeholder", f'type="dt" sz="half" idx="{idx[0]}"', (760, 684, 320, 24), "ctr",
           plain_lvl1(1000, "tx2", "r"), "Date", body=NO_INSET),
        ph(first_id + 1, "Footer Placeholder", f'type="ftr" sz="quarter" idx="{idx[1]}"', (64, 684, 640, 24), "ctr",
           plain_lvl1(1000, "tx2"), "Footer", body=NO_INSET),
        ph(first_id + 2, "Slide Number Placeholder", f'type="sldNum" sz="quarter" idx="{idx[2]}"',
           (1100, 684, 116, 24), "ctr", plain_lvl1(1000, "tx2", "r", b=1), SLIDENUM, body=NO_INSET),
    ]


AGENDA_LST = (
    '<a:lvl1pPr marL="640080" indent="-640080" algn="l">'
    '<a:lnSpc><a:spcPct val="100000"/></a:lnSpc><a:spcBef><a:spcPts val="1800"/></a:spcBef>'
    '<a:buClr><a:schemeClr val="accent1"/></a:buClr><a:buSzPct val="110000"/><a:buFont typeface="+mj-lt"/>'
    '<a:buAutoNum type="arabicPeriod"/>'
    f'{rpr(2400, "tx1", 1, "mj")}</a:lvl1pPr>')
CHIP = ('<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 50000"/></a:avLst></a:prstGeom>'
        '<a:solidFill><a:schemeClr val="accent5"/></a:solidFill>')
STAT_VAL = plain_lvl1(3600, "tx1", b=1, font="mj")
STAT_LBL = plain_lvl1(1600, "tx2")

# name -> (layout type or None for custom, showMasterSp, [(decor svg, box px)], shape xml list).
# Inner layouts (showMasterSp) also get the three footer-field placeholders.
LAYOUTS = [
    ("Title", "title", False, [("deck-title-art", (0, 0, 1280, 720))], [
        ph(2, "Title 1", 'type="ctrTitle"', (80, 214, 720, 200), "b",
           plain_lvl1(4400, "tx1", b=1, font="mj"), "Deck title"),
        ph(3, "Subtitle 2", 'type="subTitle" idx="1"', (80, 430, 720, 150), "t",
           plain_lvl1(2200, "tx2"), "Subtitle · author · date"),
    ]),
    ("Section", "secHead", False, [("section-divider-frame", (0, 0, 1280, 720))], [
        ph(2, "Title 1", 'type="title"', (500, 214, 700, 200), "b",
           plain_lvl1(4000, "tx1", b=1, font="mj"), "Section title"),
        ph(3, "Text 2", 'type="body" idx="1"', (500, 430, 700, 150), "t",
           plain_lvl1(2000, "tx2"), "What this section covers"),
    ]),
    ("Figure", None, True, [], [
        ph(2, "Title 1", 'type="title"', TITLE_BOX, "b", "", "Slide title"),
        ph(3, "Figure 2", 'type="pic" sz="quarter" idx="13"', (64, 136, 1152, 480), "ctr", "", "Figure"),
        ph(4, "Caption 3", 'type="body" sz="quarter" idx="14"', (64, 620, 1152, 40), "t", CAPTION, "Caption"),
    ]),
    ("Two Figures", None, True, [], [
        ph(2, "Title 1", 'type="title"', TITLE_BOX, "b", "", "Slide title"),
        ph(3, "Figure 2", 'type="pic" sz="quarter" idx="13"', (64, 186, 560, 315), "ctr", "", "Left figure"),
        ph(4, "Caption 3", 'type="body" sz="quarter" idx="14"', (64, 513, 560, 90), "t", CAPTION, "Left caption"),
        ph(5, "Figure 4", 'type="pic" sz="quarter" idx="15"', (656, 186, 560, 315), "ctr", "", "Right figure"),
        ph(6, "Caption 5", 'type="body" sz="quarter" idx="16"', (656, 513, 560, 90), "t", CAPTION, "Right caption"),
    ]),
    ("Bullets", "obj", True, [], [
        ph(2, "Title 1", 'type="title"', TITLE_BOX, "b", "", "Slide title"),
        ph(3, "Content 2", 'idx="1"', BODY_BOX, "t", "", "Bullet point"),
    ]),
    # v0.19.0 additions
    ("Agenda", None, True, [("agenda-helix-strip", (1060, 150, 160, 500))], [
        ph(2, "Title 1", 'type="title"', TITLE_CORNER, "b", "", "Agenda"),
        ph(3, "Agenda 2", 'type="body" idx="1"', (64, 150, 940, 500), "t", AGENDA_LST, "Agenda item"),
    ]),
    ("Quote", None, True, [CORNER], [
        ph(2, "Title 1", 'type="title"', (64, 36, 960, 60), "b",
           plain_lvl1(1600, "accent1", b=1, font="mj"), "Eyebrow"),
        glyph(3, "Quote Mark", "&#8220;", (96, 110, 110, 230), 12000, "accent1"),  # 120pt line fits 230px
        ph(4, "Quote 3", 'type="body" idx="1"', (200, 170, 900, 300), "ctr",
           plain_lvl1(3200, "tx1", i=1, lnspc=110000), "Quotation"),
        ph(5, "Attribution 4", 'type="body" sz="quarter" idx="13"', (200, 490, 900, 60), "t",
           plain_lvl1(1800, "tx2", b=1), "Name, role"),
    ]),
    ("Table", None, True, [CORNER], [
        ph(2, "Title 1", 'type="title"', TITLE_CORNER, "b", "", "Slide title"),
        ph(3, "Table 2", 'type="tbl" idx="13"', (64, 140, 1152, 500), "t", "", "Table"),
    ]),
    ("KPI", None, True, [CORNER, ("kpi-medallion", (64, 140, 420, 420))], [
        ph(2, "Title 1", 'type="title"', TITLE_CORNER, "b", "", "Slide title"),
        ph(3, "KPI Value 2", 'type="body" sz="quarter" idx="13"', (84, 246, 380, 136), "b",
           plain_lvl1(8000, "accent1", "ctr", b=1, font="mj"), "92%", body=NO_INSET),
        ph(4, "KPI Delta 3", 'type="body" sz="quarter" idx="14"', (194, 394, 160, 44), "ctr",
           plain_lvl1(1600, "dk1", "ctr", b=1), "+12 pts", shape=CHIP, body=NO_INSET),
        ph(5, "KPI Label 4", 'type="body" sz="quarter" idx="15"', (64, 576, 420, 50), "t",
           plain_lvl1(1600, "tx2", "ctr", b=1), "What the number measures"),
    ] + [p for k, y in enumerate((170, 330, 490)) for p in (
        ph(6 + 2 * k, f"Stat Value {k + 1}", f'type="body" sz="quarter" idx="{16 + 2 * k}"', (560, y, 656, 64), "b",
           STAT_VAL, "48 h"),
        ph(7 + 2 * k, f"Stat Label {k + 1}", f'type="body" sz="quarter" idx="{17 + 2 * k}"', (560, y + 66, 656, 40),
           "t", STAT_LBL, "Supporting stat"),
    )]),
    ("Image + Text", None, True, [CORNER], [
        ph(2, "Title 1", 'type="title"', TITLE_CORNER, "b", "", "Slide title"),
        ph(3, "Figure 2", 'type="pic" sz="quarter" idx="13"', (64, 140, 600, 480), "ctr", "", "Figure"),
        ph(4, "Text 3", 'type="body" idx="14"', (712, 150, 504, 470), "ctr", bullet_lvl(1, 285750, 2000), "Text"),
    ]),
    ("Closing", None, False, [("closing-orbit", (0, 0, 1280, 720)), ("accent-band", (0, 704, 1280, 16))], [
        ph(2, "Title 1", 'type="title"', (80, 240, 680, 170), "b",
           plain_lvl1(6000, "tx1", b=1, font="mj"), "Thank you"),
        ph(3, "Contact 2", 'type="body" idx="1"', (80, 440, 680, 170), "t",
           plain_lvl1(2000, "tx2", lnspc=120000), "Questions · email · website"),
    ]),
]


TX_STYLES = (
    f'<p:txStyles {NS}>'
    '<p:titleStyle><a:lvl1pPr algn="l"><a:lnSpc><a:spcPct val="90000"/></a:lnSpc><a:buNone/>'
    f'{rpr(3200, "tx1", 1, "mj")}</a:lvl1pPr></p:titleStyle>'
    '<p:bodyStyle>' + "".join(bullet_lvl(n, 285750 + (n - 1) * 457200, s)
                              for n, s in enumerate((2400, 2000, 1800, 1600, 1600), 1)) + '</p:bodyStyle>'
    f'<p:otherStyle><a:lvl1pPr>{rpr(1800, "tx1")}</a:lvl1pPr></p:otherStyle></p:txStyles>'
)


def patch_theme(prs, name):
    part = prs.slide_master.part.part_related_by(RT.THEME)
    root = etree.fromstring(part.blob)
    A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
    root.set("name", f"html-template-pack House {name.title()}")
    cs = root.find(f".//{A}clrScheme")
    cs.set("name", f"html-template-pack {name.title()}")
    for slot, hexv in THEMES[name].items():
        el = cs.find(A + slot)
        el.clear()
        etree.SubElement(el, A + "srgbClr", val=hexv)
    fs = root.find(f".//{A}fontScheme")
    fs.set("name", "html-template-pack")
    for tag in ("majorFont", "minorFont"):
        f = fs.find(A + tag)
        f.find(A + "latin").set("typeface", FONT_LATIN)
        f.find(A + "ea").set("typeface", "")
        f.find(A + "cs").set("typeface", FONT_CS)
    part._blob = etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


def decor(part, sp_tree, name, theme, box, work):
    svg = mpd.bake(os.path.join(HERE, "chrome", f"{name}.svg"), theme, work)
    mpd.add_svg_picture(part, sp_tree, svg, mpd.raster(svg, 2400), [v * PX for v in box],
                        name=f"Decor {name}", decorative=True, back=True)


def author(theme, out):
    work = tempfile.mkdtemp(prefix="pptxdeck-base-")
    prs = Presentation()
    prs.slide_width, prs.slide_height = 1280 * PX, 720 * PX
    patch_theme(prs, theme)

    master = prs.slide_master
    m = master._element
    if theme == "dark":
        m.find(qn("p:clrMap")).attrib.update(dict(bg1="dk1", tx1="lt1", bg2="dk2", tx2="lt2"))
    tree = m.cSld.spTree
    for child in list(tree)[2:]:
        tree.remove(child)
    for xml in [ph(2, "Title Placeholder 1", 'type="title"', TITLE_BOX, "b", "", "Slide title"),
                ph(3, "Text Placeholder 2", 'type="body" idx="1"', BODY_BOX, "t", "", "Bullet point")] + fields(4, True):
        tree.append(parse_xml(xml.replace("<p:sp>", f"<p:sp {NS}>", 1)))
    m.replace(m.find(qn("p:txStyles")), parse_xml(TX_STYLES))
    decor(master.part, tree, "footer-strip", theme, (0, 662, 1280, 20), work)

    layouts = list(prs.slide_layouts)
    for extra in layouts[len(LAYOUTS):]:
        prs.slide_layouts.remove(extra)
    assert len(layouts) == len(LAYOUTS), "python-pptx default template no longer has 11 layouts"
    for layout, (name, typ, show_master, arts, sps) in zip(layouts, LAYOUTS):
        attrs = (f' type="{typ}"' if typ else "") + ("" if show_master else ' showMasterSp="0"')
        sps = sps + (fields(50) if show_master else [])
        layout.part._element = parse_xml(
            f'<p:sldLayout {NS}{attrs} preserve="1"><p:cSld name="{name}"><p:spTree>{GRP}{"".join(sps)}'
            '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>')
        for art, box in reversed(arts):  # each is inserted at the back, so reverse keeps list order
            decor(layout.part, layout.part._element.cSld.spTree, art, theme, box, work)

    prs.core_properties.title = f"html-template-pack house deck ({theme})"
    prs.core_properties.author = "html-template-pack"
    prs.save(out)
    print(out)


if __name__ == "__main__":
    for t in ("light", "dark"):
        author(t, os.path.join(HERE, f"house-{t}.pptx"))
