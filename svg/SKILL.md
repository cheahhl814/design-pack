---
name: design-pack-svg
description: 'Use when asked for a slide deck, presentation, designed slides, SVG diagram, infographic, mind map, figure for slides/doc/paper, or info card. design-pack design layer for GenOffice documents: a 128-component SVG diagram library that recolours to the host document (slide-set palette, tokens JSON, or .pptx/.docx theme), 13 SVG slide-design theme sets bridged into native editable .pptx decks (art PNG + native text boxes) or a PNG + vector PDF fallback, plus infographic and info-card templates. Requires the genoffice app + skill.'
version: 1.0.0
updated: 2026-11-25
requires:
  - genoffice (app + CLI >= 0.9.0 + skill at ~/.agents/skills/genoffice)
triggers:
  - "slide deck or presentation"
  - "designed slides from SVG slide designs"
  - "SVG diagram or infographic for a document or deck"
  - "recolour a diagram to match a pptx/docx"
  - "info card or printable infographic"
license: MIT
disable-model-invocation: true
---

# design-pack-svg

The design layer of [design-pack](../SKILL.md): SVG diagrams and slide designs, delivered *into* documents that GenOffice creates and edits. Paths are relative to this directory; `bin/`, `templates/`, `features/`, `docs/` here are symlinks to the shared copies one level up.

**Step 0, always:** `node bin/preflight.js` (GenOffice CLI, its skill, Chrome) and read `~/.agents/skills/genoffice/SKILL.md` before any genoffice command. GenOffice decides how a file is built; design-pack only supplies the look. Spike findings (what genoffice accepts): `../references/genoffice-integration.md`.

## Routing

| Ask | Path |
| --- | --- |
| A deck / presentation, editable | **Bridge**: payloads → `bin/genoffice-bridge.js` → native `.pptx` (below) |
| A deck that must be pixel-exact, no editing | Fallback: compose → `svg-export.js --png --pdf --pdf-out` |
| A diagram/figure for a deck or Word/PDF doc | **Library** → `svg-export.js [--palette host]` → PNG → place with genoffice |
| Edit one slide of an existing deck | genoffice `slides read` → `apply` (keep the deck's own design); insert diagrams via `addPicture` |
| Printable / social infographic or card | `info-*` / `card-*` designs (lab set) → `svg-export.js --png --pdf` |
| HTML report / reading version | `templates/report/template.html` → `genoffice convert … --to pdf` (see root SKILL.md) |
| Real data charts | `chartz`; Mermaid flow/ER → `lumen-mermaid` |

## Diagrams for documents

128 components in `features/graphics/svg-library/` (catalog: its `README.md`; browse `gallery.html`). Colours are `var(--token,#fallback)` + `color-mix()` in `style` attributes; the fallbacks are the **Lab palette** (the default). Tokens: `coral green teal deep-blue amber text text-muted surface border font-head font-sans`.

1. Pick by intent from the catalog; copy `svg/<name>.svg` to the working dir and edit `<text>` labels, `aria-label`, `<title>`. No fitting component → research and add one (`../references/svg-library-notes.md`).
2. **Recolour + export** (Word/PowerPoint cannot resolve `var()`/`color-mix()`):
   `node bin/svg-export.js <name|file.svg> [--theme light|dark] [--palette SPEC] [--out DIR] [--png]`
   `--palette SPEC` is one of: a **slide-set name** (`swiss`, `nordic`, … = that set's colours and fonts), a **tokens `.json`** (any subset of the tokens), or a **`.pptx`/`.docx`/`.xlsx`** (its own theme: dk/lt, accent1–6 matched to the nearest hue role, major/minor fonts). The exporter warns when text < 4.5:1 or marks < 3:1 against the surface; fix by choosing another palette or `--theme dark`, never by ignoring it on body text.
3. **Place it**: genoffice takes **PNG, not SVG** (`create --spec` drops SVG pictures). Use `--png`, then `genoffice docs apply doc.docx --ops` with `{"op":"insert_image","url":"fig.png","maxWidthPx":600,"afterBlockIndex":N}`, or `slides apply` `addPicture`; keep the box at the 16:9 (800×450) aspect. Then `docs check`/`slides audit` and `render` and look.

## Slide decks (native, via GenOffice)

`node bin/genoffice-bridge.js deck.json [--out deck.pptx] [--work DIR] [--render]`

```json
{ "set": "swiss", "theme": "light",
  "slides": [ { "design": "title-hero", "payload": { "eyebrow": "…", "hero-title": ["line 1","line 2"] } },
              { "design": "content-two-col", "payload": { "heading": "…", "figure": "flow-pipeline" } } ] }
```

Per slide the bridge runs the composer (all gates), removes the text from the art, renders the art to a full-canvas PNG, and emits each text slot as a **native text box** at the slot's geometry (size px×0.75 = pt, set fonts and colours), then `genoffice create --type pptx --spec` and `slides audit`. Titles and body stay editable in PowerPoint/GenOffice; diagrams and decoration are the picture. 1280×720 designs only (not `info-*`/`card-*`). After the build: `slides render` and view at least the cover and one content slide; fix by editing the payload (shorten lines) and rebuilding, or via genoffice ops on the pptx. Graphics recolour with the set automatically.

**Pixel-exact fallback (PNG + PDF, no editing):** `node bin/compose-slide.js <design> --set <set> --payload p.json --theme <t> --out slides/` per slide, then `node bin/svg-export.js slides/*.svg --theme <t> --out deck/ --png --pdf --pdf-out deck.pdf`.

### Designs and sets

Seven designs per set: `title-hero`, `section-break`, `big-statement`, `content-two-col`, `full-diagram`, `closing`, `diagram-hero` (diagram ≥ 2/3 of the slide, enforced; `--graphic-min 0.667` opts any design in), plus `bg-*` decor backgrounds (no slots, payload `{}`). Slot tables: `templates/svg-slides/sets/<set>/README.md`; preview `templates/svg-slides/gallery.html`. Thirteen sets, one slot contract (a payload re-themes across sets if its lines fit the budgets): `lab` (default, science), `swiss`, `boardroom`, `editorial`, `bold`, `brutalist`, `academia`, `terminal`, `cyberpunk`, `glass`, `mesh`, `deco`, `nordic`. Pick by the look asked for; `--set` on every slide of a deck. No set fits → research examples, then add one per *Adding a theme set* in `templates/svg-slides/README.md`. `info-tall-web` (800×2000), `info-a4-print`, `info-social-45`, `card-a6-print`, `card-social-45` are lab-only, composed the same way.

When a gate fires (`TEXT-OVERFLOW`, `SLOT-UNKNOWN`, `SLOT-MISSING`, `GRAPHIC-TOO-SMALL`…) **shorten or re-break the text**; never edit a budget.

## Hard invariants

- GenOffice is mandatory; run preflight first and report its failure verbatim rather than falling back silently (the PNG+PDF fallback is a user choice, not an error path).
- Never edit a design's text budget to make a payload fit.
- Library components stay id-free: no `<defs>`/`<marker>`/`<filter>`/`<script>`/`<mask>`/`<pattern>`/`<clipPath>`; colours are `var(--token,#fallback)` in `style` attributes. Animated twins: frame 0 is the rest state, so PNG export is safe.
- After editing designs, sets or components: `node bin/build-svg-gallery.js`, `node bin/build-slides-gallery.js`, re-sync `docs/`, run `node test/run-all.js` (background it; it exceeds a 120 s tool timeout; the slides suite has a gallery/docs freshness test).

Release notes: `../references/history.md`.
