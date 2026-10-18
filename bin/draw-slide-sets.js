#!/usr/bin/env node
/**
 * draw-slide-sets.js: writes the generated svg-slides theme sets (swiss,
 * boardroom, editorial, bold) into templates/svg-slides/sets/<set>/:
 * set.json (palette + fonts), designs/*.svg and README.md (catalog + slot tables).
 *
 *     node bin/draw-slide-sets.js [set...] [--out DIR]   (default: every set, into the repo)
 *
 *   --out   write to DIR/<set>/ instead (the tests diff that against the repo)
 *
 * The .svg files are the canonical designs the composer reads; this script is how
 * they are drawn. Edit a design HERE and re-run, never the .svg by hand, so the
 * preview text keeps the layout rule and the README tables keep the budgets.
 * The lab set is hand-drawn and not touched by this script.
 *
 * Shared contract (checked by test/smoke-test-slides.py): every set's six slide
 * designs keep lab's slot names, kinds, required flags and line counts, and
 * compose the shared samples.json payloads. Character budgets follow each set's
 * fonts. Preview text in every slot is the matching samples.json line(s).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let SETS_DIR = path.join(ROOT, 'templates', 'svg-slides', 'sets');
const SAMPLES = JSON.parse(fs.readFileSync(path.join(ROOT, 'templates', 'svg-slides', 'samples.json'), 'utf8'));
const FIRST = 1.15, LEAD = 1.25;
const f = (n) => String(+n.toFixed(1));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── drawing kit, bound to one set's light palette (the token fallbacks) ──────
function kit(P) {
  const c = (t) => `var(--${t},${P[t]})`;
  const mix = (a, p, b = 'transparent') => `color-mix(in srgb, ${a} ${p}%, ${b})`;
  const font = (k) => `var(--font-${k},${P['font-' + k]})`;
  const rect = (x, y, w, h, style, rx = 0) => `  <rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${rx ? ` rx="${rx}"` : ''} style="${style}"/>`;
  const circle = (cx, cy, r, style) => `  <circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" style="${style}"/>`;
  const line = (x1, y1, x2, y2, style, extra = '') => `  <line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" style="${style}"${extra}/>`;
  const poly = (pts, style) => `  <polygon points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" style="${style}"/>`;
  const pathd = (d, style, extra = '') => `  <path d="${d}" style="${style}"${extra}/>`;
  const label = (x, y, s, size, style, anchor = 'start') => `  <text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}" style="font-family:${font('head')};font-size:${size}px;${style}">${esc(s)}</text>`;
  const fill = (t) => `fill:${t}`;
  const stroke = (t, w) => `fill:none;stroke:${t};stroke-width:${w}`;

  /** text slot; o = {box, font, weight, size, lines, chars, anchor, fill, tracking, optional} */
  function text(arch, name, o) {
    const [x, y, w, h] = o.box;
    const anchor = o.anchor || 'start';
    if (o.size * LEAD * o.lines > h + o.size * 0.25) throw new Error(`${arch}/${name}: box h ${h} too small`);
    const v = SAMPLES[arch] && SAMPLES[arch][name];
    const preview = v === undefined ? [name.toUpperCase()] : Array.isArray(v) ? v : [v];
    if (preview.length > o.lines || preview.some((l) => [...l].length > o.chars)) throw new Error(`${arch}/${name}: sample over budget ${o.lines} × ${o.chars}`);
    const tx = anchor === 'start' ? x : anchor === 'middle' ? x + w / 2 : x + w;
    const st = `font-family:${font(o.font)};font-size:${o.size}px;font-weight:${o.weight};fill:${o.fill}` + (o.tracking ? `;letter-spacing:${o.tracking}px` : '');
    const attrs = `data-slot="${name}" data-slot-kind="text" data-slot-box="${x} ${y} ${w} ${h}" data-slot-font="${o.font}" data-slot-weight="${o.weight}" data-slot-size="${o.size}"` +
      (o.tracking ? ` data-slot-tracking="${o.tracking}"` : '') +
      ` data-slot-maxlines="${o.lines}" data-slot-maxchars="${o.chars}" data-slot-anchor="${anchor}" data-slot-fill="${o.fill}"` +
      (o.optional ? ' data-slot-optional="true"' : '');
    slots.push({ name, kind: 'text', ...o, anchor });
    return `  <g ${attrs}>\n` + preview.map((l, i) => `    <text x="${f(tx)}" y="${f(y + o.size * FIRST + i * o.size * LEAD)}" text-anchor="${anchor}" style="${st}">${esc(l)}</text>`).join('\n') + '\n  </g>';
  }

  /** graphic slot with the dashed hint frame */
  function graphic(name, box, optional = false) {
    const [x, y, w, h] = box;
    slots.push({ name, kind: 'graphic', box, optional });
    const cx = x + w / 2, cy = y + h / 2;
    return `  <g data-slot="${name}" data-slot-kind="graphic" data-slot-box="${x} ${y} ${w} ${h}"${optional ? ' data-slot-optional="true"' : ''}>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" style="fill:${mix(c('teal'), 4)};stroke:${c('border-bright')};stroke-width:1.5" stroke-dasharray="6 6"/>
    <rect x="${f(cx - 70)}" y="${f(cy - 40)}" width="36" height="28" style="fill:${mix(c('teal'), 16, c('surface'))};stroke:${c('teal')};stroke-width:2"/>
    <rect x="${f(cx - 18)}" y="${f(cy - 40)}" width="36" height="28" style="fill:${mix(c('amber'), 16, c('surface'))};stroke:${c('amber')};stroke-width:2"/>
    <rect x="${f(cx + 34)}" y="${f(cy - 40)}" width="36" height="28" style="fill:${mix(c('coral'), 16, c('surface'))};stroke:${c('coral')};stroke-width:2"/>
    <text x="${f(cx)}" y="${f(cy + 22)}" text-anchor="middle" style="font-family:${font('head')};font-size:11px;font-weight:700;fill:${c('text-muted')};letter-spacing:1.2px">GRAPHIC SLOT</text>
    <text x="${f(cx)}" y="${f(cy + 42)}" text-anchor="middle" style="font-family:${font('sans')};font-size:12px;fill:${c('text-muted')}">place an svg-library component here (800 × 450)</text>
  </g>`;
  }
  let slots = [];
  const take = () => { const s = slots; slots = []; return s; };
  const bg = (t) => `  <rect x="0" y="0" width="1280" height="720" style="fill:${t}"/>`;
  return { c, mix, font, rect, circle, line, poly, pathd, label, fill, stroke, text, graphic, take, bg };
}

// ── the sets ─────────────────────────────────────────────────────────────────
const SETS = {};

