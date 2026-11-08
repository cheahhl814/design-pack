---
name: design-pack-html
description: 'design-pack HTML templates — report (5-tab sticky sidebar, v2 offset-anchored annotations with comment/delete/insert/replace, JSON export), bento one-pager (2026 bento-grid snapshot briefing, v2 annotations), and htmx dashboard (topbar, KPI row, sparkline, sortable table, demo-mode mock backend), plus the zero-dependency CSS graphics pack (donut, gauge, bars, heatmap, flow, milestones). Dark-first glass chrome, theme/density/font toggles. Pick report for ≥3 long sections, bento for a one-page briefing, dashboard for live data. Invoke for "HTML report", "annotated report", "review-ready HTML", "HTML page", "reading version", "one-pager", "briefing", "recap page", "HTML dashboard", "htmx dashboard", "ops dashboard", "admin panel", or MD/DOCX/PDF → HTML conversion. Decks and standalone SVG graphics → design-pack-svg.'
version: 0.37.0
updated: 2026-11-08
triggers:
  - "HTML report"
  - "annotated report"
  - "review-ready HTML"
  - "convert MD/DOCX/PDF to HTML"
  - "bento one-pager"
  - "briefing or recap page"
  - "htmx dashboard"
  - "ops dashboard"
license: MIT
---

# design-pack-html

The HTML half of the [design-pack](../SKILL.md) skill: three production-grade, self-contained templates (report, bento, dashboard) and the CSS graphics pack they share. Decks and standalone SVG graphics live in the sibling sub-skill `design-pack-svg` (`../svg/SKILL.md`). Paths below are relative to this directory; `bin/`, `templates/`, `features/` and `docs/` here are symlinks to the shared copies one level up, so the same paths work whether the skill is loaded from the repo root or from a harness skill directory.

Report and bento carry the v2 review/annotation system and the light/dark theme toggle; the dashboard carries the theme toggle plus an htmx-driven live-data shell. All three are **dark-first** (refined glass chrome, fluid display typography) and carry the density + font-size toggles.

## Which template

| If the content has… | Use |
| --- | --- |
| ≥3 long sections, prose, charts, references, appendices; "report", "manuscript reading version", "review page" | **report** (`templates/report/template.html`) |
| One-page snapshot — sprint recap, weekly readout, one-page proposal, "one-pager", "briefing", "recap page" | **bento** (`templates/bento/bento-template.html`); grows past one page → report; numbers refresh from a server → dashboard |
| Live/polling data — KPIs, status tables, ops metrics, admin views | **dashboard** (`templates/dashboard/dashboard-template.html`) |
| Both a long report and a summary deck | report as the canonical; the deck is a second file built with `design-pack-svg` |

