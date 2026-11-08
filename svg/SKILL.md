---
name: design-pack-svg
description: 'design-pack SVG toolchain — designed SVG slide decks (13 theme sets incl. swiss/boardroom/editorial/brutalist/terminal/glass/mesh/deco/nordic, slot-marked designs, diagram-hero, composer gates) delivered as per-slide 2x PNG + one merged vector PDF; a 126-component hand-drawn SVG diagram/infographic library (static + SMIL-animated) with a standalone exporter that bakes palettes so SVGs open in PowerPoint/Word/Figma/Inkscape; plus infographic and info-card templates (web 800×2000, A4 print, social 4:5, A6). Invoke for "slide deck", "presentation", "pitch deck", "designed slides", "SVG diagram", "infographic", "mind map", "org chart", "process diagram", "figure for my slides/paper/poster", "info card", "PowerPoint-ready graphic". HTML reports/bento/dashboards → design-pack-html.'
version: 0.37.0
updated: 2026-11-08
triggers:
  - "slide deck or presentation"
  - "designed slides from SVG slide designs"
  - "slide theme sets (swiss, boardroom, editorial, bold, brutalist, academia, terminal, cyberpunk, glass, mesh, deco, nordic)"
  - "SVG diagram or infographic"
  - "standalone SVG for PowerPoint/Word/Figma"
  - "info card or printable infographic"
license: MIT
---

# design-pack-svg

The SVG half of the [design-pack](../SKILL.md) skill: the slide-deck toolchain (composer + theme sets), the SVG diagram library, and the standalone exporter. HTML reports, bento one-pagers and dashboards live in the sibling sub-skill `design-pack-html` (`../html/SKILL.md`). Paths below are relative to this directory; `bin/`, `templates/`, `features/` and `docs/` here are symlinks to the shared copies one level up.

Routing: any **deck** → svg-slides (compose → PNG + merged PDF; there is no HTML slide template since v0.26.0 and no `.pptx` builder since v0.23.0). A **graphic only** (diagram, infographic, figure for a deck/doc/poster/paper) → standalone SVG from the library. A "review deck" meant as a long-form reading artifact → report template in `design-pack-html`. If a graphic type is not in the library, research online and hand-draw a new component (see *Standalone SVG* step 1). Live-presentation-only decks → `lumen-slides`; real data charts → `chartz`.

## Slide-deck delivery (svg-slides → composed SVG → PNG + PDF; since v0.26.0)

**Replacement of the removed HTML slide template** (templates/slide/, deleted in v0.26.0 — its prev/next shell, v1 annotation system and inline deck chrome went with it). Every deck ask now:

1. Author one JSON payload per slide against the chosen theme set's slot tables (`templates/svg-slides/sets/<set>/README.md`).
2. Compose: `node bin/compose-slide.js <design> --set <set> --payload <p>.json --theme <light|dark> --out slides/` (composer gates fail loudly — fix by shortening lines, never by editing budgets).
3. Deliver: `node bin/svg-export.js slides/*.svg --theme <light|dark> --out deck/ --png --pdf --pdf-out deck.pdf` — per-slide baked SVG + 2x PNG + vector PDF, plus one merged, page-sized PDF via pdfunite.

Baked slides are frozen artifacts: no inline annotation (a baked SVG is not a stable text anchor), no live theming — re-theme from the payloads. Review-capable HTML work stays with the report and bento templates. (The compose-then-inline-into-an-HTML-shell hybrid used for genomics-gap-deck in 2026-10 is no longer a shipped deliverable; PNG + PDF replaces it.)

## SVG diagram library (`features/graphics/svg-library/` + `bin/build-svg-gallery.js` + `bin/svg-export.js`)

A sibling to the CSS graphics pack: **126 hand-drawn inline SVG infographic templates** (static infographics plus 17 SMIL-animated `anim-` twins) for explanatory/summary visuals — concept diagrams the CSS pack does not cover. The full numbered catalog (component · shows · when to use) is in `features/graphics/svg-library/README.md`; read it to pick by intent. Growth history per release: `../references/history.md`.