// Swiss: International Typographic Style. Strict grid, one grotesque, white
// content slides framed by bold red colour-block title / callout slides.
SETS.swiss = {
  label: 'Swiss',
  description: 'International Typographic Style: a strict 12-column grid, one grotesque (Helvetica / Arial) in two weights, flush-left ragged-right type, white content slides framed by bold red colour-block title, statement and closing slides, black rules, no ornament.',
  references: [
    'KeynotePro "Geneva" (International Typographic Style theme): bold coloured title and callout slides around clean white content slides, colour reserved for emphasis, minimal geometric ornament.',
    'Consulting slide rules (deckary.com design guide): three colour roles, 15 to 20 percent whitespace, one margin every element snaps to.',
  ],
  fonts: { 'font-head': 'Helvetica Neue, Helvetica, Arial, sans-serif', 'font-sans': 'Helvetica Neue, Helvetica, Arial, sans-serif' },
  light: { surface: '#ffffff', text: '#111111', 'text-muted': '#5e5e5e', border: '#e6e6e6', 'border-bright': '#c4c4c4', accent: '#e30613', teal: '#e30613', 'deep-blue': '#1f4fa3', amber: '#f5a800', coral: '#ff6a3d', green: '#0a8f5a', navy: '#111111', block: '#e30613', 'on-block': '#ffffff', ink: '#111111', 'on-ink': '#ffffff' },
  dark: { surface: '#101010', text: '#f4f4f4', 'text-muted': '#a3a3a3', border: '#262626', 'border-bright': '#3d3d3d', accent: '#ff3b30', teal: '#ff3b30', 'deep-blue': '#6f9be8', block: '#d7261e', 'on-block': '#ffffff', ink: '#1f1f1f', 'on-ink': '#f4f4f4' },
  designs(k) {
    const { c, mix, rect, line, text, graphic, fill, stroke, bg } = k;
    const on = c('on-block'), onMuted = mix(c('on-block'), 78, c('block'));
    const head = (o) => ({ font: 'head', ...o });
    return [
      { name: 'title-hero', title: 'Swiss cover slide design', aria: 'Cover slide with a red colour block holding the eyebrow, a two-line title, a subtitle and a meta line, and a white grid column with stacked black bars on the right',
        desc: 'Cover (1280x720): a red colour block over the left 70% holds every text slot flush left on the grid; the white right column carries stacked black typographic bars and a red square.',
        body: () => [bg(c('surface')), rect(0, 0, 900, 720, fill(c('block'))),
          rect(80, 64, 48, 8, fill(on)),
          text('title-hero', 'eyebrow', head({ box: [80, 96, 760, 20], weight: 700, size: 14, tracking: 1.5, lines: 1, chars: 48, fill: on })),
          text('title-hero', 'hero-title', head({ box: [80, 270, 780, 140], weight: 700, size: 54, lines: 2, chars: 26, fill: on })),
          text('title-hero', 'subtitle', { font: 'sans', box: [80, 440, 760, 60], weight: 400, size: 22, lines: 2, chars: 64, fill: onMuted }),
          line(80, 600, 860, 600, stroke(mix(c('on-block'), 45, c('block')), 1.5)),
          text('title-hero', 'meta', head({ box: [80, 620, 780, 22], weight: 500, size: 16, lines: 1, chars: 80, fill: on, optional: true })),
          ...[[960, 120, 240], [960, 160, 180], [960, 200, 220], [960, 240, 120]].map(([x, y, w]) => rect(x, y, w, 14, fill(c('text')))),
          rect(960, 560, 56, 56, fill(c('block'))),
          line(940, 0, 940, 720, stroke(c('border-bright'), 1)), line(1220, 0, 1220, 720, stroke(c('border'), 1)),
        ] },
      { name: 'section-break', title: 'Swiss section divider design', aria: 'Section divider with a heavy black rule, an oversized red chapter number on the left and the section title and orientation line on the right grid column',
        desc: 'Section divider: a heavy black rule across the top margin, an oversized red chapter number in the left four columns, eyebrow, title and orientation line from column six, a thin rule closing the block.',
        body: () => [bg(c('surface')), rect(80, 96, 1120, 10, fill(c('text'))),
          text('section-break', 'number', head({ box: [80, 170, 420, 320], weight: 700, size: 260, lines: 1, chars: 2, fill: c('block') })),
          text('section-break', 'eyebrow', head({ box: [560, 250, 640, 20], weight: 700, size: 14, tracking: 1.5, lines: 1, chars: 44, fill: c('text-muted'), optional: true })),
          text('section-break', 'section-title', head({ box: [560, 290, 640, 130], weight: 700, size: 50, lines: 2, chars: 22, fill: c('text') })),
          text('section-break', 'orientation', { font: 'sans', box: [560, 450, 640, 30], weight: 400, size: 22, lines: 1, chars: 56, fill: c('text-muted') }),
          line(560, 520, 1200, 520, stroke(c('text'), 2)), rect(1160, 600, 40, 40, fill(c('block'))),
        ] },
      { name: 'big-statement', title: 'Swiss statement slide design', aria: 'Statement slide in reversed type: a three-line takeaway set flush left on a solid black field, a red square marker and an attribution line',
        desc: 'Takeaway slide in reversed type: a solid ink field (black, a lifted charcoal in dark), a red square marks the eyebrow, three flush-left lines of statement, the attribution under a thin rule.',
        body: () => [bg(c('ink')), rect(80, 130, 40, 40, fill(c('block'))),
          text('big-statement', 'eyebrow', head({ box: [140, 140, 900, 20], weight: 700, size: 14, tracking: 1.5, lines: 1, chars: 48, fill: mix(c('on-ink'), 70, c('ink')), optional: true })),
          text('big-statement', 'statement', head({ box: [80, 210, 1120, 170], weight: 700, size: 44, lines: 3, chars: 46, fill: c('on-ink') })),
          line(80, 430, 400, 430, stroke(c('block'), 4)),
          text('big-statement', 'attribution', { font: 'sans', box: [80, 450, 1120, 26], weight: 400, size: 18, lines: 1, chars: 70, fill: mix(c('on-ink'), 70, c('ink')), optional: true }),
        ] },
      { name: 'content-two-col', title: 'Swiss two-column content design', aria: 'Two-column content slide on a grid: heading over a heavy rule, body text and a red-ruled callout in the left six columns, a hairline-framed graphic and caption in the right six',
        desc: 'Content slide on the 12-column grid: eyebrow and heading over a heavy black rule with a red tab, body text and a red-ruled key point in the left six columns, a hairline-framed graphic and caption in the right six.',
        body: () => [bg(c('surface')),
          text('content-two-col', 'eyebrow', head({ box: [80, 40, 700, 20], weight: 700, size: 13, tracking: 1.5, lines: 1, chars: 56, fill: c('block'), optional: true })),
          text('content-two-col', 'heading', head({ box: [80, 70, 1120, 52], weight: 700, size: 40, lines: 1, chars: 48, fill: c('text') })),
          rect(80, 140, 1120, 4, fill(c('text'))), rect(80, 136, 64, 12, fill(c('block'))),
          text('content-two-col', 'body', { font: 'sans', box: [80, 180, 560, 190], weight: 400, size: 24, lines: 6, chars: 46, fill: c('text') }),
          rect(80, 430, 6, 80, fill(c('block'))),
          text('content-two-col', 'callout', head({ box: [104, 440, 536, 60], weight: 700, size: 20, lines: 2, chars: 48, fill: c('text'), optional: true })),
          rect(700, 176, 500, 380, stroke(c('border-bright'), 1)),
          graphic('figure', [710, 186, 480, 360]),
          text('content-two-col', 'caption', { font: 'sans', box: [700, 580, 500, 40], weight: 400, size: 14, lines: 2, chars: 70, fill: c('text-muted'), optional: true }),
        ] },
      { name: 'full-diagram', title: 'Swiss full-diagram design', aria: 'Diagram slide: heading over a heavy rule, a large graphic area on nine columns and a red takeaway column on the right',
        desc: 'Figure slide: eyebrow and heading over a heavy black rule, a large graphic slot across nine columns, and a red colour-block column on the right holding the takeaway in white.',
        body: () => [bg(c('surface')),
          text('full-diagram', 'eyebrow', head({ box: [80, 32, 700, 20], weight: 700, size: 13, tracking: 1.5, lines: 1, chars: 48, fill: c('block'), optional: true })),
          text('full-diagram', 'heading', head({ box: [80, 60, 1120, 46], weight: 700, size: 36, lines: 1, chars: 56, fill: c('text') })),
          rect(80, 120, 1120, 4, fill(c('text'))),
          graphic('figure', [80, 150, 820, 480]),
          rect(940, 150, 260, 480, fill(c('block'))), rect(960, 170, 32, 6, fill(c('on-block'))),
          text('full-diagram', 'takeaway', head({ box: [960, 196, 230, 160], weight: 700, size: 18, lines: 6, chars: 24, fill: c('on-block'), optional: true })),
        ] },
      { name: 'closing', title: 'Swiss closing slide design', aria: 'Closing slide on a red colour block: an oversized two-line title, a thin rule, contact lines and a meta line, with a black bar in the corner',
        desc: 'Closing slide: the red colour block fills the slide; an oversized two-line title, a thin white rule, up to three contact lines and a meta line, all flush left; a black bar anchors the bottom right.',
        body: () => [bg(c('block')),
          text('closing', 'title', head({ box: [80, 170, 1120, 184], weight: 700, size: 72, lines: 2, chars: 20, fill: on })),
          line(80, 390, 1200, 390, stroke(mix(c('on-block'), 50, c('block')), 1.5)),
          text('closing', 'contact', { font: 'sans', box: [80, 420, 800, 84], weight: 400, size: 22, lines: 3, chars: 60, fill: on }),
          text('closing', 'meta', head({ box: [80, 600, 900, 22], weight: 500, size: 16, lines: 1, chars: 80, fill: onMuted, optional: true })),
          rect(1040, 600, 160, 24, fill(c('text'))),
        ] },
      { name: 'bg-grid', zone: 'x 80–1200, y 140–640 (below the top rule)', title: 'Swiss grid background', aria: 'Background with a faint twelve-column grid, a heavy black rule across the top margin and a red square in the top-left corner',
        desc: 'Background: a faint 12-column grid with its gutters, a heavy black rule across the top margin, a red square at the top-left corner of the grid and a short rule at the bottom right.',
        body: () => [bg(c('surface')),
          ...Array.from({ length: 12 }, (_, i) => rect(80 + i * 95, 40, 75, 640, fill(mix(c('text'), 2)))),
          ...Array.from({ length: 13 }, (_, i) => line(80 + i * 95 - (i === 12 ? 20 : 0), 40, 80 + i * 95 - (i === 12 ? 20 : 0), 680, stroke(mix(c('text'), 10), 1))),
          rect(80, 96, 1120, 10, fill(c('text'))), rect(80, 40, 40, 40, fill(c('block'))),
          rect(1040, 660, 160, 6, fill(c('text'))),
        ] },
      { name: 'bg-block', zone: 'x 80–780, y 80–640 (the white columns)', title: 'Swiss colour-block background', aria: 'Background with a red colour block over the right third, a black vertical rule beside it and white grid columns on the left',
        desc: 'Background: a red colour block over the right third of the slide, a black vertical rule at its edge, a short black bar on the block and faint column guides on the white side.',
        body: () => [bg(c('surface')), rect(854, 0, 426, 720, fill(c('block'))), rect(842, 0, 6, 720, fill(c('text'))),
          rect(900, 80, 120, 12, fill(c('on-block'))), rect(900, 104, 72, 12, fill(c('on-block'))),
          ...Array.from({ length: 8 }, (_, i) => line(80 + i * 95, 40, 80 + i * 95, 680, stroke(mix(c('text'), 8), 1))),
          rect(80, 640, 200, 6, fill(c('text'))),
        ] },
    ];
  },
};

