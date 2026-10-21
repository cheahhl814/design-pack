# svg-slides: slide designs in theme sets + slot-marker composer (v0.21.0; backgrounds v0.22.0; theme sets v0.24.0)

Whole **slide designs** drawn as SVG in the svg-library look (rounded cards, misregistered-print
offset copies, token-driven colour), with **slots** marked for text and for svg-library graphics.
`bin/compose-slide.js` fills the slots and bakes ONE renderer-safe SVG slide.

A second category, **background designs** (`bg-*`, v0.22.0), are slot-free full-bleed stages for
graphic-only or text slides (see *Background designs*).

Use this when a deck needs real slide **design**, not just layout chrome. For plain bullet decks the
HTML slide template (`templates/slide/`) stays the right choice.

**Theme sets (v0.24.0).** The designs come in five sets that share one slot contract. Pick one with
`--set`. A payload written for one set re-themes the whole deck in another, as long as its lines
fit that set's budgets (the composer gates them).

| Set | Look | Slot tables |
|---|---|---|
| `lab` (default) | hand-drawn science: rounded offset cards, teal + amber, helix / molecule / orbit motifs | this README |
| `swiss` | International Typographic Style: 12-column grid, one grotesque, red colour-block title / statement / closing slides, black rules | [`sets/swiss/README.md`](sets/swiss/README.md) |
| `boardroom` | generic consulting: navy + one bright accent, serif titles over sans body, thin title rule, agenda tracker, 60:40 chart + insight | [`sets/boardroom/README.md`](sets/boardroom/README.md) |
| `editorial` | magazine: cream paper, brown serif headlines, terracotta accent, hairline and double rules, pull-quote, old-style numerals | [`sets/editorial/README.md`](sets/editorial/README.md) |
| `bold` | bold geometric: saturated violet / amber / coral / blue fields, flat polygons, Arial Black display type | [`sets/bold/README.md`](sets/bold/README.md) |

Every set ships the six slide designs below under the same names, with lab's slot names, kinds,
required flags and line counts (the tests enforce it), plus its own backgrounds (lab 8, the others 2).
Character budgets follow each set's fonts, and a test fills every slot to its budget and measures it in
Chrome. Each set's `set.json` holds its light and dark palette and its font pair. The composer bakes
those over the svg-bake.js THEMES defaults, so inlined svg-library components take the set's colours too.
Token names are palette slots, not hues: `--teal` is a set's primary (red in swiss, navy in
boardroom). The generated sets add `--block` / `--on-block` (colour-block fill and the text on it).

**Generated, not hand-drawn.** Lab is hand-drawn. The swiss, boardroom, editorial and bold designs,
their `set.json` and their READMEs are written by `bin/draw-slide-sets.js`, which places every preview
line by the layout rule and fails a sample that is over budget. Edit the script and re-run it; never
hand-edit those `.svg` files, because the tests diff them against a fresh run.

```
templates/svg-slides/
├── README.md       ← you are here (conventions, lab catalog, workflow)
├── gallery.html    ← GENERATED preview: every set, every design composed with its sample (theme toggle)
├── samples.json    ← one sample payload per slide design, shared by every set (gallery + tests)
└── sets/<set>/
    ├── set.json    ← label, description, palette (light/dark) and fonts (lab: defaults, none set)
    ├── README.md   ← generated sets: palette, catalog and slot tables (lab's are below)
    └── designs/*.svg ← CANONICAL design files (slot-marked; backgrounds are bg-*)
bin/compose-slide.js        ← the composer (--set picks the set)
bin/draw-slide-sets.js      ← draws the swiss / boardroom / editorial / bold sets
bin/svg-bake.js             ← token → hex bake logic, shared with bin/svg-export.js
bin/build-slides-gallery.js ← regenerates gallery.html
test/smoke-test-slides.py   ← set contract + design QA + composer gates + budget fit (in test/run-all.js)
test/slides-fit.js          ← the budget-fill page the fit check measures in Chrome
```

## Workflow

```
# 1. pick a design (gallery.html or the catalog below), write a payload
cat > payload.json <<'EOF'
{ "heading": "Four stages from sample to result",
  "body": ["Each chip runs the same four stages.", "Lysis and extraction happen on the card."],
  "figure": "flow-pipeline" }
EOF

# 2. compose: one SVG slide
node bin/compose-slide.js content-two-col --payload payload.json --theme light --out slides/
#  → slides/content-two-col.svg   finished slide, colours baked to hex, 1280×720

# 3. the same payload in another set (--name keeps both)
node bin/compose-slide.js content-two-col --set editorial --payload payload.json --out slides/ --name editorial-two-col
```

