# PPTX deck builder: house base + svg→pptx (v0.18.0)

A real PowerPoint deck whose figures are svg-library components, embedded as **native vector SVG**
(PowerPoint's `svgBlip` extension) with a high-res PNG fallback. All text stays **native and
editable**: titles in title placeholders, bullets in body placeholders, captions in caption
placeholders, speaker notes in the notes page. Use this when the deliverable is a `.pptx`, not an
HTML deck. For a reviewable HTML deck, use `templates/slide/`.

```
templates/deck/
├── README.md            ← you are here
├── house-light.pptx     ← house base (committed binary; built by author-base.py)
├── house-dark.pptx      ← same layouts, dark colour map
├── author-base.py       ← one-time OOXML author script for the two bases
└── chrome/              ← deck decor SVGs (title art, section frame, footer strip)
bin/make-pptx-deck.py    ← the builder (spec → .pptx)
bin/pptx-preview.py      ← proxy preview (pptx → HTML → headless-Chrome PNGs)
test/smoke-test-pptx-deck.py  ← structural QA (wired into test/run-all.js)
```

## Install (optional Python deps, deck builder only)

```
pip install python-pptx lxml cairosvg pillow     # PyYAML too if you want .yaml specs
```

`node` (for `bin/svg-export.js`) and, for previews, `google-chrome`/`chromium` must be on `PATH`.
The HTML templates do not need any of this.

## Build a deck

```
python3 bin/make-pptx-deck.py spec.json -o deck.pptx [--theme light|dark] [--base corp.pptx]
```

```json
{
  "title": "Ecosystems in five slides",
  "theme": "light",
  "slides": [
    {"layout": "title", "title": "How ecosystems move energy", "subtitle": "Team · 2026-10-13",
     "notes": "Speaker notes go to the notes page."},
    {"layout": "section", "title": "Energy flow", "subtitle": "Food webs and trophic levels"},
    {"layout": "figure", "title": "Who eats whom", "figure": "food-web",
     "caption": "Arrows point from food to feeder.", "alt": "optional; defaults to the SVG aria-label"},
    {"layout": "two-figures", "title": "Water and ocean structure",
     "figures": [{"svg": "water-cycle", "caption": "Water cycle"},
                 {"svg": "my-edited/ocean-zones.svg", "caption": "Ocean zones", "alt": "..."}]},
    {"layout": "bullets", "title": "Takeaways",
     "bullets": ["Energy flows one way", ["~10% per trophic level"], "Matter cycles"]}
  ]
}
```

- A figure is an svg-library **component name** or a **path to a `.svg`** (e.g. a copy with edited
  labels). The builder bakes it for the deck theme with `bin/svg-export.js`, so the file can be the
  token-driven original. Figures are contain-fitted (aspect kept, centred) into the layout's picture
  rectangle.
- The PNG fallback is rendered with cairosvg at 2400 px wide for full-width figures and 1800 px for
  half-width ones.
- Alt text goes on the picture (`cNvPr@descr`). It defaults to the SVG's `aria-label`.
- Placeholders you do not fill (e.g. a section with no subtitle) are removed, so nothing reads
  "Click to add text".
- Bad specs fail loudly: unknown layout, wrong figure count, unknown component.

## House layouts (13.333 × 7.5 in, 16:9)

| `layout` | House layout | Placeholders | Decor |
|---|---|---|---|
| `title` | Title (`type="title"`) | centre title, subtitle | `deck-title-art` (master decor hidden) |
| `section` | Section (`type="secHead"`) | title, subtitle | `section-divider-frame` (master decor hidden) |
| `figure` | Figure | title, picture (idx 13), caption (idx 14) | footer strip |
| `two-figures` | Two Figures | title, 2 pictures (idx 13/15), 2 captions (idx 14/16) | footer strip |
| `bullets` | Bullets (`type="obj"`) | title, body (5 bullet levels) | footer strip |

**Theme.** Library tokens map onto theme slots: `accent1` teal, `accent2` deep-blue, `accent3` amber,
`accent4` coral, `accent5` green, `accent6` navy. `dk2`/`lt2` hold muted text and the light-grey
surface.
- The dark base keeps the same layouts and flips the master colour map (`bg1=dk1`, `tx1=lt1`).
- Its background is `#131820`, the same colour `svg-export --theme dark` paints behind figures, so
  dark figures sit seamlessly on the slide.

**Fonts.** Theme fonts are Arial (latin + cs). Every text style points at `+mj-*`/`+mn-*` theme
fonts, so a rebrand is a single edit in Design → Variants → Fonts. `ea` is left empty on purpose: the
per-script `<a:font script="Jpan|Hans|Hant|Hang">` list then picks a proper CJK face.

**Chrome.** The decor SVGs live in `chrome/`, **outside the component catalog**: they are slide
chrome, not diagrams. They follow the svg-library conventions (token-driven, id-free, offset-shadow
hand-drawn style) on a 1280×720 canvas (1 px = 9525 EMU). They are drawn once onto the master and
layouts, flagged decorative for screen readers, and never repeated per slide. After editing one,
rerun `python3 templates/deck/author-base.py` and commit both `.pptx` files.

## Corporate templates (`--base`)

`--base corp.pptx` builds on someone else's template. Its existing slides are dropped. Each slide kind
picks a layout in this order:
1. by house name;
2. by OOXML layout type: `title`, `secHead`, `titleOnly` for figures, `obj` for bullets;
3. any layout with a title placeholder.

Without picture placeholders, figures fill the area below the title, and captions become textboxes
under each figure. Save `.potx` templates as `.pptx` first; python-pptx refuses the template content
type.

## QA: three layers

1. **Structural (automated):** `python3 test/smoke-test-pptx-deck.py`, also run by
   `node test/run-all.js`. It reloads light, dark and `--base` (4:3) decks with python-pptx and
   checks:
   - every `svgBlip` resolves to an `image/svg+xml` part (baked, PNG blip alongside);
   - titles sit in real title placeholders, and there are no free textboxes on house decks;
   - no empty or unfilled placeholders, and nothing off-slide (slides, layouts, master);
   - alt text on every figure and the decorative flag on every decor picture;
   - notes, bullet levels and fallback PNG widths;
   - the bases' size, layout set, accents, `clrMap`, and latin/ea/cs fonts.
2. **Proxy preview (automated render, human eyeball):**
   `python3 bin/pptx-preview.py deck.pptx --out DIR`. It rebuilds each slide as HTML at EMU→px:
   - master/layout decor, the embedded SVGs, and text with sizes, colours, bullets and alignment
     resolved through the placeholder inheritance chain;
   - a headless-Chrome screenshot of every slide;
   - a red dashed outline on any text that overflows its box.

   It is a **proxy**: PowerPoint's autofit, line breaking, kerning and font substitution differ. Use
   it to catch composition bugs, not to sign off typography.
3. **Real-renderer check: manual, once per theme release, NOT automated.** No Office or LibreOffice
   runs in CI. Whenever the house bases or chrome change:
   - open a sample deck in **PowerPoint Online** (native SVG path);
   - open it in **Google Slides** (it ignores `svgBlip`, so this tests the PNG fallback);
   - optionally convert it with **LibreOffice** (`soffice --headless --convert-to pdf`; its
     `svgBlip` support is unverified, so assume the PNG).

   Record the date and result in the release notes. Decks built from an unchanged base do not need
   this gate.

## Known pitfalls (already handled; keep them handled)

- python-pptx **cannot create layouts or masters**. That is why `author-base.py` patches XML once
  and the bases are committed.
- Its default layouts are **4:3**, and setting `slide_width` does not move placeholders. Every
  placeholder here is re-authored at 16:9.
- `placeholder.insert_picture()` **crops to fill**. The builder reads the picture placeholder's
  rectangle, contain-fits the figure into it, and removes the placeholder.
- `font.name` in python-pptx sets only `a:latin`, so CJK runs fall back to the `ea` face. The builder
  never hard-codes font names.
- PowerPoint's SVG renderer has no CSS variables, no `color-mix()`, and patchy `<style>`/filter
  support. That is why figures are always baked first.
- Figure labels use Outfit/Inter with fallbacks down to Arial. On machines without those fonts the
  labels are substituted (PowerPoint) or were rasterised with the build machine's fonts (PNG
  fallback).
