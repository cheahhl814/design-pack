#!/usr/bin/env node
/**
 * compose-slide.js: merge an svg-slides design + svg-library graphics + text
 * into ONE composed, renderer-safe SVG slide (1280x720).
 *
 *     node bin/compose-slide.js <design|path.svg> --payload payload.json
 *                               [--set SET] [--theme light|dark] [--out DIR] [--name NAME]
 *
 *   design    a name from templates/svg-slides/sets/<set>/designs/ (e.g. title-hero) or a path
 *   --set     theme set (default lab): its designs, palette and fonts, from
 *             templates/svg-slides/sets/<set>/set.json. Every set ships the same six
 *             slide designs with the same slot names, so one payload re-themes.
 *   payload   JSON object keyed by slot name (a file, or inline JSON such as '{}';
 *             decor-only backgrounds, data-decor-only="true", have no slots and take {}):
 *               text slot    -> "one line" or ["line 1", "line 2"] (no auto-wrap:
 *                               you break the lines, the composer checks the budget)
 *               graphic slot -> an svg-library name ("flow-pipeline") or a path to
 *                               a token-driven or already-baked .svg
 *   --out     output directory (default ./slides); writes <name>.svg, the
 *             composed slide with colours baked to hex
 *   --name    output basename (default: the design name)
 *
 * Gates (exit 1, message starts with the gate name and the slot):
 *   DESIGN-UNKNOWN, DESIGN-INVALID (bad slot markup), PAYLOAD-MALFORMED,
 *   SLOT-UNKNOWN (payload key with no slot), SLOT-MISSING (required slot not in
 *   payload), TEXT-OVERFLOW (line > maxchars or lines > maxlines),
 *   GRAPHIC-UNREADABLE, BAKE-LEFTOVER (var()/color-mix()/data-slot survived).
 *
 * Text layout rule (also in templates/svg-slides/README.md): first baseline =
 * box top + size × 1.15, each further line + size × 1.25; x from data-slot-anchor
 * (start = box left, middle = box centre, end = box right).
 */
const fs = require('fs');
const path = require('path');
const { THEMES, exportSvg } = require('./svg-bake.js');

const ROOT = path.resolve(__dirname, '..');
const SETS_DIR = path.join(ROOT, 'templates', 'svg-slides', 'sets');
const designDir = (set = 'lab') => path.join(SETS_DIR, set, 'designs');
const listSets = () => fs.readdirSync(SETS_DIR).filter((d) => fs.existsSync(path.join(SETS_DIR, d, 'set.json'))).sort();
const LIB_DIR = path.join(ROOT, 'features', 'graphics', 'svg-library', 'svg');
const W = 1280, H = 720;
const FIRST = 1.15, LEAD = 1.25;
const FONTS = { head: 'var(--font-head,ui-sans-serif,system-ui)', sans: 'var(--font-sans,ui-sans-serif,system-ui)' };

class GateError extends Error {
  constructor(gate, msg) { super(`${gate}: ${msg}`); this.gate = gate; }
}
const gate = (code, msg) => { throw new GateError(code, msg); };
const fmt = (n) => String(+n.toFixed(1));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));

