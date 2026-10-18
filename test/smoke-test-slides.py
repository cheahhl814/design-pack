#!/usr/bin/env python3
"""QA for the svg-slides design library + bin/compose-slide.js
(html-template-pack v0.21.0; background designs v0.22.0).

1. Designs: well-formed XML, svg-library hard rules (no ids/defs/..., role +
   aria-label + <title>), slot markers valid (kind, box inside 1280x720, text
   budgets declared and documented in the README), preview text placed by the
   documented layout rule, and every design renders in headless Chrome.
   Background designs (data-decor-only="true") must have zero slots, a
   full-bleed painted rect and a documented content zone; they compose with {}
   to a text-free slide.
2. Composer: happy path per design × light/dark (no var()/color-mix()/data-slot
   left, component inlined, payload lines at the layout-rule position), and
   every gate rejects what it should (TEXT-OVERFLOW, SLOT-UNKNOWN, ...).
"""
import json, os, re, shutil, subprocess, sys, tempfile
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESIGNS = os.path.join(ROOT, "templates", "svg-slides", "designs")
README = open(os.path.join(ROOT, "templates", "svg-slides", "README.md"), encoding="utf-8").read()
SAMPLES = json.load(open(os.path.join(ROOT, "templates", "svg-slides", "samples.json"), encoding="utf-8"))
COMPOSER = os.path.join(ROOT, "bin", "compose-slide.js")
SVG = "{http://www.w3.org/2000/svg}"
FIRST, LEAD = 1.15, 1.25  # documented baseline rule

passed = failed = 0


def check(ok, msg):
    global passed, failed
    if ok:
        passed += 1
    else:
        failed += 1
        print(f"  ✗ {msg}")


def slots_of(root):
    return [g for g in root.iter(SVG + "g") if g.get("data-slot")]


def design_errors(src):
    """Static design QA; returns a list of problems (used on the real files and on mutants)."""
    errs = []
    try:
        root = ET.fromstring(src)
    except ET.ParseError as e:
        return [f"not well-formed: {e}"]
    if root.get("viewBox") != "0 0 1280 720":
        errs.append("viewBox")
    if root.get("role") != "img" or not root.get("aria-label") or root.find(SVG + "title") is None:
        errs.append("role/aria-label/title")
    for el in root.iter():
        tag = el.tag.replace(SVG, "")
        if "id" in el.attrib:
            errs.append(f"id on <{tag}>")
        if tag in ("defs", "marker", "filter", "mask", "pattern", "clipPath", "script"):
            errs.append(f"<{tag}>")
        if tag != "g" and any(a.startswith("data-slot") for a in el.attrib):
            errs.append(f"slot marker on <{tag}> (markers live on <g> only, so they stay rendering-neutral)")
    names = [g.get("data-slot") for g in slots_of(root)]
    if len(names) != len(set(names)):
        errs.append("duplicate slot names")
    if root.get("data-decor-only") == "true":  # background design: zero slots, painted edge to edge
        if names:
            errs.append(f"decor-only design has slots {names}")
        first = next((el for el in root if el.tag != SVG + "title"), None)
        if first is None or first.tag != SVG + "rect" or [first.get(a) for a in ("x", "y", "width", "height")] != ["0", "0", "1280", "720"] \
                or "fill:" not in first.get("style", ""):
            errs.append("decor-only design must open with a full-bleed painted 1280x720 rect")
        if not re.search(r"<!--[\s\S]*?Content zone: \S[\s\S]*?-->\s*<svg", src):
            errs.append("decor-only design must document its content zone in the header comment")
    elif not names:
        errs.append("no slots")
    for g in slots_of(root):
        n, kind = g.get("data-slot"), g.get("data-slot-kind")
        try:
            x, y, w, h = (float(v) for v in g.get("data-slot-box", "").split())
        except ValueError:
            errs.append(f"{n}: bad box")
            continue
        if not (w > 0 and h > 0 and x >= 0 and y >= 0 and x + w <= 1280 and y + h <= 720):
            errs.append(f"{n}: box outside 1280x720")
        if kind == "text":
            for a in ("data-slot-size", "data-slot-maxlines", "data-slot-maxchars"):
                if not g.get(a):
                    errs.append(f"{n}: missing {a}")
        elif kind != "graphic":
            errs.append(f"{n}: kind {kind!r}")
    return errs


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def compose(design, payload, tmp, theme="light", name=None):
    pay = os.path.join(tmp, "payload.json")
    with open(pay, "w", encoding="utf-8") as f:
        json.dump(payload, f)
    return run(["node", COMPOSER, design, "--payload", pay, "--theme", theme, "--out", tmp] + (["--name", name] if name else []))


