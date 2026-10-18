# svg-slides: hand-drawn slide designs + slot-marker composer (v0.21.0; backgrounds v0.22.0)

Whole **slide designs** drawn as SVG in the svg-library look (rounded cards, misregistered-print
offset copies, token-driven colour), with **slots** marked for text and for svg-library graphics.
`bin/compose-slide.js` fills the slots and bakes ONE renderer-safe SVG slide.

A second category, **background designs** (`bg-*`, v0.22.0), are slot-free full-bleed stages for
graphic-only or text slides (see *Background designs*).

Use this when a deck needs real slide **design**, not just layout chrome. For plain bullet decks the
HTML slide template (`templates/slide/`) stays the right choice.

```
templates/svg-slides/
├── README.md       ← you are here (conventions, catalog, workflow)
├── gallery.html    ← GENERATED preview: every design composed with its sample (theme toggle)
├── samples.json    ← one sample payload per design (gallery + tests use it)
└── designs/*.svg   ← CANONICAL design files (hand-drawn, slot-marked)
bin/compose-slide.js        ← the composer
bin/svg-bake.js             ← token → hex bake logic, shared with bin/svg-export.js
bin/build-slides-gallery.js ← regenerates gallery.html
test/smoke-test-slides.py   ← design QA + composer gates (in test/run-all.js)
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
| `DESIGN-UNKNOWN` | the design name is not in `designs/` (the message lists the known ones) |
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
1. Draw `designs/<kebab-name>.svg` by the conventions above, with preview text in every text slot
   (placed by the layout rule) and a hint frame in every graphic slot. Paint the background.
2. Add a sample payload to `samples.json` (every required slot; a real svg-library component for
   graphic slots).
3. Add a catalog row and a slot table above. The tests check every slot is in the table with its
   `maxchars`.
4. Run `node bin/build-slides-gallery.js` and `python3 test/smoke-test-slides.py`. Open
   `gallery.html` and check light and dark.
5. If it is generally useful, mention it in SKILL.md's slide-designs section.

A new **background**: same steps, but the root says `data-decor-only="true"`, there are no slots, `samples.json` gets `{}`, the header comment has a
`Content zone:` line, and the row goes in the *Background designs* table.
