#!/usr/bin/env python3
"""QA for the svg-slides theme sets + bin/compose-slide.js
(design-pack v0.21.0; backgrounds v0.22.0; theme sets v0.24.0; info-* / card-* canvases v0.28.0).

0. Sets: every set under templates/svg-slides/sets/ ships each samples.json
   design with lab's slot names, kinds, required flags and line counts (so one
   payload re-themes), plus backgrounds (lab ≥ 8, others ≥ 2); the generated
   sets are exactly what bin/draw-slide-sets.js writes.

1. Designs: well-formed XML, svg-library hard rules (no ids/defs/..., role +
   aria-label + <title>), slot markers valid (kind, box inside the design's canvas, 1280x720 unless data-canvas, text
   budgets declared and documented in the README), preview text placed by the
   documented layout rule, and every design renders in headless Chrome.
   Background designs (data-decor-only="true") must have zero slots, a
   full-bleed painted rect and a documented content zone; they compose with {}
   to a text-free slide.
2. Composer: happy path per design × light/dark (no var()/color-mix()/data-slot
   left, component inlined, payload lines at the layout-rule position), and
   every gate rejects what it should (TEXT-OVERFLOW, SLOT-UNKNOWN, ...).
   Runs for every set × design × theme with the shared samples.
3. Fit (with Chrome): every text slot filled to its budget, baked in its set's
   fonts, renders inside its slot box.
"""
import json, os, re, shutil, subprocess, sys, tempfile
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SETS_DIR = os.path.join(ROOT, "templates", "svg-slides", "sets")
DESIGNS = os.path.join(SETS_DIR, "lab", "designs")  # lab: the hand-drawn set the mutants start from
SAMPLES = json.load(open(os.path.join(ROOT, "templates", "svg-slides", "samples.json"), encoding="utf-8"))
COMPOSER = os.path.join(ROOT, "bin", "compose-slide.js")
SVG = "{http://www.w3.org/2000/svg}"
FIRST, LEAD = 1.15, 1.25  # documented baseline rule

passed = failed = 0
FAMILY = re.compile(r"^(info|card)-")  # lab-only designs with their own canvas (data-canvas)


def canvas_of(root):
    """(W, H) a design declares with data-canvas, default 1280x720"""
    return tuple(int(v) for v in root.get("data-canvas", "0 0 1280 720").split()[2:])


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
    cw, ch_ = canvas_of(root) if re.fullmatch(r"0 0 [1-9]\d* [1-9]\d*", root.get("data-canvas", "0 0 1280 720")) else (0, 0)
    if not cw or root.get("viewBox") != f"0 0 {cw} {ch_}":
        errs.append("viewBox / data-canvas")
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
        if not (w > 0 and h > 0 and x >= 0 and y >= 0 and x + w <= cw and y + h <= ch_):
            errs.append(f"{n}: box outside {cw}x{ch_}")
        if kind == "text":
            for a in ("data-slot-size", "data-slot-maxlines", "data-slot-maxchars"):
                if not g.get(a):
                    errs.append(f"{n}: missing {a}")
        elif kind != "graphic":
            errs.append(f"{n}: kind {kind!r}")
    return errs


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def compose(design, payload, tmp, theme="light", name=None, set_="lab"):
    pay = os.path.join(tmp, "payload.json")
    with open(pay, "w", encoding="utf-8") as f:
        json.dump(payload, f)
    return run(["node", COMPOSER, design, "--payload", pay, "--theme", theme, "--out", tmp, "--set", set_] + (["--name", name] if name else []))


def readme(set_):
    p = os.path.join(ROOT, "templates", "svg-slides", "README.md") if set_ == "lab" else os.path.join(SETS_DIR, set_, "README.md")
    return open(p, encoding="utf-8").read()


SETS = sorted(d for d in os.listdir(SETS_DIR) if os.path.exists(os.path.join(SETS_DIR, d, "set.json")))
NAMES = {s: sorted(f[:-4] for f in os.listdir(os.path.join(SETS_DIR, s, "designs")) if f.endswith(".svg")) for s in SETS}
ROOTS = {(s, d): ET.parse(os.path.join(SETS_DIR, s, "designs", f"{d}.svg")).getroot() for s in SETS for d in NAMES[s]}
BGS = {s: [d for d in NAMES[s] if ROOTS[s, d].get("data-decor-only") == "true"] for s in SETS}
chrome = shutil.which("google-chrome") or shutil.which("chromium")

