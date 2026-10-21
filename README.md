# design-pack

> **Renamed from `html-template-pack` (2026-10-18, v0.25.0).** GitHub redirects git traffic and repo links from the old URL, but the old Pages address (`cheahhl814.github.io/html-template-pack/`) does NOT redirect — use `https://cheahhl814.github.io/design-pack/`.
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Live demo](https://img.shields.io/badge/demo-GitHub%20Pages-2ea44f)](https://cheahhl814.github.io/design-pack/)
[![Type](https://img.shields.io/badge/type-agent%20skill-blueviolet)](#-installation)

Three self-contained HTML templates — **report** (sticky sidebar, 5 icon+label tabs, v2 offset-anchored annotations, theme toggle), **bento brief** (2026 bento-grid one-page snapshot briefing, dark-first glass, full v2 annotation engine), and **htmx dashboard** (topbar, KPI row, sparkline chart, activity feed, sortable table, demo-mode mock backend) — plus a full **SVG slide-deck toolchain** (5 theme sets × 6 designs + 16 backgrounds, composer with text-budget gates, delivery as per-slide PNG + one merged vector PDF). Decks are **not** HTML since v0.26.0 (the HTML slide template was removed; see the slide-designs section below). All three templates ship the **v0.12.0 zero-dependency graphics pack** (donut, radial gauge, horizontal bars, heatmap, data-bar cells, pure-CSS flowchart, milestone strip, conversion funnel, venn, SWOT grid, org tree, cycle loop, comparison table, pull-quote, scroll-driven motion) and are single-file, review-ready HTML with no external CDN dependencies beyond Google Fonts (report/bento) and pinned htmx with SRI (dashboard). All three are **dark-first** with refined glass chrome, fluid display typography, and hover-glow micro-interactions (v0.7.0 aesthetic pass).

**Repository**: https://github.com/cheahhl814/design-pack

## 🖍️ SVG diagram library (v0.16.0)

Ninety-four **hand-drawn inline SVG infographic templates** for concept/summary diagrams — a sibling to the CSS graphics pack below. Canonical files in [`features/graphics/svg-library/svg/`](./features/graphics/svg-library/) with a generated, token-driven **preview gallery** ([`gallery.html`](./features/graphics/svg-library/gallery.html), ◐ theme toggle): pick a component, copy the inline `<svg>`, edit the `<text>` labels.

`flow-pipeline` · `cycle-loop` · `hub-spoke` · `pyramid-hierarchy` · `venn-overlap` · `quadrant-matrix` · `funnel-stages` · `roadmap-timeline` · `fishbone-causal` · `layer-stack` · `target-bullseye` · `staircase-steps` · `chevron-progression` · `iceberg-depth` · `balance-scale` · `radar-spider` · `journey-map` · `converging-forces` · `puzzle-pieces` · `gear-mechanism`  \
`timeline-vertical` · `swimlane-gantt` · `honeycomb-cluster` · `dual-hub` · `petal-cycle` · `decision-tree` · `snake-path` · `onion-layers` · `pillars-foundation` · `versus-columns` · `lightbulb-layers` · `matrix-nine-box` · `s-curve-adoption` · `growth-tree` · `spiral-growth` · `domino-chain` · `network-mesh` · `merge-paths` · `five-w-agenda` · `orbit-satellites` · `metro-map`  \
`hanging-tags` · `helix-ribbon-timeline` · `ring-chain` · `semicircle-segments` · `wavy-timeline` · `pictogram-grid` · `mind-map` · `eight-step-ring` · `radial-bars` · `org-chart` · `world-dot-map` · `europe-tile-grid`  \
`warming-stripes` · `climate-zones-globe` · `sector-landscape` · `sea-level-rise` · `carbon-cycle` · `thermometer-gauge` · `energy-mix-icons` · `planet-actions`  \
`dna-helix-steps` · `central-dogma` · `cell-to-dna-zoom` · `lab-glassware-steps` · `cell-membrane` · `punnett-square` · `mutation-types` · `gel-electrophoresis` · `well-plate-layout` · `scientific-method`  \
`cladogram-ladder` · `cladogram-anatomy` · `cladogram-matrix` · `nested-clades` · `circular-cladogram` · `cladogram-styles`  \
`food-web` · `trophic-pyramid` · `water-cycle` · `nitrogen-cycle` · `symbiosis-types` · `ecological-succession` · `ocean-zones`  \
`plate-boundaries` · `reaction-coordinate` · `states-of-matter` · `em-spectrum` · `crispr-editing` · `immune-response` · `pcr-thermal-cycle` · `transformer-block` · `api-request-lifecycle`

Every file: `role="img"` + `aria-label` + `<title>`, id-free markup (safe to paste several into one page), token-driven colors wired via `style` attributes (`var(--token, #fallback)` + `color-mix()` — adapts to every template palette and both themes with zero edits), constant 800×450 `viewBox`. Conventions and the add-a-component workflow: [`features/graphics/svg-library/README.md`](./features/graphics/svg-library/README.md). Regenerate the gallery with `node bin/build-svg-gallery.js`. **Need just the graphic, no page?** `node bin/svg-export.js <name|file.svg> [--theme dark] --out <dir>` writes a standalone `.svg` with the palette baked in, which renders in PowerPoint, Word, Figma and Inkscape.

## 🎞️ SVG slide designs + composer (v0.21.0; theme sets v0.24.0; the only deck toolchain since v0.26.0)

All decks (any length, any ask) are composed here as **slide designs** drawn as SVG in the svg-library style — real design, not layout chrome. The six designs live in [`templates/svg-slides/sets/`](./templates/svg-slides/), in five theme sets, with a generated, token-driven [`gallery.html`](./templates/svg-slides/gallery.html):

`title-hero` · `section-break` · `big-statement` · `content-two-col` · `full-diagram` · `closing`

Each design is a complete 1280×720 slide whose text and graphic areas are marked as **slots** (`data-slot` groups with a box, a type and a per-line character budget). `bin/compose-slide.js` fills them from a JSON payload and writes one renderer-safe composed `.svg`, colours baked to hex for light or dark, with svg-library components inlined into graphic slots.

```
node bin/compose-slide.js content-two-col --payload payload.json --theme light --out slides/
```

**Gates.** Text is never auto-wrapped: you break the lines, and the composer fails with `TEXT-OVERFLOW`, `SLOT-UNKNOWN`, `SLOT-MISSING` (and friends) instead of shipping a broken slide.

**Background designs (v0.22.0).** Eight slot-free, full-bleed stages (`bg-helix-field` · `bg-mosaic-triangles` · `bg-flow-dashes` · `bg-concentric-vortex` · `bg-dot-wash` · `bg-molecule-scatter` · `bg-orbit-arc` · `bg-slat-panel`) for graphic-only or text slides: compose with an empty payload (`--payload '{}'`), and the motif keeps a documented content zone clear.

**Theme sets (v0.24.0).** Every design comes in five sets that share one slot contract, so one payload re-themes a deck with `--set`:
- `lab` (default): hand-drawn science.
- `swiss`: International Typographic Style, with red colour blocks.
- `boardroom`: generic consulting, navy plus one accent, serif titles.
- `editorial`: cream-paper magazine, serif, terracotta.
- `bold`: saturated geometric polygons with heavy display type.

The four new sets were researched from professional theme examples (composition and palette cues only) and are drawn by `bin/draw-slide-sets.js`. A test fills every slot to its budget and measures it in Chrome.

```
node bin/compose-slide.js title-hero --set editorial --payload payload.json --theme dark --out slides/
```

Slot spec, layout rule, per-design slot tables and the add-a-design workflow: [`templates/svg-slides/README.md`](./templates/svg-slides/README.md).

## Contents

- [SVG diagram library (v0.16.0)](#️-svg-diagram-library-v0160)
- [SVG slide designs + composer (v0.21.0; theme sets v0.24.0; the only deck toolchain since v0.26.0)](#️-svg-slide-designs--composer-v0210-theme-sets-v0240-the-only-deck-toolchain-since-v0260)
- [Live demo](#-live-demo)
- [Installation](#-installation)
- [Usage examples](#-usage-examples)
- [What this skill does](#-what-this-skill-does)
- [Annotation system](#-annotation-system-report--bento)
- [Theme toggle](#-theme-toggle)
- [Density and font-size toggles](#-density-and-font-size-toggles-all-three-templates)
- [Graphics pack](#-graphics-pack-v080)
- [LaTeX equations (CodeCogs)](#-latex-equations-codecogs-v090)
- [Hard invariants](#-hard-invariants)

## 🚀 Live demo

All three HTML templates are deployed as a working demo on GitHub Pages. Open any of them to interact with the live UI — no setup, no build step, no backend.

| | |
|---|---|
| 🌐 **Launcher** | https://cheahhl814.github.io/design-pack/ |
| 📄 **[Report demo](https://cheahhl814.github.io/design-pack/report/)** | "Q3 Operations Review — Northwind Logistics" (5 tabs, custom content) |
| 🎞️ **[Slide demo](https://cheahhl814.github.io/design-pack/slide/)** | REPLACED in v0.26.0 — decks are now designed SVG slides (compose + export PNG/PDF), see the svg-slides section and `templates/svg-slides/gallery.html` |
| 🍱 **[Bento demo](https://cheahhl814.github.io/design-pack/bento/)** | "Project Phoenix — One-page Recap" (bento grid, full annotation engine) |
| 🧩 **[Components demo](https://cheahhl814.github.io/design-pack/components/)** | The graphics pack in one page — donut, gauge, bars, heatmap, flow, compare, pull-quote, motion legend |
| 🖍️ **[SVG library demo](https://cheahhl814.github.io/design-pack/svg-library/)** | All 94 SVG infographic templates, token-driven, with source blocks — ◐ toggle previews both palettes |
| 📊 **[Dashboard demo](https://cheahhl814.github.io/design-pack/dashboard/)** | "Northwind Logistics — Operations Dashboard" (mock data, live polling) |

Each demo is a curated showcase with realistic content (not a blank template). Try the **◐ theme toggle**, **▤ density toggle**, **S/M/L font size toggle** in the top-right of every demo. In the report and bento demos, select any text to leave tracked-changes-style annotations, then export them as JSON from the 💬 Notes panel.

**Source files** (for starting your own document): see [`templates/`](./templates/) and follow the usage examples below.

## 🛠️ Installation

This is an **agent skill**, not a user-facing library. The skill is loaded by the agent harness at startup.

**To install, give your AI agent this prompt:**

```
Import the following skill: https://github.com/cheahhl814/design-pack
```

**Optional, for the SVG tooling only:** `node` for `bin/svg-export.js` / `bin/compose-slide.js`, plus Chrome/Chromium for `svg-export.js --png --pdf` and `pdfunite` (poppler-utils) for merged deck PDFs. The HTML templates need none of these.

Once installed, the skill is **auto-invoked**: when you ask the agent for an HTML report, a slide deck (composed SVG slides → PNG + PDF), or a dashboard, the agent routes the request here automatically.

## 💡 Usage examples

### Slash commands and explicit invocation

Different agent harnesses use different mechanisms to force-load a skill. Use whichever matches your setup:

| Harness | Force-load command | Notes |
|---------|-------------------|-------|
| **Pi** | `/skill:design-pack` | Slash command; works even when auto-detection misses |
| **Claude Code** | `/design-pack <request>` | Slash command (Claude Code uses `/name` for skills and plugins) |
| **OpenCode** | Mention `"Use the design-pack skill"` in your prompt | OpenCode reads skill metadata from `SKILL.md` at startup |
| **Codex** | Mention the skill by name in your prompt | Codex reads skill metadata from `SKILL.md` at startup |

In all cases, the harness needs to discover the skill first — typically by cloning the repo into the harness's skills directory (`~/.pi/agent/skills/`, `~/.claude/skills/`, etc.) or by registering it via the harness's skill configuration.

If auto-detection works, you can just use natural language prompts — the harness routes them automatically. Slash commands / explicit mentions are useful when:

- The request is ambiguous and you want full control over the workflow
- The harness picked the wrong skill (e.g. chose `lumen-guide` instead of `design-pack`)
- You want to chain skills explicitly (e.g. invoke this one after `notebooklm-jacob` to wrap its output)

### Natural language prompts that trigger the skill

These phrases auto-invoke the skill via your agent's global skill-routing guide:

<details>
<summary><b>Report</b> (≥3 long sections, prose, charts, references)</summary>

```
Build me an HTML report from path/to/source.md.
Convert this Markdown into a reviewable HTML page.
Make a reading version of my manuscript for the team to comment on.
I need a single-file HTML the team can annotate.
Generate the grant submission recap as HTML.
```
</details>

<details>
<summary><b>Slide deck</b> (designed SVG slides → PNG + merged PDF; since v0.26.0)</summary>

```
Create a slide deck about X.
Convert this DOCX / PDF into a deck.
Make a pitch deck from this outline.
Build a 5-slide internal readout on the latest experiment results.
```
</details>

<details>
<summary><b>Dashboard</b> (live data, KPIs, ops metrics)</summary>

```
Build me a dashboard for tracking X.
Set up an ops dashboard with these KPIs.
Create an admin panel showing the live state of the system.
Wire up an htmx dashboard against /api/stats, /api/activity, etc.
```
</details>

### Multi-step review workflow

A complete review cycle uses three skills together:

1. **Generate**: "Build an HTML report from `path/to/draft.md`."
   - Agent auto-invokes `design-pack` → produces `report.html`
2. **Review**: Open the HTML in a browser, leave annotations (select text, click 💬 / ✂ / ➕ / ✎ in the floating toolbar, or use the Notes panel for editing). When done, click **💾 Export** in the Notes panel to download `annotations-<id>.json`.
3. **Revise**: "Apply the annotations from `annotations-report-template.json` to `report.html`."
   - Agent reads the JSON, applies each annotation, and produces a revised `report.html`

The exported JSON is the bridge between human reviewers and the AI — it's the only artifact that crosses the human→AI boundary in this workflow.

### Force-routing (when the wrong template gets picked)

If the agent picks the wrong template, you can be explicit:

```
Use svg-slides, not the report template.
That's a dashboard, not a report.
Don't use the report template here — the content has 8 discrete beats, give me a deck from svg-slides.
```

Or steer away from this skill entirely:

```
Don't build a full HTML report — just give me a Markdown summary.
Skip the HTML, write a plain text outline instead.
```

## 🎯 What this skill does

The skill ships four HTML templates. Pick the one that matches your content.

### Report template

A long-form reading document with a sticky left sidebar of tabs. The reviewer clicks between tabs to read different sections (Summary, Metrics, Methodology, Findings, Annotations), selects text to leave tracked-changes-style notes, and exports the notes as a JSON file when finished. The sidebar collapses to a horizontal tab strip on narrow screens. When printed, the sidebar hides and all sections flow sequentially with page breaks.

As of **v0.8.0**, the Metrics panel includes a donut chart, three animated radial gauges, horizontal workflow bars, a sightings heatmap, and data-bar table cells; the Methodology panel adds a pure-CSS screening-flowchart and a horizontal milestone strip; the Findings panel adds a pull-quote and a feature-comparison table. The Methodology panel also carries a plain `<pre><code>` code-block example (no highlighter; reviewers can annotate any line). A scroll-tied reading-progress bar is pinned to the top edge of the page (the same `animation-timeline: scroll()` API used by [Medium](https://medium.com)-style readers).

**Best for**: research reports, grant progress reports, manuscript reading versions, gap analyses, EOI drafts — anything a human will read end-to-end and leave comments on.

### Slide decks (svg-slides → PNG + PDF; replaced the HTML slide template in v0.26.0)

Decks are **not** HTML any more. Every deck ask composes one designed 1280×720 SVG slide per beat from `templates/svg-slides/` via `bin/compose-slide.js` (payload JSONs, slot budgets, composer gates — see the section above), then delivers with `bin/svg-export.js … --png --pdf --pdf-out deck.pdf`: per-slide baked SVG, a 2x PNG per slide, a vector PDF per slide, and one merged, page-sized PDF. There is no prev/next HTML shell, no inline deck annotations, and no live theming — baked slides are frozen artifacts; re-theme by re-composing from the payloads. Interactive slide-deck previews of the designs live in [`templates/svg-slides/gallery.html`](./templates/svg-slides/gallery.html).

**Best for**: pitch decks, conference talks, lightning talks, internal readouts, research summary decks — any deck; especially when printing/PDF or PowerPoint import is the destination.

### Dashboard template

A fixed-topbar shell with a sidebar navigation and a content area laid out as a grid: a row of KPI stat cards, a sparkline chart panel, a recent-activity feed, and a sortable/filterable/searchable data table. The interactions are wired with htmx — the table polls every few seconds, search is debounced, and sort state carries across requests. The four data endpoints (`/api/stats`, `/api/chart`, `/api/activity`, `/api/table`) are expected to return HTML fragments, not JSON.

The template ships in **demo mode** out of the box: a small mock backend intercepts every request to `/api/*` and answers from an embedded dataset, so the file opens in a browser and is fully interactive (filter, sort, poll, pause/resume) before any real backend exists. Once you have a real server, delete the `data-demo-mode` attribute on the body and the `« BEGIN/END DEMO MODE »` script block at the end of the file. Nothing else in the markup changes.

**Best for**: ops dashboards, admin panels, status pages, internal metrics views — anything meant to be watched and interacted with live, not read and annotated.

### Bento brief template (v0.7.0; v0.8.0 adds graphics)

A one-page snapshot briefing in the 2026 bento-grid style: a hero header (eyebrow pill, gradient display title, meta chips) above a 12-column grid of modular glass cards — KPI row, pure-CSS bar chart, progress bars, gradient quote card, milestone timeline, key highlights, and a CTA card. Dark-first glass surfaces with an ambient accent glow; cards lift with an accent-glow shadow on hover. It carries the full v2 annotation engine (select any text to leave tracked-changes-style notes, export/import JSON), plus the theme, density, and font-size toggles with bento-specific storage keys. No JS dependencies at all — the chart is pure CSS.

As of **v0.8.0**, a fourth row adds donut + gauges (animated), a sightings heatmap, a feature-comparison table, and a pull-quote card — same component classes as the report graphics pack, just packaged into the bento grid.

**Best for**: sprint recaps, weekly readouts, one-page proposals, status snapshots for review panels — anything the reader should grasp in 60 seconds and annotate inline. If the content grows past one page, graduate to the report template; if the numbers need to refresh from a server, it's the dashboard.

## 💬 Annotation system (report + bento)

> **Audience: human reviewers.** The other sections of this README document what
> the agent/harness should do. This section is for the *human* who opens the
> rendered HTML in a browser and wants to leave review notes. The agent does
> not interact with the annotation UI directly.

When you open a report or bento brief in a browser, you can leave tracked-changes-style notes directly on the text. Select any passage, choose what kind of note you want to leave, and a small floating toolbar appears with options. Your notes are saved in your browser automatically and can be exported as a file to send to an AI coding agent for revision.

### The review cycle

```mermaid
sequenceDiagram
    autonumber
    participant Agent as AI Agent
    actor Human as Human Reviewer
    participant Page as HTML Page

    Human->>Page: Add annotations (💬/✂/➕/✎)
    Page-->>Human: Export JSON file
    Human->>Agent: Submit JSON + HTML
    Agent-->>Human: Revised HTML file
```

### Advanced note management

- **Import**: Use **⬆ Import** to merge JSON files from other reviewers.
- **Orphans**: If the document text changes, some notes may no longer point to the exact text. These appear with a **red border and warning** in the Notes panel.
- **Storage**: Notes live in `localStorage` under `annotations:<id>`. For a multi-document project, give each one a unique id (e.g., `<body data-annot-storage="my-report-2026">`) so reviews don't overwrite each other.

### Feature reference

For quick reference, here's the full feature matrix across the two templates:

| Feature | Report | Bento |
|---------|:------:|:-----:|
| Select text → floating toolbar (4 options) | ✅ | ✅ |
| Right-side Notes panel with all notes | ✅ | ✅ |
| Click a note to jump back to its text | ✅ | ✅ |
| Edit or delete a note | ✅ | ✅ |
| Export to JSON file | ✅ | ✅ |
| Export to clipboard | ✅ | ✅ |
| Import JSON (merge by id) | ✅ | ✅ |
| Flag orphaned notes (text shifted) | ✅ | ✅ |
| Auto-switch to the right tab on jump | ✅ | — |
| Notes survive Mermaid diagram re-renders | ✅ | ✅ |

## 🎨 Theme toggle

All three templates have a **◐ dark / ◑ light** button at the top-right (dashboard has it inline in the topbar). Click it to switch between light and dark themes. The choice is remembered in your browser and follows your operating system's dark-mode preference on first visit. The theme toggle is hidden when you print the document.

## ⚡ Density and font-size toggles (all three templates)

Two extra buttons appear next to the theme toggle. They help reviewers read dense content more comfortably.

<table>
<tr><th>Toggle</th><th>States</th><th>Storage key</th><th>Affects</th></tr>
<tr>
  <td><b>Density</b> (<code>▤</code> / <code>▥</code>)</td>
  <td>comfortable (default) → compact</td>
  <td><code>report-density</code>, <code>bento-density</code>, <code>dashboard-density</code></td>
  <td>Card padding, table cell padding, stat-card padding, grid gaps, panel top spacing</td>
</tr>
<tr>
  <td><b>Font size</b> (<code>S</code> / <code>M</code> / <code>L</code>)</td>
  <td>Small (14px) → Medium (16px, default) → Large (18px)</td>
  <td><code>report-font-size</code>, <code>bento-font-size</code>, <code>dashboard-font-size</code></td>
  <td>Every text element using proportional units</td>
</tr>
</table>

Both toggles:

- Persist in your browser independently of the theme
- Reset to defaults when you print (so PDF output looks consistent)
- Apply to whichever template you're viewing

The **dashboard** template's toggles are especially useful when viewing dense data tables — switch to compact + small to fit more rows on screen, or comfortable + large for a presentation-style view.

**Why these toggles work**: every element in each template uses proportional units (`rem` or `em`) relative to the root font size. Changing the root font size cascades through every element. The slide template had a bug where `body { font-size: 16px }` blocked this cascade; that's been fixed so all three templates behave the same way.

## 🧩 Graphics pack (v0.8.0)

All three templates ship with a shared **zero-dependency graphics pack** — eleven components, pure CSS/HTML, no JS, no chart library, no canvas. Lives in [`features/graphics/graphics.css`](./features/graphics/graphics.css) (inlined into each template) with a copy-paste reference at [`features/graphics/snippets.html`](./features/graphics/snippets.html).

| | Component | Class |
|---|---|---|
| 📊 | **Donut / pie chart** | `.donut` + `.legend` |
| 🎯 | **Radial gauge** | `.gauge` (variants `.g-green .g-amber .g-coral`) |
| 📶 | **Horizontal bars** | `.hbar` (colours `.c-teal .c-amber .c-coral .c-green`) |
| 🟦 | **Heatmap table** | `.heat` on a real `<table>` with `td[data-level="0-4"]` |
| 🟫 | **Data bars in cells** | `.db-cell` + `.db-bar` |
| 🔀 | **Pure-CSS flowchart** | `.flow` + `.flow-node` (.start .end .decision) + `.flow-branch` |
| 🚩 | **Milestone strip** | `.mstrip` |
| ⊞ | **Comparison table** | `.compare` (`.rec-col`, ✓/— via `.yes`/`.no`) |
| ❝ | **Pull-quote** | `.pull-quote` |
| ▰ | **Reading progress bar** | `<div class="reading-progress">` |
| ⤓ | **Scroll-driven reveal** | `.reveal` |
| ⌖ | **Gauge sweep** | `.gauge.animated` |

**Live reference**: see every component at **[…/components/](https://cheahhl814.github.io/design-pack/components/)** — the same file also inlines a *motion legend* (browser-state matrix + 4-keyframe progress strip + before/after reveal pair + 5-step gauge sweep) so pack D is obvious from a single screenshot.

**Accessibility baked in**: every visual chart is built from a real `<table>` (heatmap, data bars) or paired with a visually-hidden `<table>` fallback (donut); `role="img"` + `aria-label` on conic charts; numbers stay visible in heatmap cells; motion is `@supports (animation-timeline: …)` + `prefers-reduced-motion` guarded — browsers without support just see the final state, no JS fallback needed.

### Diagram pack polish + new diagrams (v0.12.0)
The pure-CSS diagram set got the Canva-quality polish pass (card shadows, gradient fills, arrowheads on every connector, pill tags, progress-filled milestone rail) and five new zero-dependency components: **conversion funnel** (`.funnel`), **venn** 2-way/3-way (`.venn`), **SWOT grid** (`.swot`), **org tree** (`.otree`), and **cycle loop** (`.cycle`). All token-driven, dark-first, print-safe, with text-equivalent a11y fallbacks — usage headers in `features/graphics/graphics.css`, copy-paste markup in `features/graphics/snippets.html`. The report template's `.layer-stack` / `.chain-step` blocks got the same treatment (drawn connector arrows replace the bare ▼ glyph).

### Interactive data charts (v0.10.0)

When a template needs more than static/snapshot charts — interactive tooltips, box/violin plots, sankey, treemap, or network graphs — render the chart with the [chartz](https://github.com/cheahhl814/chartz) skill (Chart.js / Plotly.js / ECharts / Cytoscape.js, CDN-pinned) and embed it via `<iframe>`, keeping the pack's templates dependency-free. Patterns, when-to-use table, and the single-file exception are documented in [`features/graphics/chartz-embed.md`](./features/graphics/chartz-embed.md).

## 🧮 LaTeX equations (CodeCogs, v0.9.0)

MathJax/KaTeX would break the no-external-CDN guarantee, so equations are rendered server-side by **CodeCogs** (keyless) and **inlined as SVG** with `fill="currentColor"` so the dark/light theme toggle keeps working:

```html
<span class="math" data-tex="\frac{d[A]}{dt}=-k[A]"></span>
<!-- eq: E = mc^2 -->
```

```bash
python3 bin/codecogs_render.py page.html                  # inline in place
python3 bin/codecogs_render.py --url '\int_0^1 f(x)\,dx'  # print the URL
python3 bin/codecogs_render.py --selftest                 # 5-check offline test
```

Full workflow, draft-mode (hotlink) caveat, and placeholder syntax: [`docs/latex-equations.md`](./docs/latex-equations.md).

## 🔒 Hard invariants

- UI always reachable (theme, annotations, navigation)
- Annotations persist across reloads (valid JSON or fresh start)
- Print works cleanly (report primary; dashboard secondary; decks print via `svg-export.js --pdf-out` merged PDFs)
- Single-file portable (only Google Fonts + pinned htmx SRI allowed external)
- Dashboard demo-mode never ships to production
- Graphics pack ships with no JS dependencies (conic-gradient + CSS grid only)
- Motion triggers on visibility, not page load: animated gauges (`.gauge.animated`) replay when a report panel is shown (`showTab()`), so the sweep is visible to the reader instead of completing before they navigate to it. Honors `prefers-reduced-motion` (skips the restart; static fallback applies).

## License

MIT — see the `license` field in [`SKILL.md`](./SKILL.md).
