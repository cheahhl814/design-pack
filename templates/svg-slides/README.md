# svg-slides: hand-drawn slide designs + slot-marker composer (v0.21.0)

Whole **slide designs** drawn as SVG in the svg-library look (rounded cards, misregistered-print
offset copies, token-driven colour), with **slots** marked for text and for svg-library graphics.
`bin/compose-slide.js` fills the slots and bakes ONE renderer-safe SVG slide; the same run writes a
sidecar that `bin/make-pptx-deck.py` turns into an editable PPTX slide (the design as a full-bleed
picture, the text as **native text boxes**).

Use this when a deck needs real slide **design**, not just layout chrome. The house PPTX layouts
(`templates/deck/`) stay the right choice for plain bullets, tables and KPI slides, and both kinds mix
in one deck.

```
templates/svg-slides/
├── README.md       ← you are here (conventions, catalog, workflow)
├── gallery.html    ← GENERATED preview: every design composed with its sample (theme toggle)
├── samples.json    ← one sample payload per design (gallery + tests use it)
└── designs/*.svg   ← CANONICAL design files (hand-drawn, slot-marked)
bin/compose-slide.js        ← the composer
bin/svg-bake.js             ← token → hex bake logic, shared with bin/svg-export.js
bin/build-slides-gallery.js ← regenerates gallery.html
test/smoke-test-slides.py   ← design QA + composer gates + deck wiring (in test/run-all.js)
```

## Workflow

```
# 1. pick a design (gallery.html or the catalog below), write a payload
cat > payload.json <<'EOF'
{ "heading": "Four stages from sample to result",
  "body": ["Each chip runs the same four stages.", "Lysis and extraction happen on the card."],
  "figure": "flow-pipeline" }
EOF

# 2. compose: one SVG slide (+ background variant + native-text sidecar)
node bin/compose-slide.js content-two-col --payload payload.json --theme light --out slides/
#  → slides/content-two-col.svg          finished slide, colours baked to hex, 1280×720
#    slides/content-two-col.bg.svg       same slide without the text slots (the pptx picture)
#    slides/content-two-col.slides.json  text geometry + font + size (pt) + colour per text slot

# 3. or put it straight into a PowerPoint deck (the builder runs the composer itself)
python3 bin/make-pptx-deck.py spec.json -o deck.pptx
```

```json
{"slides": [
  {"design": "title-hero", "payload": {"eyebrow": "LAB MEETING", "hero-title": ["Lab-on-chip", "diagnostics"],
                                      "subtitle": "What we built this quarter"}},
  {"design": "full-diagram", "payload": {"heading": "How PCR works", "figure": "pcr-thermal-cycle"},
   "notes": "Speaker notes work as on any other slide."},
  {"layout": "bullets", "title": "House layouts still work", "bullets": ["..."]}
]}
```

**Payload.** Keys are slot names. A **text** slot takes a string (one line) or an array of strings
(one per line). A **graphic** slot takes an svg-library component name (`flow-pipeline`) or a path to
an `.svg` (token-driven or already baked; it must be id-free). Optional slots can be left out; their
preview text then disappears.

