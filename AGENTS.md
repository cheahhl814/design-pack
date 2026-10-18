# Agent wiring for html-template-pack

> **Note for the agent:** This file is for **human readers** (e.g. a developer
> importing the skill into another harness). It is NOT auto-loaded by pi.
> The actual auto-invocation rule is in the global
> [`~/.pi/agent/AGENTS.md`](../../../AGENTS.md) "HTML output rule" section,
> plus the `description:` field in this skill's `SKILL.md` (which the system
> prompt injects at startup). For the trigger logic the LLM actually uses,
> see those two files.
> 
> The wiring below documents what a human importing this skill into
> Claude Code, Codex, Opencode, etc. should add to their agent's
> configuration.

## Auto-trigger rule (for cross-harness import)

**Whenever the user asks for any of the following, this skill MUST be the first thing checked:**

| User says…                                                                                             | Use this template                                                          |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| "HTML report", "report HTML", "review page", "reading version"                                         | **report template**                                                        |
| "HTML deck", "slide deck", "slides", "presentation", "talk"                                            | **slide template** (unless "review deck" → report)                         |
| "HTML dashboard", "htmx dashboard", "ops dashboard", "admin panel", "status page", "live metrics view" | **dashboard template**                                                     |
| "Convert this to HTML", "Make this reviewable"                                                         | **report template** (default)                                              |
| "Annotated HTML", "HTML with comments"                                                                 | **report template** (better annotation system)                             |
| "Single-file HTML the team can comment on"                                                             | **report template**                                                        |
| "Pitch deck", "internal readout", "lightning talk"                                                     | **slide template**                                                         |
| Specific filename ending in `.md` or `.docx` or `.pdf` to convert                                      | **report template** if ≥3 sections, **slide template** if 1 idea per slide |
| Wants filtering/sorting/polling against live or server-backed data                                     | **dashboard template**                                                     |

**Do not reach for `lumen-guide`, `lumen-slides`, `frontend-create`, or any other HTML skill first.** Those skills build demo decks and guides; they are not production-ready for human review or live-data monitoring. This skill covers both the "human will read this and leave comments" use case (report/slide) and the "human will watch/interact with live data" use case (dashboard).

## When NOT to use this skill

- **Web apps / form handlers / login pages** → `frontend-create` / `pi-frontend-create`
- **One-shot diagrams** for embedding into other docs → `lumen-mermaid`
- **Live presentation decks** where the audience watches you present (no review) → `lumen-slides` (fullscreen engine is better for stage)
- **Single slides / posters** → `lumen-slides` (one slide, no deck)
- **A chart/diagram embedded inside a report**, not a standalone dashboard page → `lumen-chart` / `lumen-diagram` (or embed Mermaid directly in the report template)

Interactive dashboards with live data are now handled by **this** skill's dashboard template — do not route those to `lumen-chart`/`lumen-diagram` unless the user specifically wants a chart/diagram embedded in an existing report, not a standalone dashboard.

If the request is ambiguous, ask with `ask_user_question` offering the template options.

## Workflow

1. **Read** this skill's `SKILL.md` for the full decision rubric.
2. **Copy** the appropriate template (`templates/report/template.html`, `templates/slide/slide-template.html`, or `templates/dashboard/dashboard-template.html`) to the working directory.
3. **Edit** the placeholders:
   - Report: title, `data-report-id`, content blocks.
   - Slide: title, `DECK_CONFIG`, slide content.
   - Dashboard: title, sidebar nav, table columns / KPI meaning; leave demo mode in place until a real backend exists, then delete the `« BEGIN/END DEMO MODE »` block and `data-demo-mode` attribute.
4. **Verify** the file works by opening it in a browser OR running a headless test (`google-chrome --headless --dump-dom` to check the DOM). For the dashboard template, also confirm the KPI row/chart/feed/table populate (demo mode should make this visible without a backend).
5. **Document** the choice in the user's session log (one line: "Built `<filename>` from html-template-pack `<report|slide|dashboard>` template").
6. **Update** this skill's `wiki` with what you learned if you encountered any new patterns (via `wiki_observe` or `wiki_retro`).

## Cross-skill composition

This skill **composes with**:

- **`lumen-mermaid`**: for adding Mermaid diagrams to the report template (the template already wires Mermaid 10 via CDN).
- **`lumen-chart`**: for adding Chart.js charts to the report template (drop in a `<canvas>` block + script) — or a chart *embedded inside* the dashboard template's panels if the built-in inline-SVG sparkline isn't enough.
- **`lumen-diagram`**: for adding fgraph diagrams.
- **v2 annotation engine** (`features/{report,slide}/highlight-annotate.js`, `annotate.css`, `theme-toggle.js`, `theme-toggle.css`): the engine was extracted from the previous internal-codename template on 2026-07-10 (see the 2026-07-10 wiki entry on the v1→v2 offset-anchored annotation upgrade) and lives in this skill under its current name. There is no separate source-of-truth skill to sync from — this folder is the canonical home. Not applicable to the dashboard template (no annotation system).
- **`md2pdf`**: for converting the final HTML to PDF (use `google-chrome --headless --print-to-pdf`, not `md2pdf`, because the template has `@media print` rules). Applies to report/slide; the dashboard template is not designed as a print/PDF artifact.
- **Backend frameworks (Flask/FastAPI/Express/Django/etc.)**: the dashboard template's `/api/*` routes need a real server once demo mode is removed. This skill does not build that backend — it only defines the fragment contract each route must satisfy (see the dashboard template's header comment and `DASHBOARD_MOCK` for the exact shape).

## What "self-contained" means here

Each template is **portable**: copy the file (plus its `features/<report|slide|dashboard>/` JS/CSS if you want to keep them out-of-line) to any directory, and it works without other files in the tree. The report template has all CSS inline; the slide template has all CSS and JS inline; the dashboard template has all CSS/JS inline or local except the pinned, SRI-verified htmx CDN script. Mermaid, Google Fonts, and htmx are the only external dependencies, all CDN-served.

For math, do NOT add MathJax/KaTeX — render LaTeX with CodeCogs and inline the SVG: author `<span class="math" data-tex="..."></span>` (or `<!-- eq: ... -->`) placeholders, then run `python3 bin/codecogs_render.py page.html`. The script themes every fill to `currentColor` so the theme toggle keeps working. Full guide: [`docs/latex-equations.md`](./docs/latex-equations.md).

## Known limitations

- The slide template's v1 annotation system doesn't survive Mermaid re-renders inside slides. Workaround: don't put Mermaid in slides (put them in the report template instead), OR swap in the v2 features (see SKILL.md "What ships in the box").
- The report template's tab switcher + Mermaid interaction can require a `beforeprint` re-render. The template already handles this; don't remove the `beforeprint` listener.
- The dashboard template's demo mode intercepts `XMLHttpRequest`, not `fetch`. If you add code that calls `/api/*` via `fetch` instead of htmx's XHR-based requests, demo mode will not intercept it and the call will hit the network and fail (no server exists in demo mode). Stick to htmx's own request mechanism for anything meant to work in demo mode.
- The dashboard template's built-in chart is an inline SVG sparkline generated client-side (demo mode) or server-side (real backend) — it is intentionally not a full charting library. If the user needs interactive charts (zoom, tooltips, multiple series), compose with `lumen-chart` inside the `#chart-panel` element instead of extending the sparkline.
- Both templates assume Western left-to-right scripts. RTL languages need additional CSS.
