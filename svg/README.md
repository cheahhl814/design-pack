# design-pack-svg

**Skill name**: `design-pack-svg` · **Version**: 0.37.0 · **Type**: agent skill (workflow-only)

The SVG half of the [design-pack](https://github.com/cheahhl814/design-pack) family: designed slide decks, a 126-component SVG diagram library, and a standalone exporter.

> This is a **sub-skill**. It has its own frontmatter and trigger set and can be symlinked on its own (`ln -s <repo>/svg ~/.agents/skills/design-pack-svg`). The `bin`, `templates`, `features` and `docs` entries here are symlinks to the shared copies at the repo root.

## When it fires

```text
- slide deck / presentation / pitch deck / designed slides
- SVG diagram / infographic / mind map / org chart / process diagram
- figure for slides, a paper or a poster; PowerPoint-ready graphic
- info card / printable or social infographic
```

HTML reports, bento one-pagers and dashboards go to [`design-pack-html`](../html/README.md).

## What it covers

| Part | Topic |
|:-----|:------|
| **Slides** | `bin/compose-slide.js` with 13 theme sets; per-slide PNG + one merged vector PDF via `bin/svg-export.js` |
| **Library** | 126 hand-drawn components (static and SMIL-animated), generated gallery |
| **Export** | palette-baked standalone `.svg` for PowerPoint, Word, Figma, Inkscape |
| **Info templates** | web 800×2000, A4 print, social 4:5, A6 card |

Full instructions: [`SKILL.md`](./SKILL.md). Tests: `node test/run-all.js` from the repo root.
