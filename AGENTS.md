# Agent wiring for design-pack (v1.0.0)

> **For human readers** importing the skill into another harness (Claude Code, Codex, Opencode…). Not auto-loaded by pi: pi uses the `description:` of `SKILL.md` and the HTML rule in `~/.pi/agent/AGENTS.md`.

## Hard dependency: GenOffice

design-pack is the design layer for [GenOffice](https://github.com/genspark-ai/genoffice). Install the GenOffice app (it provides the `genoffice` CLI) **and** its skill ([`skills/genoffice/SKILL.md`](https://github.com/genspark-ai/genoffice/blob/main/skills/genoffice/SKILL.md)) into your harness's skills directory (e.g. `~/.agents/skills/genoffice`). `node bin/preflight.js` verifies both plus Chrome and exits 1 if anything is missing.

## Auto-trigger rule

| User says… | Use |
| --- | --- |
| "slide deck", "presentation", "designed slides", "pitch deck", "talk" | `design-pack-svg` → `bin/genoffice-bridge.js` (native pptx) |
| "SVG diagram", "infographic", "mind map", "figure for my slides/doc/paper" | `design-pack-svg` library → `svg-export.js --palette <host> --png` → genoffice |
| "recolour/match this diagram to my pptx/docx" | `svg-export.js --palette file.pptx` |
| "HTML report", "reading version", "annotated report", "MD → polished PDF" | report template → `genoffice convert … --to pdf` |
| edit/convert/create plain docx/pptx/xlsx/pdf | **genoffice only** |

Retired in v1.0.0 (use tag `v0.37.0-final`): `design-pack-html`, bento one-pager, htmx dashboard.

## Not this skill
Web apps/form handlers → `frontend-create`; live-data charts → `chartz`; Mermaid-only diagrams → `lumen-mermaid`.

## Workflow
1. `node bin/preflight.js`; read the genoffice `SKILL.md`; read this skill's root `SKILL.md`, then `svg/SKILL.md`.
2. Build: decks via the bridge (payload JSON per slide; fix composer gates by shortening text, never by editing budgets); diagrams via the exporter; reports via the template + genoffice convert.
3. Verify with genoffice's own checks (`slides audit`, `docs check`, `render`) and look at the PNGs.
4. `node test/run-all.js` after any change to bin/, templates/ or the library (background it; > 120 s).
5. Log the choice in the session log (one line) and update the wiki if a new pattern appears.

## Cross-skill composition
`chartz` (real charts, embedded as PNG), `lumen-mermaid`, `codecogs_render.py` (LaTeX → inline SVG for the report template; no MathJax/KaTeX), `herdr-lab` (delegated batches), `skill-forge` (lint with `bin/skill-lint.py`).

## Known limitations
- GenOffice deck specs take PNG/JPG pictures, not SVG; the bridge therefore bakes art to 2x PNG (diagrams in a bridged deck are not individually editable).
- The full report template hangs `genoffice convert --to docx`; use Markdown/fragment → `create --type docx` for editable Word.
- Bridge supports 1280×720 slide designs only (not `info-*`/`card-*`).
- Fallback decks (`compose` + `svg-export --png --pdf`) are baked: no editing, no live theme.
- Report template assumes left-to-right scripts; Mermaid, Google Fonts are its only CDN dependencies.
