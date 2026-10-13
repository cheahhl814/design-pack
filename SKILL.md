---
name: html-template-pack
description: 'Four self-contained HTML templates — report (5-tab sticky sidebar, offset-anchored annotations, JSON export), slide deck (prev/next nav, inline annotations, JSON export), bento one-pager (2026 bento-grid snapshot briefing, full v2 annotation engine), and htmx dashboard (topbar, KPI row, sparkline, table, demo-mode mock backend). Pick report for ≥3 long sections, slide for ≤12 beats, bento for a one-page briefing, dashboard for live data. Invoke for "HTML report", "HTML deck", "HTML page", "annotated report", "review-ready HTML", "slide deck", "HTML dashboard", "htmx dashboard", "ops dashboard", "admin panel", "one-pager", "briefing", "recap page", "SVG diagram", "infographic", "ecosystem" (HTML or standalone .svg), or MD/DOCX/PDF → HTML conversion. Ships a 94-template hand-drawn SVG diagram library + a zero-dep CSS graphics pack. Report/slide/bento ship the v2 annotation system; dashboard omits it (live data is not a stable anchor). All four are dark-first with glass chrome and density + font-size toggles.'
version: 0.21.0
updated: "2026-10-13"
triggers:
  - "HTML report"
  - "annotated report"
  - "HTML slide deck"
  - "bento one-pager"
  - "htmx dashboard"
  - "ops dashboard"
  - "briefing or recap page"
  - "SVG diagram or infographic"
  - "convert MD/DOCX/PDF to HTML"
  - "review-ready HTML"
  - "PowerPoint .pptx deck with SVG figures"
  - "designed slides from SVG slide designs"
license: MIT
---

# html-template-pack

Four production-grade HTML templates, each self-contained (no external CDN dependencies beyond Google Fonts / htmx when used). The report, slide, and bento templates carry the v2 review/annotation system and the light/dark theme toggle; the dashboard template carries the theme toggle plus an htmx-driven live-data shell. All four are **dark-first** (dark is the starting theme, refined glass chrome, fluid display typography — the v0.7.0 aesthetic pass), and all four carry the density + font-size toggles from v0.6.1. The report and slide templates were battle-tested on a long-form research report with multiple sections and a companion slide deck in 2026; the bento template follows the 2026 bento-grid trend for snapshot summaries.

## When to invoke

**Invoke `html-template-pack` whenever** the user asks for an HTML artifact that is meant to be **read and reviewed by a human**, not just rendered for screen-sharing or embedding. Concrete triggers:

- "Build me an HTML report from `<path/to/file.md>`"
- "Make this Markdown into a reviewable HTML page"
- "Create a slide deck about X"
- "Convert this DOCX / PDF to a deck"
- "I need a single-file HTML the team can comment on"
- "Generate the grant submission recap as HTML"
- "Make a reading version of my manuscript"
- "Give me a one-page briefing/recap of this sprint"
- "Summarize this into a one-pager the panel can comment on"
- "Draw me a mind map / org chart / process diagram as an SVG for my slides" → **standalone SVG**, no page (see *Standalone SVG* below)
- "Make me a PowerPoint / .pptx deck with these diagrams" → **PPTX deck builder** (see *PPTX deck* below)
- "The slides need to look designed, not like a template" / "a cover slide with a real design" → **svg-slides designs + composer** (see *Slide designs* below)

**Do not invoke** for:

- Web apps (form handlers, login pages) → use `frontend-create` / `pi-frontend-create`
- One-shot visual diagrams (no review needed) → use `lumen-mermaid`
- Slide decks for live presentation / screen sharing only (no review) → use `lumen-slides`