// Boardroom: generic consulting style. Navy plus one bright accent, serif
// titles over sans body, one-sentence titles under a thin rule, agenda tracker.
SETS.boardroom = {
  label: 'Boardroom',
  description: 'Generic consulting style: navy plus one bright accent per slide, serif titles over sans body, one-sentence titles under a thin rule, a six-square agenda tracker, chart-left / insight-right 60:40 content, "so what" box. Not any firm\'s template or brand.',
  references: [
    'deckary.com PowerPoint design guide (from 300+ consulting decks): three colour roles, accent on one element per slide, 28 to 36 pt titles, data + insight layout with the chart at about 60 percent, 15 to 20 percent whitespace.',
    'SlideSpeak consulting-style prompts (unofficial): deep navy headings in a serif, one electric-blue takeaway accent per slide, titles under 15 words above a thin grey rule, agenda tracker of small squares.',
  ],
  fonts: { 'font-head': 'Georgia, Cambria, Times New Roman, serif', 'font-sans': 'Arial, Helvetica, sans-serif' },
  light: { surface: '#ffffff', text: '#0b1f33', 'text-muted': '#5b6b7c', border: '#e2e7ee', 'border-bright': '#c3ccd7', accent: '#2f6bff', teal: '#12355b', 'deep-blue': '#3f6fa8', amber: '#c9a227', coral: '#d1495b', green: '#2e8b6e', navy: '#0b1f33', block: '#12355b', 'on-block': '#ffffff' },
  dark: { surface: '#0b1622', text: '#eef3f8', 'text-muted': '#95a5b8', border: '#1b2a3b', 'border-bright': '#2c3f55', accent: '#6b93ff', teal: '#5b8fd1', 'deep-blue': '#7fa3d1', block: '#163454', 'on-block': '#eef3f8' },
  designs(k) {
    const { c, mix, rect, line, text, graphic, fill, stroke, bg } = k;
    const on = c('on-block'), onMuted = mix(c('on-block'), 72, c('block'));
    const tracker = (x, y, cur) => Array.from({ length: 6 }, (_, i) => rect(x + i * 14, y, 8, 8, i === cur ? fill(c('block')) : `fill:none;stroke:${c('border-bright')};stroke-width:1.2`));
    const bars = (x, y, col) => [[0, 60], [34, 96], [68, 132], [102, 180]].map(([dx, h], i) => rect(x + dx, y - h, 22, h, i === 3 ? fill(c('accent')) : fill(mix(col, 22))));
    return [
      { name: 'title-hero', title: 'Boardroom cover slide design', aria: 'Navy cover slide: an accent rule and eyebrow, a two-line serif title, a subtitle, a thin rule over the meta line and a small rising bar chart motif on the right',
        desc: 'Cover: full navy field; accent rule and tracked eyebrow, a two-line serif title, a sans subtitle, a thin rule above the meta line, and a small four-bar rising chart motif (last bar in the accent) on the right.',
        body: () => [bg(c('block')), rect(96, 128, 56, 4, fill(c('accent'))),
          text('title-hero', 'eyebrow', { font: 'sans', box: [96, 150, 800, 20], weight: 700, size: 14, tracking: 2, lines: 1, chars: 48, fill: mix(c('accent'), 55, c('on-block')) }),
          text('title-hero', 'hero-title', { font: 'head', box: [96, 200, 840, 150], weight: 700, size: 56, lines: 2, chars: 26, fill: on }),
          text('title-hero', 'subtitle', { font: 'sans', box: [96, 380, 820, 60], weight: 400, size: 22, lines: 2, chars: 72, fill: onMuted }),
          line(96, 596, 1184, 596, stroke(mix(c('on-block'), 30, c('block')), 1)),
          text('title-hero', 'meta', { font: 'sans', box: [96, 616, 900, 22], weight: 400, size: 15, lines: 1, chars: 80, fill: onMuted, optional: true }),
          ...bars(1040, 520, c('on-block')), line(1030, 520, 1160, 520, stroke(mix(c('on-block'), 40, c('block')), 1.5)),
        ] },
      { name: 'section-break', title: 'Boardroom section divider design', aria: 'Section divider: a navy left panel holding the chapter number, the agenda tracker with the current section filled, and the serif section title with an orientation line on white',
        desc: 'Section divider: a navy left panel holds the chapter number in serif; on white, the six-square agenda tracker (current square filled), eyebrow, a two-line serif section title under an accent rule and a sans orientation line.',
        body: () => [bg(c('surface')), rect(0, 0, 420, 720, fill(c('block'))),
          text('section-break', 'number', { font: 'sans', box: [60, 250, 300, 200], weight: 700, size: 160, lines: 1, chars: 2, anchor: 'middle', fill: on }),
          rect(180, 470, 60, 3, fill(c('accent'))),
          ...tracker(500, 200, 1),
          text('section-break', 'eyebrow', { font: 'sans', box: [500, 236, 700, 20], weight: 700, size: 14, tracking: 2, lines: 1, chars: 44, fill: c('accent'), optional: true }),
          text('section-break', 'section-title', { font: 'head', box: [500, 280, 700, 130], weight: 700, size: 48, lines: 2, chars: 24, fill: c('text') }),
          line(500, 430, 1200, 430, stroke(c('border-bright'), 1)),
          text('section-break', 'orientation', { font: 'sans', box: [500, 448, 700, 30], weight: 400, size: 22, lines: 1, chars: 56, fill: c('text-muted') }),
        ] },
      { name: 'big-statement', title: 'Boardroom statement slide design', aria: 'Statement slide: an accent bar beside a three-line serif takeaway in navy, an eyebrow above and a source-style attribution below a thin rule',
        desc: 'Takeaway slide: an accent bar runs beside a three-line serif statement in navy, the tracked eyebrow above, a thin rule and a source-style attribution below; quiet grey corner ticks frame the block.',
        body: () => [bg(c('surface')), rect(120, 214, 6, 150, fill(c('accent'))),
          text('big-statement', 'eyebrow', { font: 'sans', box: [160, 172, 960, 20], weight: 700, size: 14, tracking: 2, lines: 1, chars: 48, fill: c('accent'), optional: true }),
          text('big-statement', 'statement', { font: 'head', box: [160, 210, 960, 160], weight: 700, size: 38, lines: 3, chars: 45, fill: c('text') }),
          line(160, 404, 1120, 404, stroke(c('border-bright'), 1)),
          text('big-statement', 'attribution', { font: 'sans', box: [160, 420, 960, 26], weight: 400, size: 18, lines: 1, chars: 70, fill: c('text-muted'), optional: true }),
          ...[[96, 120, 1], [1184, 120, -1]].map(([x, y, d]) => `  <path d="M ${x} ${y + 30} L ${x} ${y} L ${x + d * 30} ${y}" style="fill:none;stroke:${c('border-bright')};stroke-width:2"/>`),
          ...[[96, 520, 1], [1184, 520, -1]].map(([x, y, d]) => `  <path d="M ${x} ${y - 30} L ${x} ${y} L ${x + d * 30} ${y}" style="fill:none;stroke:${c('border-bright')};stroke-width:2"/>`),
        ] },
      { name: 'content-two-col', title: 'Boardroom chart + insight design', aria: 'Chart and insight slide: a one-line serif action title over a thin rule with the agenda tracker, the graphic on the left sixty percent with a source line, and body text plus a navy so-what box on the right',
        desc: 'Data + insight slide: eyebrow, a one-line serif action title over a thin grey rule, tracker top right; the graphic fills the left 60% with a source line under it, the body text and a navy "so what" box take the right 40%.',
        body: () => [bg(c('surface')), ...tracker(1132, 34, 2),
          text('content-two-col', 'eyebrow', { font: 'sans', box: [64, 28, 700, 20], weight: 700, size: 12, tracking: 2, lines: 1, chars: 56, fill: c('accent'), optional: true }),
          text('content-two-col', 'heading', { font: 'head', box: [64, 54, 1152, 46], weight: 700, size: 34, lines: 1, chars: 56, fill: c('text') }),
          line(64, 118, 1216, 118, stroke(c('border-bright'), 1)),
          graphic('figure', [64, 146, 680, 430]),
          text('content-two-col', 'caption', { font: 'sans', box: [64, 592, 680, 36], weight: 400, size: 13, lines: 2, chars: 90, fill: c('text-muted'), optional: true }),
          line(764, 146, 764, 620, stroke(c('border'), 1)),
          text('content-two-col', 'body', { font: 'sans', box: [788, 150, 428, 150], weight: 400, size: 19, lines: 6, chars: 44, fill: c('text') }),
          rect(784, 436, 432, 112, fill(c('block'))), rect(784, 436, 6, 112, fill(c('accent'))),
          text('content-two-col', 'callout', { font: 'head', box: [806, 460, 396, 60], weight: 700, size: 18, lines: 2, chars: 38, fill: on, optional: true }),
        ] },
      { name: 'full-diagram', title: 'Boardroom full-diagram design', aria: 'Diagram slide: a one-line serif action title over a thin rule, a large graphic area, and a pale accent-tinted key takeaway card on the right',
        desc: 'Figure slide: eyebrow and a one-line serif action title over a thin grey rule, tracker top right, a large graphic slot, and a pale accent-tinted takeaway card with an accent top edge on the right.',
        body: () => [bg(c('surface')), ...tracker(1132, 34, 3),
          text('full-diagram', 'eyebrow', { font: 'sans', box: [64, 28, 700, 20], weight: 700, size: 12, tracking: 2, lines: 1, chars: 48, fill: c('accent'), optional: true }),
          text('full-diagram', 'heading', { font: 'head', box: [64, 54, 1152, 46], weight: 700, size: 34, lines: 1, chars: 56, fill: c('text') }),
          line(64, 118, 1216, 118, stroke(c('border-bright'), 1)),
          graphic('figure', [64, 140, 860, 490]),
          rect(956, 180, 260, 196, fill(mix(c('accent'), 8, c('surface')))), rect(956, 180, 260, 4, fill(c('accent'))),
          text('full-diagram', 'takeaway', { font: 'sans', box: [976, 204, 228, 160], weight: 700, size: 17, lines: 6, chars: 24, fill: c('text'), optional: true }),
        ] },
      { name: 'closing', title: 'Boardroom closing slide design', aria: 'Navy closing slide: an accent rule, a two-line serif title, contact lines, a thin rule over the meta line and the rising bar motif',
        desc: 'Closing slide: full navy field, accent rule, a two-line serif title, up to three sans contact lines, a thin rule above the meta line and the cover\'s rising-bar motif on the right.',
        body: () => [bg(c('block')), rect(96, 170, 56, 4, fill(c('accent'))),
          text('closing', 'title', { font: 'head', box: [96, 196, 900, 164], weight: 700, size: 64, lines: 2, chars: 20, fill: on }),
          text('closing', 'contact', { font: 'sans', box: [96, 400, 900, 84], weight: 400, size: 22, lines: 3, chars: 60, fill: onMuted }),
          line(96, 596, 1184, 596, stroke(mix(c('on-block'), 30, c('block')), 1)),
          text('closing', 'meta', { font: 'sans', box: [96, 616, 900, 22], weight: 400, size: 15, lines: 1, chars: 80, fill: onMuted, optional: true }),
          ...bars(1040, 520, c('on-block')), line(1030, 520, 1160, 520, stroke(mix(c('on-block'), 40, c('block')), 1.5)),
        ] },
      { name: 'bg-rule', zone: 'x 64–1216, y 140–630 (title area above it stays free for a heading)', title: 'Boardroom rule background', aria: 'Background with a thin navy band across the top, a thin grey title rule, the agenda tracker and a hairline source rule near the bottom',
        desc: 'Background: a thin navy band along the top edge, a grey title rule at y 118, the six-square agenda tracker top right and a hairline source rule near the bottom; a title goes above the rule, content below.',
        body: () => [bg(c('surface')), rect(0, 0, 1280, 10, fill(c('block'))), rect(0, 10, 220, 3, fill(c('accent'))),
          line(64, 118, 1216, 118, stroke(c('border-bright'), 1)), ...tracker(1132, 34, 0),
          line(64, 650, 1216, 650, stroke(c('border'), 1)), rect(64, 664, 120, 6, fill(mix(c('text'), 14))),
        ] },
      { name: 'bg-panel', zone: 'x 460–1216, y 80–640 (right of the panel)', title: 'Boardroom side-panel background', aria: 'Background with a navy panel over the left third, an accent rule on the panel, the rising bar motif at its foot and a white field on the right',
        desc: 'Background: a navy panel over the left 31% with an accent rule and the rising-bar motif at its foot, a thin grey rule at the panel edge, and a white field for content on the right.',
        body: () => [bg(c('surface')), rect(0, 0, 400, 720, fill(c('block'))), rect(64, 80, 56, 4, fill(c('accent'))),
          ...bars(64, 640, c('on-block')), line(410, 0, 410, 720, stroke(c('border'), 1)),
          rect(460, 80, 120, 6, fill(mix(c('text'), 12))),
        ] },
    ];
  },
};

