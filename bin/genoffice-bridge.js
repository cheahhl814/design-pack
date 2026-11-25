#!/usr/bin/env node
/**
 * genoffice-bridge.js: build a native, editable .pptx from design-pack slide designs
 * through GenOffice (mandatory dependency, see bin/preflight.js).
 *
 *     node bin/genoffice-bridge.js deck.json [--out deck.pptx] [--work DIR] [--no-build] [--render]
 *
 *   deck.json  { "set": "swiss", "theme": "light",
 *                "slides": [ { "design": "title-hero", "payload": { ...slot -> text|lines|graphic... } }, ... ] }
 *              Same payload format as compose-slide.js: its gates (budgets, GRAPHIC-TOO-SMALL) run first.
 *
 * Hybrid output per slide: the design's art (shapes + inlined diagrams, text removed) becomes one
 * full-canvas PNG, and each text slot becomes a NATIVE GenOffice text box at the slot's geometry,
 * so titles/bullets stay editable in PowerPoint/GenOffice. (GenOffice's deck spec accepts PNG/JPG
 * pictures, not SVG: spike 2026-11-25.) Writes WORK/art/NN.png, WORK/deck.spec.json, then runs
 * `genoffice create --type pptx --spec` and `genoffice slides audit`. 1280x720 designs only.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadDesign, compose, bake, palette, GateError } = require('./compose-slide.js');
const { flattenStyle } = require('./svg-bake.js');
const { renderPng } = require('./svg-export.js');

const PX_TO_PT = 0.75; // canvas 1280px = 13.333in at 96 px/in

const hexOf = (fill, pal) => flattenStyle(`fill:${fill}`, pal).match(/fill:(#[0-9a-f]{6})/)[1];
const family = (css) => css.split(',')[0].replace(/['"]/g, '').trim();

/** slide -> { art: svg string without text, page: GenOffice page object } */
function buildSlide(s, set, theme) {
  const design = loadDesign(s.design, set);
  if (design.canvas[0] !== 1280 || design.canvas[1] !== 720) throw new Error(`${s.design}: ${design.canvas.join('x')} canvas; bridge supports 1280x720 slide designs`);
  const c = compose(design, s.payload || {});
  const pal = palette(set, theme);
  const art = bake(c.svg, theme, set).replace(/<text\b[\s\S]*?<\/text>\s*/g, '');
  const elements = c.text.map((t) => {
    const [x, y, w] = t.box;
    return {
      type: 'text', x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(t.size * (1.15 + 1.25 * (t.lines.length - 1)) + 10),
      valign: 'top',
      paragraphs: t.lines.map((l) => ({
        align: t.anchor === 'middle' ? 'center' : t.anchor === 'end' ? 'right' : 'left',
        runs: [{ text: l, sizePt: Math.round(t.size * PX_TO_PT * 2) / 2, bold: t.weight >= 600, color: hexOf(t.fill, pal), font: family(pal[t.font === 'head' ? 'font-head' : 'font-sans']) }],
      })),
    };
  });
  return { art, bg: pal.surface, elements, title: (c.text[0] || { lines: [s.design] }).lines[0] };
}

function main(argv) {
  const args = argv.slice(2), flags = { out: '', work: '', build: true, render: false }, files = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out') flags.out = args[++i];
    else if (args[i] === '--work') flags.work = args[++i];
    else if (args[i] === '--no-build') flags.build = false;
    else if (args[i] === '--render') flags.render = true;
    else files.push(args[i]);
  }
  if (files.length !== 1) { console.error('usage: node bin/genoffice-bridge.js deck.json [--out deck.pptx] [--work DIR] [--no-build] [--render]'); process.exit(2); }
  const deck = JSON.parse(fs.readFileSync(files[0], 'utf8'));
  const set = deck.set || 'lab', theme = deck.theme || 'light';
  if (!Array.isArray(deck.slides) || !deck.slides.length) throw new Error('deck.json needs a non-empty "slides" array');
  const work = path.resolve(flags.work || path.join(path.dirname(files[0]), path.basename(files[0], '.json') + '-build'));
  const out = path.resolve(flags.out || path.join(work, 'deck.pptx'));
  fs.mkdirSync(path.join(work, 'art'), { recursive: true });
  const pages = deck.slides.map((s, i) => {
    const b = buildSlide(s, set, theme);
    const nn = String(i + 1).padStart(2, '0'), svgFile = path.join(work, 'art', `${nn}.svg`);
    fs.writeFileSync(svgFile, b.art);
    const png = renderPng(svgFile, b.art);
    return { title: b.title, type: 'content', layout: s.design, background: b.bg,
      elements: [{ type: 'image', url: path.relative(work, png), x: 0, y: 0, w: 1280, h: 720 }, ...b.elements] };
  });
  const spec = path.join(work, 'deck.spec.json');
  fs.writeFileSync(spec, JSON.stringify({ pages }, null, 2));
  console.log(spec);
  if (!flags.build) return;
  const go = (...a) => execFileSync('genoffice', a, { encoding: 'utf8', cwd: work, stdio: ['ignore', 'pipe', 'inherit'] });
  const made = JSON.parse(go('create', '--type', 'pptx', '--spec', spec, '--out', out, '--json'));
  const fails = (made.detail && made.detail.imageFailures) || [];
  if (fails.length) throw new Error('genoffice could not load images: ' + JSON.stringify(fails));
  console.log(out);
  const audit = JSON.parse(go('slides', 'audit', out, '--json'));
  console.log(`audit: ${audit.summary}`);
  if (flags.render) console.log(JSON.parse(go('slides', 'render', out, '--out', path.join(work, 'shots'), '--json')).summary);
}

if (require.main === module) {
  try { main(process.argv); } catch (e) { console.error(e instanceof GateError ? e.message : `genoffice-bridge: ${e.message}`); process.exit(1); }
}
module.exports = { buildSlide };