names = sorted(f[:-4] for f in os.listdir(DESIGNS) if f.endswith(".svg"))
ROOTS = {d: ET.parse(os.path.join(DESIGNS, f"{d}.svg")).getroot() for d in names}
BGS = [d for d in names if ROOTS[d].get("data-decor-only") == "true"]
check(len(names) - len(BGS) >= 6 and len(BGS) >= 8, f"expected ≥6 slide + ≥8 background designs, found {len(names) - len(BGS)} + {len(BGS)}")
check(all(SAMPLES.get(d) == {} for d in BGS), "background samples are empty payloads")
check(sorted(SAMPLES) == names, "samples.json has exactly one payload per design")
chrome = shutil.which("google-chrome") or shutil.which("chromium")

# ── 1. designs ──────────────────────────────────────────────────────────
with tempfile.TemporaryDirectory(prefix="svgslides-") as tmp:
    for d in names:
        src = open(os.path.join(DESIGNS, f"{d}.svg"), encoding="utf-8").read()
        errs = design_errors(src)
        check(not errs, f"{d}: {errs}")
        root = ET.fromstring(src)
        check(f"`{d}`" in README, f"{d}: no catalog entry in templates/svg-slides/README.md")
        for g in slots_of(root):
            n = g.get("data-slot")
            row = re.search(rf"^\| `{re.escape(n)}` \|.*$", README.split(f"### `{d}`")[-1].split("###")[0], re.M)
            check(row is not None, f"{d}/{n}: slot missing from the README slot table")
            if g.get("data-slot-kind") != "text":
                continue
            if row:
                check(g.get("data-slot-maxchars") in row.group(0), f"{d}/{n}: README budget ≠ data-slot-maxchars")
            # preview lines follow the documented layout rule
            x, y, w, h = (float(v) for v in g.get("data-slot-box").split())
            size, anchor = float(g.get("data-slot-size")), g.get("data-slot-anchor", "start")
            tx = {"start": x, "middle": x + w / 2, "end": x + w}[anchor]
            texts = g.findall(SVG + "text")
            check(0 < len(texts) <= int(g.get("data-slot-maxlines")), f"{d}/{n}: preview line count")
            for i, t in enumerate(texts):
                check(abs(float(t.get("x")) - tx) < 0.06 and abs(float(t.get("y")) - (y + size * FIRST + i * size * LEAD)) < 0.06,
                      f"{d}/{n}: preview line {i + 1} not at the layout-rule position")
                check(len(t.text or "") <= int(g.get("data-slot-maxchars")), f"{d}/{n}: preview line over budget")
        if chrome:  # the raw design renders on its own (token fallbacks)
            png = os.path.join(tmp, f"{d}.png")
            run([chrome, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
                 "--window-size=1280,720", f"--screenshot={png}", "file://" + os.path.join(DESIGNS, f"{d}.svg")])
            check(os.path.exists(png) and os.path.getsize(png) > 10000, f"{d}: headless Chrome render empty")

    # mutants: the static QA must reject each
    base = open(os.path.join(DESIGNS, "content-two-col.svg"), encoding="utf-8").read()
    for mutant, why in ((base.replace("<title>", '<title id="t">', 1), "id attribute"),
                        (base.replace('data-slot-box="80 80 1120 54"', 'data-slot-box="80 80 1300 54"'), "box outside canvas"),
                        (base.replace(' data-slot-maxchars="46"', "", 1), "text slot without budget"),
                        (base.replace('data-slot="caption"', 'data-slot="body"'), "duplicate slot")):
        check(design_errors(mutant), f"design QA missed a mutant: {why}")
    # background mutants: a text slot, no full-bleed paint, no documented content zone
    helix = open(os.path.join(DESIGNS, "bg-helix-field.svg"), encoding="utf-8").read()
    check(not design_errors(helix), "bg-helix-field must pass before mutating")
    slot = ('<g data-slot="heading" data-slot-kind="text" data-slot-box="80 80 600 60" data-slot-size="40" '
            'data-slot-maxlines="1" data-slot-maxchars="30"><text x="80" y="126">x</text></g>\n</svg>')
    for mutant, why in ((helix.replace("</svg>", slot), "decor design with a text slot"),
                        (helix.replace('<rect x="0" y="0" width="1280" height="720"', '<rect x="0" y="0" width="1280" height="600"', 1), "decor design not full-bleed"),
                        (helix.replace("Content zone:", "Zone:", 1), "decor design without a content zone")):
        check(design_errors(mutant), f"design QA missed a mutant: {why}")