# ── 0. sets: shared slot contract + generator reproducibility ───────────
check("lab" in SETS and len(SETS) >= 5, f"expected lab + 4 generated sets, found {SETS}")
contract = lambda s, d: sorted((g.get("data-slot"), g.get("data-slot-kind"), g.get("data-slot-optional") == "true", g.get("data-slot-maxlines") or "")
                                for g in slots_of(ROOTS[s, d]))
for s in SETS:
    slides = [d for d in NAMES[s] if d not in BGS[s]]
    want = [n for n in SAMPLES if s == "lab" or not FAMILY.match(n)]
    slides = [d for d in slides if s == "lab" or not FAMILY.match(d)]
    check(sorted(slides) == sorted(want), f"{s}: slide designs {slides} ≠ samples.json designs")
    check(len(BGS[s]) >= (8 if s == "lab" else 2), f"{s}: only {len(BGS[s])} background designs")
    conf = json.load(open(os.path.join(SETS_DIR, s, "set.json"), encoding="utf-8"))
    check(bool(conf.get("label")) and bool(conf.get("description")), f"{s}: set.json needs label + description")
    if s != "lab":
        check(set(conf.get("dark", {})) <= set(conf.get("light", {})) and {"font-head", "font-sans"} <= set(conf.get("fonts", {})),
              f"{s}: set.json palette incomplete (fonts, and every dark token also in light)")
    for d in slides:
        if (s, d) in ROOTS and ("lab", d) in ROOTS:
            check(contract(s, d) == contract("lab", d), f"{s}/{d}: slot contract differs from lab {contract('lab', d)}")
files = lambda base: {os.path.relpath(os.path.join(dp, f), base) for s in SETS if s != "lab" for dp, _, fs in os.walk(os.path.join(base, s)) for f in fs}
with tempfile.TemporaryDirectory(prefix="drawsets-") as gen:
    r = run(["node", os.path.join(ROOT, "bin", "draw-slide-sets.js"), "--out", gen])
    same = r.returncode == 0 and files(gen) == files(SETS_DIR) and all(
        open(os.path.join(gen, p), "rb").read() == open(os.path.join(SETS_DIR, p), "rb").read() for p in files(gen))
    check(same, f"generated sets differ from bin/draw-slide-sets.js output; edit the script and re-run it, never the .svg {r.stderr.strip()}")