When in doubt, ask the user with `ask_user_question` offering the template options. Do not invoke for web apps (`frontend-create`), one-shot diagrams (`lumen-mermaid`), or live-presentation-only decks (`lumen-slides`). Real data charts (tooltips, box/violin, sankey, treemap, networks) → the [chartz](https://github.com/cheahhl814/chartz) skill, embedded per `features/graphics/chartz-embed.md`.

## The three templates

### Report template (`templates/report/template.html`)

**Pattern**: left-side sticky sidebar (240px, 5 tabs: Summary / Metrics / Methodology / Findings / Annotations) with icon + label per tab; collapses to horizontal strip on screens `<720px`. Each tab maps to a `<section data-panel="..." id="panel-...">` panel in the content area. Active tab gets a coloured left border (`--accent`) and dimmed background (`--accent-dim`).

**Annotation system**: **v2** (offset-anchored, multi-tab aware, JSON import+export, orphaned-state detection, **4 annotation types**: comment / delete / insert / replace). The UI uses `mark.annot` / `#annot-toggle` / `.annot-drawer` / `.annot-toolbar` / `#annot-editor`. Panel uses `data-annot-storage` to namespace by report. Types: comment, delete, insert, replace — delete/replace strike the original inline and show the suggested replacement; insert drops a caret marker with the proposed text. The v2 engine's `jumpTo` activates the correct tab/panel via `[data-tab]` buttons before scrolling — seamless cross-tab navigation from the annotation drawer.

**Component library**: shared with the report and bento templates (token-driven, so the same markup works in either template's brand palette): `.card` (with `.highlight`/`.warning`/`.success`/`.info` variants), `.badge` (with `.green`/`.teal`/`.amber`/`.blue` variants), `.stat-card` + `.stat-grid` for KPI blocks, `table` with navy header strip and slate borders, `.layer-stack` (with `.layer-1`..`.layer-5` color variants) for multi-stage processes, `.chain-step` + `.chain-arrow` for causal narratives, and the graphics-pack diagram set (`.flow` flowchart, `.mstrip` milestones, `.funnel`, `.venn`/`.venn.triple`, `.swot`, `.otree` org tree, `.cycle` loop — all zero-dependency, see `features/graphics/graphics.css` headers for usage), `.grid-2` / `.grid-3` for card layouts, `<pre><code>` code blocks (report + bento; token-themed, no syntax highlighter, scroll on screen / wrap in print, annotatable), `.eyebrow` (with `.eyebrow-teal`/`.coral`/`.amber`/`.green`/`.navy` variants) for section labels, `.badge-line` for above-title pills, `.meta-card` + `.meta-grid` for project/event metadata, Mermaid diagrams (Mermaid 10+ via CDN), theme toggle button.

**Print**: `@media print` hides sidebar, shows all panels sequentially with page breaks. `beforeprint` event re-renders Mermaid. Tested with `google-chrome --headless --print-to-pdf`.

**Self-contained**: All CSS inline, scripts are local (in `features/report/`), Mermaid via CDN. Single-file output when you copy the CSS/JS in.

**Best for**: long-form research reports, grant progress reports, manuscript reading versions, gap analyses, EOI drafts.
### Bento brief template (`templates/bento/bento-template.html`)

**Pattern**: single-page bento grid — a hero header (eyebrow pill, gradient display title, lede, meta chips) above a 12-column grid of modular glass cards. Card variants: KPI row (`.kpi-row`), pure-CSS bar chart (`.bars`), progress list (`.progress-item`), gradient quote card (`.quote`), timeline (`.tl`), key-list (`.key-list`), gradient CTA (`.cta`); spans `.span-4`–`.span-12` (collapse to full width <980px). Dark-first glass: translucent `color-mix` surfaces + `backdrop-filter`, ambient radial accent glow behind the grid, hover lift + accent-glow shadow.

**Annotation system**: **v2** — the full engine inlined (its token-mapping `:root` block was stripped; the bento defines the generic token names directly). Select text → comment/ask/delete/replace/format; drawer with JSON export/import; localStorage namespace via `data-annot-storage="bento-template"` on `<body>` (change it per brief).

**Chrome parity**: theme toggle (◐), density toggle (▤/▥ — `[data-density]` drives `--bento-pad`/`--bento-gap`/`--bento-kpi-gap`), font-size toggle (S/M/L root scaling), all with bento-specific storage keys (`bento-density`, `bento-font-size`) and print resets.

**No JS dependencies**: the bar chart is pure CSS (`height` percentages), no Mermaid, no htmx — the most dependency-free of the four.

**Print**: `@media print` hides chrome, flattens cards (break-inside: avoid), resets density/font.

**Best for**: sprint recaps, weekly readouts, one-page proposals, status snapshots for review panels — anything the reader should grasp in 60 seconds and annotate inline.

### Dashboard template (`templates/dashboard/dashboard-template.html`)

**Pattern**: fixed topbar + sidebar nav + content grid — KPI stat row, a sparkline chart panel, a recent-activity feed, and a sortable/filterable/searchable data table. Everything is wired with **htmx** (`hx-get` + `hx-trigger="load, every Ns"` for polling, `hx-trigger="keyup changed delay:300ms"` for debounced search, `hx-vals` for carrying sort state) instead of a JS framework.

**Backend contract**: the four endpoints (`/api/stats`, `/api/chart`, `/api/activity`, `/api/table`) must return **HTML fragments**, not JSON — htmx swaps whatever comes back straight into the target element. `/api/chart` returns a ready-to-swap `<svg>`; the others return markup matching the structure already inside their target (stat cards, `<li>` feed items, `<tr>` table rows).

**Demo mode (ships on by default)**: the template is *not* wired to a real server out of the box. A `data-demo-mode` attribute on `<body>` plus a small `XMLHttpRequest` shim (marked with `« BEGIN/END DEMO MODE »` banners near the end of `<body>`) intercepts every request to `/api/*` and answers it from an embedded mock dataset (`DASHBOARD_MOCK`), so the file opens in a browser and is fully interactive — filtering, sorting, polling, pause/resume — before any backend exists. **Delete the demo-mode block and the `data-demo-mode` attribute once a real backend is wired**; every `hx-get`/`hx-trigger`/`hx-vals` attribute in the markup is already what you'd point at production routes and does not change.

**Component library**: same design tokens as the report template (`--bg`, `--surface`, `--accent`, etc.) plus dashboard-only additions: `.stat-card`, `.panel`, `.chart-wrap` (inline SVG sparkline), `.feed` (activity list), `.badge.success/warning/error/info`, sortable `<th data-sort-key>`.

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

## Pipeline (Decide → Copy → Adapt → Render → Wire annotation / backend)

1. **Decide** — apply the table above. If unsure, ask the user.
2. **Copy** — copy `templates/<report|bento|dashboard>/*.html` to the project's working directory; set the `<title>` + `data-report-id` (report), topbar title (dashboard), or hero + `data-annot-storage` (bento).
3. **Adapt**:
   - Report: replace each `<main class="content" data-annot-root data-panel="...">` with the section content.
   - Dashboard: adjust the sidebar nav links and the stat/table/chart column meaning to the real data; once a backend exists, replace `DASHBOARD_MOCK`'s four routes with real server routes returning the same fragment shapes.
   - Bento: replace the hero (eyebrow/title/lede/meta chips) and each `.b-card` with the brief's content; keep card spans roughly balanced (8/4, 4/4/4, 7/5 work well); set `data-annot-storage` to a unique per-brief key.
4. **Render** — open the HTML in a browser (or `google-chrome --headless --dump-dom`). Check the theme toggle; for report/bento that the annotation drawer opens and print preview is clean; for the dashboard that the KPI row/chart/feed/table populate and search/sort/filter/pause-resume work.
5. **Wire**:
   - Report/bento: a unique storage key per document (`data-annot-storage="my-report-2026-q3"` on `<body>`).
   - Dashboard: once a real backend serves `/api/stats|chart|activity|table`, delete the `« BEGIN/END DEMO MODE »` script block and the `data-demo-mode` attribute on `<body>`. Nothing else changes.

## Annotation system — what ships in the box

The report and bento templates ship with a full annotation system; the dashboard template and the SVG deck toolchain intentionally ship **none** (dashboard: live data is not a stable anchor; baked slides: text is hex-baked SVG, not selectable HTML).

| Feature                                               | Report template (v2)     | Bento template (v2)               |
| ----------------------------------------------------- | ------------------------ | --------------------------------- |
| Select text → floating comment pill                   | ✓ (3-button toolbar)     | ✓ (3-button toolbar)              |
| Side drawer with list of annotations                  | ✓ (right-side drawer)    | ✓ (right-side drawer)             |
| Click highlight to jump to drawer entry               | ✓                        | ✓                                 |
| Edit + delete existing annotations                    | ✓                        | ✓                                 |
| Export JSON                                           | ✓ (download + clipboard) | ✓ (download + clipboard)          |
| Import JSON (merge by id)                             | ✓                        | ✓                                 |
| Orphaned-state detection                              | ✓ (red border + warning) | ✓ (red border + warning)          |
| Multi-tab panel activation on jump                    | ✓ (uses `[data-tab]`)    | —                                 |
| Anchor on offsets (survives Mermaid re-render)        | ✓                        | ✓                                 |
| Annotation types: comment / delete / insert / replace | ✓                        | ✓                                 |
| localStorage namespace                                | `annotations:<id>`       | `annotations:bento-template`      |

**Report and bento ship the v2 annotation engine.** The bento's inline CSS+JS come from `features/report/{annotate.css,highlight-annotate.js}` (the engine's canonical home since the HTML slide template was removed in v0.26.0). If you want a different annotation UI surface (e.g. a tooltip instead of a drawer, or a comment-only single-button toolbar), edit the engine in `features/report/` and re-check both consumers.

## Theme toggle

All three templates have a `◐ dark` / `◑ light` button. Report and dashboard templates use `features/*/theme-toggle.js`; bento inlines an equivalent. All of them:

- Persist to localStorage (dashboard uses its own key, `dashboard-theme`, so it doesn't collide with a report open in the same origin)
- Honour `prefers-color-scheme` on first visit
- Switch every component (cards, badges, stats, Mermaid, dashboard panels) via `[data-theme]` attribute on `<html>`
- Hidden in print

Positioning differs: the report floats the button `position: fixed` top-right; the dashboard places it inline in the topbar (no `position: fixed`), since the topbar is already a persistent chrome element.

## Hard invariants (do not lower)

- **All UI must remain reachable**: theme toggle (◐), density toggle (▤), font-size toggle (M), annotation panel (💬, report/bento only), navigation (report: tab strip, dashboard: sidebar + table toolbar). Never hide these without a visible alternative.
- **Annotations must persist across reloads** (report/bento). localStorage must remain valid JSON at all times. If parsing fails, start fresh — never crash the page.
- **Print must work cleanly** (report template; the dashboard hides topbar/sidebar/table actions in `@media print` but is not a primary print artifact — recommend the report template for anything that must be printed/PDF'd).
- **Single-file portability**: when a user copies the HTML to a new project, all CSS/JS must work without external CDN (Google Fonts and the pinned htmx CDN script with SRI are the only allowed exceptions; everything else must be inlined or local).
- **Dashboard demo mode must never silently ship to production**: confirm the `« BEGIN/END DEMO MODE »` block and `data-demo-mode` attribute were removed once real `/api/*` routes exist — a demo mock left in place masks a missing/broken backend.

## Tests and history

`node test/run-all.js` (report, bento, dashboard, graphics, export, slides suites). Release notes and sources: `../references/history.md`.
