---
name: design-pack
description: 'Use when asked for a slide deck, presentation, designed slides, SVG diagram, infographic, figure for a document, HTML report or reading version. Design layer for GenOffice (mandatory dependency: app + skill): a 128-component SVG diagram library that recolours to the host pptx/docx, SVG slide-design theme sets bridged into native editable .pptx decks, and a themed report template for PDF output. Runs the dependency preflight, then hands to design-pack-svg or the report recipe; GenOffice builds and edits the files.'
version: 1.0.0
updated: 2026-11-25
requires:
  - genoffice (app + CLI >= 0.9.0 + skill; https://github.com/genspark-ai/genoffice)
triggers:
  - "slide deck or presentation"
  - "SVG diagram or infographic"
  - "diagram recoloured to match a pptx/docx"
  - "HTML report or reading version"
license: MIT
disable-model-invocation: true
---

# design-pack

**GenOffice builds and edits the documents; design-pack supplies the design.** Since v1.0.0 the HTML-first family (`design-pack-html`, bento, dashboard) is retired; what remains is the SVG design layer plus one report template.

## Requires GenOffice (mandatory)

1. Run `node bin/preflight.js` first. It checks the `genoffice` CLI (≥ 0.9.0; PATH or `~/.genoffice/launcher`), the genoffice skill (`~/.agents/skills/genoffice/SKILL.md`) and Chrome. On failure report the message verbatim and stop; install from https://github.com/genspark-ai/genoffice.
2. Read `~/.agents/skills/genoffice/SKILL.md` before any genoffice command (its pipeline for decks: style sheet → outline → per-page spec → create → render/audit).
3. Rules of the split: genoffice owns the file (create, convert, `docs/slides/sheet apply`, render, audit); design-pack owns palettes, SVG art, slide designs and the report template. Tested behaviour (SVG pictures are rejected, PNG works; the full report template converts to PDF but hangs on docx): `references/genoffice-integration.md`.

## Routing

| Request | Do |
| --- | --- |
| Slide deck / presentation / designed slides | [`svg/SKILL.md`](./svg/SKILL.md) → `bin/genoffice-bridge.js` → native pptx (PNG + PDF fallback for pixel-exact) |
| Diagram, infographic, figure for a deck or Word/PDF doc | [`svg/SKILL.md`](./svg/SKILL.md) → `svg-export.js --palette <host> --png` → place with genoffice |
| Edit a slide/paragraph of the user's own pptx/docx | genoffice only; add design-pack diagrams as recoloured PNGs |
| Report / reading version / MD → polished PDF | Report recipe below |
| Spreadsheet, plain Word doc, conversions | genoffice only (no design-pack asset) |
| Live data charts | `chartz`; Mermaid flow/ER → `lumen-mermaid` |
| Web app, dashboard, bento one-pager | **Not here** (retired in v1.0.0; `git checkout v0.37.0-final` for the old templates) |

## Report recipe (HTML → PDF)

`templates/report/template.html` (v2 annotation engine, tabs, theme/density/font toggles, CSS graphics pack; self-contained, ≥ 3 sections) is the themed source. Copy it, fill title/`data-report-id`/content, check it in a browser, then `genoffice convert report.html --to pdf --out report.pdf` and look at the rendered pages. For an **editable Word** report do not convert the full template (it hangs): write Markdown or a restricted HTML fragment and `genoffice create --type docx --from …`, then insert design-pack diagrams (`docs apply insert_image`). Math: render LaTeX with `bin/codecogs_render.py` (see `docs/latex-equations.md`), never MathJax/KaTeX. Mermaid is the only CDN dependency of the template.

## Files

```
design-pack/
├── SKILL.md                this router            ├── svg/SKILL.md   design-pack-svg (diagrams, decks, export)
├── bin/  preflight, genoffice-bridge, palette, compose-slide, svg-export, svg-bake, draw-slide-sets, build-*-gallery, codecogs_render
├── templates/{report,svg-slides}/    features/{report,graphics}/ (svg-library = 128 components)
├── references/  genoffice-integration.md, svg-library-notes.md, history.md
├── docs/  Pages demos (generated galleries + launcher)       └── test/  run-all.js + smoke tests
```

## Invariants

- Preflight before any work; never silently fall back from GenOffice.
- Every deliverable keeps this family's look; do not hand-roll another aesthetic.
- Decks from the PNG+PDF fallback are baked (no annotation, no live theme); the bridge's decks keep native text.
- Report template: leave its `beforeprint` re-render listener in place.

Release notes: [`references/history.md`](./references/history.md). Tests: `node test/run-all.js` (run in the background; > 120 s).
