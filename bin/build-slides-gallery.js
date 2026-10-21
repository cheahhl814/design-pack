#!/usr/bin/env node
/**
 * build-slides-gallery.js: regenerates templates/svg-slides/gallery.html from
 * templates/svg-slides/sets/<set>/designs/*.svg + samples.json.
 *
 * One section per theme set (its palette scoped to its cards), each split into
 * slide designs (slot-marked), backgrounds, and (lab) Infographics (info-*) and
 * Info cards (card-*), whose cards use their own canvas aspect ratio; backgrounds (data-decor-only, zero slots,
 * composed with {}). Each card shows the design
 * composed with its sample payload, still
 * token-driven so the ◐ toggle previews both palettes, plus collapsible
 * blocks with the design source and the sample payload. Run after editing or
 * adding a design:
 *
 *     node bin/build-slides-gallery.js
 *
 * Validation (fails the build): every design parses with bin/compose-slide.js
 * (svg-library hard rules + slot markup) and composes with its sample; every
 * set has a sample-backed design for each samples.json entry.
 */
const fs = require('fs');
const path = require('path');
const { SETS_DIR, listSets, listDesigns, loadDesign, compose } = require('./compose-slide.js');

const DIR = path.dirname(SETS_DIR);
const OUT = path.join(DIR, 'gallery.html');
const SAMPLES = JSON.parse(fs.readFileSync(path.join(DIR, 'samples.json'), 'utf8'));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const conf = (set) => JSON.parse(fs.readFileSync(path.join(SETS_DIR, set, 'set.json'), 'utf8'));
const vars = (o) => Object.entries(o).map(([k, v]) => `--${k}: ${v};`).join(' ');
// info-* / card-* (v0.28.0) are lab-only families with their own canvases; the six slide designs ship in every set
const FAMILY = /^(info|card)-/;
// catalog order = samples.json order, then the backgrounds
const namesOf = (set) => {
  const all = listDesigns(set);
  for (const n of Object.keys(SAMPLES)) if (!all.includes(n) && !(FAMILY.test(n) && set !== 'lab')) throw new Error(`${set}: no ${n} design (every set ships all samples.json designs)`);
  return [...Object.keys(SAMPLES).filter((n) => all.includes(n)), ...all.filter((n) => !SAMPLES[n])];
};
const card = (set) => (name, i) => {
  const design = loadDesign(name, set);
  if (!SAMPLES[name] && !design.decorOnly) throw new Error(`${set}/${name}: no sample payload in samples.json`);
  const head = design.src.match(/<!--([\s\S]*?)-->/);
  // header comment: line 1 is the title, the description runs until "Slots:" (backgrounds: "Content zone:")
  const desc = head ? head[1].split(/\n\s*(?:Slots|Content zone):/)[0].split('\n').slice(2).map((l) => l.trim()).join(' ') : '';
  const zone = head && head[1].match(/Content zone:\s*(.+)/);
  const slide = compose(design, SAMPLES[name] || {}).svg.replace(/<!--[\s\S]*?-->\s*/g, '').trim();
  const use = design.decorOnly ? `content zone: ${esc(zone ? zone[1].trim() : '')}`
    : `slots: ${design.slots.map((s) => `<code>${s.name}</code>${s.optional ? '?' : ''}`).join(' ')}`;
  const canvas = (design.src.match(/<svg[^>]*data-canvas="0 0 (\d+) (\d+)"/) || [, 1280, 720]).slice(1).map(Number);
  return `    <figure class="card" id="d-${set}-${name}">
      <figcaption>
        <span class="idx">${String(i + 1).padStart(2, '0')}</span>
        <span class="info"><strong>${name}</strong><em>${esc(desc)}</em><span class="use">${use}</span></span>
      </figcaption>
      <div class="stage set-${set}" style="aspect-ratio:${canvas[0]} / ${canvas[1]}${canvas[0] < canvas[1] ? `;max-width:${Math.round(canvas[0] * 0.5)}px` : ''}">${slide}</div>
      <details><summary>design source (.svg${design.decorOnly ? ', decor only' : ', slot-marked'})</summary><pre class="src">${esc(design.src.trim())}</pre></details>
      <details><summary>sample payload (.json)</summary><pre class="src">${esc(JSON.stringify(SAMPLES[name] || {}, null, 2))}</pre></details>
    </figure>`;
};
const SETS = listSets().sort((a, b) => (a === 'lab' ? -1 : b === 'lab' ? 1 : a.localeCompare(b)));
let cards = 0;
// each set's palette, scoped to its stages (lab sets none and inherits the page palette)
const setCss = SETS.map((set) => {
  const c = conf(set);
  return c.light ? `  .set-${set} { ${vars({ ...c.fonts, ...c.light })} }\n  html[data-theme="dark"] .set-${set} { ${vars(c.dark)} }` : '';
}).filter(Boolean).join('\n');
const section = (set) => {
  const c = conf(set);
  const names = namesOf(set);
  const isBg = (n) => loadDesign(n, set).decorOnly;
  const slides = names.filter((n) => !isBg(n) && !FAMILY.test(n)), bgs = names.filter(isBg);
  const infos = names.filter((n) => /^info-/.test(n)), cards_ = names.filter((n) => /^card-/.test(n));
  const block = (title, list) => list.length ? `
  <h3>${title}</h3>
  <main class="catalog portrait">
${list.map(card(set)).join('\n')}
  </main>` : '';
  cards += names.length;
  const readme = set === 'lab' ? 'README.md' : `sets/${set}/README.md`;
  return `  <h2 id="set-${set}">${esc(c.label)} <small>--set ${set}</small></h2>
  <p>${esc(c.description)} Slot tables: <a href="${readme}"><code>${readme}</code></a>.</p>
  <nav>${names.map((n) => `<a href="#d-${set}-${n}">${n}</a>`).join('')}</nav>
  <h3>Slide designs</h3>
  <main class="catalog">
${slides.map(card(set)).join('\n')}
  </main>
  <h3>Backgrounds</h3>
  <main class="catalog">
${bgs.map(card(set)).join('\n')}
  </main>${block('Infographics', infos)}${block('Info cards', cards_)}`;
};