**Payload.** Keys are slot names. A **text** slot takes a string (one line) or an array of strings
(one per line). A **graphic** slot takes an svg-library component name (`flow-pipeline`) or a path to
an `.svg` (token-driven or already baked; it must be id-free). Optional slots can be left out; their
preview text then disappears.

**Lines are yours to break.** SVG has no text wrapping (SVG 2 `inline-size` is not implemented by
browsers), so the composer never wraps: it places one `<text>` per payload
line and **fails** when a line is over its slot's character budget or there are too many lines.

## Gates (exit 1; the message starts with the gate and names the slot)

| Gate | Fires when |
|---|---|
| `DESIGN-UNKNOWN` | the set is unknown, or the design name is not in `sets/<set>/designs/` (the message lists the known ones) |
| `DESIGN-INVALID` | slot markup is broken: duplicate slot, box outside the canvas, missing budget, unknown kind; a slot design with no slots or a decor-only background with any; or the file breaks the svg-library hard rules |
| `PAYLOAD-MALFORMED` | the payload is not a JSON object, a text slot is not a string / string array, a graphic slot is not a string |
| `SLOT-UNKNOWN` | a payload key matches no slot |
| `SLOT-MISSING` | a required slot has no payload |
| `TEXT-OVERFLOW` | a line is longer than `data-slot-maxchars`, or there are more lines than `data-slot-maxlines` |
| `GRAPHIC-UNREADABLE` | a graphic is neither a library name nor a readable `.svg` with a viewBox, or it has `id=` |
| `BAKE-LEFTOVER` | `var(`, `color-mix(` or `data-slot` survived into a composed file |

## Conventions (hard rules)