**Animated components (opt-in, SMIL only):** seventeen `anim-` twins of static components (family started with five in v0.27.0, grown by twelve in v0.29.0): `anim-flow-pipeline` (marching-dash pipeline with travelling packets), `anim-stepper` (pulsing active step + travelling progress dot), `anim-radial-gauge` (self-drawing radial KPI), `anim-loader-ring` (counter-rotating spinner) and `anim-sequence-lifelines` (sequence diagram, messages drawn in order); since v0.29.0 also `anim-cycle-loop`, `anim-gear-mechanism` (pitch-radius-correct counter-rotation), `anim-domino-chain` (staggered tipping on one shared cycle from the upright rest state), `anim-central-dogma` (travelling polymerase/ribosome + growing protein trail, replay cycle with full-trail frame 0), `anim-dna-helix-steps` (subtle breathing), `anim-pcr-thermal-cycle` (cursor rides the temperature profile), `anim-s-curve-adoption` (self-drawing curve, marker pulse), `anim-journey-map` / `anim-snake-path` (travelling markers), `anim-water-cycle` / `anim-food-web` / `anim-carbon-cycle` (droplets and flux dots along the static twins' arrows). Frame 0 is the settled/rest state (draw-ins freeze after a begin delay; loops are sanctioned process indicators), so PNG/PDF exports are safe; delete the `<animate*>` children for a static twin. Rules: README convention 8.

**Routing within the graphics systems**: real/interactive data → `chartz`; real-data static charts → CSS graphics pack A-block; Mermaid flow/sequence/ER → Mermaid CDN; **concept/infographic diagrams → this SVG library**; decorative background motifs → hand-draw per the svg-library conventions (token-driven, `aria-hidden`, zero text nodes). If the svg-library has no component for the requested kind, research online first (see *Standalone SVG* step 1) and add a new component rather than substituting a mismatched one.

**Usage**: open `features/graphics/svg-library/gallery.html` in a browser (token-driven, ◐ theme toggle to preview both palettes), pick a component, copy the inline `<svg>`, replace the placeholder `<text>` labels. The `svg/*.svg` files are canonical; `gallery.html` is generated — after editing or adding a component run `node bin/build-svg-gallery.js` (it validates: well-formed XML, `role="img"` + `aria-label` + `<title>`, `viewBox 0 0 800 450`, **no `id=` / `<defs>` / `<marker>` / `<filter>` / `<script>`** so several components can be pasted into one page safely). Colors are `var(--token, #fallback)` **inside `style` attributes** (var() does not work in SVG presentation attributes) + `color-mix()` tints, so the same SVG adapts to every template palette and both themes with zero per-use edits. Full conventions + add-a-component workflow: `features/graphics/svg-library/README.md`.

### Standalone SVG (no HTML page)

When the user wants **only a diagram or a few graphics**, for a PowerPoint/Keynote/Google Slides deck, a Word doc, a poster, Figma, or a manuscript figure, **do not build a template page**. Deliver `.svg` files:

1. Pick the component(s) by intent from the catalog above. **If no component matches the requested graphic type, wire in online search before giving up:** search for reference examples of that graphic type (2–4 varied queries, e.g. the type name + "diagram", "infographic", "science template"), curate the best 2–4 source URLs (fetch them to see the actual layouts), then hand-draw a **new svg-library component** from those references following *Adding a new component* in `features/graphics/svg-library/README.md` (its step 0 is this research pass). Add the catalog row, add the component to the delivery, and rebuild (`node bin/build-svg-gallery.js`) + re-run tests (`node test/run-all.js`) so the library grows every time the user asks for a graphic kind it lacks. Known-fetchable source sites: BioRender template gallery, Wikimedia Commons diagrams, USGS/NOAA/NPS, edu.rsc.org, Kuraplan, LivePhysics infographics, Mind the Graph. Sites that 403 (bot walls) or return empty: Magnific, Shutterstock, Dreamstime, Adobe Stock, Britannica, Dribbble — don't burn fetches on them.
2. Copy `features/graphics/svg-library/svg/<name>.svg` into the user's working directory and edit the `<text>` labels, `aria-label` and `<title>` there (same rules as pasting into a page).
3. Export: `node <skill>/bin/svg-export.js <edited>.svg [--theme light|dark] --out <dir>`. Library files rely on `var()` + `color-mix()`, which **only browsers resolve**; PowerPoint, Word, Inkscape, Illustrator, Figma import and cairo/rsvg converters render them black or blank. The export bakes one palette into plain hex + `fill-opacity`/`stroke-opacity`, strips the authoring comment, and sets `width="800" height="450"`. `--theme dark` also paints a background, because light text on a transparent canvas disappears on white pages.
4. Hand over the exported file(s). Need PNG? Add `--png` (2x raster of the exported file via headless Chrome); never screenshot the raw library file. Need PDF? Add `--pdf` (vector, page-sized, text stays selectable) and `--pdf-out deck.pdf` to merge several files into one deck PDF.

### Slide designs (svg-slides + composer)

**Routing:** decks that need real slide **design**, not just layout chrome → `templates/svg-slides` + `bin/compose-slide.js`, one SVG per slide. Full spec: `templates/svg-slides/README.md`. Seven designs ship: `title-hero`, `section-break`, `big-statement`, `content-two-col`, `full-diagram`, `closing`, plus `diagram-hero` (the diagram fills ≥ 2/3 of the slide, enforced; any design can opt in with `compose-slide.js --graphic-min 0.667`). Preview them in `templates/svg-slides/gallery.html`.

**Theme sets (v0.24.0; 7 more in v0.30.0):** the six designs come in twelve sets with one shared slot contract. Pick the set by the look the user asks for: `lab` (default, hand-drawn science), `swiss` (grid, grotesque, red colour blocks), `boardroom` (consulting: navy + one accent, serif titles, tracker), `editorial` (cream paper, serif, terracotta, hairlines), `bold` (saturated polygons, heavy display type), `brutalist` (neo-brutalism: acid fields, thick black borders, hard offset shadows, mono annotations), `academia` (dark academia: warm near-black, antique-gold serif, double inset frame), `terminal` (dev console: green-on-black mono, code-panel left bars, prompt cues, faint grid), `cyberpunk` (HUD: outline-only titles, corner brackets, cyan/magenta), `glass` (glassmorphism: frosted 20px cards over deep glow-blob field), `mesh` (gradient mesh: pastel blob field, Arial Black with text halo), `deco` (art deco luxe: gold frames, corner sunbursts, stepped collars), `nordic` (nordic organic: warm cream, low-opacity blobs, huge whitespace). Pass `--set <name>` to every compose call of a deck. A payload re-themes across sets if its lines fit that set's budgets (generated sets list them in `sets/<set>/README.md`). If no set matches the requested look, research professional examples first, then add a set per *Adding a theme set* in the svg-slides README.

**info-* / card-* design families (v0.28.0, lab set only):** richer-than-a-slide templates composed by the same slot composer — designs declare their canvas via `data-canvas="0 0 W H"` on the root (slides default to 1280×720). `info-tall-web` (800×2000, sectioned scrollable web infographic: header band + 4 section bands + sources footer), `info-a4-print` (794×1123 = A4 portrait poster, 3-column body, ink-friendly), `info-social-45` (1080×1350, 4:5 feed card with safe zones), `card-a6-print` (397×560 = A6 portrait card: title + narrow list column + numbered steps + citation strip), `card-social-45` (1080×1350 pull-quote/insight card). Compose exactly like slides (`--set lab`), deliver print via `svg-export.js --png --pdf` (A6 card PDF ≈ 298×420 pt, A4 ≈ 595.9×841.9 pt). Grouped in the gallery's "Infographics" / "Info cards" sections.

**Background routing (v0.22.0):** stage backgrounds for **graphic-only or text slides** → a `bg-*` background design (`data-decor-only`, zero slots, composed with `{}`). Eight ship: `bg-helix-field`, `bg-mosaic-triangles`, `bg-flow-dashes`, `bg-concentric-vortex`, `bg-dot-wash`, `bg-molecule-scatter`, `bg-orbit-arc`, `bg-slat-panel`. Each documents a clear **content zone**; put svg-library graphics or native text there, never across the motif. Generated sets ship two each (`swiss`: `bg-grid`, `bg-block`; `boardroom`: `bg-rule`, `bg-panel`; `editorial`: `bg-paper`, `bg-sun`; `bold`: `bg-corners`, `bg-stripe`). Each set's gallery section has a "Backgrounds" part.

1. Pick a design and read its slot table (name · kind · box · size · **budget** = lines × chars per line).
2. Write the payload. Text slots take a string or an array of lines. **You break the lines**, since SVG cannot wrap. Graphic slots take an svg-library name or an id-free `.svg` path.
3. SVG out: `node <skill>/bin/compose-slide.js <design> --payload p.json [--set lab|swiss|boardroom|editorial|bold] [--theme light|dark] --out <dir> [--name <slide-name>]`. This writes `<name>.svg` (finished, baked, 1280×720).
4. When a gate fires (`TEXT-OVERFLOW`, `SLOT-UNKNOWN`, `SLOT-MISSING`, …), **shorten or re-break the text**. Never edit a design's budget to make a payload fit.
5. A background slide: `node <skill>/bin/compose-slide.js bg-<name> --payload '{}' --theme dark --out <dir>`. Any payload key is `SLOT-UNKNOWN`.
6. A new archetype? Follow *Adding a new design* in the svg-slides README: research 2–4 examples first, draw the design slot-marked, add a sample payload and a slot table, then rebuild the gallery and run the tests.

## Deck pipeline (Decide → Compose → Adapt → Render)

1. **Decide** — pick the set by the requested look; pick designs from the slot tables.
2. **Compose** — one payload JSON per slide; `node bin/compose-slide.js <design> --set <set> --payload p.json --theme <light|dark> --out slides/`.
3. **Adapt** — fix composer-gate failures by shortening text, never by editing budgets.
4. **Render** — `node bin/svg-export.js slides/*.svg --theme <t> --out deck/ --png --pdf --pdf-out deck.pdf`; check the PDF page count equals the slide count and view at least the title slide PNG.

Baked slides are frozen: no annotation system, no live theme toggle — re-theme by re-composing from the payloads.

## Hard invariants (do not lower)

- Never edit a design's text budget to make a payload fit; shorten or re-break the text.
- Library components stay id-free, with no `<defs>`/`<marker>`/`<filter>`/`<script>`/`<mask>`/`<pattern>`/`<clipPath>`; colours are `var(--token, #fallback)` inside `style` attributes.
- Animated components: frame 0 is the rest state (README convention 8), so PNG/PDF exports are safe.
- After editing designs or sets: rebuild the galleries (`node bin/build-slides-gallery.js`, `node bin/build-svg-gallery.js`), re-sync `docs/`, and run `node test/run-all.js` (the slides suite has a gallery/docs freshness test).

## Tests and history

`node test/run-all.js` (full suite; run it in the background, it exceeds a 120 s tool timeout). Release notes and sources: `../references/history.md`.