const page = `<!--
  GENERATED FILE — do not hand-edit.
  Source of truth: sets/<set>/designs/*.svg + samples.json in this directory; regenerate with:
      node bin/build-slides-gallery.js
  (design-pack v0.24.0 svg-slides theme sets)
-->
<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>svg-slides · design-pack</title>
<style>
  :root {
    --bg: #f8fafc; --surface: #ffffff; --surface2: #f1f5f9;
    --border: #e2e8f0; --border-bright: #cbd5e1;
    --text: #0f172a; --text-muted: #64748b; --text-dim: #94a3b8;
    --accent: #0d9488;
    --navy: #1a2744; --deep-blue: #2c4a7c; --teal: #0d9488;
    --coral: #ef4444; --amber: #f59e0b; --green: #10b981;
    --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    --font-head: 'Outfit', sans-serif;
    --font-mono: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
  }
  html[data-theme="dark"] {
    --bg: #0b0e14; --surface: #131820; --surface2: #1c2230;
    --border: #232a35; --border-bright: #313a4a;
    --text: #f8fafc; --text-muted: #94a3b8; --text-dim: #64748b;
    --accent: #14b8a6;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: var(--font-sans); background: var(--bg); color: var(--text); padding: 40px clamp(16px, 5vw, 72px) 80px; }
  header { display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap; margin-bottom: 28px; }
  h1 { font-family: var(--font-head); font-size: clamp(26px, 3.5vw, 38px); }
  header p { color: var(--text-muted); max-width: 70ch; }
  .toggle { margin-left: auto; background: var(--surface2); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 6px 14px; cursor: pointer; font-size: 14px; }
  .catalog { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 620px), 1fr)); gap: 24px; }
  .catalog.portrait { grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px; scroll-margin-top: 20px; min-width: 0; }
  figcaption { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 14px; }
  .idx { font-family: var(--font-mono); color: var(--accent); font-size: 13px; padding-top: 2px; }
  .info strong { font-family: var(--font-head); font-size: 16px; display: block; }
  .info em { color: var(--text-muted); font-style: normal; font-size: 13px; display: block; margin-top: 2px; }
  .use { color: var(--text-dim); font-size: 12px; display: block; margin-top: 4px; }
  .use code { font-family: var(--font-mono); color: var(--text-muted); }
  .stage { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
  .stage > svg { display: block; }
  details { margin-top: 12px; }
  summary { cursor: pointer; color: var(--text-muted); font-size: 13px; user-select: none; }
  .src { font-family: var(--font-mono); font-size: 11px; line-height: 1.5; color: var(--text-muted); background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 12px; overflow: auto; max-height: 340px; white-space: pre; margin-top: 8px; }
  nav { margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 8px; }
  nav a { font-size: 13px; color: var(--accent); text-decoration: none; border: 1px solid var(--border); border-radius: 999px; padding: 4px 12px; }
  nav a:hover { border-color: var(--accent); }
  h2 { font-family: var(--font-head); font-size: 22px; margin: 36px 0 6px; }
  h2 + p { color: var(--text-muted); font-size: 14px; max-width: 80ch; margin-bottom: 16px; }
  h2 small { font-family: var(--font-mono); font-size: 13px; color: var(--text-dim); font-weight: 400; margin-left: 8px; }
  h3 { font-family: var(--font-head); font-size: 16px; color: var(--text-muted); margin: 22px 0 12px; }
  .sets { position: sticky; top: 0; z-index: 2; background: var(--bg); padding: 10px 0; }
${setCss}
</style>
</head>
<body>
  <header>
    <h1>svg-slides</h1>
    <p>Slide designs with slot markers, in ${SETS.length} theme sets. Every set ships the same six slide designs with the same slot names, so one payload re-themes with <code>--set</code>. Each card is the design composed with its sample payload by <code>bin/compose-slide.js</code>. Real output bakes colours to hex for one theme; here the slide stays token-driven so you can preview both palettes. Graphic slots hold svg-library components.</p>
    <button class="toggle" onclick="var h=document.documentElement;h.setAttribute('data-theme',h.getAttribute('data-theme')==='dark'?'light':'dark')">◐</button>
  </header>
  <nav class="sets">${SETS.map((set) => `<a href="#set-${set}">${esc(conf(set).label)}</a>`).join('')}</nav>
${SETS.map(section).join('\n')}
</body>
</html>
`;

fs.writeFileSync(OUT, page);
console.log(`${path.relative(process.cwd(), OUT)}: ${cards} designs in ${SETS.length} sets`);