All [svg-library rules](../../features/graphics/svg-library/README.md#conventions-baked-into-every-file-hard-rules)
apply: inline SVG, **no `id` / `<defs>` / `<marker>` / `<filter>` / `<mask>` / `<pattern>` /
`<clipPath>` / `<script>`**, colour as `var(--token,#fallback)` inside `style` only, tints with
`color-mix(in srgb, …)`, `--navy` / `--deep-blue` and coloured text pulled toward `--text`, root
`role="img"` + `aria-label` + `<title>`, the svg-bake.js THEMES light defaults. On top of that:

1. **Canvas `viewBox="0 0 1280 720"`** (default; `info-*` / `card-*` designs declare another with `data-canvas`, see below) (16:9, 1 px = 9525 EMU on the house bases). The design paints
   its own background (`fill:var(--surface,#ffffff)` or a tint of it), so a dark bake is dark edge to
   edge.
2. **Slots are `<g data-slot="name">` groups, never ids.** Library components are inlined into designs,
   and one slide may hold several, so ids would collide. Slot markers sit on `<g>` only and are pure
   metadata: deleting every `data-slot-*` attribute must not change what the browser draws. The
   composer strips them from its output; the design files keep them.
3. **Every slot declares its zone:** `data-slot-box="x y w h"` (positive, inside the design's canvas) and
   `data-slot-kind` (`text` or `graphic`). Add `data-slot-optional="true"` if the slide still works
   without it.
4. **Text slots declare their type and budget:**

   | Attribute | Values | Meaning |
   |---|---|---|
   | `data-slot-font` | `head` \| `sans` | `var(--font-head)` / `var(--font-sans)` |
   | `data-slot-weight` | 400–800 | font weight |
   | `data-slot-size` | px | font size |
   | `data-slot-maxlines` | ≥ 1 | line budget |
   | `data-slot-maxchars` | ≥ 1 | character budget **per line** (the gate counts code points) |
   | `data-slot-anchor` | `start` \| `middle` \| `end` | x = box left / centre / right |
   | `data-slot-fill` | token expression | e.g. `var(--text,#0f172a)`; baked to hex |
   | `data-slot-tracking` | px (optional) | letter-spacing, e.g. `1.2` on eyebrows (write them in caps yourself) |

   Size the box to hold the budget: `h ≥ size × 1.25 × maxlines`.
5. **One layout rule for text**, used by the composer, by the preview text in every design, and checked
   by the tests: **first baseline = box top + size × 1.15**, each further line **+ size × 1.25**,
   coordinates rounded to 0.1 px.
6. **Every design is a complete, presentable slide on its own.** Text slots hold preview text written
   at the rule above. Graphic slots hold a dashed hint frame and a "GRAPHIC SLOT" label, so the raw
   design previews like a library component.
7. **Graphic slots** receive the component as a nested
   `<svg x y width height viewBox="0 0 800 450" data-component="name">`. The default
   `preserveAspectRatio` (`xMidYMid meet`) keeps the aspect ratio and centres the component, so
   letterboxing inside the slot is expected. The 800 × 450 library components scale up cleanly.

## Catalog

| # | Design | What it is | Motif |
|---|---|---|---|
| 1 | `title-hero` | Cover: eyebrow, 2-line hero title, subtitle, meta row | DNA helix strip along the bottom, dot field top right |
| 2 | `section-break` | Chapter divider: oversized tinted number on a panel, section title, orientation line | molecule ring top right, dotted rule |
| 3 | `big-statement` | Centred 3-line takeaway on a tinted card, attribution | quote glyph astride the card, corner brackets |
| 4 | `content-two-col` | Heading, body card + key-point callout left (full height), framed graphic + caption right | accent underline, offset cards |
| 5 | `full-diagram` | Heading over a large graphic panel, takeaway rail card on the right | soft panel, amber rail marker |
| 6 | `closing` | Thanks / summary title, contact lines, meta line | orbit rings around a node network |

Budgets are per line. `head 54/700` means the heading font at 54 px, weight 700.

### `title-hero`
| Slot | Kind | Box (x y w h) | Type | Budget | Required |
|---|---|---|---|---|---|
| `eyebrow` | text | 80 168 720 20 | head 14/700 tracked, start | 1 × 48 ch | yes |
| `hero-title` | text | 80 214 1120 140 | head 54/700, start | 2 × 38 ch | yes |
| `subtitle` | text | 80 380 900 60 | sans 22/400 muted, start | 2 × 72 ch | yes |
| `meta` | text | 80 486 900 22 | head 16/600, start | 1 × 80 ch | optional |

### `section-break`
| Slot | Kind | Box (x y w h) | Type | Budget | Required |
|---|---|---|---|---|---|
| `number` | text | 110 196 360 280 | head 220/800 tinted teal, middle | 1 × 2 ch | yes |
| `eyebrow` | text | 580 246 620 20 | head 14/700 tracked, start | 1 × 44 ch | optional |
| `section-title` | text | 580 284 620 130 | head 48/700, start | 2 × 24 ch | yes |
| `orientation` | text | 580 440 620 30 | sans 22/400 muted, start | 1 × 52 ch | yes |

### `big-statement`
| Slot | Kind | Box (x y w h) | Type | Budget | Required |
|---|---|---|---|---|---|
| `eyebrow` | text | 160 132 960 20 | head 14/700 tracked, middle | 1 × 48 ch | optional |
| `statement` | text | 160 196 960 150 | head 38/600, middle | 3 × 46 ch | yes |
| `attribution` | text | 160 410 960 26 | sans 18/500 muted, middle | 1 × 70 ch | optional |

### `content-two-col`
| Slot | Kind | Box (x y w h) | Type | Budget | Required |
|---|---|---|---|---|---|
| `eyebrow` | text | 80 52 700 20 | head 14/700 tracked, start | 1 × 56 ch | optional |
| `heading` | text | 80 80 1120 54 | head 40/700, start | 1 × 48 ch | yes |
| `body` | text | 88 196 552 210 | sans 24/400, start | 6 × 46 ch | yes |
| `callout` | text | 96 476 540 60 | head 20/600, start | 2 × 50 ch | optional |
| `figure` | graphic | 700 186 520 364 | svg-library component, contain-fit | — | yes |
| `caption` | text | 700 580 520 40 | sans 14/400 muted, start | 2 × 70 ch | optional |

### `full-diagram`
| Slot | Kind | Box (x y w h) | Type | Budget | Required |
|---|---|---|---|---|---|
| `eyebrow` | text | 50 34 600 20 | head 14/700 tracked, start | 1 × 48 ch | optional |
| `heading` | text | 50 58 1180 48 | head 36/700, start | 1 × 60 ch | yes |
| `figure` | graphic | 50 134 880 508 | svg-library component, contain-fit (≈ 880 × 495) | — | yes |
| `takeaway` | text | 984 200 240 340 | head 20/600, rail card, start | 6 × 24 ch | optional |

### `closing`
| Slot | Kind | Box (x y w h) | Type | Budget | Required |
|---|---|---|---|---|---|
| `title` | text | 80 246 660 160 | head 60/700, start | 2 × 20 ch | yes |
| `contact` | text | 80 430 660 84 | sans 22/400, start | 3 × 50 ch | yes |
| `meta` | text | 80 560 660 22 | sans 16/400 muted, start | 1 × 80 ch | optional |

Budgets are set from the box width at an average glyph advance of about 0.52 em (head) or 0.5 em
(sans), with slack for fallback fonts. Text-budget sizing follows the getdeck.co layout
archetypes. Composition takes cues from ppt-design.com's master-layout set (cover, section, takeaway,
quote, content, thank-you) and from the former v0.19.0 PPTX deck chrome (removed in v0.23.0), whose
helix, molecule ring and orbit motifs were re-drawn slot-ready here. No external assets are used.

## Infographics and info cards (v0.28.0)

Two lab-only design families for single-page information graphics. They share the slot contract, the
gates and the conventions above; the one difference is the **canvas**. A design declares it with
`data-canvas="0 0 W H"` on its `<svg>` root (the `viewBox` must match); without the attribute the canvas is
`0 0 1280 720`. Slot boxes are checked against the design's own canvas, and the composed file takes its
`width` / `height` from it. They are not slide designs: the other four sets do not ship them, and the
gallery lists them under *Infographics* (`info-*`) and *Info cards* (`card-*`).

| # | Design | Canvas | What it is |
|---|---|---|---|
| 1 | `info-tall-web` | 800 × 2000 | long-scroll web infographic: header band, four section bands (stat row, numbered process, text + figure, full-width figure), sources footer |
| 2 | `info-a4-print` | 794 × 1123 (A4, 96 dpi) | poster: header, three columns (text + bullets, stat + chart stack, five findings), sources and citation strip; 48 px print margins |
| 3 | `info-social-45` | 1080 × 1350 (4:5) | feed card: title, hero stat, four-row listicle, takeaway; top 120 px / bottom 180 px safe zones |
| 4 | `card-a6-print` | 397 × 560 (A6, 96 dpi) | recipe-style card: narrow list column + figure, numbered steps, note, citation strip, 8 px inner border |
| 5 | `card-social-45` | 1080 × 1350 (4:5) | pull-quote card: big quote, attribution, two stat chips; same safe zones |

The `print` designs are ink-friendly (hairline strokes, white fills, a hairline offset copy instead of a
tinted one). Print path, one page per file at the design's own size:

```
node bin/compose-slide.js card-a6-print --payload payload.json --theme light --out slides/
node bin/svg-export.js slides/card-a6-print.svg --theme light --out print/ --png --pdf
```

Budgets follow the same rule as the slide designs (a test fills every slot to its budget and measures it
in Chrome). `info-a4-print`'s `bullets` slot has no bullet glyph of its own: start each bullet line with
`• ` and indent continuation lines with two spaces. Compositional cues (anatomy, safe zones, modular cards;
no assets): visme.co infographic layouts, chartbeauty.com's Instagram infographic guide, the tooka
social-card patterns, toea.com's recipe-card anatomy.

### `info-tall-web`
| Slot | Kind | Box (x y w h) | Type | Budget | Required |
|---|---|---|---|---|---|
| `eyebrow` | text | 56 56 520 20 | head 14/700 tracked, start | 1 × 45 ch | optional |
| `hero-title` | text | 56 86 688 110 | head 44/700, start | 2 × 24 ch | yes |
| `lede` | text | 56 208 688 24 | sans 18/400 muted, start | 1 × 75 ch | yes |
| `s1-heading` | text | 56 320 600 34 | head 26/700, start | 1 × 36 ch | yes |
| `s1-text` | text | 56 364 688 66 | sans 17/400, start | 3 × 79 ch | yes |
| `stat-1-value` | text | 70 458 190 48 | head 40/800, start | 1 × 7 ch | yes |
| `stat-1-label` | text | 70 510 190 34 | sans 13/400 muted, start | 2 × 28 ch | yes |
| `stat-2-value` | text | 305 458 190 48 | head 40/800, start | 1 × 7 ch | yes |
| `stat-2-label` | text | 305 510 190 34 | sans 13/400 muted, start | 2 × 28 ch | yes |
| `stat-3-value` | text | 540 458 190 48 | head 40/800, start | 1 × 7 ch | yes |
| `stat-3-label` | text | 540 510 190 34 | sans 13/400 muted, start | 2 × 28 ch | yes |
| `s2-heading` | text | 56 628 600 34 | head 26/700, start | 1 × 36 ch | yes |
| `s2-text` | text | 56 672 688 66 | sans 17/400, start | 3 × 79 ch | yes |
| `step-1` | text | 104 758 640 32 | sans 18/500, start | 1 × 70 ch | yes |
| `step-2` | text | 104 802 640 32 | sans 18/500, start | 1 × 70 ch | yes |
| `step-3` | text | 104 846 640 32 | sans 18/500, start | 1 × 70 ch | yes |
| `step-4` | text | 104 890 640 32 | sans 18/500, start | 1 × 70 ch | yes |
| `step-5` | text | 104 934 640 32 | sans 18/500, start | 1 × 70 ch | yes |
| `s3-heading` | text | 56 1046 600 34 | head 26/700, start | 1 × 36 ch | yes |
| `s3-text` | text | 56 1098 330 150 | sans 17/400, start | 7 × 37 ch | yes |
| `s3-figure` | graphic | 404 1098 340 208 | svg-library component, contain-fit | — | yes |
| `s3-caption` | text | 404 1322 340 34 | sans 13/400 muted, start | 2 × 51 ch | optional |
| `s4-heading` | text | 56 1430 600 34 | head 26/700, start | 1 × 36 ch | yes |
| `s4-text` | text | 56 1474 688 66 | sans 17/400, start | 3 × 79 ch | yes |
| `s4-figure` | graphic | 64 1556 672 234 | svg-library component, contain-fit | — | yes |
| `s4-caption` | text | 56 1806 688 20 | sans 13/400 muted, start | 1 × 104 ch | optional |
| `sources` | text | 56 1906 688 52 | sans 13/400 muted, start | 3 × 104 ch | yes |

### `info-a4-print`
| Slot | Kind | Box (x y w h) | Type | Budget | Required |
|---|---|---|---|---|---|
| `eyebrow` | text | 48 44 500 20 | head 14/700 tracked, start | 1 × 43 ch | optional |
| `title` | text | 48 68 698 86 | head 34/700, start | 2 × 32 ch | yes |
| `lede` | text | 48 162 698 22 | sans 15/400 muted, start | 1 × 92 ch | yes |
| `col1-heading` | text | 62 246 192 24 | head 16/700, start | 1 × 18 ch | yes |
| `intro` | text | 62 288 192 246 | sans 14/400, start | 14 × 26 ch | yes |
| `bullets` | text | 62 580 192 246 | sans 14/400, start | 14 × 26 ch | yes |
| `col2-heading` | text | 301 246 192 24 | head 16/700, start | 1 × 18 ch | yes |
| `stat-1-value` | text | 301 288 192 52 | head 44/800, start | 1 × 7 ch | yes |
| `stat-1-label` | text | 301 342 192 34 | sans 13/400 muted, start | 2 × 28 ch | yes |
| `chart-1` | graphic | 301 386 192 108 | svg-library component, contain-fit | — | yes |
| `stat-2-value` | text | 301 568 192 52 | head 44/800, start | 1 × 7 ch | yes |
| `stat-2-label` | text | 301 622 192 34 | sans 13/400 muted, start | 2 × 28 ch | yes |
| `chart-2` | graphic | 301 666 192 108 | svg-library component, contain-fit | — | yes |
| `col3-heading` | text | 540 246 192 24 | head 16/700, start | 1 × 18 ch | yes |
| `finding-1` | text | 578 290 154 82 | sans 13/400, start | 5 × 22 ch | yes |
| `finding-2` | text | 578 400 154 82 | sans 13/400, start | 5 × 22 ch | yes |
| `finding-3` | text | 578 510 154 82 | sans 13/400, start | 5 × 22 ch | yes |
| `finding-4` | text | 578 620 154 82 | sans 13/400, start | 5 × 22 ch | yes |
| `finding-5` | text | 578 730 154 82 | sans 13/400, start | 5 × 22 ch | yes |
| `sources` | text | 48 910 698 80 | sans 12/400 muted, start | 5 × 115 ch | yes |
| `citation` | text | 132 1022 600 20 | sans 12/400, start | 1 × 99 ch | yes |

### `info-social-45`
| Slot | Kind | Box (x y w h) | Type | Budget | Required |
|---|---|---|---|---|---|
| `eyebrow` | text | 72 140 936 22 | head 18/700 tracked, start | 1 × 63 ch | optional |
| `title` | text | 72 172 936 140 | head 56/700, start | 2 × 26 ch | yes |
| `stat-value` | text | 104 372 430 140 | head 120/800, start | 1 × 5 ch | yes |
| `stat-label` | text | 560 388 416 106 | sans 28/500, start | 3 × 28 ch | yes |
| `stat-note` | text | 104 538 872 28 | sans 20/400 muted, start | 1 × 86 ch | optional |
| `list-heading` | text | 72 628 936 30 | head 24/700, start | 1 × 62 ch | yes |
| `item-1` | text | 168 686 816 60 | sans 24/500, start | 2 × 67 ch | yes |
| `item-2` | text | 168 780 816 60 | sans 24/500, start | 2 × 67 ch | yes |
| `item-3` | text | 168 874 816 60 | sans 24/500, start | 2 × 67 ch | yes |
| `item-4` | text | 168 968 816 60 | sans 24/500, start | 2 × 67 ch | yes |
| `takeaway` | text | 100 1094 880 66 | head 26/600, start | 2 × 61 ch | yes |

### `card-a6-print`
| Slot | Kind | Box (x y w h) | Type | Budget | Required |
|---|---|---|---|---|---|
| `eyebrow` | text | 28 26 341 16 | head 10/700 tracked, start | 1 × 40 ch | optional |
| `title` | text | 28 46 341 62 | head 24/700, start | 2 × 22 ch | yes |
| `list-heading` | text | 38 138 88 14 | head 10/700 tracked, start | 1 × 9 ch | yes |
| `list` | text | 38 160 88 72 | sans 11/500, start | 5 × 15 ch | yes |
| `list-figure` | graphic | 34 278 96 140 | svg-library component, contain-fit | — | optional |
| `steps-heading` | text | 160 138 197 14 | head 10/700 tracked, start | 1 × 23 ch | yes |
| `step-1` | text | 188 164 171 30 | sans 11/400, start | 2 × 30 ch | yes |
| `step-2` | text | 188 216 171 30 | sans 11/400, start | 2 × 30 ch | yes |
| `step-3` | text | 188 268 171 30 | sans 11/400, start | 2 × 30 ch | yes |
| `step-4` | text | 188 320 171 30 | sans 11/400, start | 2 × 30 ch | yes |
| `step-5` | text | 188 372 171 30 | sans 11/400, start | 2 × 30 ch | yes |
| `note` | text | 54 448 304 30 | sans 11/500, start | 2 × 54 ch | optional |
| `citation` | text | 36 510 325 24 | sans 9/400 muted, start | 2 × 71 ch | yes |

### `card-social-45`
| Slot | Kind | Box (x y w h) | Type | Budget | Required |
|---|---|---|---|---|---|
| `eyebrow` | text | 96 140 888 22 | head 18/700 tracked, start | 1 × 60 ch | optional |
| `quote` | text | 96 400 888 380 | head 60/600, start | 5 × 26 ch | yes |
| `attribution` | text | 96 842 888 66 | sans 26/500 muted, start | 2 × 67 ch | optional |
| `stat-1-value` | text | 124 980 380 84 | head 64/800, start | 1 × 9 ch | yes |
| `stat-1-label` | text | 124 1068 380 56 | sans 22/500, start | 2 × 33 ch | yes |
| `stat-2-value` | text | 576 980 380 84 | head 64/800, start | 1 × 9 ch | yes |
| `stat-2-label` | text | 576 1068 380 56 | sans 22/500, start | 2 × 33 ch | yes |

## Background designs (v0.22.0)

Eight **decor-only stages**: full-bleed backgrounds with **zero slots**. They carry no text; the
content (svg-library graphics, text, a composed figure) goes in the documented **content
zone**, and the motif hugs one edge, corner or band so it never fights a headline there (the
asymmetric "anchor, then step back" principle of SlidesCorner's science backgrounds). One background
can carry a whole deck: title, section and data slides.

| # | Design | Motif | Content zone (clear) |
|---|---|---|---|
| 1 | `bg-helix-field` | large DNA double helix climbing the right edge, code-stream dash columns, dot accents | left 55%: x 60–700, y 60–660 |
| 2 | `bg-mosaic-triangles` | teal / amber / coral / deep-blue triangle mosaic stepping into the bottom-right corner, top-left accent rule | upper left: x 80–1000, y 120–420 (x 80–560 down to y 640) |
| 3 | `bg-flow-dashes` | six faint dashed topographic contours (one amber) across the lower third | upper zone: x 60–1220, y 60–460 |
| 4 | `bg-concentric-vortex` | dashed concentric rings from the top-right corner, three satellite dots | centre-left: x 60–760, y 80–660 |
| 5 | `bg-dot-wash` | teal wash of layered translucent ellipses, dot grid fading toward the bottom left, glowing accent cluster | left 55%: x 60–680, y 80–640 |
| 6 | `bg-molecule-scatter` | faint hex-ring molecules and atom clusters along the top and right edges | centre + left: x 60–1000, y 180–640 |
| 7 | `bg-orbit-arc` | two orbit arcs + dashed guide line across the top-left corner, satellite dots | bottom right: x 540–1220, y 260–640 |
| 8 | `bg-slat-panel` | teal-tinted left panel (28%) with vertical slats and dash columns, thin border rule | right ~65%: x 420–1220, y 60–660 |

**Contract.** The root carries `data-decor-only="true"`. The design opens with a full-bleed painted
`<rect x="0" y="0" width="1280" height="720">`, so a dark bake is dark edge to edge and a light bake
light. The header comment names the **content zone** and the tokens. All svg-library hard rules
apply; washes are layered `color-mix(…, transparent)` shapes, never gradients or filters. A
decor-only design with any slot is `DESIGN-INVALID`.

**Compose.** The payload is empty, inline or from a file:

```
node bin/compose-slide.js bg-helix-field --payload '{}' --theme dark --out slides/
#  → slides/bg-helix-field.svg
```

Any payload key is `SLOT-UNKNOWN`.

Composition references (inspiration only, no assets): SlidesCorner's "Professional Science PPT
Background" (asymmetric dark field, helix on one edge), Craftwork's flow-pattern pack (dashed
contours, dash vortex, dot fields, slats) and ppt-design.com's geometric cover themes (triangle
mosaics).

