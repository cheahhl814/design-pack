# LaTeX equations in the templates

CodeCogs-based equation rendering for the **report** template (and any other HTML page) — keyless, stdlib-only, no JS math library.

## Why not MathJax/KaTeX?

All four templates guarantee **single-file HTML with no external CDN
dependencies**. Loading a JS math library would break that. CodeCogs renders
LaTeX to SVG server-side; we inline the SVG so the page stays self-contained.

## When to use

- The source document has **real math** (inline `$...$` / `$$...$$` blocks, or
  formulas the agent would otherwise screenshot).
- Fewer than ~60 equations per page (each is one HTTP fetch at build time).

## Workflow

1. **Author placeholders** in the template copy (both syntaxes accepted):

   ```html
   <span class="math" data-tex="\frac{d[A]}{dt}=-k[A]"></span>
   <!-- eq: E = mc^2 -->
   ```

2. **Inline them** (in place, or to a new file for review):

   ```bash
   python3 bin/codecogs_render.py page.html
   python3 bin/codecogs_render.py page.html -o page.final.html
   ```

   Every SVG is post-processed so fills use `currentColor` — the templates'
   dark/light theme toggle keeps working.

3. **Verify**: `grep -c 'data-tex\|eq:' page.html` must be `0` after rendering
   (no leftovers). Unresolvable equations are left in place and warned on
   stderr — re-check their TeX (CodeCogs is a LaTeX subset; no environments
   like `align` without `svg.image` support, keep equations single-line).

## Draft mode (hotlink, not review-ready)

For throwaway drafts only — `<img>` hotlinks break the offline guarantee:

```html
<img src="https://latex.codecogs.com/svg.image?E%3Dmc%5E2" alt="E = mc^2">
```

Never ship hotlinks in review pages meant to be opened offline.

## Related tools

- `python3 bin/codecogs_render.py --url '\int_0^1 f(x)\,dx'` — print the URL for inspection.
- `python3 bin/codecogs_render.py --selftest` — 5-check offline structural test.