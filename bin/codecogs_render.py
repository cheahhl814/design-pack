#!/usr/bin/env python3
r"""codecogs_render.py — LaTeX equation rendering for design-pack templates
via the CodeCogs equation editor service (keyless, free for non-commercial use).

Why: the four templates are single-file HTML with **no external CDN
dependencies**. MathJax/KaTeX would break that guarantee. CodeCogs solves this
in two modes:

  1. **Draft mode (hotlink)** — embed `<img src="https://latex.codecogs.com/svg.image?...">`.
     Fine for throwaway drafts; requires network when the page is viewed.

  2. **Review mode (offline, recommended)** — author placeholders like
     `<span class="math" data-tex="\\int_0^1 f(x)\\,dx"></span>` in the template
     copy, then run this script to download each equation's SVG and **inline it
     into the HTML**. The final page keeps the no-external-CDN guarantee.

Usage:
    python3 bin/codecogs_render.py page.html                     # inline in place
    python3 bin/codecogs_render.py page.html -o page.final.html  # write elsewhere
    python3 bin/codecogs_render.py --url '\int_0^1 f(x)\,dx'     # just print the URL
    python3 bin/codecogs_render.py --selftest

Placeholder syntax accepted in the HTML (both work; pick one):
    <span class="math" data-tex="E = mc^2"></span>
    <!-- eq: E = mc^2 -->

The rendered SVG inherits currentColor (dark/light theme toggles keep working)
because CodeCogs SVGs use fill="currentColor" only if requested — this script
post-processes each SVG to strip fixed fills and add `fill="currentColor"`.

Exit codes: 0 ok, 1 no placeholders found (nothing to do), 2 network/parse error.
"""
import argparse
import re
import sys
import urllib.parse
import urllib.request

CODECOGS = "https://latex.codecogs.com/svg.image"
USER_AGENT = "design-pack/0.9 (equation inlining)"
TIMEOUT = 15
MAX_EQS = 60  # sanity cap per document

SPAN_RE = re.compile(r'<span\s+class="math"[^>]*\bdata-tex="([^"]+)"[^>]*>\s*</span>')
COMMENT_RE = re.compile(r"<!--\s*eq:\s*(.*?)\s*-->")
SVG_FILL_RE = re.compile(r'fill="[^"]*"')


def equation_url(tex: str) -> str:
    """CodeCogs SVG URL for a LaTeX string (\\bg uses transparent bg)."""
    return f"{CODECOGS}?{urllib.parse.quote(tex)}"


