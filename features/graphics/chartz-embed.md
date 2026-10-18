# Embedding chartz charts in design-pack templates

**v0.10.0.** When a report, slide, bento, or dashboard page needs a *real data chart* — interactive tooltips, box plots, sankey, treemap, network graphs, series beyond what the zero-dependency graphics pack expresses — render it with the [chartz](https://github.com/cheahhl814/chartz) skill and embed the output here. The graphics pack stays pure CSS/HTML; chartz supplies the JS engines (Chart.js, Plotly.js, ECharts, Cytoscape.js, each CDN-pinned) without polluting the pack's templates.

## When to use which

| Situation | Use |
|---|---|
| Static values that read at a glance (donut, gauge, bars, heatmap, flow, milestones) | **graphics pack** (`features/graphics/graphics.css` + `snippets.html`) — zero JS, theme-token driven |
| Distributional/statistical charts (box, violin, histogram, log axes, error bars) | **chartz → Plotly.js** |
| Nodes + edges (pathways, networks, dependency graphs) | **chartz → Cytoscape.js** |
| Sankey, treemap, sunburst, large series, mixed dashboards | **chartz → ECharts** |
| Simple grouped bar/line with interactive hover, few series | graphics pack first; chartz → Chart.js if tooltips/zoom needed |

Rule of thumb: if the chart's numbers are few and static, the graphics pack is lighter and theme-consistent. If the chart is genuinely interactive or data-heavy, chartz is the right engine.

## Embed pattern A — iframe (recommended, default)

chartz writes one self-contained HTML file per chart. Put it beside the document and embed it:

```html
<div class="card">
  <h3>Sequencing yield by month</h3>
  <iframe src="charts/yield-by-month.html"
          style="width:100%;height:420px;border:0;border-radius:8px"
          loading="lazy" title="Sequencing yield by month"></iframe>
</div>
```

- chartz outputs to `<workdir>/charts/<name>.html`; render the chart **first**, then reference the relative path from the template's location. Ship both files together (or inline the chart file into the same directory on export).
- The pack template stays dependency-free — the chart engine loads inside the iframe only.
- `border:0` + the `.card` wrapper keep the chart visually consistent with glass styling in both themes; chartz pages are light-surface by design, which reads fine embedded in either theme.

## Embed pattern B — single-file delivery (exception)

If the artifact must be a **single HTML file** (email, no sidecar files), inline the chart instead of iframing:

1. Pick the chartz template for the routed engine (`templates/<engine>.html` from chartz).
2. Copy the engine's pinned CDN `<script>` tag + the rendered `SPEC` block + the container/init markup into the document's body.
3. Document the deviation: the "single-file portability" invariant's CDN exception list (`Google Fonts`, pinned `htmx` with SRI) now also includes the chart engine's pinned CDN tag. Never inline the engine code itself.

Prefer pattern A whenever the output will live in a project directory; use B only when a single artifact is a hard requirement.

## What not to do

- Do not add a chart library to the pack's templates "just in case" — the graphics pack covers static/snapshot needs.
- Do not float chartz engine versions when inlining (`@latest`) — chartz pins them; keep the pin.
- Do not embed the chartz *skill* files; only the rendered chart HTML (or, per pattern B, the spec block).

See [chartz on GitHub](https://github.com/cheahhl814/chartz) for the routing table, per-engine spec contracts, signature library, and pinned versions.