// Editorial: magazine look. Cream paper, brown serif headlines, terracotta
// accent, cool blue figures, hairline and double rules, asymmetric grid.
SETS.editorial = {
  label: 'Editorial',
  description: 'Magazine look: cream paper, deep-brown serif headlines over a clean sans body, one terracotta accent, cool blue for figures, hairline and double rules, an asymmetric grid with a pull-quote and an oversized chapter numeral.',
  references: [
    'Gamma "warm editorial" deck: deep-brown cover with cream serif text, cream interiors with brown serif headlines, terracotta accents and cool-blue data visualisations.',
    'tosea.ai editorial decks: bone-white palette, hairline borders, asymmetric grids; serif display headings with all-caps tracked sans subheads.',
    'Lovable "Stone Paper" editorial template: cream paper, a Literata-style serif paired with a grotesque, three-column magazine grid.',
  ],
  fonts: { 'font-head': 'Georgia, Iowan Old Style, Palatino Linotype, serif', 'font-sans': 'Helvetica Neue, Helvetica, Arial, sans-serif' },
  light: { surface: '#f6f1e7', text: '#2b2118', 'text-muted': '#75644f', border: '#e5dbc8', 'border-bright': '#cdbb9c', accent: '#b5532c', teal: '#b5532c', 'deep-blue': '#3d6a8a', amber: '#c99a3b', coral: '#9e3b2f', green: '#61784a', navy: '#2b2118', block: '#2b2118', 'on-block': '#f6f1e7' },
  dark: { surface: '#1d1813', text: '#f2ebdf', 'text-muted': '#b3a48e', border: '#2f271e', 'border-bright': '#463a2d', accent: '#d9774c', teal: '#d9774c', 'deep-blue': '#86a9c4', block: '#322820', 'on-block': '#f2ebdf' },
  designs(k) {
    const { c, mix, rect, circle, line, label, text, graphic, fill, stroke, bg } = k;
    const dbl = (x1, x2, y) => [line(x1, y, x2, y, stroke(c('text'), 1.5)), line(x1, y + 5, x2, y + 5, stroke(c('text'), 0.75))];
    const hair = (x1, x2, y) => line(x1, y, x2, y, stroke(c('border-bright'), 1));
    const sun = (cx, cy, r, x1, x2, y0) => [circle(cx, cy, r, fill(mix(c('teal'), 85, c('surface')))),
      ...Array.from({ length: 9 }, (_, i) => line(x1, y0 + i * 16, x2, y0 + i * 16, stroke(mix(c('text'), 30), 1)))];
    return [
      { name: 'title-hero', title: 'Editorial cover slide design', aria: 'Magazine cover slide on cream paper: a double rule and tracked eyebrow, a two-line serif title, a subtitle, a hairline over the meta line, and a framed terracotta sun over ruled lines on the right',
        desc: 'Cover: cream paper, a double rule under the tracked eyebrow, a two-line serif title flush left, a sans subtitle, a hairline above the meta line; the right column is a thin-framed plate with a terracotta sun setting into ruled lines.',
        body: () => [bg(c('surface')), ...dbl(80, 1200, 70),
          text('title-hero', 'eyebrow', { font: 'sans', box: [80, 96, 700, 20], weight: 700, size: 13, tracking: 2.4, lines: 1, chars: 48, fill: c('accent') }),
          text('title-hero', 'hero-title', { font: 'head', box: [80, 220, 760, 150], weight: 400, size: 56, lines: 2, chars: 24, fill: c('text') }),
          text('title-hero', 'subtitle', { font: 'sans', box: [80, 400, 720, 60], weight: 400, size: 21, lines: 2, chars: 64, fill: c('text-muted') }),
          hair(80, 800, 588),
          text('title-hero', 'meta', { font: 'sans', box: [80, 606, 720, 22], weight: 400, size: 14, tracking: 1, lines: 1, chars: 80, fill: c('text-muted'), optional: true }),
          rect(880, 120, 320, 508, stroke(c('border-bright'), 1)), rect(892, 132, 296, 484, fill(mix(c('teal'), 7, c('surface')))),
          ...sun(1040, 360, 96, 904, 1176, 380), rect(904, 380, 272, 4, fill(c('surface'))),
        ] },
      { name: 'section-break', title: 'Editorial section divider design', aria: 'Section divider on cream paper: an oversized terracotta serif numeral, a vertical hairline, and the eyebrow, two-line serif section title and orientation line, closed by a double rule',
        desc: 'Section divider: an oversized terracotta serif numeral on the left, a vertical hairline, then the tracked eyebrow, a two-line serif section title and a sans orientation line; a double rule closes the page.',
        body: () => [bg(c('surface')),
          text('section-break', 'number', { font: 'head', box: [80, 160, 400, 300], weight: 400, size: 240, lines: 1, chars: 2, fill: c('accent') }),
          line(500, 200, 500, 500, stroke(c('border-bright'), 1)),
          text('section-break', 'eyebrow', { font: 'sans', box: [540, 230, 640, 20], weight: 700, size: 13, tracking: 2.4, lines: 1, chars: 44, fill: c('accent'), optional: true }),
          text('section-break', 'section-title', { font: 'head', box: [540, 270, 660, 130], weight: 400, size: 48, lines: 2, chars: 24, fill: c('text') }),
          text('section-break', 'orientation', { font: 'sans', box: [540, 430, 660, 30], weight: 400, size: 21, lines: 1, chars: 56, fill: c('text-muted') }),
          ...dbl(80, 1200, 600),
        ] },
      { name: 'big-statement', title: 'Editorial pull-quote design', aria: 'Pull-quote slide on cream paper: a large terracotta opening quotation mark, a three-line serif statement between hairlines and an attribution line',
        desc: 'Pull-quote slide: a large terracotta opening quotation mark hangs in the left margin, a three-line serif statement sits between two hairlines with the eyebrow above, and the attribution follows in sans.',
        body: () => [bg(c('surface')), label(150, 300, '“', 220, `fill:${mix(c('accent'), 80, c('surface'))}`, 'end'),
          hair(200, 1100, 150),
          text('big-statement', 'eyebrow', { font: 'sans', box: [200, 170, 900, 20], weight: 700, size: 13, tracking: 2.4, lines: 1, chars: 48, fill: c('accent'), optional: true }),
          text('big-statement', 'statement', { font: 'head', box: [200, 214, 900, 160], weight: 400, size: 38, lines: 3, chars: 42, fill: c('text') }),
          hair(200, 1100, 400),
          text('big-statement', 'attribution', { font: 'sans', box: [200, 420, 900, 26], weight: 400, size: 17, lines: 1, chars: 70, fill: c('text-muted'), optional: true }),
        ] },
      { name: 'content-two-col', title: 'Editorial two-column content design', aria: 'Magazine spread slide: serif heading over a double rule, a sans body column and a terracotta serif pull-quote between hairlines on the left, a column rule, and a framed plate with caption on the right',
        desc: 'Spread: tracked eyebrow and serif heading over a double rule; the left column holds the sans body and a terracotta serif pull-quote between hairlines, a column hairline divides it from a thin-framed figure plate and caption.',
        body: () => [bg(c('surface')),
          text('content-two-col', 'eyebrow', { font: 'sans', box: [80, 42, 700, 20], weight: 700, size: 13, tracking: 2.4, lines: 1, chars: 56, fill: c('accent'), optional: true }),
          text('content-two-col', 'heading', { font: 'head', box: [80, 70, 1120, 52], weight: 400, size: 40, lines: 1, chars: 48, fill: c('text') }),
          ...dbl(80, 1200, 140),
          text('content-two-col', 'body', { font: 'sans', box: [80, 176, 540, 170], weight: 400, size: 22, lines: 6, chars: 46, fill: c('text') }),
          hair(80, 620, 428),
          text('content-two-col', 'callout', { font: 'head', box: [80, 442, 540, 60], weight: 400, size: 20, lines: 2, chars: 46, fill: c('accent'), optional: true }),
          hair(80, 620, 520),
          line(660, 176, 660, 620, stroke(c('border-bright'), 1)),
          rect(700, 170, 500, 390, stroke(c('border-bright'), 1)),
          graphic('figure', [712, 182, 476, 366]),
          text('content-two-col', 'caption', { font: 'sans', box: [700, 580, 500, 40], weight: 400, size: 13, lines: 2, chars: 70, fill: c('text-muted'), optional: true }),
        ] },
      { name: 'full-diagram', title: 'Editorial full-diagram design', aria: 'Figure slide on cream paper: serif heading over a double rule, a large framed graphic plate, and a takeaway column under a terracotta rule on the right',
        desc: 'Figure slide: tracked eyebrow and serif heading over a double rule, a large thin-framed graphic plate, and a right column opened by a short terracotta rule holding the serif takeaway.',
        body: () => [bg(c('surface')),
          text('full-diagram', 'eyebrow', { font: 'sans', box: [80, 34, 700, 20], weight: 700, size: 13, tracking: 2.4, lines: 1, chars: 48, fill: c('accent'), optional: true }),
          text('full-diagram', 'heading', { font: 'head', box: [80, 60, 1120, 48], weight: 400, size: 36, lines: 1, chars: 54, fill: c('text') }),
          ...dbl(80, 1200, 124),
          rect(80, 150, 830, 480, stroke(c('border-bright'), 1)),
          graphic('figure', [90, 160, 810, 460]),
          rect(944, 190, 60, 4, fill(c('accent'))),
          text('full-diagram', 'takeaway', { font: 'head', box: [944, 210, 256, 150], weight: 400, size: 18, lines: 6, chars: 24, fill: c('text'), optional: true }),
          line(944, 600, 1200, 600, stroke(c('border-bright'), 1)),
        ] },
      { name: 'closing', title: 'Editorial closing slide design', aria: 'Closing slide on cream paper: double rules top and bottom, a centred two-line serif title, a small terracotta diamond, centred contact lines and a meta line',
        desc: 'Closing slide: double rules frame the page, a centred two-line serif title, a small terracotta diamond on a hairline, then centred sans contact lines and a tracked meta line.',
        body: () => [bg(c('surface')), ...dbl(80, 1200, 80),
          text('closing', 'title', { font: 'head', box: [140, 180, 1000, 172], weight: 400, size: 68, lines: 2, chars: 20, anchor: 'middle', fill: c('text') }),
          line(520, 384, 760, 384, stroke(c('border-bright'), 1)),
          `  <polygon points="640,374 650,384 640,394 630,384" style="fill:${c('accent')}"/>`,
          text('closing', 'contact', { font: 'sans', box: [140, 410, 1000, 84], weight: 400, size: 21, lines: 3, chars: 60, anchor: 'middle', fill: c('text') }),
          text('closing', 'meta', { font: 'sans', box: [140, 560, 1000, 22], weight: 400, size: 14, tracking: 1, lines: 1, chars: 80, anchor: 'middle', fill: c('text-muted'), optional: true }),
          ...dbl(80, 1200, 620),
        ] },
      { name: 'bg-paper', zone: 'x 80–1200, y 110–600 (between the double rules)', title: 'Editorial paper background', aria: 'Cream paper background with double rules at the top and bottom margins, faint three-column hairlines and a small terracotta square',
        desc: 'Background: cream paper, a double rule under the top margin and above the bottom margin, faint three-column hairlines between them and a small terracotta square at the top-left of the grid.',
        body: () => [bg(c('surface')), ...dbl(80, 1200, 80), ...dbl(80, 1200, 620),
          ...[453, 827].map((x) => line(x, 110, x, 600, stroke(mix(c('border-bright'), 60), 1))),
          rect(80, 52, 14, 14, fill(c('accent'))),
        ] },
      { name: 'bg-sun', zone: 'x 80–700, y 80–640 (the left side)', title: 'Editorial sun background', aria: 'Cream paper background with a large terracotta sun setting into ruled lines on the right edge and a double rule along the top',
        desc: 'Background: cream paper, a double rule along the top, and a large terracotta sun on the right edge setting into a block of ruled lines; the left side stays open for content.',
        body: () => [bg(c('surface')), ...dbl(80, 1200, 50),
          circle(1060, 380, 190, fill(mix(c('teal'), 80, c('surface')))), rect(780, 380, 500, 340, fill(c('surface'))),
          ...Array.from({ length: 16 }, (_, i) => line(800, 400 + i * 18, 1280, 400 + i * 18, stroke(mix(c('text'), 28), 1))),
        ] },
    ];
  },
};