# ── 2. composer ─────────────────────────────────────────────────────────
TITLE_OF = {"flow-pipeline": "Four-step process pipeline"}
with tempfile.TemporaryDirectory(prefix="compose-") as tmp:
    for d in names:
        for theme in ("light", "dark"):
            r = compose(d, SAMPLES[d], tmp, theme)
            check(r.returncode == 0, f"{d} [{theme}]: {r.stderr.strip()}")
            if r.returncode:
                continue
            full = open(os.path.join(tmp, f"{d}.svg"), encoding="utf-8").read()
            check(not re.search(r"var\(|color-mix\(|data-slot|data-decor-only|<!--", full), f"{d} [{theme}]: leftover marker/token")
            check(re.search(r'<svg[^>]*width="1280" height="720"', full) is not None, f"{d} [{theme}]: fixed size")
            ET.fromstring(full.split("?>", 1)[1])  # well-formed
            for g in slots_of(ROOTS[d]):
                n = g.get("data-slot")
                if g.get("data-slot-kind") != "text" or n not in SAMPLES[d]:
                    continue
                x, y, w, h = (float(v) for v in g.get("data-slot-box").split())
                size = float(g.get("data-slot-size"))
                tx = {"start": x, "middle": x + w / 2, "end": x + w}[g.get("data-slot-anchor", "start")]
                lines = SAMPLES[d][n] if isinstance(SAMPLES[d][n], list) else [SAMPLES[d][n]]
                for i, line in enumerate(lines):
                    esc = line.replace("&", "&amp;")
                    m = re.search(rf'<text x="([\d.]+)" y="([\d.]+)"[^>]*>{re.escape(esc)}</text>', full)
                    check(m is not None and abs(float(m.group(1)) - tx) < 0.06
                          and abs(float(m.group(2)) - (y + size * (FIRST + i * LEAD))) < 0.06,
                          f"{d}/{n}: composed line {i + 1} missing or not at the layout-rule position")
            fig = SAMPLES[d].get("figure")
            if fig:
                check(f'data-component="{fig}"' in full, f"{d}: component {fig} not inlined")
                if fig in TITLE_OF:
                    check(f"<title>{TITLE_OF[fig]}</title>" in full, f"{d}: component subtree missing")
            if d in BGS:  # zero slots: text-free, painted edge to edge in the theme's surface
                check("<text" not in full, f"{d} [{theme}]: decor slide has text")
                m = re.search(r'<rect x="0" y="0" width="1280" height="720" style="fill:#([0-9a-f]{6})', full)
                lum = m and sum(int(m.group(1)[i:i + 2], 16) for i in (0, 2, 4)) / 765
                check(m is not None and (lum < 0.2 if theme == "dark" else lum > 0.85), f"{d} [{theme}]: full-bleed paint is not {theme}")

    # the gates bite
    two = SAMPLES["content-two-col"]
    for design, payload, gate in (
            ("title-hero", {**SAMPLES["title-hero"], "hero-title": ["x" * 39]}, "TEXT-OVERFLOW"),
            ("title-hero", {**SAMPLES["title-hero"], "hero-title": ["a", "b", "c"]}, "TEXT-OVERFLOW"),
            ("content-two-col", {**two, "sidebar": "x"}, "SLOT-UNKNOWN"),
            ("content-two-col", {k: v for k, v in two.items() if k != "heading"}, "SLOT-MISSING"),
            ("content-two-col", {**two, "figure": "no-such-component"}, "GRAPHIC-UNREADABLE"),
            ("content-two-col", {**two, "body": 42}, "PAYLOAD-MALFORMED"),
            ("no-such-design", {}, "DESIGN-UNKNOWN"),
            ("bg-helix-field", {"heading": "x"}, "SLOT-UNKNOWN")):
        r = compose(design, payload, tmp)
        check(r.returncode == 1 and r.stderr.startswith(gate), f"gate {gate} did not fire ({design}): {r.stderr.strip()}")
    mutant = os.path.join(tmp, "mutant.svg")
    with open(mutant, "w") as f:
        f.write(open(os.path.join(DESIGNS, "closing.svg")).read().replace('data-slot="meta"', 'data-slot="title"'))
    r = compose(mutant, {"title": "x", "contact": "y"}, tmp)
    check(r.returncode == 1 and r.stderr.startswith("DESIGN-INVALID"), f"gate DESIGN-INVALID did not fire: {r.stderr.strip()}")
    with open(mutant, "w") as f:
        f.write(open(os.path.join(DESIGNS, "bg-slat-panel.svg")).read().replace(
            "</svg>", '<g data-slot="t" data-slot-kind="graphic" data-slot-box="400 100 400 300"></g></svg>'))
    r = compose(mutant, {}, tmp)
    check(r.returncode == 1 and r.stderr.startswith("DESIGN-INVALID") and "decor-only" in r.stderr, f"decor design with a slot not rejected: {r.stderr.strip()}")
    # inline JSON payload, the documented background call
    r = run(["node", COMPOSER, "bg-helix-field", "--payload", "{}", "--theme", "dark", "--out", tmp, "--name", "inline"])
    check(r.returncode == 0 and os.path.exists(os.path.join(tmp, "inline.svg")), f"inline --payload '{{}}': {r.stderr.strip()}")
    # optional slots may be left out; the composed slide then has no placeholder text
    r = compose("closing", {"title": "Thanks", "contact": "x@example.org"}, tmp, name="bare")
    check(r.returncode == 0 and "Slides and data" not in open(os.path.join(tmp, "bare.svg")).read(), "optional slot left out")

print(f"  svg-slides: {len(names) - len(BGS)} slide + {len(BGS)} background designs · composer × 2 themes")
print(f"  TOTAL: {passed} passed · {failed} failed")
sys.exit(1 if failed else 0)