// Same hard rules as the svg-library gallery validator
function lint(src) {
  const errs = [];
  if (/\sid="/.test(src)) errs.push('has id= attributes');
  if (/<(defs|marker|filter|mask|pattern|clipPath|script)[\s>]/.test(src)) errs.push('has defs/marker/filter/mask/pattern/clipPath/script');
  if (!/<svg[^>]*viewBox="0 0 1280 720"/.test(src)) errs.push('viewBox must be 0 0 1280 720');
  if (!/role="img"/.test(src) || !/aria-label="[^"]+"/.test(src) || !/<title>[^<]+<\/title>/.test(src)) errs.push('needs role="img", aria-label and <title>');
  return errs;
}

// Slot groups: <g data-slot=...> ... matching </g> (slot groups may nest plain <g>s)
function parseDesign(src, label = 'design') {
  const errs = lint(src);
  if (errs.length) gate('DESIGN-INVALID', `${label}: ${errs.join('; ')}`);
  const slots = [];
  const re = /<g\s[^>]*data-slot="[^"]*"[^>]*>/g;
  let m;
  while ((m = re.exec(src))) {
    let depth = 1, i = m.index + m[0].length;
    const tagRe = /<g[\s>]|<\/g>/g;
    tagRe.lastIndex = i;
    let t;
    while (depth && (t = tagRe.exec(src))) depth += t[0] === '</g>' ? -1 : 1;
    if (depth) gate('DESIGN-INVALID', `${label}: unbalanced <g> in a slot`);
    const a = attrs(m[0]);
    const name = a['data-slot'];
    const s = { name, kind: a['data-slot-kind'], start: m.index, end: tagRe.lastIndex, open: m[0],
      optional: a['data-slot-optional'] === 'true' };
    const bad = (why) => gate('DESIGN-INVALID', `${label}: slot "${name}" ${why}`);
    if (slots.some((o) => o.name === name)) bad('is declared twice');
    s.box = (a['data-slot-box'] || '').trim().split(/\s+/).map(Number);
    const [x, y, w, h] = s.box;
    if (s.box.length !== 4 || s.box.some(isNaN) || w <= 0 || h <= 0 || x < 0 || y < 0 || x + w > W || y + h > H) bad(`box "${a['data-slot-box']}" must be 4 positive numbers inside ${W}x${H}`);
    if (s.kind === 'text') {
      s.font = a['data-slot-font'] || 'sans';
      s.weight = +(a['data-slot-weight'] || 400);
      s.size = +a['data-slot-size'];
      s.maxlines = +a['data-slot-maxlines'];
      s.maxchars = +a['data-slot-maxchars'];
      s.anchor = a['data-slot-anchor'] || 'start';
      s.fill = a['data-slot-fill'] || 'var(--text,#0f172a)';
      s.tracking = a['data-slot-tracking'] ? +a['data-slot-tracking'] : 0;
      if (!FONTS[s.font]) bad('font must be head or sans');
      if (!['start', 'middle', 'end'].includes(s.anchor)) bad('anchor must be start, middle or end');
      if (!(s.size > 0 && s.maxlines >= 1 && s.maxchars >= 1)) bad('needs data-slot-size, -maxlines and -maxchars (the budget)');
      if (s.size * LEAD * s.maxlines > h + s.size * 0.25) bad(`box height ${h} cannot hold ${s.maxlines} line(s) at ${s.size}px`);
    } else if (s.kind !== 'graphic') bad('kind must be text or graphic');
    slots.push(s);
    re.lastIndex = s.end;
  }
  // background (decor-only) designs carry no slots at all; every other design needs one
  const decorOnly = /<svg[^>]*data-decor-only="true"/.test(src);
  if (decorOnly && slots.length) gate('DESIGN-INVALID', `${label}: decor-only design has slot "${slots[0].name}" (backgrounds take no slots)`);
  if (!decorOnly && !slots.length) gate('DESIGN-INVALID', `${label}: no data-slot groups`);
  return { src, slots, decorOnly };
}

function loadDesign(ref, set = 'lab') {
  if (!listSets().includes(set)) gate('DESIGN-UNKNOWN', `set ${set} (known: ${listSets().join(', ')})`);
  const file = ref.endsWith('.svg') ? ref : path.join(designDir(set), `${ref}.svg`);
  if (!fs.existsSync(file)) gate('DESIGN-UNKNOWN', `${ref} (known in ${set}: ${listDesigns(set).join(', ')})`);
  return parseDesign(fs.readFileSync(file, 'utf8'), path.basename(file, '.svg'));
}

const listDesigns = (set = 'lab') => fs.readdirSync(designDir(set)).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)).sort();

function textLines(s, v) {
  const lines = typeof v === 'string' ? [v] : v;
  if (!Array.isArray(lines) || !lines.every((l) => typeof l === 'string')) gate('PAYLOAD-MALFORMED', `slot "${s.name}" needs a string or an array of strings`);
  if (lines.length > s.maxlines) gate('TEXT-OVERFLOW', `slot "${s.name}" has ${lines.length} lines, budget ${s.maxlines}`);
  lines.forEach((l, i) => {
    const n = [...l].length;
    if (n > s.maxchars) gate('TEXT-OVERFLOW', `slot "${s.name}" line ${i + 1} has ${n} chars, budget ${s.maxchars}: "${l}"`);
  });
  return lines;
}

function renderText(s, lines) {
  const [x, y, w] = s.box;
  const tx = s.anchor === 'start' ? x : s.anchor === 'middle' ? x + w / 2 : x + w;
  const style = `font-family:${FONTS[s.font]};font-size:${s.size}px;font-weight:${s.weight};fill:${s.fill}` +
    (s.tracking ? `;letter-spacing:${s.tracking}px` : '');
  return lines.map((l, i) => `\n    <text x="${fmt(tx)}" y="${fmt(y + s.size * FIRST + i * s.size * LEAD)}" text-anchor="${s.anchor}" style="${style}">${esc(l)}</text>`).join('') + '\n  ';
}

