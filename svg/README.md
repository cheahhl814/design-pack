# design-pack-svg

**Skill name**: `design-pack-svg` · **Version**: 1.0.0 · **Type**: agent skill (workflow-only)

The SVG half of the [design-pack](https://github.com/cheahhl814/design-pack) family: the design layer for GenOffice documents: a 128-component SVG diagram library that recolours to the host document, slide designs bridged into native editable `.pptx` decks, and a standalone exporter.

> This is a **sub-skill**. It has its own frontmatter and trigger set and can be symlinked on its own (`ln -s <repo>/svg ~/.agents/skills/design-pack-svg`). The `bin`, `templates`, `features` and `docs` entries here are symlinks to the shared copies at the repo root.

## When it fires

```text
- slide deck / presentation / pitch deck / designed slides
- SVG diagram / infographic / mind map / org chart / process diagram
- figure for slides, a paper or a poster; PowerPoint-ready graphic
- info card / printable or social infographic
```

HTML reports go through the report recipe in the root [`SKILL.md`](../SKILL.md). **Requires GenOffice** (app + skill): run `node bin/preflight.js` first.

## What it covers

| Part | Topic |
|:-----|:------|
| **Slides** | `bin/genoffice-bridge.js` → native pptx (art PNG + editable text); fallback: `bin/compose-slide.js` + PNG + merged vector PDF |
| **Library** | 128 hand-drawn components (static and SMIL-animated), generated gallery |
| **Export / recolour** | `svg-export.js --palette <set\|tokens.json\|file.pptx>` → baked `.svg` / `--png` for genoffice, Figma, Inkscape |
| **Info templates** | web 800×2000, A4 print, social 4:5, A6 card |

Full instructions: [`SKILL.md`](./SKILL.md). Tests: `node test/run-all.js` from the repo root.