## Adding a new design

0. **Research first.** Look at 2–4 real slide examples of the archetype before drawing. Fetchable
   sources: ppt-design.com (theme and master-layout pages), getdeck.co (184 layout archetypes in 17
   categories, with item counts), Slidev theme galleries (sli.dev/resources/theme-gallery). These
   return 403 or bot walls, so skip them: slidesdocs, 24slides, Magnific, Adobe Stock. Use them as
   composition reference only, never copy their assets.
1. Draw `sets/lab/designs/<kebab-name>.svg` by the conventions above, with preview text in every
   text slot (placed by the layout rule) and a hint frame in every graphic slot. Paint the background.
2. Add a sample payload to `samples.json` (every required slot; a real svg-library component for
   graphic slots).
3. Add a catalog row and a slot table above. The tests check every slot is in the table with its
   `maxchars`.
4. A new slide design belongs to **every** set: add it to each set in `bin/draw-slide-sets.js` with the
   same slot names, kinds, required flags and line counts, then run `node bin/draw-slide-sets.js`.
5. Run `node bin/build-slides-gallery.js` and `python3 test/smoke-test-slides.py`. Open
   `gallery.html` and check light and dark.
6. If it is generally useful, mention it in SKILL.md's slide-designs section.

A new **background**: same steps, but the root says `data-decor-only="true"`, there are no slots,
there is no `samples.json` entry (backgrounds compose with `{}`), the header comment has a
`Content zone:` line, the row goes in the *Background designs* table, and only its own set needs it.

## Adding a theme set

1. Research 2–4 professional theme examples of the look first (theme galleries, template marketplaces,
   design guides), as composition and palette cues only. Never copy assets or impersonate a brand.
2. Add an entry to `SETS` in `bin/draw-slide-sets.js`: label, description, references, fonts, a light
   and a dark palette (every token the designs use, plus the library tokens so inlined components
   match), and all six slide designs with lab's slot contract, plus at least two `bg-*` backgrounds.
3. Size budgets from the box width and the font's average glyph advance, at or above the sample
   lines. Run `node bin/draw-slide-sets.js <set>` (it fails on an over-budget sample), then
   `node bin/build-slides-gallery.js` and `python3 test/smoke-test-slides.py` (the fit check fails any
   line that leaves its box). Check light and dark in `gallery.html`.
