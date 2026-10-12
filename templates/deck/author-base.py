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
  - the 11 stock layouts replaced by 5: Title, Section, Figure, Two Figures, Bullets
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


def rpr(sz=None, clr=None, b=None, font="mn"):
    attrs = (f' sz="{sz}"' if sz else "") + (f' b="{b}"' if b is not None else "")
    fill = f'<a:solidFill><a:schemeClr val="{clr}"/></a:solidFill>' if clr else ""
    fonts = f'<a:latin typeface="+{font}-lt"/><a:ea typeface="+{font}-ea"/><a:cs typeface="+{font}-cs"/>'
    return f'<a:defRPr{attrs}>{fill}{fonts}</a:defRPr>'


def plain_lvl1(sz, clr, algn="l", b=None, font="mn"):
    """lvl1 paragraph props without bullets (subtitles, captions)."""
    return (f'<a:lvl1pPr marL="0" indent="0" algn="{algn}"><a:buNone/>'
            f'{rpr(sz, clr, b, font)}</a:lvl1pPr>')


def ph(sid, name, ph_attrs, box, anchor="t", lst="", prompt=""):
    x, y, w, h = (v * PX for v in box)
    text = f'<a:r><a:rPr lang="en-US"/><a:t>{prompt}</a:t></a:r>' if prompt else ""
    return (f'<p:sp><p:nvSpPr><p:cNvPr id="{sid}" name="{name}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>'
            f'<p:nvPr><p:ph {ph_attrs}/></p:nvPr></p:nvSpPr>'
            f'<p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm></p:spPr>'
            f'<p:txBody><a:bodyPr anchor="{anchor}"><a:normAutofit/></a:bodyPr><a:lstStyle>{lst}</a:lstStyle>'
            f'<a:p>{text}<a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp>')


TITLE_BOX = (64, 36, 1152, 84)
BODY_BOX = (64, 140, 1152, 520)
CAPTION = plain_lvl1(1400, "tx2", "ctr")

# name -> (layout type or None for custom, showMasterSp, decor svg, placeholder xml list)
LAYOUTS = [
    ("Title", "title", False, "deck-title-art", [
        ph(2, "Title 1", 'type="ctrTitle"', (80, 214, 720, 200), "b",
           plain_lvl1(4400, "tx1", b=1, font="mj"), "Deck title"),
        ph(3, "Subtitle 2", 'type="subTitle" idx="1"', (80, 430, 720, 150), "t",
           plain_lvl1(2200, "tx2"), "Subtitle · author · date"),
    ]),
    ("Section", "secHead", False, "section-divider-frame", [
        ph(2, "Title 1", 'type="title"', (500, 214, 700, 200), "b",
           plain_lvl1(4000, "tx1", b=1, font="mj"), "Section title"),
        ph(3, "Text 2", 'type="body" idx="1"', (500, 430, 700, 150), "t",
           plain_lvl1(2000, "tx2"), "What this section covers"),
    ]),
    ("Figure", None, True, None, [
        ph(2, "Title 1", 'type="title"', TITLE_BOX, "b", "", "Slide title"),
        ph(3, "Figure 2", 'type="pic" sz="quarter" idx="13"', (64, 136, 1152, 480), "ctr", "", "Figure"),
        ph(4, "Caption 3", 'type="body" sz="quarter" idx="14"', (64, 624, 1152, 44), "t", CAPTION, "Caption"),
    ]),
    ("Two Figures", None, True, None, [
        ph(2, "Title 1", 'type="title"', TITLE_BOX, "b", "", "Slide title"),
        ph(3, "Figure 2", 'type="pic" sz="quarter" idx="13"', (64, 186, 560, 315), "ctr", "", "Left figure"),
        ph(4, "Caption 3", 'type="body" sz="quarter" idx="14"', (64, 513, 560, 90), "t", CAPTION, "Left caption"),
        ph(5, "Figure 4", 'type="pic" sz="quarter" idx="15"', (656, 186, 560, 315), "ctr", "", "Right figure"),
        ph(6, "Caption 5", 'type="body" sz="quarter" idx="16"', (656, 513, 560, 90), "t", CAPTION, "Right caption"),
    ]),
    ("Bullets", "obj", True, None, [
        ph(2, "Title 1", 'type="title"', TITLE_BOX, "b", "", "Slide title"),
        ph(3, "Content 2", 'idx="1"', BODY_BOX, "t", "", "Bullet point"),
    ]),
]


def bullet_lvl(n, marl, sz):
    return (f'<a:lvl{n}pPr marL="{marl}" indent="-285750" algn="l">'
            '<a:lnSpc><a:spcPct val="100000"/></a:lnSpc><a:spcBef><a:spcPts val="1000"/></a:spcBef>'
            '<a:buClr><a:schemeClr val="accent1"/></a:buClr><a:buFont typeface="Arial"/><a:buChar char="&#8226;"/>'
            f'{rpr(sz, "tx1")}</a:lvl{n}pPr>')


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
    for xml in (ph(2, "Title Placeholder 1", 'type="title"', TITLE_BOX, "b", "", "Slide title"),
                ph(3, "Text Placeholder 2", 'type="body" idx="1"', BODY_BOX, "t", "", "Bullet point")):
        tree.append(parse_xml(xml.replace("<p:sp>", f"<p:sp {NS}>", 1)))
    m.replace(m.find(qn("p:txStyles")), parse_xml(TX_STYLES))
    decor(master.part, tree, "footer-strip", theme, (0, 676, 1280, 36), work)

    layouts = list(prs.slide_layouts)
    for extra in layouts[len(LAYOUTS):]:
        prs.slide_layouts.remove(extra)
    for layout, (name, typ, show_master, art, sps) in zip(layouts, LAYOUTS):
        attrs = (f' type="{typ}"' if typ else "") + ("" if show_master else ' showMasterSp="0"')
        layout.part._element = parse_xml(
            f'<p:sldLayout {NS}{attrs} preserve="1"><p:cSld name="{name}"><p:spTree>{GRP}{"".join(sps)}'
            '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>')
        if art:
            decor(layout.part, layout.part._element.cSld.spTree, art, theme, (0, 0, 1280, 720), work)

    prs.core_properties.title = f"html-template-pack house deck ({theme})"
    prs.core_properties.author = "html-template-pack"
    prs.save(out)
    print(out)


if __name__ == "__main__":
    for t in ("light", "dark"):
        author(t, os.path.join(HERE, f"house-{t}.pptx"))