// Bold geometric: saturated colour fields, polygon blocks, heavy display type.
SETS.bold = {
  label: 'Bold geometric',
  description: 'Saturated colour fields and flat polygon blocks (violet, amber, coral, blue, green) with heavy display type (Arial Black) over a clean grotesque body; high contrast, no gradients, shapes kept clear of every text slot.',
  references: [
    'Slidev "bricks" theme: a colourful, bold theme built from polygon components.',
    'Apple Keynote "Bold" theme category (Bold Color, Showcase, Modern Type): full colour fields and oversized type.',
    'tosea.ai "Editorial Chroma": a high-energy orange / teal palette on an off-white base with heavy headings.',
  ],
  fonts: { 'font-head': 'Arial Black, Arial, Helvetica, sans-serif', 'font-sans': 'Helvetica Neue, Helvetica, Arial, sans-serif' },
  light: { surface: '#ffffff', text: '#15122b', 'text-muted': '#5f5b78', border: '#ebe8f5', 'border-bright': '#cdc8e0', accent: '#5b2eff', teal: '#5b2eff', 'deep-blue': '#1f6bff', amber: '#ffc21a', coral: '#ff4f64', green: '#00c48c', navy: '#15122b', block: '#5b2eff', 'on-block': '#ffffff' },
  dark: { surface: '#110f1f', text: '#f6f4ff', 'text-muted': '#a9a4c7', border: '#241f3d', 'border-bright': '#37305a', accent: '#8a6bff', teal: '#7b5cff', block: '#4a24e0', 'on-block': '#ffffff' },
  designs(k) {
    const { c, mix, rect, circle, poly, text, graphic, fill, bg } = k;
    const on = c('on-block'), onMuted = mix(c('on-block'), 80, c('block'));
    const shapes = [poly([[1280, 720], [1280, 300], [880, 720]], fill(c('amber'))),
      circle(1120, 170, 90, fill(c('coral'))),
      poly([[1010, 300], [1080, 370], [1010, 440], [940, 370]], fill(c('deep-blue'))),
      circle(1210, 420, 22, fill(c('green')))];
    return [
      { name: 'title-hero', title: 'Bold geometric cover slide design', aria: 'Violet cover slide with an amber triangle, a coral circle, a blue diamond and a green dot on the right, and the eyebrow, a heavy two-line title, a subtitle and a meta line on the left',
        desc: 'Cover: a full violet field; flat polygons (amber triangle, coral circle, blue diamond, green dot) on the right; on the left an amber eyebrow, a heavy two-line title, a subtitle and a meta line.',
        body: () => [bg(c('block')), ...shapes, rect(80, 140, 64, 10, fill(c('amber'))),
          text('title-hero', 'eyebrow', { font: 'sans', box: [80, 170, 760, 20], weight: 700, size: 15, tracking: 2, lines: 1, chars: 48, fill: c('amber') }),
          text('title-hero', 'hero-title', { font: 'head', box: [80, 226, 860, 150], weight: 800, size: 54, lines: 2, chars: 24, fill: on }),
          text('title-hero', 'subtitle', { font: 'sans', box: [80, 410, 820, 60], weight: 400, size: 22, lines: 2, chars: 72, fill: onMuted }),
          text('title-hero', 'meta', { font: 'sans', box: [80, 620, 800, 22], weight: 700, size: 16, lines: 1, chars: 80, fill: on, optional: true }),
        ] },
      { name: 'section-break', title: 'Bold geometric section divider design', aria: 'Section divider: a violet left block holding a huge chapter number with an amber corner triangle, and on white a heavy two-line section title between coral and blue shapes',
        desc: 'Section divider: a violet block over the left 40% holds a huge white chapter number, with an amber triangle in its corner; on white, the eyebrow, a heavy two-line section title and an orientation line, a coral dot and blue bar as accents.',
        body: () => [bg(c('surface')), rect(0, 0, 520, 720, fill(c('block'))), poly([[0, 720], [0, 520], [200, 720]], fill(c('amber'))),
          text('section-break', 'number', { font: 'head', box: [80, 180, 400, 320], weight: 800, size: 250, lines: 1, chars: 2, fill: on }),
          circle(1180, 120, 36, fill(c('coral'))), rect(580, 560, 200, 16, fill(c('deep-blue'))), rect(796, 560, 40, 16, fill(c('green'))),
          text('section-break', 'eyebrow', { font: 'sans', box: [580, 230, 640, 20], weight: 700, size: 14, tracking: 2, lines: 1, chars: 44, fill: c('block'), optional: true }),
          text('section-break', 'section-title', { font: 'head', box: [580, 270, 640, 130], weight: 800, size: 46, lines: 2, chars: 20, fill: c('text') }),
          text('section-break', 'orientation', { font: 'sans', box: [580, 430, 640, 30], weight: 400, size: 22, lines: 1, chars: 56, fill: c('text-muted') }),
        ] },
      { name: 'big-statement', title: 'Bold geometric statement slide design', aria: 'Statement slide: a heavy centred three-line takeaway in violet framed by a coral circle top left, an amber triangle bottom right, a blue square and a green dot',
        desc: 'Takeaway slide on white: a heavy centred three-line statement in the violet accent with the eyebrow above and attribution below, framed by a coral circle top left, an amber triangle bottom right, a blue square and a green dot.',
        body: () => [bg(c('surface')), circle(30, 40, 120, fill(c('coral'))), poly([[1280, 720], [1280, 500], [1020, 720]], fill(c('amber'))),
          rect(1160, 90, 50, 50, fill(c('deep-blue'))), circle(120, 640, 18, fill(c('green'))),
          text('big-statement', 'eyebrow', { font: 'sans', box: [140, 168, 1000, 20], weight: 700, size: 14, tracking: 2, lines: 1, chars: 48, anchor: 'middle', fill: c('text-muted'), optional: true }),
          text('big-statement', 'statement', { font: 'head', box: [140, 210, 1000, 160], weight: 800, size: 38, lines: 3, chars: 40, anchor: 'middle', fill: c('accent') }),
          rect(600, 400, 80, 8, fill(c('amber'))),
          text('big-statement', 'attribution', { font: 'sans', box: [140, 424, 1000, 26], weight: 400, size: 18, lines: 1, chars: 70, anchor: 'middle', fill: c('text-muted'), optional: true }),
        ] },
      { name: 'content-two-col', title: 'Bold geometric two-column content design', aria: 'Content slide: heavy heading over amber and coral bars, a body card with a thick violet edge and an amber key-point card on the left, a graphic frame on a flat coral offset block on the right',
        desc: 'Content slide: a violet eyebrow and heavy heading over amber and coral bars; a pale body card with a thick violet edge and an amber key-point card on the left; the graphic frame sits on a flat coral offset block on the right.',
        body: () => [bg(c('surface')),
          text('content-two-col', 'eyebrow', { font: 'sans', box: [80, 38, 700, 20], weight: 700, size: 13, tracking: 2, lines: 1, chars: 56, fill: c('block'), optional: true }),
          text('content-two-col', 'heading', { font: 'head', box: [80, 64, 1120, 52], weight: 800, size: 38, lines: 1, chars: 44, fill: c('text') }),
          rect(80, 134, 120, 10, fill(c('amber'))), rect(208, 134, 40, 10, fill(c('coral'))),
          rect(72, 166, 588, 236, fill(mix(c('block'), 6, c('surface'))), 6), rect(72, 166, 8, 236, fill(c('block'))),
          text('content-two-col', 'body', { font: 'sans', box: [100, 184, 540, 190], weight: 400, size: 22, lines: 6, chars: 46, fill: c('text') }),
          rect(72, 424, 588, 106, fill(mix(c('amber'), 26, c('surface'))), 6),
          text('content-two-col', 'callout', { font: 'head', box: [96, 446, 540, 60], weight: 800, size: 20, lines: 2, chars: 40, fill: c('text'), optional: true }),
          rect(712, 172, 500, 380, fill(c('coral')), 6), rect(700, 160, 500, 380, fill(c('surface')), 6),
          `  <rect x="700" y="160" width="500" height="380" rx="6" style="fill:none;stroke:${c('text')};stroke-width:3"/>`,
          graphic('figure', [712, 172, 476, 356]),
          text('content-two-col', 'caption', { font: 'sans', box: [700, 576, 520, 40], weight: 400, size: 14, lines: 2, chars: 70, fill: c('text-muted'), optional: true }),
        ] },
      { name: 'full-diagram', title: 'Bold geometric full-diagram design', aria: 'Diagram slide: a heavy heading over colour bars, a large graphic area and a violet takeaway block with an amber circle on the right',
        desc: 'Figure slide: violet eyebrow and a heavy one-line heading over amber and coral bars, a large graphic slot, and a violet takeaway block on the right with an amber circle cut into its foot.',
        body: () => [bg(c('surface')),
          text('full-diagram', 'eyebrow', { font: 'sans', box: [64, 30, 700, 20], weight: 700, size: 13, tracking: 2, lines: 1, chars: 48, fill: c('block'), optional: true }),
          text('full-diagram', 'heading', { font: 'head', box: [64, 56, 1152, 46], weight: 800, size: 34, lines: 1, chars: 50, fill: c('text') }),
          rect(64, 116, 120, 8, fill(c('amber'))), rect(192, 116, 40, 8, fill(c('coral'))),
          graphic('figure', [64, 146, 860, 484]),
          rect(960, 146, 256, 484, fill(c('block')), 6), circle(1170, 600, 40, fill(c('amber'))),
          text('full-diagram', 'takeaway', { font: 'sans', box: [984, 176, 216, 160], weight: 700, size: 18, lines: 6, chars: 24, fill: on, optional: true }),
        ] },
      { name: 'closing', title: 'Bold geometric closing slide design', aria: 'Violet closing slide with the cover shapes on the right and a heavy two-line title, contact lines and a meta line on the left',
        desc: 'Closing slide: the cover\'s violet field and flat polygons, a heavy two-line title, an amber bar, up to three contact lines and a meta line on the left.',
        body: () => [bg(c('block')), ...shapes,
          text('closing', 'title', { font: 'head', box: [80, 170, 820, 180], weight: 800, size: 70, lines: 2, chars: 18, fill: on }),
          rect(80, 376, 120, 10, fill(c('amber'))),
          text('closing', 'contact', { font: 'sans', box: [80, 410, 800, 84], weight: 400, size: 22, lines: 3, chars: 60, fill: on }),
          text('closing', 'meta', { font: 'sans', box: [80, 610, 800, 22], weight: 700, size: 16, lines: 1, chars: 80, fill: onMuted, optional: true }),
        ] },
      { name: 'bg-corners', zone: 'x 200–1080, y 120–600 (the middle)', title: 'Bold geometric corners background', aria: 'White background with a coral quarter circle in the top-left corner, violet and amber triangles in the bottom-right corner, a blue square and a green dot',
        desc: 'Background: white, a coral quarter circle in the top-left corner, stacked violet and amber triangles in the bottom-right, a small blue square top right and a green dot bottom left; the middle stays clear.',
        body: () => [bg(c('surface')),
          `  <path d="M 0 0 L 180 0 A 180 180 0 0 1 0 180 Z" style="fill:${c('coral')}"/>`,
          poly([[1280, 720], [1280, 420], [980, 720]], fill(c('block'))), poly([[1280, 720], [1280, 560], [1120, 720]], fill(c('amber'))),
          rect(1180, 60, 40, 40, fill(c('deep-blue'))), circle(80, 640, 18, fill(c('green'))),
        ] },
      { name: 'bg-stripe', zone: 'x 520–1200, y 80–640 (right of the stripe)', title: 'Bold geometric stripe background', aria: 'White background with a broad violet diagonal stripe across the left side, an amber triangle and coral circle on it and a row of blue dots',
        desc: 'Background: white, a broad violet diagonal stripe across the left side with an amber triangle and a coral circle riding it, and a short row of blue dots at the top right.',
        body: () => [bg(c('surface')), poly([[0, 0], [300, 0], [460, 720], [0, 720]], fill(c('block'))),
          poly([[0, 720], [0, 470], [250, 720]], fill(c('amber'))), circle(250, 160, 60, fill(c('coral'))),
          ...Array.from({ length: 5 }, (_, i) => circle(1040 + i * 36, 60, 8, fill(c('deep-blue')))),
        ] },
    ];
  },
};

