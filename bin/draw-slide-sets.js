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
          text('title-hero', 'meta', { font: 'sans', box: [80, 606, 760, 22], weight: 400, size: 14, tracking: 1, lines: 1, chars: 80, fill: c('text-muted'), optional: true }),
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

// ── shared six-slide layout for the themed sets (academia ... nordic) ────────
// One geometry, keeping lab's slot names, kinds, line counts and required flags;
// each set supplies palette, fonts, fills, ornaments (pre/post/panels) and the
// character-width ratios its budgets follow (chars = box width / (ratio × size + tracking)).
//   o.r: em widths {head, hcap (tracked caps title), body, cap (tracked caps), mono};
//   o.mono: style declarations appended to eyebrow / meta / caption slots (a mono face);
//   o.tx: declarations appended to title fills (outline, italic, halo).
function std(k, o) {
  const { c, mix, text, graphic, bg } = k;
  const mid = o.align === 'middle', A = mid ? 'middle' : 'start', W = 1280 - 2 * o.m, r = o.r, S = o.sz;
  const hh = (size, n) => Math.ceil(size * (1.25 * n - 0.25)) + 4;
  const ch = (role, w, size, tr = 0, cap = 1e9) => Math.min(cap, Math.floor((w - 3) / (r[role] * size + tr)));
  const mono = o.mono ? `;${o.mono}` : '';
  const g = {};
  { const w = mid ? W : o.tw || 900, h = hh(S.hero, 2);
    g['title-hero'] = { eb: [o.m, 150, w, 22], hero: [o.m, 206, w, h], sub: [o.m, 206 + h + 30, w, 62], meta: [o.m, o.metaY || 610, w, 22] }; }
  { const th = hh(S.secT, 2);
    if (mid) { const ty = 80 + S.num + 10 + 70;
      g['section-break'] = { num: [o.m, 80, W, S.num + 10], eb: [o.m, ty - 42, W, 22], title: [o.m, ty, W, th], ori: [o.m, ty + th + 30, W, 30] };
    } else { const tx = o.m + 440, tw = 1280 - tx - o.m;
      g['section-break'] = { num: [o.m, 150, 400, S.num + 10], eb: [tx, 230, tw, 22], title: [tx, 270, tw, th], ori: [tx, 270 + th + 30, tw, 30] }; } }
  { const h = hh(S.stmt, 3), w = W;
    g['big-statement'] = { eb: [o.m, 150, w, 22], st: [o.m, 196, w, h], at: [o.m, 196 + h + 50, w, 26] }; }
  g['content-two-col'] = { eb: [64, 30, 700, 20], hd: [64, 56, 1152, hh(S.hd, 1)], body: [64, 162, 540, hh(19, 6)], call: [64, 388, 540, hh(18, 2)],
    bodyP: [52, 150, 568, 168], callP: [52, 376, 568, 74], figP: [680, 150, 536, 390], fig: [696, 166, 504, 358], cap: [680, 560, 536, 36] };
  g['full-diagram'] = { eb: [64, 28, 700, 20], hd: [64, 52, 1152, hh(S.hd2, 1)], figP: [64, 140, 820, 480], fig: [80, 156, 788, 448], takeP: [904, 140, 312, 480], take: [928, 184, 272, hh(18, 6)] };
  { const h = hh(S.cl, 2), w = mid ? W : o.cw || W;
    g.closing = { title: [o.m, 150, w, h], contact: [o.m, 150 + h + 50, w, hh(22, 3)], meta: [o.m, o.metaY || 610, w, 22] }; }
  const F = (n) => ({ ...o.fill, ...(o.fills && o.fills[n]) });
  const tfill = (n) => `${F(n).t}${o.tx ? ';' + o.tx(n) : ''}`;
  const sml = (n, extra) => `${extra}${mono}`;
  const eb = (arch, box, optional) => text(arch, 'eyebrow', { font: 'sans', box, weight: 700, size: 14, tracking: o.etr, lines: 1, chars: ch(o.mono ? 'mono' : 'cap', box[2], 14, o.etr, 48), anchor: A, fill: sml(arch, F(arch).e), optional });
  const ttl = (arch, name, box, size, lines, tr) => text(arch, name, { font: 'head', box, weight: o.hw, size, lines, chars: ch(tr ? 'hcap' : 'head', box[2], size, tr || 0), tracking: tr, anchor: A, fill: tfill(arch) });
  const bod = (arch, name, box, size, lines, cap, optional, fl, wt = 400) => text(arch, name, { font: 'sans', box, weight: wt, size, lines, chars: ch('body', box[2], size, 0, cap), anchor: A, fill: fl, optional });
  const L = (n) => [bg(c(o.bg ? o.bg(n) : 'surface')), ...(o.pre ? o.pre(n, g) : [])];
  const after = (n) => (o.post ? o.post(n, g) : []);
  const D = o.dec;
  const d = (name, what, body) => ({ name, title: `${o.label} ${what} design`, aria: D[name][0], desc: D[name][1], body });
  const T = g['title-hero'], SB = g['section-break'], BS = g['big-statement'], CT = g['content-two-col'], FD = g['full-diagram'], CL = g.closing;
  const sm = (arch, name, box, size, optional, fl, wt = 400, cap = 80) => text(arch, name, { font: 'sans', box, weight: wt, size, lines: 1, chars: ch('mono' in r && o.mono ? 'mono' : 'body', box[2], size, 0, cap), anchor: A, fill: sml(arch, fl), optional });
  return [
    d('title-hero', 'cover slide', () => [...L('title-hero'),
      eb('title-hero', T.eb, false), ttl('title-hero', 'hero-title', T.hero, S.hero, 2, o.htr),
      bod('title-hero', 'subtitle', T.sub, 22, 2, 72, false, F('title-hero').m),
      sm('title-hero', 'meta', T.meta, 15, true, F('title-hero').m), ...after('title-hero')]),
    d('section-break', 'section divider', () => [...L('section-break'),
      text('section-break', 'number', { font: 'head', box: SB.num, weight: o.hw, size: S.num, lines: 1, chars: 2, anchor: A, fill: `${F('section-break').n || F('section-break').t}${o.tx ? ';' + o.tx('num') : ''}` }),
      eb('section-break', SB.eb, true), ttl('section-break', 'section-title', SB.title, S.secT, 2, o.htr),
      bod('section-break', 'orientation', SB.ori, 22, 1, 56, false, F('section-break').m), ...after('section-break')].filter(Boolean)),
    d('big-statement', 'statement slide', () => [...L('big-statement'),
      eb('big-statement', BS.eb, true), text('big-statement', 'statement', { font: 'head', box: BS.st, weight: o.hw, size: S.stmt, lines: 3, chars: ch('head', BS.st[2], S.stmt), anchor: A, fill: tfill('big-statement') }),
      bod('big-statement', 'attribution', BS.at, 18, 1, 70, true, F('big-statement').m), ...after('big-statement')]),
    d('content-two-col', 'two-column content', () => [...L('content-two-col'),
      eb('content-two-col', CT.eb, true), text('content-two-col', 'heading', { font: 'head', box: CT.hd, weight: o.hw, size: S.hd, lines: 1, chars: ch('head', CT.hd[2], S.hd, 0, 46), anchor: 'start', fill: tfill('content-two-col') }),
      text('content-two-col', 'body', { font: 'sans', box: CT.body, weight: 400, size: 19, lines: 6, chars: ch('body', CT.body[2], 19, 0, 46), anchor: 'start', fill: F('content-two-col').b }),
      text('content-two-col', 'callout', { font: o.calloutHead ? 'head' : 'sans', box: CT.call, weight: o.calloutHead ? o.hw : 700, size: 18, lines: 2, chars: ch(o.calloutHead ? 'head' : 'body', CT.call[2], 18, 0, 48), anchor: 'start', fill: F('content-two-col').k || F('content-two-col').t, optional: true }),
      graphic('figure', CT.fig),
      text('content-two-col', 'caption', { font: 'sans', box: CT.cap, weight: 400, size: 13, lines: 2, chars: ch(o.mono ? 'mono' : 'body', CT.cap[2], 13, o.mono ? o.ctr || 0 : 0, 70), anchor: 'start', tracking: o.mono ? o.ctr : undefined, fill: sml('c', F('content-two-col').m), optional: true }),
      ...after('content-two-col')]),
    d('full-diagram', 'full-diagram', () => [...L('full-diagram'),
      eb('full-diagram', FD.eb, true), text('full-diagram', 'heading', { font: 'head', box: FD.hd, weight: o.hw, size: S.hd2, lines: 1, chars: ch('head', FD.hd[2], S.hd2, 0, 56), anchor: 'start', fill: tfill('full-diagram') }),
      graphic('figure', FD.fig),
      text('full-diagram', 'takeaway', { font: 'sans', box: FD.take, weight: 700, size: 18, lines: 6, chars: ch('body', FD.take[2], 18, 0, 24), anchor: 'start', fill: F('full-diagram').k || F('full-diagram').t, optional: true }),
      ...after('full-diagram')]),
    d('closing', 'closing slide', () => [...L('closing'),
      ttl('closing', 'title', CL.title, S.cl, 2, o.htr),
      bod('closing', 'contact', CL.contact, 22, 3, 60, false, F('closing').b),
      sm('closing', 'meta', CL.meta, 15, true, F('closing').m), ...after('closing')]),
  ];
}

