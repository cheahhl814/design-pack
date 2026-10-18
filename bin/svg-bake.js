/**
 * svg-bake.js: shared token -> hex bake logic for svg-library style SVGs.
 *
 * Used by bin/svg-export.js (standalone .svg export) and bin/compose-slide.js
 * (slide designs). Resolves var(--token,#fallback) + nested color-mix(in srgb, ...)
 * inside inline style attributes into plain hex + fill/stroke-opacity, using one
 * theme of the slide-template palette (light = the files' own fallbacks).
 */
// Slide-template palette (the library's fallbacks are its light values)
const HEAD = 'Outfit, Inter, Segoe UI, Helvetica, Arial, sans-serif';
const SANS = 'Inter, Segoe UI, Helvetica, Arial, sans-serif';
const THEMES = {
  light: { 'font-head': HEAD, 'font-sans': SANS },
  dark: {
    'font-head': HEAD, 'font-sans': SANS,
    surface: '#131820', border: '#232a35', 'border-bright': '#313a4a',
    text: '#f8fafc', 'text-muted': '#94a3b8', accent: '#14b8a6',
  },
};

const hex2rgb = (h) => {
  h = h.replace('#', '');
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const rgb2hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

// Colour value -> { hex, a }. Handles nested color-mix(in srgb, A p%, B) with
// hex or `transparent` operands (the only forms the library uses).
function colour(v) {
  v = v.trim();
  if (v === 'transparent') return { rgb: [0, 0, 0], a: 0 };
  if (/^#[0-9a-f]{3,6}$/i.test(v)) return { rgb: hex2rgb(v), a: 1 };
  const m = v.match(/^color-mix\(in srgb,\s*(.+)\)$/);
  if (!m) throw new Error(`unsupported colour: ${v}`);
  // split the two operands at the top-level comma
  let depth = 0, cut = -1;
  for (let i = 0; i < m[1].length; i++) {
    const ch = m[1][i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) { cut = i; break; }
  }
  const parse = (s) => {
    const pm = s.trim().match(/^(.*?)(?:\s+([\d.]+)%)?$/);
    return { c: colour(pm[1]), p: pm[2] === undefined ? null : +pm[2] / 100 };
  };
  const A = parse(m[1].slice(0, cut)), B = parse(m[1].slice(cut + 1));
  const pa = A.p ?? (B.p === null ? 0.5 : 1 - B.p);
  const pb = 1 - pa;
  // CSS color-mix interpolates premultiplied colour, then un-premultiplies
  const a = A.c.a * pa + B.c.a * pb;
  const rgb = a === 0 ? [0, 0, 0] : [0, 1, 2].map((i) => (A.c.rgb[i] * A.c.a * pa + B.c.rgb[i] * B.c.a * pb) / a);
  return { rgb, a };
}

function resolveVars(s, theme) {
  const re = /var\(--([a-z-]+)(?:,([^()]*))?\)/; // innermost first (fallbacks hold no parens)
  let m;
  while ((m = s.match(re))) {
    const val = theme[m[1]] ?? (m[2] !== undefined ? m[2].trim() : null);
    if (val === null) throw new Error(`no value for --${m[1]}`);
    s = s.replace(m[0], val);
  }
  return s;
}

function flattenStyle(style, theme) {
  const out = [];
  for (const decl of resolveVars(style, theme).split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim(), val = decl.slice(i + 1).trim();
    if ((prop === 'fill' || prop === 'stroke') && val !== 'none') {
      const { rgb, a } = colour(val);
      out.push(`${prop}:${rgb2hex(rgb)}`);
      if (a < 0.999) out.push(`${prop}-opacity:${+a.toFixed(3)}`);
    } else {
      out.push(`${prop}:${val}`);
    }
  }
  return out.join(';');
}

function exportSvg(src, themeName, theme = THEMES[themeName]) {
  let svg = src.replace(/<!--[\s\S]*?-->\s*/g, '').trim();
  svg = svg.replace(/style="([^"]*)"/g, (_, st) => `style="${flattenStyle(st, theme)}"`);
  const [, , w, h] = svg.match(/viewBox="([\d.\s-]+)"/)[1].trim().split(/\s+/).map(Number);
  svg = svg.replace(/style="width:100%;height:auto"/, `width="${w}" height="${h}"`);
  if (themeName === 'dark') {
    svg = svg.replace(/(<\/title>)/, `$1\n  <rect width="${w}" height="${h}" style="fill:${theme.surface}"/>`);
  }
  if (/var\(|color-mix/.test(svg)) throw new Error('unresolved var()/color-mix() left in output');
  return `<?xml version="1.0" encoding="UTF-8"?>\n${svg}\n`;
}

module.exports = { THEMES, colour, resolveVars, flattenStyle, exportSvg };