// ── writers ──────────────────────────────────────────────────────────────────
const wrap = (s, w = 76, ind = '  ') => {
  const out = []; let cur = '';
  for (const word of s.split(/\s+/)) {
    if ((cur + ' ' + word).trim().length > w) { out.push(cur.trim()); cur = word; } else cur += ' ' + word;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.map((l) => ind + l).join('\n');
};
const slotSummary = (slots) => slots.map((s) => s.kind === 'graphic' ? `${s.name} (graphic)`
  : `${s.name} (text, ${s.optional ? 'optional, ' : ''}${s.lines} × ${s.chars} ch)`).join(' · ');
const tokensOf = (svg) => [...new Set([...svg.matchAll(/var\(--([a-z-]+)/g)].map((m) => m[1]))].join(' ');

function drawSet(name) {
  const S = SETS[name];
  const P = { ...S.light, ...S.fonts };
  const k = kit(P);
  const dir = path.join(SETS_DIR, name, 'designs');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const rows = [];
  for (const d of S.designs(k)) {
    const body = d.body().join('\n');
    const slots = k.take();
    const decor = !!d.zone;
    if (decor && slots.length) throw new Error(`${name}/${d.name}: background with slots`);
    const svgBody = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" role="img" aria-label="${esc(d.aria)}"${decor ? ' data-decor-only="true"' : ''} style="width:100%;height:auto">
  <title>${esc(d.title)}</title>
${body}
</svg>
`;
    const head = `<!--
design-pack · svg-slides · ${name} · ${d.name}
${wrap(d.desc)}
${decor ? `  Content zone: ${d.zone}.` : wrap(`Slots: ${slotSummary(slots)}.`)}
${wrap(`Tokens: ${tokensOf(svgBody)}.`)}
  Generated by bin/draw-slide-sets.js (edit there, then re-run); slot rules in templates/svg-slides/README.md.
-->
`;
    if (/--(?!>)/.test(head.slice(4, -4))) throw new Error(`${d.name}: double hyphen in the header comment`);
    fs.writeFileSync(path.join(dir, `${d.name}.svg`), head + svgBody);
    rows.push({ ...d, slots, decor });
  }
  fs.writeFileSync(path.join(SETS_DIR, name, 'set.json'), JSON.stringify({
    label: S.label, description: S.description, generatedBy: 'bin/draw-slide-sets.js',
    fonts: S.fonts, light: S.light, dark: S.dark,
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(SETS_DIR, name, 'README.md'), readme(name, S, rows));
  console.log(`${path.relative(process.cwd(), path.join(SETS_DIR, name))}: ${rows.length} designs`);
}

function readme(name, S, rows) {
  const type = (s) => `${s.font} ${s.size}/${s.weight}${s.tracking ? ' tracked' : ''}, ${s.anchor}`;
  const content = rows.filter((r) => !r.decor), bgs = rows.filter((r) => r.decor);
  return `# svg-slides set: ${S.label} (\`${name}\`)

<!-- GENERATED by bin/draw-slide-sets.js. Edit the script, then re-run it. -->

${S.description}

\`\`\`
node bin/compose-slide.js title-hero --set ${name} --payload payload.json --theme light --out slides/
\`\`\`

The six slide designs keep the lab set's slot names, kinds, required flags and line counts, so any
payload that fits these budgets composes in every set. Character budgets follow this set's fonts.
Shared conventions, gates and the layout rule: [\`../../README.md\`](../../README.md).

**References** (composition and palette cues only, no assets copied):
${S.references.map((r) => `- ${r}`).join('\n')}

## Palette and fonts

| Token | Light | Dark |
|---|---|---|
${Object.keys(S.light).map((t) => `| \`--${t}\` | \`${S.light[t]}\` | \`${S.dark[t] || S.light[t]}\` |`).join('\n')}

Fonts: head \`${S.fonts['font-head']}\`; sans \`${S.fonts['font-sans']}\`. Token names are palette
slots, not literal hues: \`--teal\` is this set's primary. \`--block\` / \`--on-block\` are the
colour-block fill and the text on it (\`--ink\` / \`--on-ink\` likewise for a reversed field). Inlined svg-library components pick up the same palette.

## Catalog

| # | Design | What it is |
|---|---|---|
${content.map((r, i) => `| ${i + 1} | \`${r.name}\` | ${r.desc} |`).join('\n')}