def fetch_svg(tex: str) -> str:
    """Download one equation's SVG, theme-ize fills, return SVG markup."""
    req = urllib.request.Request(equation_url(tex), headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        svg = resp.read().decode("utf-8", errors="replace")
    svg = svg[svg.find("<svg"):] if "<svg" in svg else svg
    if not svg.startswith("<svg"):
        raise ValueError(f"CodeCogs returned non-SVG payload for {tex!r}")
    # Theme-proof: every fill becomes currentColor (dark/light toggles keep working)
    svg = SVG_FILL_RE.sub('fill="currentColor"', svg)
    # CodeCogs SVGs usually carry NO fill attribute at all (default = black),
    # which is invisible on the dark-first templates — set it on the root
    # element so the inherited fill reaches every path.
    if "currentColor" not in svg:
        svg = re.sub(r"(<svg\b[^>]*?)\s*(/?>)", r"\1 fill='currentColor'\2", svg, count=1)
    return svg


def inline_equations(html: str) -> tuple:
    """Replace all placeholders with inline SVG. Returns (html, [tex...]).
    Unresolvable equations are left in place and warned about on stderr.
    Processes at most MAX_EQS unique equations per document (documented cap)."""
    eqs = []
    for tex in SPAN_RE.findall(html):
        tex = _unescape(tex)
        if tex not in eqs:
            eqs.append(tex)
    for tex in COMMENT_RE.findall(html):
        if tex not in eqs:
            eqs.append(tex)
    skipped = eqs[MAX_EQS:]
    if skipped:
        sys.stderr.write(f"WARN: {len(skipped)} unique equation(s) exceed the "
                         f"MAX_EQS={MAX_EQS} per-document cap and were left as placeholders; "
                         "render them in a second pass or reduce equation count.\n")
        for tex in skipped:
            sys.stderr.write(f"  skipped: {tex!r}\n")
    eqs = eqs[:MAX_EQS]
    out = html
    for tex in eqs:
        try:
            svg = fetch_svg(tex)
        except Exception as e:
            sys.stderr.write(f"WARN: {tex!r}: {e}\n")
            continue
        out = SPAN_RE.sub(
            lambda m: svg if _unescape(m.group(1)) == tex else m.group(0), out)
        out = COMMENT_RE.sub(
            lambda m: svg if m.group(1) == tex else m.group(0), out)
    return out, eqs


def _attr_escape(tex: str) -> str:
    return tex.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")


def _unescape(tex: str) -> str:
    return (tex.replace("&amp;", "&").replace("&quot;", '"').replace("&lt;", "<"))


def _selftest():
    n = 0
    # URL building
    u = equation_url(r"\int_0^1 f(x)\,dx")
    assert u.startswith(CODECOGS) and "%5Cint" in u
    n += 1
    # span placeholder detection (with escaped attr)
    sample = '<span class="math" data-tex="E = mc^2"></span>'
    assert SPAN_RE.findall(sample) == ["E = mc^2"]
    n += 1
    # comment placeholder detection
    sample2 = "<!-- eq: \\alpha + \\beta -->"
    assert COMMENT_RE.findall(sample2) == ["\\alpha + \\beta"]
    n += 1
    # SVG theme-ization on a canned payload (no network)
    canned = '<svg fill="#000" width="64"><g fill="#000"/></svg>'
    themed = SVG_FILL_RE.sub('fill="currentColor"', canned)
    assert themed.count('fill="currentColor"') == 2
    n += 1
    # Inline replacement on canned fetch_svg (no network)
    saved = globals()["fetch_svg"]
    try:
        globals()["fetch_svg"] = lambda t: canned
        out, eqs = inline_equations(
            '<p>x <span class="math" data-tex="E = mc^2"></span> y</p>')
        assert eqs == ["E = mc^2"]
        assert out == f"<p>x {canned} y</p>"   # span incl. data-tex attr replaced
        n += 1
    finally:
        globals()["fetch_svg"] = saved
    print(f"SELFTEST PASS ({n} checks)")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("html", nargs="?", help="HTML file to process (in-place by default)")
    ap.add_argument("-o", "--out", help="Write result here instead of in-place")
    ap.add_argument("--url", metavar="TEX", help="Print the CodeCogs URL for this equation and exit")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()
    if args.selftest:
        _selftest()
        return
    if args.url:
        print(equation_url(args.url))
        return
    if not args.html:
        ap.error("provide an HTML file, --url TEX, or --selftest")
    path = args.html
    html = open(path, encoding="utf-8").read()
    out, eqs = inline_equations(html)
    if not eqs and "<!-- eq:" not in html and 'data-tex="' not in html:
        print("no equation placeholders found; nothing to do", file=sys.stderr)
        sys.exit(1)
    target = args.out or path
    open(target, "w", encoding="utf-8").write(out)
    total = len(SPAN_RE.findall(html)) + len(COMMENT_RE.findall(html))
    remaining = len(SPAN_RE.findall(out)) + len(COMMENT_RE.findall(out))
    print(f"inlined {total - remaining} of {total} equation occurrence(s) -> {target}"
          + (f"; {remaining} placeholder(s) left (see stderr warnings)" if remaining else ""))
    sys.exit(0 if remaining == 0 and total > 0 else 1)


if __name__ == "__main__":
    main()