Interactive data dashboards now live in **this** skill (the dashboard template) rather than being routed elsewhere — see the table below. Still route to `lumen-diagram` / `lumen-chart` if the user wants a diagram/chart *embedded inside* the report template, not a standalone dashboard page. For **real data charts** (interactive tooltips, box/violin plots, sankey, treemap, network graphs — anything beyond the pure-CSS graphics pack), route to the [chartz](https://github.com/cheahhl814/chartz) skill, render the chart there, and embed it per `features/graphics/chartz-embed.md`.

## Which template to use

| If the content has…                                                      | Use                                                                               | Why                                                                                                                                                                                 |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ≥3 long sections, lots of prose, charts, references, appendices          | **report template** (`templates/report/template.html`)                            | Multi-tab lumen-guide pattern handles 20+ sections cleanly. Tab navigation + Mermaid diagrams work together. Reviewer can switch tabs, leave comments per tab, export one JSON.     |
| ≤12 discrete visual beats, one idea per slide, mostly bullets + headings | **slide template** (`templates/slide/slide-template.html`)                        | Single-page deck with prev/next nav, fullscreen mode, slide-per-page print. Reviewer scrolls through slides linearly.                                                               |
| Live/polling data — KPIs, status tables, ops metrics, admin views        | **dashboard template** (`templates/dashboard/dashboard-template.html`)            | htmx-driven shell (topbar, stat row, sparkline chart, activity feed, sortable/filterable table) wired to `/api/*` endpoints. Not for review/annotation — for monitoring live state. |
| One-page snapshot briefing — sprint recap, weekly readout, one-page proposal, everything at a glance + reviewer comments | **bento template** (`templates/bento/bento-template.html`)                        | 2026 bento-grid one-pager: modular glass cards (KPIs, pure-CSS chart, progress, timeline, quote, CTA) on a dark-first surface. Full v2 annotation engine. Static snapshot — numbers live in the file, not a server. |
| Only one or a few diagrams/infographics, no page (for PPT, Word, Figma, a poster or a paper) | **svg-library component(s) → `bin/svg-export.js`** | Standalone `.svg` with the palette baked in, so it renders outside a browser. See *Standalone SVG (no HTML page)*. |
| A real PowerPoint file (`.pptx`) — slides people will edit/present in Office, with library figures | **PPTX deck builder** (`bin/make-pptx-deck.py` + `templates/deck/house-{light,dark}.pptx`) | Native vector SVG figures + PNG fallback, native editable text in real placeholders, house layouts or `--base` corporate template. See *PPTX deck (native PowerPoint)*. |
| Decks that need real slide **design** (cover, chapter break, big statement, figure slides), not just layout chrome | **svg-slides** (`templates/svg-slides/designs/` + `bin/compose-slide.js`) → one SVG per slide, or the `design` slide kind of `bin/make-pptx-deck.py` | Hand-drawn full-slide designs with slot markers. Text is budgeted and gated, svg-library graphics are inlined, colours are baked. In PPTX the design is the picture and the text stays native. See *Slide designs*. |
| Mixed: both a long-form report AND a summary deck                        | **report template as the canonical**, link to the deck as a downloadable artifact | Don't ship two HTMLs. The report template is the review surface; if the user also wants a separate deck, build that as a second file in the same project directory.                 |

### Decision rubric (use this in your first response)

0. **If the user wants only a graphic** (a diagram, infographic or figure, not a page) → **standalone SVG**: skip the templates and export from the svg-library. If no catalog component matches the requested graphic type, don't stop at "not found" — search online for suitable examples and grow the library by hand-drawing a new component (see *Standalone SVG* step 1).
1. **Count the sections in the source content.** If ≥3 sections each > 1 page, → **report template**.
2. **If mostly bullets + headings + one idea per slide**, → **slide template**.
3. **If the user wants live/polling data — metrics, status, KPIs, an admin/ops view backed by a server**, → **dashboard template**.
4. **If user says "report" or "manuscript reading version" or "review page"**, → **report template**.
5. **If user says "deck" or "slides" or "presentation"**, → **slide template** (unless they say "review deck", which means a long-form reading artifact — use the report template).
6. **If user says "dashboard", "admin panel", "ops view", "htmx dashboard", or wants filtering/sorting/polling against live data**, → **dashboard template**.
7. **If the content is a one-page snapshot summary** — sprint recap, weekly readout, one-page proposal, status snapshot — where the reader should see everything at a glance and leave inline review notes → **bento template**. (If it grows past one page or needs long prose sections, it graduates to the report template; if the numbers need to refresh from a server, it's a dashboard.)
8. **If user says "one-pager", "briefing", "snapshot", "recap page", or "everything on one page"** → bento template.
9. **If the user explicitly wants a `.pptx` / PowerPoint file** (not an HTML deck) → **PPTX deck builder** (see *PPTX deck*). "Deck" or "slides" alone still means the HTML slide template.
   - **Decks that need real slide DESIGN** (not just layout chrome): use `templates/svg-slides` + `compose-slide.js`, then the `design` kind in `make-pptx-deck.py`. For standalone SVG slides, the composer alone is enough. House layouts and design slides mix in one spec.
10. **When in doubt, ask the user** with `ask_user_question` offering the template options.

## Files in this skill

```
~/.pi/agent/skills/html-template-pack/
├── SKILL.md                                    ← you are here
├── AGENTS.md                                   ← how the agent should auto-apply this skill
├── templates/
│   ├── report/
│   │   └── template.html                       ← finalized report template (812 lines)
│   ├── slide/
│   │   └── slide-template.html                 ← finalized slide template (817 lines)
│   ├── bento/
│   │   └── bento-template.html                 ← bento one-pager (2026 bento grid, dark-first glass, v2 annotation engine inline)
│   ├── dashboard/
│   │   └── dashboard-template.html              ← finalized dashboard template (htmx + demo-mode mock backend)
│   ├── svg-slides/                             ← v0.21.0 slide-design library (see templates/svg-slides/README.md)
│   │   ├── README.md                           ← slot-marker spec, layout rule, gates, per-design slot tables
│   │   ├── designs/*.svg                       ← 6 canonical hand-drawn 1280×720 designs (slot-marked)
│   │   ├── samples.json                        ← one sample payload per design (gallery + tests)
│   │   └── gallery.html                        ← generated preview (node bin/build-slides-gallery.js)
│   ├── deck/                                   ← v0.18.0 PPTX deck builder assets (see templates/deck/README.md)
│   │   ├── house-light.pptx / house-dark.pptx   ← house bases: 11 layouts (v0.19.0), 16:9, token-mapped theme, native footer fields, decor on master/layouts
│   │   ├── author-base.py                      ← one-time OOXML author script for the bases
│   │   └── chrome/                             ← deck decor SVGs (title art, section frame, footer strip + v0.19.0 science set: molecule corner, helix strip, KPI medallion, closing orbit, accent band; not catalog components)
│   └── graphics/
│       ├── graphics.css                        ← v0.8.0 shared graphics pack (donut, gauge, bars, heatmap, flow, mstrip, compare, pull-quote, motion; inlined into each template)
│       └── snippets.html                       ← copy-paste reference for every component
├── features/
│   ├── graphics/
│   │   └── chartz-embed.md                     ← v0.10.0 how to embed chartz-rendered data charts (iframe pattern, single-file exception)
│   │   └── svg-library/
│   │       ├── README.md                       ← v0.16.0 SVG diagram library: conventions + catalog (94 components)
│   │       ├── gallery.html                    ← generated preview page (node bin/build-svg-gallery.js)
│   │       └── svg/                            ← canonical .svg component files (94 infographic templates)
│   ├── report/
│   │   ├── highlight-annotate.js               ← v2 offset-anchored annotations (602 lines)
│   │   ├── annotate.css                        ← annotation styles (216 lines)
│   │   ├── theme-toggle.js                     ← light/dark toggle (66 lines)
│   │   └── theme-toggle.css                    ← toggle styles (16 lines)
│   ├── slide/
│   │   ├── highlight-annotate.js               ← same v2 engine, available as upgrade
│   │   ├── annotate.css                        ← same v2 styles
│   │   ├── theme-toggle.js                     ← same toggle
│   │   └── theme-toggle.css                    ← same styles
│   └── dashboard/
│       ├── theme-toggle.js                     ← same toggle engine (no fixed positioning; lives in the topbar)
│       └── theme-toggle.css                    ← same toggle styles, unpositioned
├── bin/
│   ├── svg-export.js                           ← bake a library SVG to a renderer-safe standalone .svg
│   ├── svg-bake.js                             ← v0.21.0 shared token → hex bake logic (svg-export + compose-slide)
│   ├── compose-slide.js                        ← v0.21.0 design + payload → composed SVG slide + native-text sidecar
│   ├── build-slides-gallery.js                 ← v0.21.0 regenerates templates/svg-slides/gallery.html
│   ├── make-pptx-deck.py                       ← v0.18.0 spec → .pptx with native SVG figures
│   └── pptx-preview.py                         ← v0.18.0 proxy preview (pptx → HTML → Chrome PNGs)
└── test/
    ├── smoke-test-report.js
    ├── smoke-test-slide.js
    ├── smoke-test-dashboard.js
    ├── smoke-test-pptx-deck.py                 ← v0.18.0 structural QA for the deck builder (run by run-all.js)
    ├── smoke-test-slides.py                    ← v0.21.0 design QA + composer gates + design slides in pptx (run by run-all.js)
    └── run-all.js
```

## The four templates at a glance

### Report template (`templates/report/template.html`)

**Pattern**: left-side sticky sidebar (240px, 5 tabs: Summary / Metrics / Methodology / Findings / Annotations) with icon + label per tab; collapses to horizontal strip on screens `<720px`. Each tab maps to a `<section data-panel="..." id="panel-...">` panel in the content area. Active tab gets a coloured left border (`--accent`) and dimmed background (`--accent-dim`).

**Annotation system**: **v2** (offset-anchored, multi-tab aware, JSON import+export, orphaned-state detection, **4 annotation types**: comment / delete / insert / replace). The UI uses `mark.annot` / `#annot-toggle` / `.annot-drawer` / `.annot-toolbar` / `#annot-editor`. Panel uses `data-annot-storage` to namespace by report. Types: comment, delete, insert, replace — delete/replace strike the original inline and show the suggested replacement; insert drops a caret marker with the proposed text. The v2 engine's `jumpTo` activates the correct tab/panel via `[data-tab]` buttons before scrolling — seamless cross-tab navigation from the annotation drawer.

**Component library**: shared with the slide template (token-driven, so the same markup works in either template's brand palette): `.card` (with `.highlight`/`.warning`/`.success`/`.info` variants), `.badge` (with `.green`/`.teal`/`.amber`/`.blue` variants), `.stat-card` + `.stat-grid` for KPI blocks, `table` with navy header strip and slate borders, `.layer-stack` (with `.layer-1`..`.layer-5` color variants) for multi-stage processes, `.chain-step` + `.chain-arrow` for causal narratives, and the graphics-pack diagram set (`.flow` flowchart, `.mstrip` milestones, `.funnel`, `.venn`/`.venn.triple`, `.swot`, `.otree` org tree, `.cycle` loop — all zero-dependency, see `features/graphics/graphics.css` headers for usage), `.grid-2` / `.grid-3` for card layouts, `<pre><code>` code blocks (report + slide only; token-themed, no syntax highlighter, scroll on screen / wrap in print, annotatable), `.eyebrow` (with `.eyebrow-teal`/`.coral`/`.amber`/`.green`/`.navy` variants) for section labels, `.badge-line` for above-title pills, `.meta-card` + `.meta-grid` for project/event metadata, Mermaid diagrams (Mermaid 10+ via CDN), theme toggle button.

**Print**: `@media print` hides sidebar, shows all panels sequentially with page breaks. `beforeprint` event re-renders Mermaid. Tested with `google-chrome --headless --print-to-pdf`.

**Self-contained**: All CSS inline, scripts are local (in `features/report/`), Mermaid via CDN. Single-file output when you copy the CSS/JS in.

**Best for**: long-form research reports, grant progress reports, manuscript reading versions, gap analyses, EOI drafts.

### Slide template (`templates/slide/slide-template.html`)

**Pattern**: single-page prev/next deck with dots, counter, fullscreen, home button, slide-per-page print.

**Annotation system**: **v2** (offset-anchored, 4 types: comment/delete/insert/replace, JSON import+export, orphaned-state detection, per-slide `data-panel` for cross-slide navigation). Inline CSS + JS (inlined from `features/slide/{annotate.css,highlight-annotate.js}`). The UI uses `mark.annot` / `.annot-toggle` / `.annot-toolbar` / `.annot-editor` / `.annot-drawer` / `.annot-insert-toggle`. Panel uses localStorage key `annotations:slide-template` (set via `data-annot-storage` on `<body>`; change the body attribute to namespace per deck). A small inline adapter wraps `__deckGoTo` so clicking a drawer item switches slides first, then scrollIntoView fires.

**Component library**: tokens (slate-50 to slate-900 + brand teal/coral/amber/navy), `.card.highlight/warning/success/info`, `.badge-*`, `.stat-card`, `.layer-stack`, `.chain-step`, `+ 2 component reference slides` showing every reusable block.

**Print**: `@media print` hides UI chrome and forces `slide { position: static; page-break-after: always; height: 100vh; }` — one slide per page PDF.

**Self-contained**: All CSS inline, all JS inline. No external dependencies. Drop the file anywhere.

**Best for**: pitch decks, conference talks, lightning talks, research summary decks, internal readouts (≤12 slides).

### Bento brief template (`templates/bento/bento-template.html`)

**Pattern**: single-page bento grid — a hero header (eyebrow pill, gradient display title, lede, meta chips) above a 12-column grid of modular glass cards. Card variants: KPI row (`.kpi-row`), pure-CSS bar chart (`.bars`), progress list (`.progress-item`), gradient quote card (`.quote`), timeline (`.tl`), key-list (`.key-list`), gradient CTA (`.cta`); spans `.span-4`–`.span-12` (collapse to full width <980px). Dark-first glass: translucent `color-mix` surfaces + `backdrop-filter`, ambient radial accent glow behind the grid, hover lift + accent-glow shadow.

**Annotation system**: **v2** — the full engine inlined from the slide template (the token-mapping `:root` block was stripped; the bento defines the generic token names directly). Select text → comment/ask/delete/replace/format; drawer with JSON export/import; localStorage namespace via `data-annot-storage="bento-template"` on `<body>` (change it per brief).

**Chrome parity**: theme toggle (◐), density toggle (▤/▥ — `[data-density]` drives `--bento-pad`/`--bento-gap`/`--bento-kpi-gap`), font-size toggle (S/M/L root scaling), all with bento-specific storage keys (`bento-density`, `bento-font-size`) and print resets.

**No JS dependencies**: the bar chart is pure CSS (`height` percentages), no Mermaid, no htmx — the most dependency-free of the four.

**Print**: `@media print` hides chrome, flattens cards (break-inside: avoid), resets density/font.

**Best for**: sprint recaps, weekly readouts, one-page proposals, status snapshots for review panels — anything the reader should grasp in 60 seconds and annotate inline.

### Dashboard template (`templates/dashboard/dashboard-template.html`)

**Pattern**: fixed topbar + sidebar nav + content grid — KPI stat row, a sparkline chart panel, a recent-activity feed, and a sortable/filterable/searchable data table. Everything is wired with **htmx** (`hx-get` + `hx-trigger="load, every Ns"` for polling, `hx-trigger="keyup changed delay:300ms"` for debounced search, `hx-vals` for carrying sort state) instead of a JS framework.

**Backend contract**: the four endpoints (`/api/stats`, `/api/chart`, `/api/activity`, `/api/table`) must return **HTML fragments**, not JSON — htmx swaps whatever comes back straight into the target element. `/api/chart` returns a ready-to-swap `<svg>`; the others return markup matching the structure already inside their target (stat cards, `<li>` feed items, `<tr>` table rows).

**Demo mode (ships on by default)**: the template is *not* wired to a real server out of the box. A `data-demo-mode` attribute on `<body>` plus a small `XMLHttpRequest` shim (marked with `« BEGIN/END DEMO MODE »` banners near the end of `<body>`) intercepts every request to `/api/*` and answers it from an embedded mock dataset (`DASHBOARD_MOCK`), so the file opens in a browser and is fully interactive — filtering, sorting, polling, pause/resume — before any backend exists. **Delete the demo-mode block and the `data-demo-mode` attribute once a real backend is wired**; every `hx-get`/`hx-trigger`/`hx-vals` attribute in the markup is already what you'd point at production routes and does not change.

**Component library**: same design tokens as the report/slide templates (`--bg`, `--surface`, `--accent`, etc.) plus dashboard-only additions: `.stat-card`, `.panel`, `.chart-wrap` (inline SVG sparkline), `.feed` (activity list), `.badge.success/warning/error/info`, sortable `<th data-sort-key>`.

**Annotation system**: **none, intentionally**. Live/polling data is not a stable annotation target — highlighted text would shift underneath its anchor on every refresh. If the user needs reviewer comments on a snapshot of dashboard data, export a static report instead (report template), don't annotate this page.

**Theme toggle**: same engine as the other two templates, but unpositioned (`position: fixed` removed) since it sits inline in the topbar rather than floating over content.

**Self-contained**: all CSS/JS inline or local (`features/dashboard/`) except the htmx CDN script, which is pinned to `htmx.org@2.0.4/dist/htmx.min.js` with a verified SRI `integrity` hash — the one external dependency, same precedent as Mermaid for the report template. Never drop the `integrity`/`crossorigin` attributes when bumping the version; recompute the hash (`curl` the exact file, `openssl dgst -sha384 -binary | openssl base64 -A`) and update both.

**Best for**: ops dashboards, admin panels, status pages, internal metrics views — anything meant to be watched/interacted with live, not read and annotated.

## Graphics pack (`features/graphics/graphics.css` + `snippets.html`)

In **v0.8.0**, all four templates gain a shared **zero-dependency graphics pack** — eleven components, all pure CSS/HTML (no JS, no canvas, no SVG libraries). The pack lives in `features/graphics/graphics.css` (inlined into each template's `<style>` block at build time) with a copy-paste reference at `features/graphics/snippets.html`. The same component class renders correctly in any template because the styles only reference shared design tokens (`--accent`, `--surface`, `--teal`, `--amber`, etc.) that every template defines.

| | Component | Class | One-line technique |
|---|---|---|---|
| A1 | **Donut / pie chart** | `.donut` + `.legend` | `conic-gradient()` with 4 slice `--var`s + sr-only `<table>` fallback |
| A2 | **Radial gauge** | `.gauge` (variants `.g-green .g-amber .g-coral`) | conic + radial mask; one `--progress` per ring; `@property` sweep via `.animated` |
| A3 | **Horizontal bars** | `.hbar` + `.h-fill` | grid rows; `width: var(--w)`; colour via `.c-teal .c-amber .c-coral .c-green` |
| A4 | **Heatmap table** | `.heat` on a real `<table>` | `td[data-level="0-4"]` colors; numbers stay visible (never color-alone) |
| A5 | **Data bars in cells** | `.db-cell` + `.db-bar` | bar behind number via `--v` |
| B1 | **Pure-CSS flowchart** | `.flow` on `<ol>` + `.flow-node` (.start .end .decision) | nested lists + CSS connectors; decision branch via `.flow-branch` |
| B2 | **Milestone strip** | `.mstrip` on `<ol>` | flex row; `.done` / `.now` / default states |
| C1 | **Comparison table** | `.compare` on `<table>` + `.rec-col` | sticky header; ✓/— via `.yes`/`.no`; mobile stacks to cards via `data-label` |
| C2 | **Pull-quote** | `.pull-quote` on `<blockquote>` | oversized opening quote, accent left border |
| D1 | **Reading progress bar** | `.reading-progress` | `animation-timeline: scroll()` |
| D2 | **Scroll-driven reveal** | `.reveal` | `animation-timeline: view()` + `animation-range: entry` |
| D3 | **Gauge sweep** | `.gauge.animated` | `@property --sweep` interpolates conic-gradient stops |

**Accessibility baked in**: every visual chart is either built *from* a real `<table>` (heatmap, data bars) or paired with a visually-hidden `<table>` fallback (donut); `role="img"` + `aria-label` on conic charts; numbers stay visible in heatmap cells; motion is `@supports` + `prefers-reduced-motion` guarded, and the static fallback = the final visible state.

**Motion pack details**: each motion component is opt-in for both browser support (`@supports (animation-timeline: …)`) and user preference (`@media (prefers-reduced-motion: no-preference)`). Browsers without `animation-timeline` support (~15% in late 2026) just see the final state — no animation, no fallback JS needed. The reading-progress bar drops in anywhere as a single `<div class="reading-progress" aria-hidden="true"></div>`. The reveal class is just `class="reveal"` on any block.

**Print**: the graphics pack includes `@media print` rules — reading-progress bar hidden, reveals shown at their final state, gauge sweep frozen at the final value, milestone strip dots monochrome.

## SVG diagram library (`features/graphics/svg-library/` + `bin/build-svg-gallery.js` + `bin/svg-export.js`)

Grown over three releases: **10 in v0.11.0** → 20 in v0.12.0 → **40 in v0.13.0** → 41 (metro-map, after the nf-core pipeline metro maps) → 51 (10 layouts from Figma/Venngage/Canva/Pinterest infographic galleries) → 53 (two illustrative maps: dotted world from Natural Earth, Europe tile grid; precise maps → chartz GeoMap) → 61 (8 climate & environment visuals; numbers are placeholders except the IPCC/Paris thermometer) → **71 in v0.14.0** (10 lab & life-science visuals: DNA, central dogma, membrane, Punnett, mutations, gel, 96-well plate) → **77 in v0.15.0** (6 cladograms: trait ladder, labelled parts, character matrix, nested sets, circular fan, one tree three ways) → **93 in v0.16.0** (16 science & tech visuals: 7 ecosystems, 4 earth & physical science, 3 lab & biotech, 2 technology) → 94 (protocol-loop-steps: 8-station bench protocol with a reuse loop): a sibling to the CSS graphics pack — **hand-drawn inline SVG infographic templates** for explanatory/summary visuals — concept diagrams the CSS pack doesn't cover, with the hand-drawn quality users responded well to (the DNA-helix deck-motif precedent).

| # | Component (`svg/*.svg`) | Shows | When to use |
|---|---|---|---|
| 1 | `flow-pipeline` | 4-step horizontal process + feedback loop | delivery/analysis pipelines, workflows |
| 2 | `cycle-loop` | 4-node clockwise loop | iterative processes, plan-build-measure-learn |
| 3 | `hub-spoke` | central topic + 6 satellites | concept maps, ecosystems, capability overviews |
| 4 | `pyramid-hierarchy` | 4-level pyramid + side annotations | strategy→task hierarchies, abstraction tiers |
| 5 | `venn-overlap` | 2-way overlap with shared zone | shared vs unique traits of two things |
| 6 | `quadrant-matrix` | 2×2 matrix, dashed axes, tinted cells | impact/effort prioritisation, risk maps |
| 7 | `funnel-stages` | 4-stage narrowing funnel + % callouts | sales/user funnels, cohort retention |
| 8 | `roadmap-timeline` | spine + 5 milestones + alternating callouts | roadmaps, phased timelines |
| 9 | `fishbone-causal` | 4 cause categories → outcome box | root-cause analysis, driver maps |
| 10 | `layer-stack` | 4-layer vertical stack + captions | architecture stacks, dependency tiers |
| 11 | `target-bullseye` | concentric priority rings around one goal, dart in the centre | goal hierarchies, priority layers, OKR maps |
| 12 | `staircase-steps` | 5 rising steps + goal flag on top | maturity models, capability ladders, adoption stages |
| 13 | `chevron-progression` | 5 linked chevron phases with durations + activities | project phases, methodology stages, programme timelines |
| 14 | `iceberg-depth` | visible tip vs hidden mass below a dashed waterline | visible symptoms vs underlying causes, hidden complexity |
| 15 | `balance-scale` | tilted trade-off scale with verdict + factors under each pan | pros vs cons, trade-off decisions, weigh-the-evidence |
| 16 | `radar-spider` | 6-axis radar: current (filled) vs target (dashed) + largest-gap note | capability profiling, before/after dimensions, gap summaries |
| 17 | `journey-map` | stages + touchpoints + emotion curve with face markers | user/customer journeys, experience audits, process sentiment |
| 18 | `converging-forces` | four corner drivers with arrows pushing on one central subject | stakeholder/market forces, pressure maps, drivers of change |
| 19 | `puzzle-pieces` | 2×2 interlocking jigsaw with one piece lifted out | parts-of-a-whole, integration stories, missing-element framing |
| 20 | `gear-mechanism` | three meshing gears with turn-direction arrows | what-drives-what, causal mechanism, process interactions |
| 21 | `timeline-vertical` | central spine, 5 dated events alternating left/right | chronologies, event history, evolution narratives |
| 22 | `swimlane-gantt` | 4 workstream lanes × 6 quarters, today marker + GA milestone | multi-stream project plans, cross-team roadmaps |
| 23 | `honeycomb-cluster` | 7 packed hexagons, one solid focus cell | close-packing sets, capability clusters, team structures |
| 24 | `dual-hub` | two option hubs, 3 satellites each, bridged by a shared goal | comparing two approaches around a shared constraint |
| 25 | `petal-cycle` | 6 leaf petals around a hub with clockwise cues | 6-part cycles, service loops, seasonal rounds |
| 26 | `decision-tree` | root question → yes/no → 2 follow-ups → 4 outcomes | branching logic, decision guidance, triage paths |
| 27 | `snake-path` | winding road, 7 stations, U-turn, goal flag | long processes (7+ steps), journeys with direction changes |
| 28 | `onion-layers` | half-onion of 4 nested scopes with leader descriptions | nesting/containment: scopes, audiences, contexts |
| 29 | `pillars-foundation` | vision roof, 4 named pillars, foundation slab | strategy frameworks, programmes standing on capabilities |
| 30 | `versus-columns` | A vs B cards, VS badge, check/dash rows, best-for footer | option comparison, recommendation framing |
| 31 | `lightbulb-layers` | bulb sliced into 4 numbered bands + description cards | idea anatomy, innovation layers, concept decomposition |
| 32 | `matrix-nine-box` | 3×3 graded matrix, cells warming coral→green | portfolio grading, risk/impact 9-cell grids |
| 33 | `s-curve-adoption` | logistic S-curve, 4 phase bands, "we are here" marker | adoption lifecycle, maturity/effort curves |
| 34 | `growth-tree` | canopy outcomes fed by labelled roots below a soil line | outcomes ↔ enablers, drivers of growth, capability→impact |
| 35 | `spiral-growth` | outward spiral through 5 numbered stations + legend | compounding/iterative growth, escalation loops |
| 36 | `domino-chain` | 5 growing dominoes, first tipping, chain-reaction arc | chain reactions, cascade risk, dependency triggers |
| 37 | `network-mesh` | core with strong solid ties + weak dashed ties to sized nodes | ecosystems, influence maps, relationship strength |
| 38 | `merge-paths` | 3 streams curving into one arrow → single outcome | convergence: inputs → integration, synthesis stories |
| 39 | `five-w-agenda` | Who/What/When/Where/Why tiles with answers + tags | briefing skeletons, case summaries, incident reports |
| 40 | `orbit-satellites` | core + 3 dashed orbits with distance legend | proximity/closeness: partner tiers, adjacency, distance-from-core |
| 41 | `metro-map` | nf-core-style transit map: bundled routes, tool detour, split/re-merge, dotted optional spur, file icons | bioinformatics/data pipelines with alternative tools or routes |
| 42 | `hanging-tags` | 5 round tags on strings from a rail | five-step processes, playful step lists, feature tags |
| 43 | `helix-ribbon-timeline` | twisted ribbon with 5 dated turn-point events | company histories, growth stories, milestone timelines |
| 44 | `ring-chain` | zig-zag chain of 5 linked rings | linked skills/capabilities, dependent steps, value chains |
| 45 | `semicircle-segments` | half donut, 3 shares + hub total | survey splits, share-of-whole summaries |
| 46 | `wavy-timeline` | wavy pencil path, 5 pins, paper plane | project phases, light-touch roadmaps, onboarding journeys |
| 47 | `pictogram-grid` | 100 person icons, N highlighted | "n in 100" statistics, adoption/prevalence callouts |
| 48 | `mind-map` | centre + 4 branches × 3 sub-topics | brainstorms, topic overviews, planning maps |
| 49 | `eight-step-ring` | 8 arrow segments in a ring | 8-step processes, dmaic-style cycles, continuous improvement |
| 50 | `radial-bars` | 4 concentric progress arcs + takeaway | funnel/progress percentages, goal attainment |
| 51 | `org-chart` | lead → 3 heads → 6 reports | org structures, team ownership, reporting lines |
| 52 | `world-dot-map` | dotted world, 4 pins + callout cards | global footprint, office/site locations, regional hubs |
| 53 | `europe-tile-grid` | equal-tile Europe, category fills | country-level status/coverage across europe where small states must stay visible |
| 54 | `warming-stripes` | yearly stripes, blue → red | long-run temperature change at a glance |
| 55 | `climate-zones-globe` | latitude bands on a globe | climate zones, latitude-driven patterns, biome overviews |
| 56 | `sector-landscape` | sector silhouettes + shares | emissions or impacts by sector |
| 57 | `sea-level-rise` | coast section, 2 scenario levels | coastal exposure, flood risk, adaptation briefs |
| 58 | `carbon-cycle` | atmosphere ↔ land/ocean flows | explaining sources vs sinks, net-zero logic, nature-based solutions |
| 59 | `thermometer-gauge` | thermometer + Paris thresholds | climate targets, carbon-budget framing |
| 60 | `energy-mix-icons` | 5 energy icons + share bars | energy or capacity mix, technology shares |
| 61 | `planet-actions` | 6 actions → planet | climate actions, sustainability pledges, behaviour-change tips |
| 62 | `dna-helix-steps` | DNA helix + 6 callouts | sequencing or genomics workflows, six-step processes with a dna theme |
| 63 | `central-dogma` | DNA → mRNA → protein (real codons) | teaching gene expression, explaining what a sequence encodes |
| 64 | `cell-to-dna-zoom` | cell → nucleus → chromosome → DNA | explaining biological scale, where dna lives |
| 65 | `lab-glassware-steps` | glassware protocol steps | lab protocols, sample-processing workflows, methods overviews |
| 66 | `cell-membrane` | labelled bilayer cross-section | teaching membrane structure, transport and signalling context |
| 67 | `punnett-square` | Aa × Aa Punnett square + ratios | teaching mendelian inheritance, explaining carrier risk |
| 68 | `mutation-types` | base tiles: substitution / indels | teaching point mutations, explaining variant effects |
| 69 | `gel-electrophoresis` | ladder + 5 lanes, log-spaced | pcr checks, methods figures, teaching how gels separate dna |
| 70 | `well-plate-layout` | 96-well plate map + legend | elisa/qpcr plate layouts, protocol planning |
| 71 | `scientific-method` | 6-step cycle around a flask | teaching the scientific method, research-process overviews |
| 72 | `cladogram-ladder` | diagonal cladogram + trait ticks | teaching shared derived traits, evolution lessons, classification overviews |
| 73 | `cladogram-anatomy` | labelled parts of a cladogram | teaching how to read a tree, glossary figures for phylogeny sections |
| 74 | `cladogram-matrix` | trait matrix → cladogram | showing how a tree is built from traits, methods figures, plant evolution |
| 75 | `nested-clades` | nested sets ↔ slanted tree | explaining clades as nested groups, the venn-to-tree link |
| 76 | `circular-cladogram` | 16-taxon fan tree, clade colours | big-picture trees of life, many-taxa overviews (real trees from data → chartz phylotree) |
| 77 | `cladogram-styles` | same tree, three drawings | teaching that branch shape and tip order carry no meaning, reading tree diagrams |
| 78 | `food-web` | food web, energy-flow arrows | teaching energy flow, ecosystem overviews, biodiversity briefs |
| 79 | `trophic-pyramid` | energy pyramid + 10% rule | teaching trophic levels, energy transfer, why food chains are short |
| 80 | `water-cycle` | landscape water cycle | teaching the hydrological cycle, water-resource and catchment briefs |
| 81 | `nitrogen-cycle` | N2 fixation → nitrification → denitrification | teaching nutrient cycles, soil and agriculture briefs, eutrophication context |
| 82 | `symbiosis-types` | three symbioses, +/0/− badges | teaching species interactions, ecology lessons |
| 83 | `ecological-succession` | rock → lichens → shrubs → forest | teaching succession, restoration and land-recovery stories |
| 84 | `ocean-zones` | pelagic zones by depth | marine-science lessons, deep-sea and sampling-depth context |
| 85 | `plate-boundaries` | three plate boundaries | teaching plate tectonics, hazard and geology overviews |
| 86 | `reaction-coordinate` | energy profile, Ea, ΔH, catalyst | teaching kinetics and catalysis, enzyme and catalyst explainers |
| 87 | `states-of-matter` | particle models + phase changes | teaching states of matter and phase changes |
| 88 | `em-spectrum` | log λ spectrum, visible expanded | teaching light and radiation, remote-sensing and imaging context |
| 89 | `crispr-editing` | Cas9 cut → NHEJ vs HDR | explaining gene editing, methods overviews, biotech briefs |
| 90 | `immune-response` | innate vs adaptive + antibody | teaching immunology, vaccine explainers |
| 91 | `pcr-thermal-cycle` | thermal profile + 2ⁿ inset | pcr and qpcr methods, teaching amplification |
| 92 | `transformer-block` | encoder–decoder schematic | explaining llm / transformer architecture at a schematic level |
| 93 | `api-request-lifecycle` | client → gateway → services → DB | explaining backend request flow, api docs, onboarding |
| 94 | `protocol-loop-steps` | snaking 8-station bench protocol + reuse loop | lab/bench protocols with sequential reuse cycles, any 8-step workflow that repeats |

**Routing within the graphics systems**: real/interactive data → `chartz`; real-data static charts → CSS graphics pack A-block; Mermaid flow/sequence/ER → Mermaid CDN; **concept/infographic diagrams → this SVG library**; decorative background motifs → hand-draw per the svg-library conventions (token-driven, `aria-hidden`, zero text nodes). If the svg-library has no component for the requested kind, research online first (see *Standalone SVG* step 1) and add a new component rather than substituting a mismatched one.

**Usage**: open `features/graphics/svg-library/gallery.html` in a browser (token-driven, ◐ theme toggle to preview both palettes), pick a component, copy the inline `<svg>`, replace the placeholder `<text>` labels. The `svg/*.svg` files are canonical; `gallery.html` is generated — after editing or adding a component run `node bin/build-svg-gallery.js` (it validates: well-formed XML, `role="img"` + `aria-label` + `<title>`, `viewBox 0 0 800 450`, **no `id=` / `<defs>` / `<marker>` / `<filter>` / `<script>`** so several components can be pasted into one page safely). Colors are `var(--token, #fallback)` **inside `style` attributes** (var() does not work in SVG presentation attributes) + `color-mix()` tints, so the same SVG adapts to every template palette and both themes with zero per-use edits. Full conventions + add-a-component workflow: `features/graphics/svg-library/README.md`.

### Standalone SVG (no HTML page)

When the user wants **only a diagram or a few graphics**, for a PowerPoint/Keynote/Google Slides deck, a Word doc, a poster, Figma, or a manuscript figure, **do not build a template page**. Deliver `.svg` files:

1. Pick the component(s) by intent from the catalog above. **If no component matches the requested graphic type, wire in online search before giving up:** search for reference examples of that graphic type (2–4 varied queries, e.g. the type name + "diagram", "infographic", "science template"), curate the best 2–4 source URLs (fetch them to see the actual layouts), then hand-draw a **new svg-library component** from those references following *Adding a new component* in `features/graphics/svg-library/README.md` (its step 0 is this research pass). Add the catalog row, add the component to the delivery, and rebuild (`node bin/build-svg-gallery.js`) + re-run tests (`node test/run-all.js`) so the library grows every time the user asks for a graphic kind it lacks. Known-fetchable source sites: BioRender template gallery, Wikimedia Commons diagrams, USGS/NOAA/NPS, edu.rsc.org, Kuraplan, LivePhysics infographics, Mind the Graph. Sites that 403 (bot walls) or return empty: Magnific, Shutterstock, Dreamstime, Adobe Stock, Britannica, Dribbble — don't burn fetches on them.
2. Copy `features/graphics/svg-library/svg/<name>.svg` into the user's working directory and edit the `<text>` labels, `aria-label` and `<title>` there (same rules as pasting into a page).
3. Export: `node <skill>/bin/svg-export.js <edited>.svg [--theme light|dark] --out <dir>`. Library files rely on `var()` + `color-mix()`, which **only browsers resolve**; PowerPoint, Word, Inkscape, Illustrator, Figma import and cairo/rsvg converters render them black or blank. The export bakes one palette into plain hex + `fill-opacity`/`stroke-opacity`, strips the authoring comment, and sets `width="800" height="450"`. `--theme dark` also paints a background, because light text on a transparent canvas disappears on white pages.
4. Hand over the exported file(s). Need PNG? Render the exported file (e.g. `google-chrome --headless --screenshot`), never the raw library file.

### PPTX deck (native PowerPoint)

When the deliverable is a **`.pptx` file**, not an HTML page, build it with the deck builder. It needs the optional Python deps `python-pptx lxml cairosvg pillow`, plus `node`. Full spec, layouts and pitfalls: `templates/deck/README.md`.

1. Write a JSON (or YAML) spec. There are 11 layouts: `title`, `section`, `figure` (one figure + caption), `two-figures`, `bullets`, `agenda` (1–6 `items`), `quote` (`quote` + `attribution`), `table` (`header` + `rows`, ≤8×12), `kpi` (`value`, `label`, `delta`, ≤3 `stats`), `image-text` (`figure` + `bullets`/`text`, `side` left|right) and `closing` (`contact` lines). Each slide can carry `notes` and `credits`, and each figure an optional `alt`. Deck-level `footer`, `date` (fixed or `"auto"`) and `slide_numbers` (default on) fill native footer fields on inner slides. Deck-level `credits` go to the last slide's notes. A figure is an svg-library component name or a path to an edited `.svg`.
2. `python3 <skill>/bin/make-pptx-deck.py spec.json -o deck.pptx [--theme light|dark] [--base corp.pptx]`. Figures are baked through `svg-export.js`, embedded as native SVG (`svgBlip`) with a 2400/1800 px PNG fallback, contain-fitted into the picture rectangle, and given alt text. Titles, bullets, captions and notes stay native text in real placeholders, and unused placeholders are removed. `--base` builds on a corporate template (layouts are matched by name, then by layout type).
3. Preview without Office: `python3 <skill>/bin/pptx-preview.py deck.pptx --out <dir>` renders every slide as HTML and screenshots it with headless Chrome. It is a proxy, so look at composition, overlaps and red overflow outlines, not exact typography.
4. Tell the user honestly that no Office renderer was run. Checking in PowerPoint Online / Google Slides / LibreOffice is a **manual, once-per-theme-release gate**. Don't claim a deck is "verified in PowerPoint".

Never put slide titles in free textboxes, and never bake text (titles, bullets, captions, notes, tables) into a background image. Decor belongs on the master/layouts (`templates/deck/chrome/`), not on individual slides. (Design slides below are the one deliberate exception to "no free textboxes": the design *is* the slide, and every text slot is still a native, editable text box.)

### Slide designs (svg-slides + composer)

**Routing:** decks that need real slide **design**, not just layout chrome → `templates/svg-slides` + `bin/compose-slide.js` → the `make-pptx-deck.py` `design` kind. Full spec: `templates/svg-slides/README.md`. Six designs ship: `title-hero`, `section-break`, `big-statement`, `content-two-col`, `full-diagram`, `closing`. Preview them in `templates/svg-slides/gallery.html`.

1. Pick a design and read its slot table (name · kind · box · size · **budget** = lines × chars per line).
2. Write the payload. Text slots take a string or an array of lines. **You break the lines**, since SVG cannot wrap. Graphic slots take an svg-library name or an id-free `.svg` path.
3. SVG out: `node <skill>/bin/compose-slide.js <design> --payload p.json [--theme light|dark] --out <dir>`. This writes `<name>.svg` (finished, baked, 1280×720), `<name>.bg.svg` (no text) and `<name>.slides.json` (native-text contract).
4. PPTX out: put `{"design": "<name>", "payload": {...}}` slides in the deck spec. They become a full-bleed picture of the text-free background plus one native text box per text slot (theme fonts, baked colour, exact geometry). Footer fields are added unless the design paints its own bottom edge.
5. When a gate fires (`TEXT-OVERFLOW`, `SLOT-UNKNOWN`, `SLOT-MISSING`, …), **shorten or re-break the text**. Never edit a design's budget to make a payload fit.
6. A new archetype? Follow *Adding a new design* in the svg-slides README: research 2–4 examples first, draw the design slot-marked, add a sample payload and a slot table, then rebuild the gallery and run the tests.

## Pipeline (Decide → Copy → Adapt → Render → Wire annotation / backend)

1. **Decide** — apply the decision rubric above. If unsure, ask the user.
2. **Copy** — copy `templates/<report|slide|dashboard>/*.html` to the project's working directory. Set the `<title>` and the `data-report-id` (report) / `DECK_CONFIG` (slide) / topbar title + `data-report-id` (dashboard) at the top.
3. **Adapt**:
   - Report: replace each `<main class="content" data-annot-root data-panel="...">` with the section content.
   - Slide: replace each `<section class="slide slide-title active" id="...">` with the slide content. The reference slides can be deleted after the user has copied the components they need.
   - Dashboard: adjust the sidebar nav links, stat/table/chart column meaning to match the real data, and — once a backend exists — replace `DASHBOARD_MOCK`'s four routes with real server routes returning the same fragment shapes.
   - Bento: replace the hero (eyebrow/title/lede/meta chips) and each `.b-card` with the brief's content; keep card spans roughly balanced (8/4, 4/4/4, 7/5 works well); set `data-annot-storage` to a unique per-brief key.
4. **Render** — open the HTML in a browser. Check that the theme toggle works; for report/slide, that the annotation drawer opens and keyboard nav works (slides) and print preview looks clean; for dashboard, that the KPI row/chart/feed/table populate and that search/sort/filter/pause-resume all work.
5. **Wire annotation / backend**:
   - Report: verify the storage key is unique (don't reuse keys from other reports); set `data-annot-storage="my-report-2026-q3"` on `<body>`.
   - Slide: set `DECK_CONFIG.storageKey` in the inline script.
   - Dashboard: once a real backend serves `/api/stats|chart|activity|table`, delete the `« BEGIN/END DEMO MODE »` script block and the `data-demo-mode` attribute on `<body>`. Nothing else in the markup changes.

## Annotation system — what ships in the box

The report, slide, and bento templates ship with a full annotation system; the dashboard template intentionally ships **none** (see its section above for why).

| Feature                                               | Report template (v2)     | Slide template (v2)               |
| ----------------------------------------------------- | ------------------------ | --------------------------------- |
| Select text → floating comment pill                   | ✓ (3-button toolbar)     | ✓ (3-button toolbar)              |
| Side drawer with list of annotations                  | ✓ (right-side drawer)    | ✓ (right-side drawer)             |
| Click highlight to jump to drawer entry               | ✓                        | ✓ (with slide-jump adapter)       |
| Edit + delete existing annotations                    | ✓                        | ✓                                 |
| Export JSON                                           | ✓ (download + clipboard) | ✓ (download + clipboard)          |
| Import JSON (merge by id)                             | ✓                        | ✓                                 |
| Orphaned-state detection                              | ✓ (red border + warning) | ✓ (red border + warning)          |
| Multi-tab panel activation on jump                    | ✓ (uses `[data-tab]`)    | ✓ (uses `[data-panel]` per slide) |
| Anchor on offsets (survives Mermaid re-render)        | ✓                        | ✓                                 |
| Annotation types: comment / delete / insert / replace | ✓                        | ✓                                 |
| localStorage namespace                                | `annotations:<id>`       | `annotations:slide-template`      | `annotations:bento-template`     |

**Both report and slide templates ship the v2 annotation engine as of v0.4.0.** The slide template's inline CSS+JS are kept in sync with `features/slide/{annotate.css,highlight-annotate.js}` (the two `features/*` copies are also byte-identical to the report's `features/report/*` — see the invariant below). If you want a different annotation UI surface (e.g. a tooltip instead of a drawer, or a comment-only single-button toolbar), edit one place: the inline block in `templates/slide/slide-template.html`.

## Theme toggle

All three templates have a `◐ dark` / `◑ light` button. Report and dashboard templates use `features/*/theme-toggle.js`. Slide template uses an inline equivalent (4 lines). All of them:

- Persist to localStorage (dashboard uses its own key, `dashboard-theme`, so it doesn't collide with a report/slide open in the same origin)
- Honour `prefers-color-scheme` on first visit
- Switch every component (cards, badges, stats, Mermaid, dashboard panels) via `[data-theme]` attribute on `<html>`
- Hidden in print

Positioning differs: report/slide float the button `position: fixed` top-right; the dashboard places it inline in the topbar (no `position: fixed`), since the topbar is already a persistent chrome element.

## Hard invariants (do not lower)

- **All UI must remain reachable**: theme toggle (◐), density toggle (▤), font-size toggle (M), annotation panel (💬, report/slide/bento only), navigation (slide template: prev/next/dots, report template: tab strip, dashboard: sidebar + table toolbar). Never hide these without a visible alternative.
- **Annotations must persist across reloads** (report/slide). localStorage must remain valid JSON at all times. If parsing fails, start fresh — never crash the page.
- **Print must work cleanly** (report/slide; dashboard hides topbar/sidebar/table actions in `@media print` but is not designed as a primary print artifact — recommend the report template for anything that must be printed/PDF'd).
- **Single-file portability**: when a user copies the HTML to a new project, all CSS/JS must work without external CDN (Google Fonts and the pinned htmx CDN script with SRI are the only allowed exceptions; everything else must be inlined or local).
- **Dashboard demo mode must never silently ship to production**: when adapting the dashboard template for a real deployment, always confirm the `« BEGIN/END DEMO MODE »` block and `data-demo-mode` attribute were removed once real `/api/*` routes exist — a demo mock left in place will mask a missing/broken backend.

## Sources

- `template.html` and `slide-template.html` (research report + slide deck, 2026-07) — battle-tested templates
- `dashboard-template.html` (added 2026-07-11) — htmx dashboard shell, new template family for live/polling data views
- `bento-template.html` (added 2026-09-08, v0.7.0) — bento-grid one-pager. The full v2 annotation engine is inlined from the slide template with its token-mapping `:root` block stripped (the bento defines generic token names directly); density/font-size IIFEs reused with `bento-density`/`bento-font-size` storage keys. Bar chart is pure CSS, no Mermaid/htmx. Aesthetic sourced from the 2026 UI-trends research pass (bento grids as the default snapshot pattern, dark-first design, restrained glass, hover-glow micro-interactions).
- v0.13.0 SVG library to 40 components (2026-10-07) — second delegation round (claude code via herdr, svglib-v13-claude; 18 inspiration page fetches incl. subpages of infodiagram/free-powerpoint-templates-design/presentationgo; **magnific.com 403'd WebFetch and curl — its pages were never seen**). 20 new templates: timeline-vertical, swimlane-gantt, honeycomb-cluster, dual-hub, petal-cycle, decision-tree, snake-path, onion-layers, pillars-foundation, versus-columns, lightbulb-layers, matrix-nine-box, s-curve-adoption, growth-tree, spiral-growth, domino-chain, network-mesh, merge-paths, five-w-agenda, orbit-satellites. Professional polish pass on all 20 originals now standardised into one type scale (hero 20/700 · label 16/600 · annotation 13 · caption 12 · eyebrow 11/700 ls-1.2 · badge 13/700), normalised arrowheads (13×13 connectors, 16×16 spines), quadrant got the offset shadow, puzzle label overlap + radar glyph fixed. Validator hardened: rejects `<mask>/<pattern>/<clipPath>` and `fill="var(...)"`/`stroke="var(...)` presentation attributes; **XML-comment `--` check added** (staircase-steps had illegal `--accent` inside a comment that xml.etree rejected but the old validator missed). New techniques documented: pre-computed polygon sampling instead of clipPath (bulb slices), knockout label halos via `paint-order:stroke` for labels-on-lines. Verified: 40/40 build + independent convention recheck (my ET.parse loop) + both-theme screenshots + 60/60 tests; agent-side rotation-aware getBBox check (final: 0 clipped, 0 overlaps; earlier runs caught 4 real overlaps, fixed).
- v0.19.0 PPTX deck design library (2026-10-13) — the house bases grow from 5 to 11 layouts.
  - **New layouts:**
    - Agenda: native `buAutoNum` numbering.
    - Quote: italic quote, attribution and a static native “ glyph.
    - Table: a native table on theme slots, with an `accent6` header strip and `bg2` zebra rows.
    - KPI: hero value on a petri-dish medallion, a rounded delta chip the builder recolours by sign (`accent5`/`accent4`/`accent3`) and up to 3 stats.
    - Image + Text: one layout, mirrored by the builder for `side: right`.
    - Closing.
  - **Chrome science set:** `molecule-corner`, `agenda-helix-strip`, `kpi-medallion`, `closing-orbit`, `accent-band`. The footer strip was slimmed to make room for the fields.
  - **Footer fields:** native date / footer / slide-number placeholders on the master and every inner layout. The builder copies them onto inner slides with live `slidenum` (and `datetime1` for `date: "auto"`) fields.
  - **Credits:** slide and deck `credits` go to the notes.
  - **`--base` fallback:** agenda / quote / KPI degrade to body lines, while table and image-text use the area below the title.
  - **Preview:** `bin/pptx-preview.py` now renders native tables, auto-numbering, filled/rounded placeholders and italics. Footer fields take `otherStyle`, and the last-paragraph margin no longer causes false overflow flags.
  - **Tests:** the smoke test grows to 1192 checks and was verified to fail on three mutants.
  - **Design research:** composition referenced (no assets) from ppt-design.com's 24-layout Lab Science theme (slide previews 01–24 fetched).
- v0.18.0 PPTX deck builder (2026-10-13) — `bin/make-pptx-deck.py` turns a JSON/YAML spec into a `.pptx`.
  - **Figures:** svg-library figures are embedded as native SVG (python-pptx `Part(PackURI, 'image/svg+xml')` + `relate_to` + an lxml `svgBlip` extLst on the picture blip, replacing the PoC's zip/regex post-processing), with a cairosvg PNG fallback at 2400/1800 px, contain-fit placement and alt text.
  - **Text:** titles, bullets, captions and speaker notes are native.
  - **Bases:** `templates/deck/house-{light,dark}.pptx` were authored once by `author-base.py` from python-pptx's default template via lxml. They have 16:9 geometry re-authored from the 4:3 defaults, the 5 layouts Title / Section / Figure / Two Figures / Bullets, theme slots mapped from library tokens (accent1–6, dk2/lt2), `+mj`/`+mn` theme fonts with latin/ea/cs set, and a dark variant via a flipped clrMap.
  - **Chrome:** decor SVGs (`templates/deck/chrome/`) are drawn onto the master/layouts and flagged decorative.
  - **`--base`:** corporate templates are supported, with layout fallback by type.
  - **QA:** structural checks in `test/smoke-test-pptx-deck.py` (wired into `run-all.js`), a proxy preview in `bin/pptx-preview.py` (HTML + headless Chrome), and a documented manual real-renderer gate per theme release (no Office or LibreOffice in CI).
- v0.21.0 SVG slide-design library + slot-marker composer (2026-10-14).
  - **Designs:** `templates/svg-slides/` holds six hand-drawn 1280×720 slide designs in the svg-library look: `title-hero`, `section-break`, `big-statement`, `content-two-col`, `full-diagram`, `closing`. Slots are `data-slot` groups (never ids) that carry a box, a type and a text budget, and each design previews as a complete slide.
  - **Composer:** `bin/compose-slide.js` places the text with one documented layout rule (baseline = top + 1.15·size, +1.25·size per line) and inlines svg-library components as nested viewBox carriers. It bakes colours through the new shared `bin/svg-bake.js` (extracted from `svg-export.js`, so there is no second copy) and gates on DESIGN-UNKNOWN/INVALID, PAYLOAD-MALFORMED, SLOT-UNKNOWN/MISSING, TEXT-OVERFLOW, GRAPHIC-UNREADABLE and BAKE-LEFTOVER.
  - **Deck:** `make-pptx-deck.py` gains the `design` slide kind: the text-free background as an svgBlip + PNG picture, plus native text boxes from the sidecar, with footer fields gated by `data-native-footer`.
  - **QA:** `test/smoke-test-slides.py` covers design QA, the composer gates and design slides in pptx (light, dark, 4:3 `--base`). It was verified against mutants (text painted twice, footer always on, baseline drift, overflow gate off). The gallery is `templates/svg-slides/gallery.html` via `bin/build-slides-gallery.js`.
- v0.20.0 SVG library to 94 components (2026-10-13) — one follow-on component to the v0.16.0 science set: `protocol-loop-steps` (eight-station bench protocol on two snaking rows, dashed reuse loop from the last station back to prime + load; deletion of the loop makes a one-way flow). Convention + gallery + full-suite verified.
- v0.17.0 research-first routing (2026-10-12) — rubric step 0 and the standalone-SVG path now wire in online search whenever no svg-library component matches the requested graphic type: search → curate 2–4 reference URLs → hand-draw a new component per the svg-library README ("Adding a new component" step 0) → catalog row + gallery rebuild + tests, so every unmatched graphic request grows the library. Known-fetchable vs 403/empty source sites documented in both places.
- v0.16.0 SVG library to 93 components (2026-10-12) — 16 science & technology visuals: ecosystems (`food-web`, `trophic-pyramid`, `water-cycle`, `nitrogen-cycle`, `symbiosis-types`, `ecological-succession`, `ocean-zones`), earth & physical science (`plate-boundaries`, `reaction-coordinate`, `states-of-matter`, `em-spectrum`), lab & biotech (`crispr-editing`, `immune-response`, `pcr-thermal-cycle`), technology (`transformer-block`, `api-request-lifecycle`); science checked against NOAA, NPS, USGS, Addgene, Bio-Rad and the other sources in the svg-library README sections.
- v0.15.0 SVG library to 77 components (2026-10-11) — 6 cladograms inspired by Venngage/Creately/Pinterest/Microbe Notes cladogram examples: `cladogram-ladder`, `cladogram-anatomy`, `cladogram-matrix`, `nested-clades`, `circular-cladogram`, `cladogram-styles`; topologies checked (see the svg-library README "Phylogeny & cladograms" section).
- v0.14.0 SVG library to 71 components + standalone export (2026-10-09) — metro-map (nf-core pipeline metro maps); 10 infographic layouts (Figma/Venngage/Canva/Pinterest; Magnific + Adobe Stock 403'd); `world-dot-map` (Natural Earth 1:110m land mask, continent tints, no borders) + `europe-tile-grid` (EU data-vis guide layout); 8 climate visuals (placeholders except the IPCC AR6 ≈1.1 °C / Paris 1.5–2 °C thermometer); 10 lab/life-science visuals with checked science (real codons + re-translated frameshifts, log-spaced gel ladder, membrane orientation). New `bin/svg-export.js` bakes a theme palette (var() + color-mix → hex + fill/stroke-opacity) so library SVGs render outside browsers (PowerPoint, Word, Figma, Inkscape, cairo); verified with cairosvg on all exports; `test/smoke-test-svg-export.js` added to the suite. SKILL routing: standalone-SVG path (rubric step 0).
- v0.12.0 SVG library expansion (2026-10-07) — library grown from 10 to 20 components: 10 new infographic templates (target-bullseye, staircase-steps, chevron-progression, iceberg-depth, balance-scale, radar-spider, journey-map, converging-forces, puzzle-pieces, gear-mechanism) inspired by PowerPoint diagram galleries (infodiagram key-visuals, free-powerpoint-templates-design, magnific presentation vectors, presentationgo — layout inspiration only, no assets), plus a polish pass on the originals: convention fix (arrowhead colours now set via `style=` polygons — three files had used `fill="var()"` attributes), dark-mode contrast fix (`--navy`/`--deep-blue` outlines+labels mixed toward `--text` where they disappeared on dark surfaces), shared offset-tint hand-drawn drop-shadow, cycle nodes placed on the arc circle, fishbone arrowhead + sub-causes, funnel in-band counts, roadmap "today" marker + done segment, quadrant arrowed axes, venn set titles, journey/emotion curve. All 20 re-verified in both themes with Playwright (getBBox out-of-viewBox flags on rotated text are false positives — bbox ignores rotate transforms).
- v0.11.0 SVG diagram library (2026-10-07) — `features/graphics/svg-library/` (`README.md` conventions + catalog, 10 canonical `svg/*.svg` infographic templates, generated `gallery.html` preview via `bin/build-svg-gallery.js`). Ten token-driven hand-drawn diagram components (pipeline, cycle, hub-spoke, pyramid, venn, quadrant, funnel, roadmap, fishbone, layer-stack) with `role="img"`/`aria-label`/`<title>` a11y, id-free collision-safe markup, var()-in-style-attribute color wiring (var() is invalid in SVG presentation attributes — discovered and documented), and constant 800×450 viewBox. Motivated by the user's positive experience with agent-drawn SVG (DNA-helix deck motif, 2026-10-02); delivery chosen (ask_user): reference + gallery page, token-driven auto-adapt, diagrams/infographics focus.
- v0.10.0 chartz interlink (2026-09-19) — routing: real/interactive data charts (box/violin, sankey, treemap, network graphs, tooltip-heavy series) beyond the pure-CSS graphics pack now route to the [chartz](https://github.com/cheahhl814/chartz) skill; `features/graphics/chartz-embed.md` documents the embed patterns (iframe by default — keeps templates dependency-free; documented single-file exception that extends the invariant's CDN-exception list with the pinned chart-engine tag). Static/snapshot charts stay on the graphics pack.
- v0.7.0 aesthetic pass (2026-09-08) — all four templates: dark-first defaults (theme scripts now `saved || 'dark'`), glass chrome (`color-mix` translucent surfaces + `backdrop-filter` on sidebar/panels/cards in dark mode), ambient radial accent glow (`body::before`, hidden in print), fluid `clamp()` type scale on display headings, hover lift + accent-glow shadows. Fixed a corrupted CSS line in the dashboard template's light token block (`--error: #dc2 la l’T.` → `--error: #dc2626`). Annotation systems untouched.
- v0.8.0 graphics pack (2026-09-08) — `features/graphics/graphics.css` + `snippets.html` added; the pack is inlined into each template's `<style>` block. Eleven zero-dependency components: donut/pie + radial gauge + horizontal bars + heatmap table + data-bar table cells + pure-CSS flowchart + horizontal milestone strip + feature comparison table + pull-quote + scroll-driven reveals + reading-progress bar + `@property`-animated gauge sweep. Every chart carries an accessible data fallback (real `<table>` or sr-only mirror); every motion component is `@supports (animation-timeline: …)` + `prefers-reduced-motion` guarded. Sources for the techniques: CSS-Tricks pie chart articles, MDN conic-gradient + scroll-driven animations docs, chaarts (CSS-only charts from tables), WAI accessibility.build charts guide, coryrylan anchor-positioning flowcharts.
- v2 annotation engine + theme toggle (`features/{report,slide}/highlight-annotate.js`, `annotate.css`, `theme-toggle.js`, `theme-toggle.css`) — extracted from the original template on 2026-07-10 (renamed to `html-template-pack` from its previous internal codename; see the 2026-07-10 wiki entry on the v1→v2 offset-anchored annotation upgrade for the rename history)
- v2 tracked-changes annotation types — `comment` / `delete` / `insert` / `replace` added 2026-07-30 to the report template; selection-based delete/replace reuse the floating-pill flow, insert is caret-based via an `Insert here` arm/click toggle. The `replacement` field carries suggested new text for insert/replace; exported JSON includes `type` + `replacement` per annotation so a downstream (human or AI) revision agent can apply the changes without parsing free-text intent. The same v2 engine + tracked-changes types were ported into the slide template on 2026-07-30 (v0.4.0), with a small per-slide adapter: each `<section class="slide">` gets `data-panel="<id>"`; the inline adapter switches slides (`__deckGoTo`) before the engine's scrollIntoView when a drawer item is clicked.
- Shared component library — `.card` / `.badge` / `.stat-card` / table / `.layer-stack` / `.chain-step` / `.grid-2` / `.eyebrow` / `.badge-line` / `.meta-card` originated in the slide template (extracted from a research report project on 2026-07). In v0.5.0 the same component CSS was pasted into the report template with a shared token palette (10-step `--slate-*` neutral scale + `--teal`/`--coral`/`--green`/`--amber`/`--deep-blue`/`--navy`/`--white` accent colors) so the same markup renders correctly in either template. The slide template's brand colors (teal/coral/green) and the report's blue/neutral palette both work; the components are token-driven, not template-specific.
- `htmx` (BSD-2-Clause) — the hypermedia library driving the dashboard template's polling, debounced search, and partial swaps
- `lumen-guide` — the multi-tab pattern used by the report template
- `zarazhangrui/beautiful-html-templates` (MIT) — color token inspiration for the report template
- 2026 UI-trend research (2026-09-08) — bento grids, dark-first design, glassmorphism depth, typography-led headings (sources: Midrocket "UI Design Trends for 2026", Landdding "State of Landing Pages 2026", zero-dependency CSS systems keel/shadcss/purissimo); see the wiki observation on the v3 demo pass