${content.map((r) => `### \`${r.name}\`
| Slot | Kind | Box (x y w h) | Type | Budget | Required |
|---|---|---|---|---|---|
${r.slots.map((s) => s.kind === 'graphic' ? `| \`${s.name}\` | graphic | ${s.box.join(' ')} | svg-library component, contain-fit | — | ${s.optional ? 'optional' : 'yes'} |`
    : `| \`${s.name}\` | text | ${s.box.join(' ')} | ${type(s)} | ${s.lines} × ${s.chars} ch | ${s.optional ? 'optional' : 'yes'} |`).join('\n')}
`).join('\n')}
## Backgrounds

Decor-only stages (\`data-decor-only="true"\`, zero slots); compose with \`--payload '{}'\`.

| # | Design | What it is | Content zone (clear) |
|---|---|---|---|
${bgs.map((r, i) => `| ${i + 1} | \`${r.name}\` | ${r.desc} | ${r.zone} |`).join('\n')}
`;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const o = args.indexOf('--out');
  if (o >= 0) SETS_DIR = path.resolve(args.splice(o, 2)[1]);
  const want = args;
  for (const n of want.length ? want : Object.keys(SETS)) {
    if (!SETS[n]) { console.error(`unknown set ${n} (known: ${Object.keys(SETS).join(', ')})`); process.exit(2); }
    drawSet(n);
  }
}

module.exports = { SETS };