// Neo-brutalism: acid solid fields, white cards, 3-4px black borders on every
// element, hard offset shadows (a pre-computed offset shape, no blur), Arial
// Black headlines over a Courier New body. Mono body = 0.6 em per character,
// so its budgets are chars ≈ box width / (0.6 × size); Arial Black heads use ~0.68 em.
SETS.brutalist = {
  label: 'Neo-brutalism',
  description: 'Neo-brutalist style: a high-saturation acid field (lime, hot pink, yellow), white cards, pure black text, 3 to 4 px black borders on every element, hard bottom-right offset shadows drawn as flat offset shapes (no blur), oversized Arial Black headlines over Courier New mono, bold asymmetric blocks with small tilts kept off the text slots. Dark theme: a near-black #0D0D0D field, white text, borders flip to white so they stay visible, hard shadows become solid acid-lime offsets. Not any template\'s brand.',
  references: [
    'Neo-brutalism style specs (web and UI design write-ups): saturated flat background, white cards, thick black borders on every element, hard offset shadow with no blur, oversized heavy sans headlines with monospace accents.',
    'Gumroad-style neo-brutalist product pages and the "neubrutalism" UI component kits: pure black 2 to 4 px outlines, offset box shadows of 4 to 8 px, a bright accent per block.',
  ],
  fonts: { 'font-head': 'Arial Black, Arial, sans-serif', 'font-sans': 'Courier New, Courier, monospace' },
  light: { surface: '#ccff00', text: '#000000', 'text-muted': '#2e2e2e', border: '#000000', 'border-bright': '#000000', accent: '#ff2d55', teal: '#ff2d55', 'deep-blue': '#2d5bff', amber: '#f5f500', coral: '#ff7a2d', green: '#00d26a', navy: '#000000', block: '#ff2d55', 'on-block': '#000000', ink: '#000000', 'on-ink': '#ffffff', card: '#ffffff', shadow: '#000000', lime: '#ccff00' },
  dark: { surface: '#0d0d0d', text: '#ffffff', 'text-muted': '#c8c8c8', border: '#ffffff', 'border-bright': '#ffffff', accent: '#ccff00', teal: '#ccff00', 'deep-blue': '#7b93ff', block: '#ff2d55', 'on-block': '#000000', ink: '#000000', 'on-ink': '#ffffff', card: '#1a1a1a', shadow: '#ccff00' },
  designs(k) {
    const { c, mix, rect, circle, poly, text, graphic, fill, bg } = k;
    const edge = (w) => `stroke:${c('border')};stroke-width:${w};stroke-linejoin:miter`;
    /** bordered box + hard offset shadow (the shadow is a second, flat rect) */
    const card = (x, y, w, h, tok, off = 8, bw = 3) => [rect(x + off, y + off, w, h, fill(c('shadow'))), rect(x, y, w, h, `${fill(c(tok))};${edge(bw)}`)];
    const disc = (cx, cy, r, tok, off = 6) => [circle(cx + off, cy + off, r, fill(c('shadow'))), circle(cx, cy, r, `${fill(c(tok))};${edge(3)}`)];
    /** a bordered rectangle tilted by deg about its centre, with its offset shadow */
    const tilt = (cx, cy, w, h, deg, tok, off = 8) => {
      const a = (deg * Math.PI) / 180, pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]
        .map(([x, y]) => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]);
      return [poly(pts.map(([x, y]) => [x + off, y + off]), fill(c('shadow'))), poly(pts, `${fill(c(tok))};${edge(3)}`)];
    };
    const bar = (x, y, w, h, tok = 'ink') => rect(x, y, w, h, `${fill(c(tok))};${edge(3)}`);
    const t = c('text'), onb = c('on-block');
    const head = (o) => ({ font: 'head', weight: 800, ...o });
    const mono = (o) => ({ font: 'sans', ...o });
    const eb = (box, chars, fl) => mono({ box, weight: 700, size: 16, tracking: 1, lines: 1, chars, fill: fl });
    return [
      { name: 'title-hero', title: 'Neo-brutalist cover slide design', aria: 'Cover slide on an acid field: a thick-bordered white card with a hard black shadow holds a mono eyebrow, a two-line oversized title, a subtitle and a meta line, with a tilted pink block, a yellow disc and a black bar around it',
        desc: 'Cover: acid field; a white card with a 4 px border and a hard offset shadow holds every text slot flush left; a tilted pink block, a yellow disc and a black bar break out of its right and bottom edges.',
        body: () => [bg(c('surface')), ...tilt(1120, 210, 240, 330, 7, 'block', 10), ...disc(1168, 548, 56, 'amber', 8),
          ...card(56, 72, 1060, 560, 'card', 12, 4), bar(100, 108, 140, 14),
          text('title-hero', 'eyebrow', eb([100, 140, 600, 22], 48, t)),
          text('title-hero', 'hero-title', head({ box: [100, 196, 960, 140], size: 52, lines: 2, chars: 26, anchor: 'middle', fill: t })),
          text('title-hero', 'subtitle', mono({ box: [100, 380, 960, 52], weight: 400, size: 20, lines: 2, chars: 72, fill: t })),
          bar(100, 500, 960, 6),
          text('title-hero', 'meta', mono({ box: [100, 548, 960, 22], weight: 700, size: 16, lines: 1, chars: 80, fill: c('text-muted'), optional: true })),
        ] },
      { name: 'section-break', title: 'Neo-brutalist section divider design', aria: 'Section divider on a hot-pink field: an oversized chapter numeral on a white bordered card with a hard shadow on the left, and the eyebrow, a two-line title and an orientation line on the right',
        desc: 'Section divider: hot-pink field; the chapter number sits oversized on a white card with a hard shadow; on the right the mono eyebrow, a two-line Arial Black title and an orientation line, all centred in the column around a short thick black bar, a tilted yellow block below.',
        body: () => [bg(c('block')), ...card(60, 110, 480, 440, 'card', 12, 4),
          text('section-break', 'number', head({ box: [90, 160, 420, 320], size: 260, lines: 1, chars: 2, anchor: 'middle', fill: t })),
          text('section-break', 'eyebrow', { ...eb([580, 190, 640, 22], 44, onb), anchor: 'middle', optional: true }),
          text('section-break', 'section-title', head({ box: [580, 232, 640, 130], size: 48, lines: 2, chars: 18, anchor: 'middle', fill: onb })),
          bar(800, 392, 200, 10),
          text('section-break', 'orientation', mono({ box: [580, 424, 640, 30], weight: 700, size: 20, lines: 1, chars: 52, anchor: 'middle', fill: onb })),
          ...tilt(1010, 590, 300, 80, -5, 'amber', 8),
        ] },
      { name: 'big-statement', title: 'Neo-brutalist statement slide design', aria: 'Statement slide: a large white bordered card with a hard shadow holds a three-line statement and an attribution, a pink eyebrow tab sits on its top edge, a tilted yellow block and a disc break out below',
        desc: 'Takeaway slide: acid field; a large white card with a hard shadow holds three flush-left lines of Arial Black and the mono attribution under a thick rule; the eyebrow rides a pink tab on the card edge; a tilted yellow block and a disc break out below.',
        body: () => [bg(c('surface')), ...tilt(1070, 590, 260, 90, -6, 'amber', 8), ...disc(130, 620, 38, 'block', 6), ...card(80, 100, 1120, 420, 'card', 12, 4),
          ...card(112, 70, 250, 48, 'block', 6, 3),
          text('big-statement', 'eyebrow', { ...eb([124, 83, 226, 22], 20, onb), optional: true }),
          text('big-statement', 'statement', head({ box: [124, 170, 1030, 144], size: 36, lines: 3, chars: 40, fill: t })),
          bar(124, 390, 1030, 6),
          text('big-statement', 'attribution', mono({ box: [124, 424, 1030, 26], weight: 700, size: 18, lines: 1, chars: 70, fill: c('text-muted'), optional: true })),
        ] },
      { name: 'content-two-col', title: 'Neo-brutalist two-column content design', aria: 'Content slide on an acid field: a heavy heading over a thick bar, a white body card and a pink key-point card on the left, a bordered white graphic card with a hard shadow and a caption on the right',
        desc: 'Content slide: acid field; mono eyebrow and an Arial Black heading over a thick black bar with a pink tab; a white body card and a pink key-point card with hard shadows on the left; a white graphic card with a hard shadow and caption on the right.',
        body: () => [bg(c('surface')),
          text('content-two-col', 'eyebrow', mono({ box: [60, 32, 700, 20], weight: 700, size: 14, tracking: 1, lines: 1, chars: 56, fill: t, optional: true })),
          text('content-two-col', 'heading', head({ box: [60, 58, 1160, 50], size: 34, lines: 1, chars: 44, fill: t })),
          bar(60, 120, 1160, 8), bar(60, 116, 200, 16, 'block'),
          ...card(60, 152, 590, 200, 'card', 8, 3),
          text('content-two-col', 'body', mono({ box: [84, 172, 540, 140], weight: 400, size: 18, lines: 6, chars: 48, fill: t })),
          ...card(60, 384, 590, 112, 'block', 8, 3),
          text('content-two-col', 'callout', mono({ box: [84, 408, 540, 48], weight: 700, size: 18, lines: 2, chars: 48, fill: onb, optional: true })),
          ...card(700, 152, 520, 380, 'card', 10, 4),
          graphic('figure', [716, 168, 488, 348]),
          text('content-two-col', 'caption', mono({ box: [700, 572, 520, 36], weight: 400, size: 13, lines: 2, chars: 64, fill: c('text-muted'), optional: true })),
        ] },
      { name: 'full-diagram', title: 'Neo-brutalist full-diagram design', aria: 'Diagram slide: a heavy heading over a thick bar, a large bordered graphic card with a hard shadow, and a pink takeaway card with a yellow disc on the right',
        desc: 'Figure slide: acid field; mono eyebrow and a one-line Arial Black heading over a thick bar; a large white graphic card with a hard shadow; a pink takeaway card with a hard shadow and a yellow disc at its foot.',
        body: () => [bg(c('surface')),
          text('full-diagram', 'eyebrow', mono({ box: [60, 28, 700, 20], weight: 700, size: 14, tracking: 1, lines: 1, chars: 48, fill: t, optional: true })),
          text('full-diagram', 'heading', head({ box: [60, 52, 1160, 46], size: 32, lines: 1, chars: 52, fill: t })),
          bar(60, 110, 1160, 8),
          ...card(60, 144, 800, 484, 'card', 10, 4), graphic('figure', [76, 160, 768, 452]),
          ...card(900, 144, 320, 484, 'block', 10, 4), ...disc(1150, 560, 40, 'amber', 6),
          text('full-diagram', 'takeaway', mono({ box: [920, 190, 280, 170], weight: 700, size: 18, lines: 6, chars: 24, fill: onb, optional: true })),
        ] },
      { name: 'closing', title: 'Neo-brutalist closing slide design', aria: 'Closing slide on a hot-pink field: a large white bordered card with a hard shadow holds an oversized two-line title, a thick rule, contact lines and a meta line, a tilted yellow block pokes out above and a lime disc below',
        desc: 'Closing slide: hot-pink field; a large white card with a hard shadow holds a centred oversized two-line title, a short thick rule, up to three mono contact lines and a meta line, all centred; a tilted yellow block and a lime disc break out of its edges.',
        body: () => [bg(c('block')), ...tilt(1090, 74, 250, 80, 6, 'amber', 8), ...disc(1150, 640, 44, 'surface', 6), ...card(60, 90, 1160, 500, 'card', 12, 4),
          text('closing', 'title', head({ box: [100, 124, 1040, 184], size: 72, lines: 2, chars: 20, anchor: 'middle', fill: t })),
          bar(440, 336, 400, 8),
          text('closing', 'contact', mono({ box: [100, 372, 1040, 84], weight: 400, size: 22, lines: 3, chars: 60, anchor: 'middle', fill: t })),
          text('closing', 'meta', mono({ box: [100, 520, 1040, 22], weight: 700, size: 16, lines: 1, chars: 80, anchor: 'middle', fill: c('text-muted'), optional: true })),
        ] },
      { name: 'bg-grid', zone: 'x 240–1040, y 200–520 (the middle modules)', title: 'Neo-brutalist grid background', aria: 'White background with a bold black frame and a modular grid; the four corner modules are filled pink, lime, blue and yellow with hard shadows, the middle stays clear',
        desc: 'Background: white (card) field with a 4 px black frame and a 6 by 4 modular grid of faint thick lines; the four corner modules are flat colour blocks (pink, lime, blue, yellow) with hard offset shadows; the middle modules stay clear.',
        body: () => [bg(c('card')),
          ...Array.from({ length: 5 }, (_, i) => rect(238 + i * 200, 40, 4, 640, fill(mix(c('border'), 22)))),
          ...Array.from({ length: 3 }, (_, i) => rect(40, 198 + i * 160, 1200, 4, fill(mix(c('border'), 22)))),
          ...card(40, 40, 200, 160, 'block', 8, 4), ...card(1040, 40, 200, 160, 'lime', 8, 4),
          ...card(40, 520, 200, 160, 'deep-blue', 8, 4), ...card(1040, 520, 200, 160, 'amber', 8, 4),
          rect(40, 40, 1200, 640, `fill:none;${edge(5)}`),
        ] },
      { name: 'bg-block', zone: 'x 60–800, y 60–660 (left of the blocks)', title: 'Neo-brutalist colour-block background', aria: 'White background with a lime strip, a tall hot-pink block with a thick border and hard shadow on the right, a yellow block and a white disc stacked on it, and a thick black bar at the bottom left',
        desc: 'Background: white (card) field; a lime strip, a tall pink block with a 4 px border and a hard shadow on the right, a yellow block and a white disc riding it, a tilted blue block at its foot and a thick black bar at the bottom left; the left side stays clear.',
        body: () => [bg(c('card')), bar(808, 0, 44, 720, 'lime'), ...card(852, 48, 368, 600, 'block', 12, 4), ...card(892, 100, 288, 120, 'amber', 8, 4), ...disc(1040, 360, 60, 'card', 8),
          ...tilt(1036, 560, 260, 70, -6, 'deep-blue', 8), bar(60, 640, 240, 14),
        ] },
    ];
  },
};

