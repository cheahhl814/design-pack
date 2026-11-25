#!/usr/bin/env node
// GenOffice integration: palette recolouring (no genoffice needed) + the deck bridge
// (needs the genoffice CLI; skipped with a notice when absent, since preflight.js is the hard gate).
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const { exportSvg } = require('../bin/svg-bake.js');
const { THEMES } = require('../bin/svg-bake.js');
const { resolvePalette, contrastWarnings, themeFromOoxml } = require('../bin/palette.js');
let pass = 0, fail = 0;
const check = (ok, msg) => { if (ok) pass++; else { fail++; console.log(`  ✗ ${msg}`); } };
const LAB = ['#0d9488', '#2c4a7c', '#f59e0b', '#ef4444', '#10b981'];
const SVG = path.join(ROOT, 'features/graphics/svg-library/svg');

// 1. every slide set recolours every component with no unresolved tokens; Lab hexes vanish for non-lab sets
const { listSets } = require('../bin/compose-slide.js');
for (const set of listSets()) {
  const tok = { ...THEMES.light, ...resolvePalette(set) };
  for (const f of ['mind-map', 'flow-pipeline', 'token-cascade']) {
    const out = exportSvg(fs.readFileSync(path.join(SVG, f + '.svg'), 'utf8'), 'light', tok);
    check(!/var\(|color-mix/.test(out), `${set}/${f}: unresolved tokens`);
    if (set !== 'lab' && tok.teal && tok.teal !== '#0d9488') check(!out.includes('fill:#0d9488'), `${set}/${f}: Lab teal survived`);
  }
}
// 2. json palette + contrast warnings
check(resolvePalette(null) && Object.keys(resolvePalette(null)).length === 0, 'no palette = Lab defaults');
check(contrastWarnings({ surface: '#ffffff', text: '#eeeeee' }).length === 1, 'low-contrast text warns');
check(contrastWarnings({ surface: '#ffffff', text: '#111111', teal: '#0d9488' }).length === 0, 'good palette is silent');

// 3. genoffice: OOXML theme -> palette, deck bridge
let have = true;
try { execFileSync('genoffice', ['--version'], { stdio: 'ignore' }); } catch { have = false; }
if (!have) console.log('  (genoffice CLI not found: bridge checks skipped; run bin/preflight.js)');
else {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dp-go-'));
  const samples = require('../templates/svg-slides/samples.json');
  const deck = path.join(tmp, 'deck.json');
  fs.writeFileSync(deck, JSON.stringify({ set: 'swiss', theme: 'light', slides: ['title-hero', 'content-two-col'].map((d) => ({ design: d, payload: samples[d] })) }));
  const out = execFileSync('node', [path.join(ROOT, 'bin/genoffice-bridge.js'), deck], { encoding: 'utf8' });
  const pptx = path.join(tmp, 'deck-build/deck.pptx');
  check(fs.existsSync(pptx), 'bridge wrote deck.pptx');
  check(/audit: .*no layout issues/.test(out), `slides audit clean (${out.split('\n').find((l) => l.startsWith('audit')) || 'no audit line'})`);
  const read = JSON.parse(execFileSync('genoffice', ['slides', 'read', pptx, '--json'], { encoding: 'utf8' }));
  const els = read.detail.pages.flatMap((p) => p.elements);
  check(read.detail.pages.length === 2, 'two slides');
  check(els.filter((e) => e.type === 'picture').length === 2, 'one art picture per slide');
  check(els.some((e) => e.type === 'text' && /Lab-on-chip/.test(e.text)), 'title is native editable text');
  const th = themeFromOoxml(pptx);
  check(/^#[0-9a-f]{6}$/.test(th.accent) && th['font-head'], 'themeFromOoxml reads a pptx theme');
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(`genoffice: ${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
