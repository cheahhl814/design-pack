# PPTX deck builder: house base + svg→pptx (v0.19.0)

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
     "bullets": ["Energy flows one way", ["~10% per trophic level"], "Matter cycles"]},
    {"layout": "agenda", "items": ["Where we stand", "What the data says", "Decisions"]},
    {"layout": "quote", "title": "From the board", "quote": "Kill bad programmes early.",
     "attribution": "Dr. A. Anand, CSO"},
    {"layout": "table", "title": "Programme snapshot", "header": ["Programme", "Stage", "Lead"],
     "rows": [["QT-101", "Phase 1", "Anand"], ["QT-204", "IND-enabling", "Okafor"]]},
    {"layout": "kpi", "title": "Screening got faster", "value": "92%", "label": "hit confirmation rate",
     "delta": "+12 pts", "stats": [{"value": "48 h", "label": "turnaround"}]},
    {"layout": "image-text", "title": "How a CRISPR edit works", "figure": "crispr-editing",
     "side": "right", "bullets": ["Guide RNA finds the target", "Cas9 cuts"],
     "credits": "Mechanism after Addgene's CRISPR guide"},
    {"layout": "closing", "contact": ["Questions are welcome", "team@example.org"]}
  ],
  "footer": "Ecosystems in five slides",
  "date": "auto",
  "slide_numbers": true,
  "credits": ["Deck-level credit lines (e.g. CC-BY attributions) go to the last slide's notes"]
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
- **Slot rules for the v0.19.0 kinds:**
  - `agenda`: 1–6 `items` (designed for 3–6), numbered natively with `buAutoNum`, so the numbers
    renumber themselves when edited. The title defaults to "Agenda".
  - `quote`: `quote` is required. `attribution` is shown as "— Name". `title` is an optional
    eyebrow line.
  - `table`: `header` takes 1–8 columns and `rows` 1–12 rows of exactly that width. The result is a
    native pptx table with a navy (`accent6`) header strip and `bg2` zebra rows, all theme slots, so
    it follows light/dark and a rebrand.
  - `kpi`: `value` is required. `label` and `delta` are optional, plus up to 3 `stats`
    (`{value, label}`). The delta chip is a rounded placeholder whose fill follows the sign:
    `+`/▲ green (`accent5`), `-`/−/▼ coral (`accent4`), anything else amber (`accent3`).
  - `image-text`: one `figure`, `side` `left` (default) or `right` (the builder mirrors the
    layout), and `bullets` (list) or `text` (one unbulleted paragraph).
  - `closing`: `contact` takes a string or a list of lines. The title defaults to "Thank you".
- **Footer fields (deck level):**
  - `footer` is the text to show; `date` is a fixed string or `"auto"` for a live date field.
  - `slide_numbers` is on by default and writes a live `slidenum` field.
  - They go into native date / footer / slide-number placeholders on every inner slide. Title,
    section and closing slides carry none.
- **Credits:**
  - Slide-level `credits` (a string or a list) are appended to that slide's notes under
    "Credits:".
  - Deck-level `credits` go to the last slide's notes.
- Bad specs fail loudly: unknown layout, wrong figure count, unknown component, a ragged table row,
  more than 3 KPI stats or 6 agenda items, a bad `side`.

## House layouts (13.333 × 7.5 in, 16:9)

| `layout` | House layout | Placeholders | Decor |
|---|---|---|---|
| `title` | Title (`type="title"`) | centre title, subtitle | `deck-title-art` (master decor hidden) |
| `section` | Section (`type="secHead"`) | title, subtitle | `section-divider-frame` (master decor hidden) |
| `figure` | Figure | title, picture (idx 13), caption (idx 14) | footer strip |
| `two-figures` | Two Figures | title, 2 pictures (idx 13/15), 2 captions (idx 14/16) | footer strip |
| `bullets` | Bullets (`type="obj"`) | title, body (5 bullet levels) | footer strip |
| `agenda` | Agenda | title, auto-numbered body (idx 1) | `agenda-helix-strip` + footer strip |
| `quote` | Quote | eyebrow title, quote (idx 1, italic 32 pt), attribution (idx 13); static native “ glyph | `molecule-corner` + footer strip |
| `table` | Table | title, table placeholder (idx 13; the builder replaces it with a native table) | `molecule-corner` + footer strip |
| `kpi` | KPI | title, hero value (idx 13), delta chip (idx 14), label (idx 15), 3 × stat value/label (idx 16–21) | `kpi-medallion` + `molecule-corner` + footer strip |
| `image-text` | Image + Text | title, picture (idx 13), text (idx 14) | `molecule-corner` + footer strip |
| `closing` | Closing | title, contact lines (idx 1) | `closing-orbit` + `accent-band` (master decor hidden) |

Every inner layout (all except Title, Section and Closing) also carries native **date (idx 10),
footer (idx 11) and slide-number (idx 12)** placeholders under the footer strip. The master carries
them at idx 2–4.

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
chrome, not diagrams. The v0.18.0 set is `deck-title-art`, `section-divider-frame` and
`footer-strip` (slimmed in v0.19.0 so the footer fields fit below it). The v0.19.0 science set adds
`molecule-corner`, `agenda-helix-strip`, `kpi-medallion`, `closing-orbit` and `accent-band`.
Their composition takes cues from a 24-layout lab-science theme on ppt-design.com, used as a
reference only; no assets were used. They follow the svg-library conventions (token-driven, id-free, offset-shadow
hand-drawn style) on a 1280×720 canvas (1 px = 9525 EMU). They are drawn once onto the master and
layouts, flagged decorative for screen readers, and never repeated per slide. After editing one,
rerun `python3 templates/deck/author-base.py` and commit both `.pptx` files.

## Corporate templates (`--base`)

`--base corp.pptx` builds on someone else's template. Its existing slides are dropped. Each slide kind
picks a layout in this order:
1. by house name;
2. by OOXML layout type: `title` (title, closing), `secHead`, `titleOnly` (figures, table,
   image-text), `obj` (bullets, agenda, quote, KPI);
3. any layout with a title placeholder.

Without picture placeholders, figures fill the area below the title, and captions become textboxes
under each figure.
- Image + text splits the area into a figure half and a textbox half.
- Tables go below the title.
- Quote and KPI degrade to plain lines in the body placeholder.
- Corporate layouts that have date / footer / slide-number placeholders get them filled too. Save `.potx` templates as `.pptx` first; python-pptx refuses the template content
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
   - the bases' size, layout set, accents, `clrMap`, and latin/ea/cs fonts;
   - per-kind slots (v0.19.0): agenda auto-numbering, quote + attribution, table cells / header
     strip / zebra fills, KPI value / label / chip colour by sign / unused stats removed, image-text
     mirroring;
   - live `slidenum` fields matching the slide index, footer text, a live date field, footer-field
     placeholders present on exactly the inner layouts, and slide + deck credits in the notes;
   - bad-spec fixtures that must be rejected.

   The suite was verified to fail on mutants (old v0.18.0 bases, a builder with no footer fields, an
   always-green delta chip).
2. **Proxy preview (automated render, human eyeball):**
   `python3 bin/pptx-preview.py deck.pptx --out DIR`. It rebuilds each slide as HTML at EMU→px:
   - master/layout decor, the embedded SVGs, and text with sizes, colours, bullets (incl.
     auto-numbering), fills/rounded chips and alignment resolved through the placeholder inheritance
     chain;
   - native tables;
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