# ── 1. designs ──────────────────────────────────────────────────────────
with tempfile.TemporaryDirectory(prefix="svgslides-") as tmp:
    blank = 0
    if chrome:  # a render must carry more than a blank canvas (minimal sets are only a few hundred bytes over)
        ref = os.path.join(tmp, "blank.svg")
        open(ref, "w").write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#fff"/></svg>')
        run([chrome, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--window-size=1280,720",
             f"--screenshot={ref}.png", "file://" + ref])
        blank = os.path.getsize(ref + ".png") if os.path.exists(ref + ".png") else 4000
    for s in SETS:
        README = readme(s)
        for d in NAMES[s]:
            path_ = os.path.join(SETS_DIR, s, "designs", f"{d}.svg")
            src = open(path_, encoding="utf-8").read()
            errs = design_errors(src)
            d_ = f"{s}/{d}"
            check(not errs, f"{d_}: {errs}")
            root = ET.fromstring(src)
            check(f"`{d}`" in README, f"{d_}: no catalog entry in the set README")
            for g in slots_of(root):
                n = g.get("data-slot")
                row = re.search(rf"^\| `{re.escape(n)}` \|.*$", README.split(f"### `{d}`")[-1].split("###")[0], re.M)
                check(row is not None, f"{d_}/{n}: slot missing from the README slot table")
                if g.get("data-slot-kind") != "text":
                    continue
                if row:
                    check(g.get("data-slot-maxchars") in row.group(0), f"{d_}/{n}: README budget ≠ data-slot-maxchars")
                # preview lines follow the documented layout rule
                x, y, w, h = (float(v) for v in g.get("data-slot-box").split())
                size, anchor = float(g.get("data-slot-size")), g.get("data-slot-anchor", "start")
                tx = {"start": x, "middle": x + w / 2, "end": x + w}[anchor]
                texts = g.findall(SVG + "text")
                check(0 < len(texts) <= int(g.get("data-slot-maxlines")), f"{d_}/{n}: preview line count")
                for i, t in enumerate(texts):
                    check(abs(float(t.get("x")) - tx) < 0.06 and abs(float(t.get("y")) - (y + size * FIRST + i * size * LEAD)) < 0.06,
                          f"{d_}/{n}: preview line {i + 1} not at the layout-rule position")
                    check(len(t.text or "") <= int(g.get("data-slot-maxchars")), f"{d_}/{n}: preview line over budget")
            if chrome:  # the raw design renders on its own (token fallbacks)
                png = os.path.join(tmp, f"{s}-{d}.png")
                run([chrome, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
                     "--window-size=1280,720", f"--screenshot={png}", "file://" + path_])
                check(os.path.exists(png) and os.path.getsize(png) > blank + 200, f"{d_}: headless Chrome render empty")

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
    for s, d in ROOTS:
        pay = SAMPLES.get(d, {})
        for theme in ("light", "dark"):
            r = compose(d, pay, tmp, theme, name=f"{s}-{d}", set_=s)
            check(r.returncode == 0, f"{s}/{d} [{theme}]: {r.stderr.strip()}")
            if r.returncode:
                continue
            full = open(os.path.join(tmp, f"{s}-{d}.svg"), encoding="utf-8").read()
            check(not re.search(r"var\(|color-mix\(|data-slot|data-decor-only|<!--", full), f"{s}/{d} [{theme}]: leftover marker/token")
            cw, ch_ = canvas_of(ROOTS[s, d])
            check(re.search(rf'<svg[^>]*width="{cw}" height="{ch_}"', full) is not None, f"{s}/{d} [{theme}]: fixed size")
            check("data-canvas" not in full, f"{s}/{d} [{theme}]: data-canvas marker left in the composed file")
            ET.fromstring(full.split("?>", 1)[1])  # well-formed
            for g in slots_of(ROOTS[s, d]):
                n = g.get("data-slot")
                if g.get("data-slot-kind") != "text" or n not in pay:
                    continue
                x, y, w, h = (float(v) for v in g.get("data-slot-box").split())
                size = float(g.get("data-slot-size"))
                tx = {"start": x, "middle": x + w / 2, "end": x + w}[g.get("data-slot-anchor", "start")]
                lines = pay[n] if isinstance(pay[n], list) else [pay[n]]
                for i, line in enumerate(lines):
                    esc = line.replace("&", "&amp;")
                    m = re.search(rf'<text x="([\d.]+)" y="([\d.]+)"[^>]*>{re.escape(esc)}</text>', full)
                    check(m is not None and abs(float(m.group(1)) - tx) < 0.06
                          and abs(float(m.group(2)) - (y + size * (FIRST + i * LEAD))) < 0.06,
                          f"{s}/{d}/{n}: composed line {i + 1} missing or not at the layout-rule position")
            fig = pay.get("figure")
            if fig:
                check(f'data-component="{fig}"' in full, f"{s}/{d}: component {fig} not inlined")
                if fig in TITLE_OF:
                    check(f"<title>{TITLE_OF[fig]}</title>" in full, f"{s}/{d}: component subtree missing")
            if d in BGS[s]:  # zero slots: text-free, painted edge to edge in the theme's surface
                check("<text" not in full, f"{s}/{d} [{theme}]: decor slide has text")
                m = re.search(r'<rect x="0" y="0" width="1280" height="720" style="fill:#([0-9a-f]{6})', full)
                lum = m and sum(int(m.group(1)[i:i + 2], 16) for i in (0, 2, 4)) / 765
                check(m is not None and (lum < 0.2 if theme == "dark" else lum > 0.85), f"{s}/{d} [{theme}]: full-bleed paint is not {theme}")

    # canvas mutants: a box sized for 1280x720 does not fit an A6 canvas; the viewBox must match data-canvas
    a6 = open(os.path.join(DESIGNS, "card-a6-print.svg"), encoding="utf-8").read()
    check(not design_errors(a6), "card-a6-print must pass before mutating")
    for mutant, why in ((a6.replace('data-slot-box="28 46 341 62"', 'data-slot-box="28 46 400 62"'), "box outside the A6 canvas"),
                        (a6.replace('viewBox="0 0 397 560"', 'viewBox="0 0 1280 720"'), "viewBox ≠ data-canvas"),
                        (a6.replace('data-canvas="0 0 397 560"', 'data-canvas="0 0 abc 560"'), "malformed data-canvas")):
        check(design_errors(mutant), f"design QA missed a mutant: {why}")
    for name, text, gate in (("box-outside-canvas", a6.replace('data-slot-box="28 46 341 62"', 'data-slot-box="28 46 400 62"'), "DESIGN-INVALID"),
                             ("viewbox-mismatch", a6.replace('viewBox="0 0 397 560"', 'viewBox="0 0 1280 720"'), "DESIGN-INVALID")):
        mp = os.path.join(tmp, name + ".svg")
        open(mp, "w", encoding="utf-8").write(text)
        r = compose(mp, SAMPLES["card-a6-print"], tmp)
        check(r.returncode == 1 and r.stderr.startswith(gate), f"composer gate {gate} did not fire ({name}): {r.stderr.strip()}")
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
            ("bg-helix-field", {"heading": "x"}, "SLOT-UNKNOWN"),
            # gate parity on a non-default canvas
            ("card-a6-print", {**SAMPLES["card-a6-print"], "title": ["x" * 25]}, "TEXT-OVERFLOW"),
            ("card-a6-print", {**SAMPLES["card-a6-print"], "sidebar": "x"}, "SLOT-UNKNOWN"),
            ("card-a6-print", {k: v for k, v in SAMPLES["card-a6-print"].items() if k != "title"}, "SLOT-MISSING"),
            ("info-social-45", {**SAMPLES["info-social-45"], "item-1": "x"}, None),
            ("card-a6-print", {**SAMPLES["card-a6-print"], "list-figure": "no-such-component"}, "GRAPHIC-UNREADABLE")):
        r = compose(design, payload, tmp)
        if gate is None:  # a valid payload on a new canvas composes
            check(r.returncode == 0, f"{design} happy path: {r.stderr.strip()}")
            continue
        check(r.returncode == 1 and r.stderr.startswith(gate), f"gate {gate} did not fire ({design}): {r.stderr.strip()}")
    # a set has its own budgets: an over-long line fails there too; an unknown set is DESIGN-UNKNOWN
    for set_, design, payload, gate in (("bold", "title-hero", {**SAMPLES["title-hero"], "hero-title": ["x" * 30]}, "TEXT-OVERFLOW"),
                                        ("no-such-set", "title-hero", SAMPLES["title-hero"], "DESIGN-UNKNOWN")):
        r = compose(design, payload, tmp, set_=set_)
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

# ── 3. fit: budget-filled text stays inside its slot box, in each set's fonts ──
if chrome:
    with tempfile.TemporaryDirectory(prefix="slidesfit-") as tmp:
        page = os.path.join(tmp, "fit.html")
        r = run(["node", os.path.join(ROOT, "test", "slides-fit.js"), page])
        check(r.returncode == 0, f"slides-fit.js: {r.stderr.strip()}")
        dom = run([chrome, "--headless=new", "--disable-gpu", "--no-sandbox", "--virtual-time-budget=5000", "--dump-dom", "file://" + page]).stdout
        m = re.search(r"FIT (\d+) lines\n([\s\S]*?)</pre>", dom)
        check(m is not None and int(m.group(1)) > 150, "fit page did not report")
        for bad in (m.group(2).strip().splitlines() if m else []):
            check(False, f"text over its slot box: {bad}")

print(f"  svg-slides: {len(SETS)} sets · {sum(len(NAMES[s]) - len(BGS[s]) for s in SETS)} slide + {sum(len(BGS[s]) for s in SETS)} background designs · composer × 2 themes · budget fit")
print(f"  TOTAL: {passed} passed · {failed} failed")
sys.exit(1 if failed else 0)
