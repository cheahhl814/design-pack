# design-pack-html

**Skill name**: `design-pack-html` · **Version**: 0.37.0 · **Type**: agent skill (workflow-only)

The HTML half of the [design-pack](https://github.com/cheahhl814/design-pack) family: three self-contained, dark-first templates plus the zero-dependency CSS graphics pack they share.

> This is a **sub-skill**. It has its own frontmatter and trigger set and can be symlinked on its own (`ln -s <repo>/html ~/.agents/skills/design-pack-html`). The `bin`, `templates`, `features` and `docs` entries here are symlinks to the shared copies at the repo root.

## When it fires

```text
- HTML report / annotated report / review-ready HTML / reading version
- convert MD, DOCX or PDF to HTML
- one-pager / briefing / recap page (bento)
- HTML dashboard / htmx dashboard / ops dashboard / admin panel
```

Decks, SVG diagrams and infographics go to [`design-pack-svg`](../svg/README.md).

## What it covers

| Part | Topic |
|:-----|:------|
| **Report** | 5-tab sticky sidebar, v2 offset-anchored annotations (comment / delete / insert / replace), JSON export, print rules |
| **Bento** | one-page bento grid with the same v2 annotation engine |
| **Dashboard** | htmx shell with a demo-mode mock backend (no annotations by design) |
| **Graphics pack** | donut, gauge, bars, heatmap, flow, milestones, comparison, scroll-driven motion |
| **Chrome** | theme, density and font-size toggles |

Full instructions: [`SKILL.md`](./SKILL.md). Tests: `node test/run-all.js` from the repo root.
