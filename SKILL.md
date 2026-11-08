---
name: design-pack
description: 'Router for the design-pack family: review-ready HTML (report with v2 annotations, bento one-pager, htmx dashboard → design-pack-html) and designed SVG output (slide decks as PNG + merged PDF, 126-component SVG diagram/infographic library, standalone exporter → design-pack-svg). Invoke first for "HTML report", "HTML page", "annotated report", "reading version", "one-pager", "briefing", "HTML dashboard", "ops dashboard", "slide deck", "presentation", "SVG diagram", "infographic", or MD/DOCX/PDF → HTML conversion; it picks the sub-skill and template, then hands off.'
version: 0.37.0
updated: 2026-11-08
triggers:
  - "HTML report"
  - "annotated report"
  - "bento one-pager"
  - "htmx dashboard"
  - "slide deck"
  - "SVG diagram or infographic"
  - "convert MD/DOCX/PDF to HTML"
license: MIT
---

# design-pack

Router for the design-pack family. Since v0.37.0 the detailed instructions live in two sub-skills, each with its own `SKILL.md` and its own harness-visible name, so either can be symlinked and invoked on its own:

| Sub-skill | Directory | Covers |
| --- | --- | --- |
| **design-pack-html** | [`html/`](./html/SKILL.md) | report, bento and dashboard templates; the CSS graphics pack; annotation system; theme/density/font toggles |
| **design-pack-svg** | [`svg/`](./svg/SKILL.md) | svg-slides decks (composer + 13 theme sets, PNG + merged PDF); the 126-component SVG library; standalone SVG export; infographic and info-card templates |

Read the matching sub-skill's `SKILL.md` before doing the work; this file only routes. The sub-skill directories hold symlinks (`bin`, `templates`, `features`, `docs`) to the shared copies at the repo root, so relative paths in each sub-skill resolve the same from either location. Release notes and sources: [`references/history.md`](./references/history.md).

## When to invoke

**Invoke `design-pack` whenever** the user asks for an HTML artifact that is meant to be **read and reviewed by a human**, not just rendered for screen-sharing or embedding. Concrete triggers:

- "Build me an HTML report from `<path/to/file.md>`"
- "Make this Markdown into a reviewable HTML page"
- "Create a slide deck about X" → svg-slides: compose designed slides, deliver PNG + merged PDF
- "Convert this DOCX / PDF to a deck" → svg-slides (text goes through payloads; composer gates keep each slide inside its budgets)
- "I need a single-file HTML the team can comment on"
- "Generate the grant submission recap as HTML"
- "Make a reading version of my manuscript"
- "Give me a one-page briefing/recap of this sprint"
- "Summarize this into a one-pager the panel can comment on"
- "Draw me a mind map / org chart / process diagram as an SVG for my slides" → **standalone SVG**, no page (`design-pack-svg`)
- "Make me a PowerPoint / .pptx deck with these diagrams" → **no .pptx builder** (removed in v0.23.0): compose SVG slides (`design-pack-svg`) and deliver PNG + PDF (`--png --pdf --pdf-out`), or export the figures (`design-pack-svg`, standalone SVG, `--png` for raster) for the user to place
- "The slides need to look designed, not like a template" / "a cover slide with a real design" → **svg-slides designs + composer** (`design-pack-svg`)

**Do not invoke** for:

- Web apps (form handlers, login pages) → use `frontend-create` / `pi-frontend-create`
- One-shot visual diagrams (no review needed) → use `lumen-mermaid`
- Slide decks for live presentation / screen sharing only (no review) → use `lumen-slides`

Interactive data dashboards now live in **this** skill (the dashboard template) rather than being routed elsewhere — see the table below. Still route to `lumen-diagram` / `lumen-chart` if the user wants a diagram/chart *embedded inside* the report template, not a standalone dashboard page. For **real data charts** (interactive tooltips, box/violin plots, sankey, treemap, network graphs — anything beyond the pure-CSS graphics pack), route to the [chartz](https://github.com/cheahhl814/chartz) skill, render the chart there, and embed it per `features/graphics/chartz-embed.md`.

## Which sub-skill and template

| If the request is… | Sub-skill → output |
| --- | --- |
| ≥3 long sections, prose, references; "report", "manuscript reading version", "review page", MD/DOCX/PDF → HTML | `design-pack-html` → **report template** |
| One-page snapshot: "one-pager", "briefing", "recap page", sprint/weekly readout | `design-pack-html` → **bento template** |
| Live/polling data: KPIs, ops metrics, admin panel, "htmx dashboard" | `design-pack-html` → **dashboard template** |
| Any deck: "slides", "presentation", "pitch deck", "talk", a cover/chapter/figure slide that must look designed | `design-pack-svg` → **svg-slides** (compose → per-slide PNG + one merged PDF) |
| Only a diagram, infographic or figure (for PPT, Word, Figma, a poster, a paper) | `design-pack-svg` → **standalone SVG** via `bin/svg-export.js` |
| A printable or social infographic / info card | `design-pack-svg` → **info-\* / card-\* designs** |
| A "review deck" meaning a long reading artifact | `design-pack-html` → report template |
| Both a long report and a summary deck | report as canonical (`-html`), deck as a second file (`-svg`) |

Rules of thumb: count the sections first (≥3 sections each over a page → report); a graphic-only ask skips every template; when in doubt, ask the user with `ask_user_question` offering the options.

## Files in this skill

```
design-pack/
├── SKILL.md                  ← this router
├── html/  SKILL.md           ← design-pack-html (+ symlinks bin templates features docs)
├── svg/   SKILL.md           ← design-pack-svg  (+ symlinks bin templates features docs)
├── references/history.md     ← release notes, sources, SVG-library growth log
├── AGENTS.md, README.md
├── templates/{report,bento,dashboard,svg-slides,graphics}/
├── features/{report,dashboard,graphics}/   (graphics/svg-library/ holds the 126 components)
├── bin/                      ← svg-export, svg-bake, compose-slide, build-*-gallery, draw-slide-sets, codecogs_render
├── docs/                     ← Pages demos (byte-identical copies of the generated galleries)
└── test/                     ← run-all.js + smoke tests (report, bento, dashboard, graphics, svg-export, slides, skills)
```

## Hard invariants (apply to both sub-skills)

- Every HTML or SVG deliverable follows this family: never hand-roll a different aesthetic for report/deck work.
- Decks are baked artifacts (no annotation, no live theme); report and bento carry the v2 annotation engine; the dashboard intentionally has none.
- Each sub-skill's own invariants list is authoritative for its area.