// ── helpers shared by the themed sets ────────────────────────────────────────
const bgDes = (name, zone, title, aria, desc, body) => ({ name, zone, title, aria, desc, body });
const ring = (k, cx, cy, R, tok, n = 7, a = 7) => { n = Math.round(n * 1.8); a = +(a / 1.8).toFixed(2); return Array.from({ length: n }, (_, i) => k.circle(cx, cy, R * (1 - (i / n) * 0.85), k.fill(k.mix(k.c(tok), a)))); };
const wedges = (k, cx, cy, R, a0, a1, n, style) => Array.from({ length: n }, (_, i) => {
  if (i % 2) return null;
  const s = a0 + ((a1 - a0) * i) / n, e = a0 + ((a1 - a0) * (i + 1)) / n, p = (a) => [cx + R * Math.cos((a * Math.PI) / 180), cy + R * Math.sin((a * Math.PI) / 180)];
  return k.poly([[cx, cy], p(s), p(e)], style);
}).filter(Boolean);
const blobD = (cx, cy, rs, rot = 0) => { // closed smooth path through len(rs) points (Catmull-Rom to cubic), pre-computed
  const n = rs.length, P = rs.map((r, i) => { const a = rot + (i / n) * 2 * Math.PI; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  let d = `M ${f(P[0][0])} ${f(P[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = P[(i + n - 1) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    d += ` C ${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + ' Z';
};

// Dark Academia: warm near-black, antique gold, parchment body; light theme is the print inverse.
SETS.academia = {
  label: 'Dark Academia',
  description: 'Dark Academia: warm near-black brown with antique-gold titles in italic Georgia, parchment-coloured body text, a double inset border frame (a heavy outer and a hairline inner rule), centred wide-tracked titles, thin gold rules and Courier New footnote captions. The light theme is the print inverse: parchment paper, deep-brown text, the same gold accents. Not any template\'s brand.',
  references: [
    'Dark Academia aesthetic palettes (colour-palette write-ups): near-black warm brown, antique gold, parchment, muted gold, dark-gold borders.',
    'Library and manuscript page conventions: double ruled frames, centred title pages, footnotes set in a monospace or small caps.',
  ],
  fonts: { 'font-head': 'Georgia, Cambria, serif', 'font-sans': 'EB Garamond, Georgia, serif' },
  light: { surface: '#f1e7d2', text: '#2a1d0c', 'text-muted': '#6e5a35', border: '#cdbb93', 'border-bright': '#a38c57', accent: '#8f6b1d', teal: '#8f6b1d', 'deep-blue': '#4f647c', amber: '#a8791f', coral: '#8e4a30', green: '#566b45', navy: '#2a1d0c', block: '#2a1d0c', 'on-block': '#f1e7d2', ink: '#2a1d0c', 'on-ink': '#f1e7d2' },
  dark: { surface: '#1a1208', text: '#d4bf9a', 'text-muted': '#8a7340', border: '#3d2e10', 'border-bright': '#8a7340', accent: '#c9a84c', teal: '#c9a84c', 'deep-blue': '#8da1b8', amber: '#c9a84c', coral: '#c07a58', green: '#8fa67a', block: '#2a1e0c', 'on-block': '#d4bf9a', ink: '#0e0a05', 'on-ink': '#d4bf9a' },
  designs(k) {
    const { c, mix, rect, line, poly, fill, stroke } = k;
    const frame = [rect(16, 16, 1248, 688, stroke(mix(c('accent'), 70), 3)), rect(30, 30, 1220, 660, stroke(c('border-bright'), 1)),
      ...[[26, 26], [1246, 26], [26, 686], [1246, 686]].map(([x, y]) => rect(x, y, 8, 8, fill(c('accent'))))];
    const rule = (x1, x2, y) => [line(x1, y, x2, y, stroke(mix(c('accent'), 65), 1)), poly([[640, y - 5], [645, y], [640, y + 5], [635, y]], fill(c('accent')))];
    const sub = (x, y, w, h) => [rect(x, y, w, h, stroke(c('border-bright'), 1)), rect(x + 5, y + 5, w - 10, h - 10, stroke(mix(c('accent'), 60), 1))];
    const hair = (x1, x2, y) => line(x1, y, x2, y, stroke(mix(c('accent'), 55), 1));
    return std(k, {
      label: 'Dark Academia', align: 'middle', m: 140, hw: 700, htr: 3, etr: 5, ctr: 1, mono: 'font-family:Courier New, Courier, monospace',
      r: { head: 0.58, hcap: 0.78, body: 0.5, cap: 0.7, mono: 0.6 }, sz: { hero: 48, num: 170, secT: 44, stmt: 34, hd: 32, hd2: 30, cl: 64 },
      fill: { t: c('accent'), b: c('text'), m: c('text-muted'), e: c('text-muted') }, fills: { 'content-two-col': { k: c('accent') }, 'full-diagram': { k: c('text') } },
      tx: (n) => (n === 'content-two-col' || n === 'full-diagram' ? '' : 'font-style:italic'),
      pre: (n, g) => n === 'content-two-col' ? [...frame, hair(64, 1216, 128), ...sub(...g[n].figP), rect(52, 388, 3, 46, fill(c('accent')))]
        : n === 'full-diagram' ? [...frame, hair(64, 1216, 118), ...sub(...g[n].figP), ...sub(...g[n].takeP)]
        : n === 'title-hero' ? [...frame, ...rule(140, 1140, 120), ...rule(140, 1140, 590)]
        : n === 'closing' ? [...frame, ...rule(140, 1140, 120), ...rule(140, 1140, 590)]
        : n === 'section-break' ? [...frame, ...rule(440, 840, 300)]
        : [...frame, ...rule(440, 840, 128), ...rule(440, 840, 560)],
      dec: {
        'title-hero': ['Title page: a double inset border frame, a gold rule with a diamond above and below, a tracked footnote-style eyebrow, a centred italic two-line gold title, a parchment subtitle and a mono meta line', 'Cover: warm dark field in a double inset gold frame (heavy outer, hairline inner, corner studs); a diamond rule above the centred eyebrow and below the meta line; the title is italic gold Georgia with wide tracking.'],
        'section-break': ['Section divider inside a double inset frame: a large italic gold chapter number centred over a short diamond rule, the tracked eyebrow, a centred italic title and an orientation line', 'Section divider: double gold frame; the chapter number, centred and oversized in italic gold, over a short diamond rule, then the eyebrow, a two-line italic title and the orientation line.'],
        'big-statement': ['Statement slide inside a double inset frame: a tracked eyebrow, a centred italic three-line statement between two short diamond rules and a footnote-style attribution', 'Takeaway slide: double gold frame; a centred three-line italic statement between two short diamond rules, with the mono eyebrow above and the attribution below.'],
        'content-two-col': ['Content slide in a double inset frame: an eyebrow and heading over a thin gold rule, parchment body text and a gold-barred key point on the left, a double-ruled graphic plate and a mono footnote caption on the right', 'Content slide: gold frame; heading over a hairline rule; body text with a gold-barred key point on the left; the graphic sits in a double-ruled plate with a Courier footnote caption.'],
        'full-diagram': ['Diagram slide in a double inset frame: heading over a hairline rule, a large double-ruled graphic plate and a double-ruled takeaway plate on the right', 'Figure slide: gold frame; a large double-ruled plate for the graphic and a narrower double-ruled plate for the takeaway on the right.'],
        closing: ['Closing page in a double inset frame: diamond rules above and below, a centred italic two-line gold title, centred contact lines and a mono meta line', 'Closing slide: the cover\'s double frame and diamond rules; a centred italic gold title, up to three centred contact lines and a mono meta line.'],
      },
    }).concat([
      bgDes('bg-frame', 'x 64–1216, y 64–656 (inside the frame)', 'Dark Academia frame background', 'Warm dark background with a double inset gold frame, four corner studs and a diamond rule near the top and bottom', 'Background: the warm field in a double inset gold frame (heavy outer, hairline inner) with corner studs and a diamond rule near the top and the bottom edge.',
        () => [k.bg(c('surface')), ...frame, ...rule(240, 1040, 62), ...rule(240, 1040, 658)]),
      bgDes('bg-folio', 'x 80–1200, y 120–610 (between the running head and the foot)', 'Dark Academia folio background', 'Warm dark background with a single thin inner frame, a running-head double rule at the top and a foot rule with a small gold square', 'Background: a single hairline gold frame, a running-head double rule near the top and a foot rule with a gold square at the left, like a manuscript folio.',
        () => [k.bg(c('surface')), rect(30, 30, 1220, 660, stroke(c('border-bright'), 1)), line(80, 88, 1200, 88, stroke(mix(c('accent'), 70), 2)), hair(80, 1200, 95), hair(80, 640, 1200), rect(80, 648, 14, 14, fill(c('accent')))]),
    ]);
  },
};

// Terminal: green-on-black dev console, paper-like console in the light theme.
SETS.terminal = {
  label: 'Terminal',
  description: 'Dev-console style: near-black field with a faint 6 percent green grid, code-block panels with a 3 px accent bar on the left, prompt-style ($ and >) eyebrows, a scanline band, Courier New throughout in bright phosphor green with one cyan-blue second accent. The light theme is a paper console: off-white, near-black text, green kept for accents only. Flat geometry only. Not any template\'s brand.',
  references: [
    'Terminal and developer-console colour schemes (phosphor green on black, Dracula-style panels): green headings, dim-green secondary text, a blue-cyan second accent.',
    'Code-block UI conventions: dark panel, a coloured bar on its left edge, a prompt prefix on the first line.',
  ],
  fonts: { 'font-head': 'Courier New, Courier, monospace', 'font-sans': 'Courier New, Courier, monospace' },
  light: { surface: '#fafaf7', text: '#111111', 'text-muted': '#555555', border: '#d9d9d2', 'border-bright': '#a8a89f', accent: '#0f9f0f', teal: '#0f9f0f', 'deep-blue': '#006f99', amber: '#b58900', coral: '#c0392b', green: '#0f9f0f', navy: '#111111', block: '#eeeee8', 'on-block': '#111111', card: '#f0f0ea', grid: '#0f9f0f' },
  dark: { surface: '#0a0a0a', text: '#33ff33', 'text-muted': '#1a991a', border: '#173d17', 'border-bright': '#1a991a', accent: '#33ff33', teal: '#33ff33', 'deep-blue': '#00ccff', amber: '#e6c200', coral: '#ff5f56', green: '#33ff33', block: '#111111', 'on-block': '#33ff33', card: '#111111', grid: '#33ff33' },
  designs(k) {
    const { c, mix, rect, line, label, fill, stroke } = k;
    const grid = [...Array.from({ length: 31 }, (_, i) => line(40 + i * 40, 0, 40 + i * 40, 720, stroke(mix(c('grid'), 6), 1))), ...Array.from({ length: 17 }, (_, i) => line(0, 40 + i * 40, 1280, 40 + i * 40, stroke(mix(c('grid'), 6), 1)))];
    const scan = (y) => Array.from({ length: 6 }, (_, i) => line(0, y + i * 5, 1280, y + i * 5, stroke(mix(c('grid'), 9), 1)));
    const panel = (x, y, w, h, bar = 'accent') => [rect(x, y, w, h, `${fill(c('card'))};stroke:${c('border')};stroke-width:1`), rect(x, y, 3, h, fill(c(bar)))];
    const prompt = (b, ch = '>') => label(b[0] - 18, b[1] + 16, ch, 16, `font-weight:700;fill:${c('deep-blue')}`);
    return std(k, {
      label: 'Terminal', align: 'start', m: 96, tw: 1060, cw: 1060, hw: 700, etr: 2, calloutHead: false,
      r: { head: 0.6, hcap: 0.6, body: 0.6, cap: 0.6, mono: 0.6 }, sz: { hero: 50, num: 200, secT: 46, stmt: 32, hd: 30, hd2: 28, cl: 64 },
      fill: { t: c('text'), b: c('text'), m: c('text-muted'), e: c('deep-blue') }, fills: { 'content-two-col': { k: c('text') }, 'full-diagram': { k: c('text') } },
      pre: (n, g) => [...grid, ...scan(0), ...(n === 'title-hero' ? panel(64, 100, 1152, 548) : n === 'section-break' ? panel(64, 120, 420, 440) : n === 'big-statement' ? panel(64, 110, 1152, 440)
        : n === 'closing' ? panel(64, 100, 1152, 548) : n === 'content-two-col' ? [...panel(...g[n].bodyP), ...panel(...g[n].callP, 'deep-blue'), ...panel(...g[n].figP)] : n === 'full-diagram' ? [...panel(...g[n].figP), ...panel(...g[n].takeP, 'deep-blue')] : [])],
      post: (n, g) => (g[n].eb ? [prompt(g[n].eb, n === 'title-hero' ? '$' : '>')] : []),
      dec: {
        'title-hero': ['Console cover: a dark code-block panel with a green left bar holds a blue prompt-prefixed eyebrow, a two-line monospace title, a subtitle and a meta line over a faint green grid and a scanline band', 'Cover: a faint 6 percent grid and a thin scanline band; one large code-block panel with a 3 px accent bar on its left edge holds every text slot flush left, the eyebrow led by a $ prompt.'],
        'section-break': ['Section divider: a code-block panel on the left holds a huge monospace chapter number, the prompt-prefixed eyebrow, title and orientation line sit to its right on the grid', 'Section divider: the chapter number in a code-block panel on the left; eyebrow (with a > prompt), two-line title and orientation line on the grid to the right.'],
        'big-statement': ['Statement slide: one wide code-block panel with a green bar holds a prompt-prefixed eyebrow, a three-line monospace statement and the attribution', 'Takeaway slide: a wide code-block panel with a 3 px accent bar holds the > eyebrow, three flush-left statement lines and the attribution.'],
        'content-two-col': ['Content slide on a console grid: heading under a prompt eyebrow, body text and a blue-barred key point in code-block panels on the left, the graphic in a panel with a caption on the right', 'Content slide: faint grid and scanlines; body text and the key point (blue bar) in code-block panels on the left; the graphic in a code-block panel with a caption on the right.'],
        'full-diagram': ['Diagram slide on a console grid: a heading, a large code-block panel for the graphic and a blue-barred panel with the takeaway on the right', 'Figure slide: a large code-block panel for the graphic and a narrow blue-barred panel for the takeaway, on the grid.'],
        closing: ['Closing slide: a wide code-block panel with a green bar holds a two-line monospace title, contact lines and a meta line over the console grid', 'Closing slide: grid, scanlines and one wide code-block panel holding the title, up to three contact lines and the meta line.'],
      },
    }).concat([
      bgDes('bg-grid', 'x 80–1200, y 60–660', 'Terminal grid background', 'Dark console background with a faint green grid and a thin scanline band along the top', 'Background: the console field with a faint 6 percent grid every 40 px and a thin scanline band along the top edge.',
        () => [k.bg(c('surface')), ...grid, ...scan(0)]),
      bgDes('bg-panel', 'x 96–1184, y 120–600 (inside the panel)', 'Terminal code-block background', 'Console background with a faint green grid, scanlines at the foot and one large code-block panel with a green bar on its left edge', 'Background: grid and a scanline band at the foot; one large code-block panel with a 3 px accent bar fills the middle for content.',
        () => [k.bg(c('surface')), ...grid, ...scan(680), ...panel(64, 80, 1152, 560)]),
    ]);
  },
};

// Cyberpunk HUD: outline-only titles, corner brackets, neon cyan + magenta.
SETS.cyberpunk = {
  label: 'Cyberpunk HUD',
  description: 'Cyberpunk HUD outline style: near-black field with a faint 6 percent cyan grid, outline-only Arial Black titles (transparent fill, 1.5 px cyan stroke), four L-shaped corner brackets on every slide, chamfered panels, Courier New data labels, neon cyan with one magenta second accent. The light theme is a white paper HUD: near-black text, cyan and magenta accents, an 8 percent black grid. Not any template\'s brand.',
  references: [
    'Sci-fi HUD interface design (cyberpunk game and film UI): thin neon outlines, corner brackets, mono data labels, grid overlays.',
    'Neon cyan / magenta cyberpunk palettes on near-black.',
  ],
  fonts: { 'font-head': 'Arial Black, Arial, sans-serif', 'font-sans': 'Courier New, Courier, monospace' },
  light: { surface: '#ffffff', text: '#0d0d0d', 'text-muted': '#3a4a48', border: '#cfe6e2', 'border-bright': '#00a88a', accent: '#00a88a', teal: '#00a88a', 'deep-blue': '#0077aa', amber: '#c79a00', coral: '#c2189f', green: '#00a88a', navy: '#0d0d0d', block: '#0d0d0d', 'on-block': '#e6ffff', grid: '#000000', mag: '#c2189f' },
  dark: { surface: '#0d0d0d', text: '#e6ffff', 'text-muted': '#8fe8da', border: '#0e4f46', 'border-bright': '#00ffc8', accent: '#00ffc8', teal: '#00ffc8', 'deep-blue': '#00b8ff', amber: '#ffe600', coral: '#ff2bd6', green: '#00ffc8', block: '#0d1f1c', 'on-block': '#e6ffff', grid: '#00ffc8', mag: '#ff2bd6' },
  designs(k) {
    const { c, mix, rect, line, poly, pathd, fill, stroke } = k;
    const grid = [...Array.from({ length: 19 }, (_, i) => line(64 + i * 64, 0, 64 + i * 64, 720, stroke(mix(c('grid'), 7), 1))), ...Array.from({ length: 10 }, (_, i) => line(0, 64 + i * 64, 1280, 64 + i * 64, stroke(mix(c('grid'), 7), 1)))];
    const brackets = [[28, 28, 1, 1], [1252, 28, -1, 1], [28, 692, 1, -1], [1252, 692, -1, -1]].map(([x, y, dx, dy]) => pathd(`M ${x + dx * 24} ${y} L ${x} ${y} L ${x} ${y + dy * 24}`, `fill:none;stroke:${c('teal')};stroke-width:2.5`));
    const chamfer = (x, y, w, h, s = 14) => poly([[x + s, y], [x + w, y], [x + w, y + h - s], [x + w - s, y + h], [x, y + h], [x, y + s]], `${fill(mix(c('teal'), 5))};stroke:${c('teal')};stroke-width:1.5`);
    const tag = (x, y) => [rect(x, y, 56, 4, fill(c('mag'))), rect(x + 64, y, 14, 4, fill(c('teal')))];
    return std(k, {
      label: 'Cyberpunk HUD', align: 'start', m: 96, tw: 1000, hw: 400, etr: 2, calloutHead: false,
      r: { head: 0.7, hcap: 0.8, body: 0.6, cap: 0.6, mono: 0.6 }, sz: { hero: 52, num: 230, secT: 44, stmt: 36, hd: 32, hd2: 30, cl: 68 },
      fill: { t: 'transparent', b: c('text'), m: c('text-muted'), e: c('mag') }, fills: { 'content-two-col': { k: c('text') }, 'full-diagram': { k: c('text') } },
      tx: () => `stroke:${c('teal')};stroke-width:1.5;paint-order:stroke;stroke-linejoin:round`,
      pre: (n, g) => [...grid, ...brackets, ...(n === 'content-two-col' ? [chamfer(...g[n].bodyP), chamfer(...g[n].callP, 10), chamfer(...g[n].figP), ...tag(64, 20)]
        : n === 'full-diagram' ? [chamfer(...g[n].figP), chamfer(...g[n].takeP), ...tag(64, 16)]
        : n === 'section-break' ? [chamfer(64, 120, 420, 460, 20)] : n === 'big-statement' ? [chamfer(64, 110, 1152, 440, 20)] : tag(96, 112))],
      dec: {
        'title-hero': ['HUD cover on a faint cyan grid with four corner brackets: a magenta-and-cyan tag bar, a magenta mono eyebrow, a two-line outline-only title, a subtitle and a meta line', 'Cover: faint 6 percent cyan grid, L-shaped corner brackets, a magenta and cyan tag bar over the eyebrow; the two-line title is outline-only (transparent fill, 1.5 px cyan stroke).'],
        'section-break': ['Section divider with corner brackets: a huge outline-only chapter number inside a chamfered cyan panel on the left, the eyebrow, outline title and orientation line on the right', 'Section divider: the chapter number outlined in cyan inside a chamfered panel; eyebrow, outline title and orientation line to the right of it on the grid.'],
        'big-statement': ['Statement slide with corner brackets: a wide chamfered cyan panel holds a magenta eyebrow, a three-line outline statement and an attribution', 'Takeaway slide: a wide chamfered panel with a 1.5 px cyan outline holds the eyebrow, three outline-only statement lines and the attribution.'],
        'content-two-col': ['Content slide on the HUD grid: an outline heading with a magenta tag, chamfered panels for body text, a key point and the graphic with its caption, corner brackets in each corner', 'Content slide: outline heading; body text, the key point and the graphic each in a chamfered cyan panel; corner brackets and a magenta tag.'],
        'full-diagram': ['Diagram slide on the HUD grid: an outline heading, a large chamfered panel for the graphic and a chamfered takeaway panel, corner brackets in each corner', 'Figure slide: a large chamfered panel for the graphic and a narrower chamfered panel for the takeaway; the heading is outline-only.'],
        closing: ['Closing slide with corner brackets on the HUD grid: a magenta-and-cyan tag, a two-line outline-only title, contact lines and a meta line', 'Closing slide: grid, brackets and the tag bar; an outline-only two-line title with the contact lines and meta line under it.'],
      },
    }).concat([
      bgDes('bg-hud', 'x 80–1200, y 80–640 (inside the brackets)', 'Cyberpunk HUD grid background', 'Dark HUD background with a faint cyan grid, four L-shaped corner brackets and a short magenta and cyan tag bar at the top left', 'Background: a faint 6 percent grid, four L-shaped corner brackets and a short magenta and cyan tag bar at the top left.',
        () => [k.bg(c('surface')), ...grid, ...brackets, ...tag(80, 48)]),
      bgDes('bg-frame', 'x 120–1160, y 110–610 (inside the panel)', 'Cyberpunk HUD frame background', 'Dark HUD background with a faint grid, corner brackets and one large chamfered cyan panel with a magenta tag bar', 'Background: grid and brackets with one large chamfered cyan panel across the middle and a magenta and cyan tag bar above it.',
        () => [k.bg(c('surface')), ...grid, ...brackets, chamfer(80, 80, 1120, 560, 28), ...tag(104, 100)]),
    ]);
  },
};

// Glassmorphism: stacked translucent circles stand in for gradients (no defs allowed).
SETS.glass = {
  label: 'Glassmorphism',
  description: 'Glassmorphism: a deep indigo field with violet, blue and cyan glow blobs built from stacked translucent circles (the designs forbid gradient defs and filters, so the soft edge is a banded approximation), frosted glass cards (translucent white fill, thin light border, rounded corners) holding thin-weight white text in a light Segoe UI-style head over a sans body, cyan and violet accents. The light theme is light glass on a pale sky field with dark text. Not any template\'s brand.',
  references: [
    'Glassmorphism UI write-ups (frosted translucent panels, 1 px light borders, vivid blurred backgrounds, rounded 16 to 20 px corners).',
    'Windows 11 / iOS translucent-material design language: thin type, soft glow behind frosted cards.',
  ],
  fonts: { 'font-head': 'Segoe UI Light, Segoe UI, Arial, sans-serif', 'font-sans': 'Segoe UI, Arial, sans-serif' },
  light: { surface: '#eaf3ff', text: '#14163a', 'text-muted': '#464c78', border: '#c9d9f2', 'border-bright': '#7aa2e6', accent: '#0891b2', teal: '#0891b2', 'deep-blue': '#2f5da8', amber: '#d19a1c', coral: '#d65a8c', green: '#2aa583', navy: '#14163a', block: '#6b21a8', 'on-block': '#ffffff', 'blob-a': '#a78bfa', 'blob-b': '#7ab3ff', 'blob-c': '#67e8f9', glass: '#ffffff', 'glass-line': '#6f9be0', violet: '#7c5ce6' },
  dark: { surface: '#1a1a4e', text: '#ffffff', 'text-muted': '#e0e0f0', border: '#2c2c70', 'border-bright': '#a78bfa', accent: '#67e8f9', teal: '#67e8f9', 'deep-blue': '#8aa8ff', block: '#6b21a8', 'blob-a': '#7c2fd0', 'blob-b': '#2f5da8', 'blob-c': '#22b8d4', glass: '#8c8cdc', 'glass-line': '#ffffff', violet: '#a78bfa' },
  designs(k) {
    const { c, mix, rect, line, fill, stroke } = k;
    const blobs = (n) => ({ 'title-hero': [[1050, 140, 360, 'blob-a'], [1150, 600, 340, 'blob-b'], [220, 640, 240, 'blob-c']], 'section-break': [[260, 360, 380, 'blob-a'], [1100, 140, 260, 'blob-c'], [1150, 640, 320, 'blob-b']],
      'big-statement': [[120, 120, 300, 'blob-c'], [1180, 640, 380, 'blob-a'], [640, 780, 300, 'blob-b']], 'content-two-col': [[1180, 80, 280, 'blob-a'], [60, 700, 300, 'blob-b'], [700, 700, 200, 'blob-c']],
      'full-diagram': [[1200, 700, 320, 'blob-a'], [60, 60, 240, 'blob-b'], [700, 20, 180, 'blob-c']], closing: [[1100, 120, 340, 'blob-c'], [160, 650, 360, 'blob-a'], [1180, 640, 260, 'blob-b']] }[n] || []).flatMap(([x, y, R, t]) => ring(k, x, y, R, t));
    const card = (x, y, w, h, rx = 18) => [rect(x, y, w, h, `${fill(mix(c('glass'), 40))};stroke:${mix(c('glass-line'), 55)};stroke-width:1.5`, rx), line(x + rx, y + 2, x + w - rx, y + 2, stroke(mix(c('glass-line'), 80), 1.5))];
    return std(k, {
      label: 'Glassmorphism', align: 'start', m: 124, tw: 900, cw: 900, hw: 300, etr: 3, calloutHead: false,
      r: { head: 0.56, hcap: 0.72, body: 0.52, cap: 0.7, mono: 0.6 }, sz: { hero: 58, num: 220, secT: 50, stmt: 38, hd: 36, hd2: 32, cl: 72 },
      fill: { t: c('text'), b: c('text'), m: c('text-muted'), e: c('accent') }, fills: { 'content-two-col': { k: c('text') }, 'full-diagram': { k: c('text') } },
      pre: (n, g) => [...blobs(n), ...(n === 'title-hero' ? card(64, 96, 1020, 540, 22) : n === 'section-break' ? card(64, 100, 440, 480, 22) : n === 'big-statement' ? card(80, 110, 1120, 420, 22) : n === 'closing' ? card(64, 90, 1152, 546, 22)
        : n === 'content-two-col' ? [...card(...g[n].bodyP), ...card(...g[n].callP), ...card(...g[n].figP, 22)] : n === 'full-diagram' ? [...card(...g[n].figP, 22), ...card(...g[n].takeP, 22)] : [])],
      dec: {
        'title-hero': ['Cover on a deep indigo field with soft violet, blue and cyan glow blobs and one frosted glass card holding the cyan eyebrow, a large thin two-line title, a subtitle and a meta line', 'Cover: deep field with stacked-circle glow blobs; one frosted card (translucent fill, light border, 22 px corners) holds all the text flush left.'],
        'section-break': ['Section divider: a frosted glass card on the left holds an oversized thin chapter number over glowing violet and cyan blobs; the eyebrow, title and orientation line sit to its right', 'Section divider: the chapter number in a frosted card over a violet glow; eyebrow, two-line thin title and orientation line to its right.'],
        'big-statement': ['Statement slide: a wide frosted glass card holds a cyan eyebrow, a three-line thin statement and an attribution over cyan and violet glow blobs', 'Takeaway slide: one wide frosted card over cyan and violet glows holds the eyebrow, a three-line statement and the attribution.'],
        'content-two-col': ['Content slide: frosted glass cards for body text, key point and the graphic over soft violet and blue glows, with a thin heading and caption', 'Content slide: body text, key point and graphic each in a frosted card over soft glow blobs; thin heading above, caption under the graphic.'],
        'full-diagram': ['Diagram slide: a large frosted glass card for the graphic and a narrower card for the takeaway over soft glow blobs, a thin heading above', 'Figure slide: a large frosted card for the graphic and a narrow frosted card for the takeaway over glow blobs.'],
        closing: ['Closing slide: a large frosted glass card holds a large thin two-line title, contact lines and a meta line over cyan, violet and blue glows', 'Closing slide: one large frosted card over three glows holds the title, up to three contact lines and the meta line.'],
      },
    }).concat([
      bgDes('bg-glow', 'x 80–1200, y 80–640', 'Glassmorphism glow background', 'Deep field with large violet, blue and cyan glow blobs made of stacked translucent circles at the corners, the middle clear', 'Background: deep indigo field with three corner glow blobs (violet top left, blue bottom right, cyan top right) from stacked translucent circles.',
        () => [k.bg(c('surface')), ...ring(k, 120, 100, 420, 'blob-a', 9), ...ring(k, 1180, 620, 440, 'blob-b', 9), ...ring(k, 1100, 80, 240, 'blob-c', 8)]),
      bgDes('bg-card', 'x 140–1140, y 140–580 (inside the card)', 'Glassmorphism card background', 'Deep field with glow blobs behind one large frosted glass card across the middle', 'Background: glow blobs at the left and right edges behind one large frosted glass card (translucent fill, light border) across the middle.',
        () => [k.bg(c('surface')), ...ring(k, 200, 600, 420, 'blob-a', 9), ...ring(k, 1080, 140, 380, 'blob-b', 9), ...ring(k, 640, 700, 260, 'blob-c', 8), ...card(100, 100, 1080, 520, 26)]),
    ]);
  },
};

// Gradient mesh: overlapping translucent circles stand in for mesh gradient nodes.
SETS.mesh = {
  label: 'Gradient Mesh',
  description: 'Gradient-mesh style: a painterly field of overlapping glowing blobs (hot pink, violet, cyan, warm orange) made of stacked translucent circles (gradient defs are not allowed in designs, so the soft edges are banded), white Arial Black display type with a knockout halo in the surface colour, an Arial body. The light theme is a pale pastel field with the same blobs and dark text. Not any template\'s brand.',
  references: [
    'Mesh-gradient backgrounds in contemporary brand and app design: four to six colour nodes (pink, violet, cyan, orange) blended into a soft painterly field.',
    'Knockout / halo text treatments used to keep type legible over busy colour.',
  ],
  fonts: { 'font-head': 'Arial Black, Arial, sans-serif', 'font-sans': 'Arial, Helvetica, sans-serif' },
  light: { surface: '#fbf6fb', text: '#2b2b37', 'text-muted': '#555566', border: '#e9deea', 'border-bright': '#cbb9cf', accent: '#7b61ff', teal: '#7b61ff', 'deep-blue': '#00a9d6', amber: '#f59e2b', coral: '#ff6ec7', green: '#16a98a', navy: '#2b2b37', block: '#7b61ff', 'on-block': '#ffffff', pink: '#ff6ec7', violet: '#7b61ff', cyan: '#00d4ff', orange: '#ffb347', card: '#ffffff' },
  dark: { surface: '#15102e', text: '#ffffff', 'text-muted': '#f0e8ff', border: '#2e2458', 'border-bright': '#7b61ff', accent: '#ff6ec7', teal: '#ff6ec7', 'deep-blue': '#00d4ff', block: '#7b61ff', card: '#241b52' },
  designs(k) {
    const { c, mix, rect, fill } = k;
    const pos = { 'title-hero': [['pink', 1050, 160, 380], ['violet', 1180, 560, 360], ['orange', 760, 700, 260], ['cyan', 60, 700, 220]], 'section-break': [['violet', 250, 360, 400], ['pink', 1100, 110, 300], ['cyan', 1150, 640, 320], ['orange', 700, 740, 220]],
      'big-statement': [['cyan', 100, 100, 320], ['pink', 1200, 640, 380], ['violet', 640, 800, 320], ['orange', 1200, 60, 220]], 'content-two-col': [['pink', 1200, 60, 300], ['violet', 40, 700, 320], ['cyan', 700, 740, 220]],
      'full-diagram': [['violet', 1220, 700, 340], ['pink', 40, 40, 260], ['orange', 700, 10, 200]], closing: [['orange', 1140, 140, 320], ['pink', 200, 640, 380], ['violet', 1200, 640, 300], ['cyan', 640, 20, 220]] };
    const mesh = (n) => (pos[n] || []).flatMap(([t, x, y, R]) => ring(k, x, y, R, t, 8, 6));
    const panel = (x, y, w, h) => rect(x, y, w, h, `${fill(mix(c('card'), 80))}`, 22);
    const halo = (w) => `stroke:${c('surface')};stroke-width:${w};stroke-linejoin:round;paint-order:stroke`;
    return std(k, {
      label: 'Gradient Mesh', align: 'middle', m: 140, hw: 900, etr: 3, calloutHead: false,
      r: { head: 0.66, hcap: 0.8, body: 0.52, cap: 0.7, mono: 0.6 }, sz: { hero: 56, num: 230, secT: 48, stmt: 36, hd: 34, hd2: 32, cl: 70 },
      fill: { t: c('text'), b: c('text'), m: c('text-muted'), e: c('text') }, fills: {},
      tx: () => halo(6),
      pre: (n, g) => [...mesh(n), ...(n === 'content-two-col' ? [panel(...g[n].figP)] : n === 'full-diagram' ? [panel(...g[n].figP)] : [])],
      dec: {
        'title-hero': ['Cover on a painterly mesh of hot-pink, violet, orange and cyan glow blobs: a halo-outlined eyebrow, a two-line heavy title, a subtitle and a meta line flush left', 'Cover: overlapping stacked-circle blobs (pink, violet, orange, cyan) across the field; every text slot carries a knockout halo in the surface colour.'],
        'section-break': ['Section divider on a mesh of violet, pink, cyan and orange blobs: a huge heavy chapter number on the left over the violet node, the eyebrow, title and orientation line to its right', 'Section divider: the chapter number sits on the violet node at the left; eyebrow, two-line heavy title and orientation line to the right, all with halos.'],
        'big-statement': ['Statement slide on a mesh of cyan, pink, violet and orange blobs: a halo-outlined eyebrow, a three-line heavy statement and an attribution', 'Takeaway slide: cyan node top left, pink bottom right, violet below; three flush-left heavy statement lines with the halo outline.'],
        'content-two-col': ['Content slide on a soft mesh: a heavy heading, body text and a key point with halos on the left, the graphic on a translucent rounded panel on the right with a caption', 'Content slide: pink and violet nodes at the corners; text with halos on the left; the graphic on a translucent card-colour panel on the right.'],
        'full-diagram': ['Diagram slide on a soft mesh: a heavy heading, a large translucent rounded panel for the graphic and a halo-outlined takeaway column on the right', 'Figure slide: violet and pink nodes at the corners, a large translucent panel for the graphic and the takeaway in halo text on the right.'],
        closing: ['Closing slide on a mesh of orange, pink, violet and cyan blobs: a large heavy two-line title, contact lines and a meta line with halos', 'Closing slide: four mesh blobs; a large heavy title with the contact lines and meta line, all halo-outlined.'],
      },
    }).concat([
      bgDes('bg-mesh', 'x 80–1200, y 100–620 (the middle)', 'Gradient mesh background', 'Pale-or-deep field with a painterly mesh of pink, violet, cyan and orange glow blobs from stacked translucent circles at the corners', 'Background: the field with four mesh blobs (pink top left, violet bottom right, cyan top right, orange bottom left) from stacked translucent circles.',
        () => [k.bg(c('surface')), ...ring(k, 160, 120, 420, 'pink', 9, 6), ...ring(k, 1140, 640, 460, 'violet', 9, 6), ...ring(k, 1120, 80, 260, 'cyan', 8, 6), ...ring(k, 80, 680, 260, 'orange', 8, 6)]),
      bgDes('bg-flow', 'x 120–1160, y 100–620 (above the lower blobs)', 'Gradient mesh flow background', 'Field with a broad band of overlapping pink, violet and cyan glow blobs rising from the bottom edge', 'Background: a broad band of overlapping blobs (orange, pink, violet, cyan) along the bottom edge; the upper two thirds stay clear.',
        () => [k.bg(c('surface')), ...ring(k, 160, 760, 360, 'orange', 8, 6), ...ring(k, 480, 790, 380, 'pink', 8, 6), ...ring(k, 860, 780, 380, 'violet', 8, 6), ...ring(k, 1180, 770, 320, 'cyan', 8, 6)]),
    ]);
  },
};

// Art Deco: gold geometry, sunbursts, fans and stepped chevrons on cream or jet.
SETS.deco = {
  label: 'Art Deco',
  description: 'Art Deco luxe: cream paper (near-black in the dark theme), metallic gold and a deeper gold as the only two accents, jet-black / cream text, wide-tracked Georgia titles, thin double rules, stepped chevron collars, corner sunburst rays and fan (concentric arc) motifs, very restrained. Not any template\'s brand.',
  references: [
    '1920s Art Deco poster and architecture ornament: sunburst rays, fans, stepped chevrons and double rules in gold on black or cream.',
    'Contemporary Art Deco presentation palettes: cream, metallic gold, deeper gold, jet.',
  ],
  fonts: { 'font-head': 'Georgia, Times New Roman, serif', 'font-sans': 'Arial, Helvetica, sans-serif' },
  light: { surface: '#f2ead3', text: '#15130f', 'text-muted': '#6b5a37', border: '#d9cba5', 'border-bright': '#b98d2f', accent: '#b98d2f', teal: '#8f6b1d', 'deep-blue': '#46606e', amber: '#b98d2f', coral: '#9a4a30', green: '#566b45', navy: '#15130f', block: '#15130f', 'on-block': '#f2ead3', gold: '#b98d2f', 'gold-deep': '#8f6b1d' },
  dark: { surface: '#101214', text: '#f2ead3', 'text-muted': '#b9a77a', border: '#2a2a22', 'border-bright': '#b98d2f', accent: '#d4a93e', teal: '#b98d2f', 'deep-blue': '#8aa4b2', block: '#1b1a15', 'on-block': '#f2ead3', gold: '#d4a93e', 'gold-deep': '#b98d2f' },
  designs(k) {
    const { c, mix, rect, line, poly, pathd, fill, stroke } = k;
    const dbl = (x1, x2, y) => [line(x1, y, x2, y, stroke(c('gold'), 2)), line(x1, y + 5, x2, y + 5, stroke(c('gold-deep'), 1))];
    const frame = [rect(24, 24, 1232, 672, stroke(c('gold'), 2)), rect(32, 32, 1216, 656, stroke(c('gold-deep'), 1))];
    const rays = (cx, cy, R, a0, a1, n, t = 'gold', a = 18) => wedges(k, cx, cy, R, a0, a1, n, fill(mix(c(t), a)));
    const corners = [...rays(0, 0, 170, 0, 90, 12), ...rays(1280, 0, 170, 90, 180, 12), ...rays(0, 720, 170, 270, 360, 12), ...rays(1280, 720, 170, 180, 270, 12)];
    const chev = (cx, y, n = 4) => Array.from({ length: n }, (_, i) => pathd(`M ${cx - 40 - i * 22} ${y + i * 12} L ${cx} ${y + 22 + i * 12} L ${cx + 40 + i * 22} ${y + i * 12}`, `fill:none;stroke:${c(i % 2 ? 'gold-deep' : 'gold')};stroke-width:2`));
    const fan = (cx, cy, rmax, n = 7, a = 'M') => Array.from({ length: n }, (_, i) => { const r = rmax - i * (rmax / n); return pathd(`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`, `fill:none;stroke:${c(i % 2 ? 'gold-deep' : 'gold')};stroke-width:${i === 0 ? 2 : 1.2}`); });
    const plate = (x, y, w, h) => [rect(x, y, w, h, stroke(c('gold'), 2)), rect(x + 6, y + 6, w - 12, h - 12, stroke(c('gold-deep'), 1))];
    return std(k, {
      label: 'Art Deco', align: 'middle', m: 170, hw: 400, htr: 4, etr: 5, calloutHead: false,
      r: { head: 0.52, hcap: 0.78, body: 0.5, cap: 0.72, mono: 0.6 }, sz: { hero: 44, num: 170, secT: 42, stmt: 32, hd: 32, hd2: 30, cl: 60 },
      fill: { t: c('text'), b: c('text'), m: c('text-muted'), e: c('gold-deep') }, fills: { 'section-break': { n: c('gold') } },
      pre: (n, g) => n === 'title-hero' ? [...frame, ...corners, ...chev(640, 70), ...dbl(300, 980, 560)]
        : n === 'section-break' ? [...frame, ...corners, ...dbl(460, 820, 320)]
        : n === 'big-statement' ? [...frame, ...corners, ...chev(640, 60, 3), ...dbl(300, 980, 520)]
        : n === 'closing' ? [...frame, ...corners, ...chev(640, 70), ...dbl(300, 980, 560)]
        : n === 'content-two-col' ? [...dbl(64, 1216, 112), ...plate(...g[n].figP), rect(52, 388, 4, 46, fill(c('gold')))]
        : [...dbl(64, 1216, 102), ...plate(...g[n].figP), ...plate(...g[n].takeP)],
      dec: {
        'title-hero': ['Cover in a double gold frame: sunburst rays in all four corners, a stepped chevron collar at the top, a centred tracked eyebrow and two-line title, a subtitle, a double rule and the meta line', 'Cover: double gold frame; quarter sunbursts in the four corners; a stepped chevron collar above the centred wide-tracked title; a double rule above the meta line.'],
        'section-break': ['Section divider in a double gold frame with corner sunbursts: a centred gold numeral over a short double rule, the eyebrow, a two-line title and an orientation line', 'Section divider: double frame and corner rays; the chapter number in gold, centred, over a short double rule, then eyebrow, title and orientation.'],
        'big-statement': ['Statement slide in a double gold frame with corner sunbursts: a chevron collar, a centred eyebrow and three-line statement, and a double rule over the attribution', 'Takeaway slide: frame and corner rays; a three-step chevron collar above the centred statement; a double rule above the attribution.'],
        'content-two-col': ['Content slide: a double gold rule under the heading, body text and a gold-barred key point on the left, the graphic in a double-ruled gold plate with a caption on the right', 'Content slide: double rule under the heading; the graphic in a double-ruled gold plate; a gold bar beside the key point.'],
        'full-diagram': ['Diagram slide: a double gold rule under the heading, a large double-ruled plate for the graphic and a narrower double-ruled plate for the takeaway', 'Figure slide: double rule under the heading; two double-ruled gold plates, the large one for the graphic, the narrow one for the takeaway.'],
        closing: ['Closing slide in a double gold frame with corner sunbursts: a chevron collar, a centred two-line title, contact lines and a double rule over the meta line', 'Closing slide: the cover\'s frame, corner rays and chevron collar; centred title and contact lines; a double rule above the meta line.'],
      },
    }).concat([
      bgDes('bg-rays', 'x 160–1120, y 100–440 (above the rays)', 'Art Deco sunburst background', 'Cream or jet background with a gold double frame, a large sunburst of faint gold rays rising from the bottom centre and a stepped chevron collar at the top', 'Background: double gold frame, faint gold rays fanning up from the bottom centre and a stepped chevron collar at the top; text goes in the upper two thirds.',
        () => [k.bg(c('surface')), ...frame, ...rays(640, 720, 640, 180, 360, 24, 'gold', 14), ...chev(640, 56, 3)]),
      bgDes('bg-fan', 'x 200–1080, y 100–600 (the middle)', 'Art Deco fan background', 'Cream or jet background with a gold double frame, concentric gold fans in the top and bottom corners and a double rule near the top', 'Background: double gold frame, concentric fan arcs in two opposite corners and a double rule near the top; the middle stays clear.',
        () => [k.bg(c('surface')), ...frame, ...fan(150, 160, 130, 6), ...fan(1130, 660, 130, 6), ...dbl(200, 1080, 76)]),
    ]);
  },
};

// Nordic organic minimal: low-opacity blob shapes, lots of whitespace, mono caption.
SETS.nordic = {
  label: 'Nordic Organic',
  description: 'Nordic organic minimal: warm cream (deep warm charcoal in the dark theme), dark warm-brown Georgia display type at regular weight over a light Arial body, large low-opacity organic blob shapes as texture (pre-computed paths, no filters), three small brown dots as the only accent, at least 40 percent whitespace, a thin bottom rule with a wide-tracked Courier New caption. Not any template\'s brand.',
  references: [
    'Scandinavian / Nordic interior and editorial design: warm neutrals, soft organic shapes, generous whitespace, restrained serif type.',
    'Organic-minimal presentation templates: blob shapes at low opacity, a single muted accent, mono captions.',
  ],
  fonts: { 'font-head': 'Georgia, Times New Roman, serif', 'font-sans': 'Arial, Helvetica, sans-serif' },
  light: { surface: '#f4f1ec', text: '#3d3530', 'text-muted': '#8a7a6a', border: '#e3ddd3', 'border-bright': '#cfc5b6', accent: '#8b6f55', teal: '#8b6f55', 'deep-blue': '#6f7f86', amber: '#b59b7e', coral: '#a8704f', green: '#7d8a6a', navy: '#3d3530', block: '#e9e2d6', 'on-block': '#3d3530', 'dot-b': '#b59b7e', 'dot-c': '#d2c2aa' },
  dark: { surface: '#26221e', text: '#f4f1ec', 'text-muted': '#b3a594', border: '#38322b', 'border-bright': '#52483d', accent: '#c9a98a', teal: '#c9a98a', 'deep-blue': '#97a7ae', block: '#322d27', 'on-block': '#f4f1ec', 'dot-b': '#a68a6c', 'dot-c': '#7a6650' },
  designs(k) {
    const { c, mix, rect, circle, line, pathd, fill, stroke } = k;
    const blob = (cx, cy, R, seed, a = 7, tok = 'accent') => pathd(blobD(cx, cy, [1, 0.86, 1.08, 0.9, 1.04, 0.82, 1.1, 0.94].map((v, i) => R * v * (1 + 0.06 * Math.sin(seed + i))), seed), fill(mix(c(tok), a)));
    const dots = (x, y) => [circle(x, y, 5, fill(c('accent'))), circle(x + 18, y, 5, fill(c('dot-b'))), circle(x + 36, y, 5, fill(c('dot-c')))];
    const foot = [line(120, 652, 1160, 652, stroke(c('border-bright'), 1))];
    const bl = { 'title-hero': [blob(1040, 220, 300, 1, 8), blob(1180, 600, 200, 2, 6, 'dot-b')], 'section-break': [blob(980, 560, 320, 3, 8), blob(260, 140, 160, 4, 5, 'dot-b')], 'big-statement': [blob(1100, 130, 240, 5, 7), blob(140, 640, 190, 6, 6, 'dot-b')],
      'content-two-col': [blob(1220, 700, 220, 7, 6)], 'full-diagram': [blob(60, 720, 200, 8, 6)], closing: [blob(1000, 260, 320, 9, 8), blob(180, 650, 180, 10, 6, 'dot-b')] };
    const rnd = (x, y, w, h) => rect(x, y, w, h, fill(mix(c('accent'), 5)), 28);
    return std(k, {
      label: 'Nordic Organic', align: 'start', m: 120, tw: 680, cw: 700, metaY: 672, hw: 400, etr: 4, ctr: 1, mono: 'font-family:Courier New, Courier, monospace', calloutHead: false,
      r: { head: 0.54, hcap: 0.74, body: 0.5, cap: 0.7, mono: 0.6 }, sz: { hero: 52, num: 190, secT: 46, stmt: 36, hd: 34, hd2: 32, cl: 64 },
      fill: { t: c('text'), b: c('text'), m: c('text-muted'), e: c('accent') }, fills: {},
      pre: (n, g) => [...(bl[n] || []), ...(n === 'title-hero' || n === 'closing' ? [...foot, ...dots(120, 108)] : n === 'content-two-col' ? [...dots(64, 20), rnd(...g[n].figP), rect(52, 388, 3, 46, fill(c('accent')))]
        : n === 'full-diagram' ? [...dots(64, 18), rnd(...g[n].figP), rnd(...g[n].takeP)] : n === 'big-statement' ? [...dots(120, 108)] : [])],
      dec: {
        'title-hero': ['Cover on warm cream with large pale organic blobs on the right, three small brown dots, a short tracked eyebrow, a two-line serif title in a narrow left column, a subtitle and a thin bottom rule over a mono caption', 'Cover: cream field, pale organic blob paths at 8 percent, three brown dots, a narrow left text column leaving over 40 percent whitespace, a thin foot rule and a tracked Courier caption.'],
        'section-break': ['Section divider: a large light serif chapter number on the left, a pale organic blob in the lower right, and the eyebrow, title and orientation line in the right column on cream', 'Section divider: oversized light serif numeral; pale blobs lower right and upper left; eyebrow, two-line title and orientation on the right with plenty of white space.'],
        'big-statement': ['Statement slide on cream: three brown dots, a tracked eyebrow, a three-line serif statement flush left, a pale organic blob top right and another bottom left', 'Takeaway slide: dots, eyebrow, three flush-left serif lines and an attribution; pale blobs at the top right and bottom left.'],
        'content-two-col': ['Content slide on cream: a serif heading, body text and a brown-barred key point on the left, the graphic on a pale rounded plate with a mono caption on the right, a faint blob at the bottom right', 'Content slide: dots, serif heading, body text with a brown bar beside the key point, a pale rounded plate for the graphic and a tracked Courier caption.'],
        'full-diagram': ['Diagram slide on cream: a serif heading over a large pale rounded plate for the graphic and a second pale plate for the takeaway, a faint blob at the lower left', 'Figure slide: a large pale rounded plate for the graphic and a narrow one for the takeaway; a faint blob at the lower left.'],
        closing: ['Closing slide on cream: a large pale organic blob on the right, three brown dots, a two-line serif title and contact lines in a left column, a thin foot rule over a mono meta line', 'Closing slide: left text column, a large pale blob right, a thin foot rule and a tracked Courier meta line.'],
      },
    }).concat([
      bgDes('bg-blobs', 'x 120–900, y 100–600 (the left and middle)', 'Nordic blob background', 'Cream or warm charcoal background with two large pale organic blob shapes on the right, three small brown dots at the top left and a thin foot rule', 'Background: two large pale blob paths (8 and 6 percent) on the right, three brown dots at the top left and a thin rule near the foot.',
        () => [k.bg(c('surface')), blob(1060, 260, 320, 11, 8), blob(1160, 640, 220, 12, 6, 'dot-b'), ...dots(120, 80), ...foot]),
      bgDes('bg-pebble', 'x 120–1160, y 100–610 (above the foot rule)', 'Nordic pebble background', 'Cream or warm charcoal background with a few pale pebble-shaped blobs in the corners, three small brown dots at the top left and a thin foot rule', 'Background: pale pebble blobs in the top-right and bottom-left corners, three brown dots at the top left and a thin foot rule; the middle is empty.',
        () => [k.bg(c('surface')), blob(1180, 100, 200, 13, 7), blob(80, 660, 220, 14, 7, 'dot-b'), blob(1000, 700, 120, 15, 5), ...dots(120, 80), ...foot]),
    ]);
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