function renderGraphic(s, ref) {
  if (typeof ref !== 'string' || !ref) gate('PAYLOAD-MALFORMED', `slot "${s.name}" needs an svg-library name or a .svg path`);
  const lib = path.join(LIB_DIR, `${ref}.svg`);
  const file = /^[a-z0-9-]+$/.test(ref) && fs.existsSync(lib) ? lib : ref;
  let src;
  try {
    if (!file.endsWith('.svg')) throw new Error('not an svg-library name or a .svg path');
    src = fs.readFileSync(file, 'utf8');
  } catch (e) { gate('GRAPHIC-UNREADABLE', `slot "${s.name}": ${ref}: ${e.message}`); }
  src = src.replace(/<\?xml[^>]*\?>/, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  const root = src.match(/^<svg\b[^>]*>/);
  const vb = root && attrs(root[0]).viewBox;
  if (!vb || !src.endsWith('</svg>')) gate('GRAPHIC-UNREADABLE', `slot "${s.name}": ${ref} has no <svg viewBox> root`);
  if (/\sid="/.test(src)) gate('GRAPHIC-UNREADABLE', `slot "${s.name}": ${ref} has id= attributes (would collide when inlined)`);
  const label = attrs(root[0])['aria-label'] || '';
  const [x, y, w, h] = s.box;
  const name = path.basename(file, '.svg');
  // nested <svg> carrier: viewBox scaling with the default xMidYMid meet keeps the aspect ratio
  return `\n    <svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb}" role="img" aria-label="${esc(label)}" data-component="${esc(name)}">` +
    src.slice(root[0].length, -'</svg>'.length) + '</svg>\n  ';
}

/** design + payload -> { svg (token-driven, markers dropped), text[], graphics[] } */
function compose(design, payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) gate('PAYLOAD-MALFORMED', 'payload must be a JSON object keyed by slot name');
  const names = design.slots.map((s) => s.name);
  for (const k of Object.keys(payload)) if (!names.includes(k)) gate('SLOT-UNKNOWN', `payload key "${k}" (design slots: ${names.join(', ') || 'none, decor-only background'})`);
  const text = [], graphics = [];
  let svg = '', at = 0;
  for (const s of design.slots) {
    const v = payload[s.name];
    const empty = v === undefined || v === null || (Array.isArray(v) && !v.length) || v === '';
    if (empty && !s.optional) gate('SLOT-MISSING', `slot "${s.name}" (${s.kind}) is required`);
    let inner = '';
    if (!empty && s.kind === 'text') {
      const lines = textLines(s, v);
      inner = renderText(s, lines);
      text.push({ slot: s.name, lines, box: s.box, font: s.font, weight: s.weight, size: s.size,
        anchor: s.anchor, fill: s.fill, tracking: s.tracking });
    } else if (!empty) {
      inner = renderGraphic(s, v);
      graphics.push({ slot: s.name, component: v, box: s.box });
    }
    svg += design.src.slice(at, s.start) + s.open + inner + '</g>';
    at = s.end;
  }
  svg = (svg + design.src.slice(at)).replace(/\s+data-(slot[\w-]*|decor-only)="[^"]*"/g, '');
  return { svg, text, graphics };
}

// One theme of a set: the slide-template palette, overridden by the set's own tokens and fonts
function palette(set = 'lab', theme = 'light') {
  const conf = JSON.parse(fs.readFileSync(path.join(SETS_DIR, set, 'set.json'), 'utf8'));
  return { ...THEMES[theme], ...conf.fonts, ...(conf[theme] || {}) };
}

function bake(svg, theme, set = 'lab') {
  const out = exportSvg(svg, theme, palette(set, theme));
  if (/var\(|color-mix\(|data-slot/.test(out)) gate('BAKE-LEFTOVER', 'var()/color-mix()/data-slot left in the composed slide');
  return out;
}

/** Write <name>.svg; returns its path */
function composeToFiles(ref, payload, theme = 'light', out = 'slides', name, set = 'lab') {
  if (!THEMES[theme]) gate('PAYLOAD-MALFORMED', `theme must be light or dark, not ${theme}`);
  const design = loadDesign(ref, set);
  const c = compose(design, payload);
  name = name || path.basename(ref, '.svg');
  fs.mkdirSync(out, { recursive: true });
  const file = path.join(out, `${name}.svg`);
  fs.writeFileSync(file, bake(c.svg, theme, set));
  return file;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  let theme = 'light', out = 'slides', payloadFile, name, set = 'lab';
  const refs = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--theme') theme = args[++i];
    else if (args[i] === '--out') out = args[++i];
    else if (args[i] === '--payload') payloadFile = args[++i];
    else if (args[i] === '--name') name = args[++i];
    else if (args[i] === '--set') set = args[++i];
    else refs.push(args[i]);
  }
  if (refs.length !== 1 || !payloadFile) {
    console.error('usage: node bin/compose-slide.js <design|path.svg> --payload payload.json|JSON [--set SET] [--theme light|dark] [--out DIR] [--name NAME]');
    console.error(`sets: ${listSets().join(', ')}; lab designs: ${listDesigns().join(', ')}`);
    process.exit(2);
  }
  try {
    let payload;
    // --payload takes a file, or inline JSON ('{}' for a decor-only background)
    try { payload = JSON.parse(payloadFile.trim().startsWith('{') ? payloadFile : fs.readFileSync(payloadFile, 'utf8')); } catch (e) { gate('PAYLOAD-MALFORMED', `${payloadFile}: ${e.message}`); }
    console.log(composeToFiles(refs[0], payload, theme, out, name, set));
  } catch (e) {
    console.error(e instanceof GateError ? e.message : `compose-slide: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { SETS_DIR, designDir, listSets, palette, FIRST, LEAD, GateError, lint, parseDesign, loadDesign, listDesigns, compose, bake, composeToFiles };
