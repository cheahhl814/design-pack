# GenOffice integration notes (spike 2026-11-25, genoffice CLI 0.12.600, skill 2.67.8)

design-pack is the **design layer**; GenOffice is the **document engine** and a mandatory dependency
(`bin/preflight.js`; https://github.com/genspark-ai/genoffice, skill at `~/.agents/skills/genoffice`).

| Question | Result | Consequence |
| --- | --- | --- |
| Deck spec / `addPicture` accept SVG? | **No**: `create --spec` reports `imageFailures` and drops the picture. PNG works (renders correctly, cover-cropped to the box). | Art is exported to PNG (2x) by `svg-export.js`/Chrome; keep the box at the image's aspect ratio. |
| `convert report.html --to pdf` (162 KB report template)? | Works, 14 pages, ~1 MB. | Report template stays the PDF/review-HTML source. |
| `convert report.html --to docx` (same template)? | **Hangs** (>100 s, killed); a small HTML converts in seconds. | For an editable Word report use `genoffice create --type docx --from report.md` (or a restricted HTML fragment), then place figures; do not convert the full template. |
| `docs apply … insert_image` with a design-pack PNG? | Works (`{"op":"insert_image","url":"fig.png","maxWidthPx":600,"afterBlockIndex":N}`). | Diagrams go into docx as PNG. |
| Theme of an existing Office file? | Not in `slides read`; read `ppt|word|xl/theme/theme1.xml` from the zip. | `bin/palette.js` does this for `svg-export.js --palette file.pptx`. |
| Text geometry? | Deck canvas 1280x720 px = 13.33 in; 1 px = 0.75 pt. | `genoffice-bridge.js` maps composer text slots to native text boxes at slot geometry. |

## Recipes
- Native deck from designs: `node bin/genoffice-bridge.js deck.json [--render]` (see its header; set + slides[{design,payload}]).
- Diagram that matches the host document: `node bin/svg-export.js mind-map --palette host.pptx --png`, then `slides apply addPicture` / `docs apply insert_image`.
- Pixel-exact fallback (not editable): `compose-slide.js` + `svg-export.js --png --pdf --pdf-out`.