**Lines are yours to break.** SVG has no text wrapping (SVG 2 `inline-size` is not implemented by
browsers or PowerPoint's renderer), so the composer never wraps: it places one `<text>` per payload
line and **fails** when a line is over its slot's character budget or there are too many lines.

**Deck slides.** A `{"design": ..., "payload": ...}` slide becomes:
- the composed **background** (`.bg.svg`, no text) as one full-bleed picture: native `svgBlip` plus a
  2400 px PNG fallback, contain-fitted and centred on a non-16:9 `--base`;
- one native, editable **text box** per filled text slot, named `Slot <name>`, at the slot box, with
  the slot's size, bold for weight ≥ 600, the baked colour, letter-spacing, and the theme font
  (`+mj-lt` for `head`, `+mn-lt` for `sans`, so a rebrand reaches design slides too). Word wrap and
  autofit are off, so the lines you wrote stay the lines on the slide;
- native footer / date / slide-number fields as on the inner house layouts, unless the design root says
  `data-native-footer="false"` (cover-style designs that paint their own bottom edge);
- the picture's alt text is the inlined components' `aria-label`s. With no component it is marked
  decorative, since all its meaning is in the native text.

Notes and credits work as on any other slide. Typography in PowerPoint is the theme font (Arial in the
house bases), not Outfit/Inter, so lines run a little wider or narrower than in the SVG. The budgets
leave room for that.

## Gates (exit 1; the message starts with the gate and names the slot)

| Gate | Fires when |
|---|---|
| `DESIGN-UNKNOWN` | the design name is not in `designs/` (the message lists the known ones) |
| `DESIGN-INVALID` | slot markup is broken: duplicate slot, box outside the canvas, missing budget, unknown kind; or the file breaks the svg-library hard rules |
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
`role="img"` + `aria-label` + `<title>`, light slide-template fallbacks. On top of that:

1. **Canvas `viewBox="0 0 1280 720"`** (16:9, 1 px = 9525 EMU on the house bases). The design paints
   its own background (`fill:var(--surface,#ffffff)` or a tint of it), so a dark bake is dark edge to
   edge.
2. **Slots are `<g data-slot="name">` groups, never ids.** Library components are inlined into designs,
   and one slide may hold several, so ids would collide. Slot markers sit on `<g>` only and are pure
   metadata: deleting every `data-slot-*` attribute must not change what the browser draws. The
   composer strips them from its output; the design files keep them.
3. **Every slot declares its zone:** `data-slot-box="x y w h"` (positive, inside 1280×720) and
   `data-slot-kind` (`text` or `graphic`). Add `data-slot-optional="true"` if the slide still works
   without it.
4. **Text slots declare their type and budget:**

   | Attribute | Values | Meaning |
   |---|---|---|
   | `data-slot-font` | `head` \| `sans` | `var(--font-head)` / `var(--font-sans)`; theme major / minor font in PPTX |
   | `data-slot-weight` | 400–800 | font weight (≥ 600 → bold in PPTX) |
   | `data-slot-size` | px | font size; PPTX size is px × 0.75 pt |
   | `data-slot-maxlines` | ≥ 1 | line budget |
   | `data-slot-maxchars` | ≥ 1 | character budget **per line** (the gate counts code points) |
   | `data-slot-anchor` | `start` \| `middle` \| `end` | x = box left / centre / right; PPTX left / centre / right |
   | `data-slot-fill` | token expression | e.g. `var(--text,#0f172a)`; baked to hex for the PPTX colour |
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
8. **Footer zone.** Designs without `data-native-footer="false"` keep the bottom 44 px (y ≥ 676)
   free of content, because the native date / footer / slide-number fields sit at y 684–708.

## Catalog

| # | Design | What it is | Motif | Native footer |
|---|---|---|---|---|
| 1 | `title-hero` | Cover: eyebrow, 2-line hero title, subtitle, meta row | DNA helix strip along the bottom, dot field top right | no |
| 2 | `section-break` | Chapter divider: oversized tinted number on a panel, section title, orientation line | molecule ring top right, dotted rule | no |
| 3 | `big-statement` | Centred 3-line takeaway on a tinted card, attribution | quote glyph astride the card, corner brackets | yes |
| 4 | `content-two-col` | Heading, body card + key-point callout left (full height), framed graphic + caption right | accent underline, offset cards | yes |
| 5 | `full-diagram` | Heading over a large graphic panel, takeaway rail card on the right | soft panel, amber rail marker | yes |
| 6 | `closing` | Thanks / summary title, contact lines, meta line | orbit rings around a node network | no |

Budgets are per line. `head 54/700` means the heading font at 54 px, weight 700.

### `title-hero` (no native footer)
| Slot | Kind | Box (x y w h) | Type | Budget | Required |
|---|---|---|---|---|---|
| `eyebrow` | text | 80 168 720 20 | head 14/700 tracked, start | 1 × 48 ch | yes |
| `hero-title` | text | 80 214 1120 140 | head 54/700, start | 2 × 38 ch | yes |
| `subtitle` | text | 80 380 900 60 | sans 22/400 muted, start | 2 × 72 ch | yes |
| `meta` | text | 80 486 900 22 | head 16/600, start | 1 × 80 ch | optional |

### `section-break` (no native footer)
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

### `closing` (no native footer)
| Slot | Kind | Box (x y w h) | Type | Budget | Required |
|---|---|---|---|---|---|
| `title` | text | 80 246 660 160 | head 60/700, start | 2 × 20 ch | yes |
| `contact` | text | 80 430 660 84 | sans 22/400, start | 3 × 50 ch | yes |
| `meta` | text | 80 560 660 22 | sans 16/400 muted, start | 1 × 80 ch | optional |

Budgets are set from the box width at an average glyph advance of about 0.52 em (head) or 0.5 em
(sans), with slack for Arial in PowerPoint. Text-budget sizing follows the getdeck.co layout
archetypes. Composition takes cues from ppt-design.com's master-layout set (cover, section, takeaway,
quote, content, thank-you) and from the v0.19.0 deck chrome. The helix, molecule ring and orbit
motifs are re-drawn slot-ready from `templates/deck/chrome/`. No external assets are used.

## Adding a new design

0. **Research first.** Look at 2–4 real slide examples of the archetype before drawing. Fetchable
   sources: ppt-design.com (theme and master-layout pages), getdeck.co (184 layout archetypes in 17
   categories, with item counts), Slidev theme galleries (sli.dev/resources/theme-gallery). These
   return 403 or bot walls, so skip them: slidesdocs, 24slides, Magnific, Adobe Stock. Use them as
   composition reference only, never copy their assets.
1. Draw `designs/<kebab-name>.svg` by the conventions above, with preview text in every text slot
   (placed by the layout rule) and a hint frame in every graphic slot. Paint the background. Leave the
   footer zone clear, or set `data-native-footer="false"`.
2. Add a sample payload to `samples.json` (every required slot; a real svg-library component for
   graphic slots).
3. Add a catalog row and a slot table above. The tests check every slot is in the table with its
   `maxchars`.
4. Run `node bin/build-slides-gallery.js` and `python3 test/smoke-test-slides.py`. Open
   `gallery.html` and check light and dark.
5. If it is generally useful, mention it in SKILL.md's slide-designs section.
