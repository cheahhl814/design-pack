/**
 * palette.js: resolve a `--palette` spec into svg-bake token overrides, so a
 * diagram can adopt the colours of the document it is embedded in.
 *
 *   <set>          one of the slide sets (lab, swiss, nordic, ...): that set's tokens + fonts
 *   file.json      {"teal":"#hex", "text":"#hex", ...} any subset of the bake tokens
 *   file.pptx/.docx/.xlsx   the file's own theme (ppt|word|xl/theme/theme1.xml): dk/lt + accent1-6
 *
 * Library default (no --palette) is the Lab palette: the files' own fallbacks.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (a, b, p) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v * p + B[i] * (1 - p))); };
const lum = (h) => hex2rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const hue = (h) => {
  const [r, g, b] = hex2rgb(h).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return -1; // grey: no hue
  const t = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (t * 60 + 360) % 360;
};
const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };

// Token -> hue the library uses it for (from the Lab fallbacks)
const ROLE_HUE = { coral: 5, green: 160, teal: 175, 'deep-blue': 218, amber: 38 };

function themeFromOoxml(file) {
  const entry = { '.pptx': 'ppt', '.docx': 'word', '.xlsx': 'xl' }[path.extname(file).toLowerCase()];
  let xml = '';
  try { xml = execFileSync('unzip', ['-p', file, `${entry}/theme/theme1.xml`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch { throw new Error(`${file}: no ${entry}/theme/theme1.xml (is unzip on PATH and the file an Office document?)`); }
  const slot = (n) => {
    const m = xml.match(new RegExp(`<a:${n}>\\s*<a:(?:srgbClr val|sysClr[^>]*lastClr)="([0-9A-Fa-f]{6})"`));
    return m ? '#' + m[1].toLowerCase() : null;
  };
  const font = (k) => (xml.match(new RegExp(`<a:${k}Font>\\s*<a:latin typeface="([^"]+)"`)) || [])[1];
  const accents = [1, 2, 3, 4, 5, 6].map((i) => slot('accent' + i)).filter(Boolean);
  const [dk, lt] = [slot('dk1') || '#000000', slot('lt1') || '#ffffff'];
  if (!accents.length) throw new Error(`${file}: theme has no accent colours`);
  const out = { surface: lt, text: dk, 'text-muted': mix(dk, lt, 0.62), border: mix(dk, lt, 0.14), 'border-bright': mix(dk, lt, 0.28), accent: accents[0] };
  // assign each hue role the nearest unused accent (greedy by distance); the rest fall back to a tint of accent1
  const pool = accents.map((c) => ({ c, h: hue(c) })), pairs = [];
  for (const [tok, h] of Object.entries(ROLE_HUE)) for (const a of pool) pairs.push({ tok, a, d: a.h < 0 ? 999 : hueDist(h, a.h) });
  pairs.sort((x, y) => x.d - y.d);
  const usedTok = new Set(), usedAcc = new Set();
  for (const p of pairs) if (!usedTok.has(p.tok) && !usedAcc.has(p.a.c) && p.d <= 70) { out[p.tok] = p.a.c; usedTok.add(p.tok); usedAcc.add(p.a.c); }
  for (const tok of Object.keys(ROLE_HUE)) if (!out[tok]) out[tok] = accents[0]; // few accents: reuse the brand colour
  if (font('major')) out['font-head'] = `${font('major')}, Helvetica, Arial, sans-serif`;
  if (font('minor')) out['font-sans'] = `${font('minor')}, Helvetica, Arial, sans-serif`;
  return out;
}

function resolvePalette(spec, theme = 'light') {
  if (!spec) return {};
  if (/\.(pptx|docx|xlsx)$/i.test(spec)) return themeFromOoxml(spec);
  if (/\.json$/i.test(spec)) return JSON.parse(fs.readFileSync(spec, 'utf8'));
  const { palette, listSets } = require('./compose-slide.js');
  if (!listSets().includes(spec)) throw new Error(`--palette: "${spec}" is not a slide set (${listSets().join(', ')}), .json, .pptx, .docx or .xlsx`);
  return palette(spec, theme);
}

// Warn (never fail) when a resolved palette makes text or marks hard to see on its surface
function contrastWarnings(p) {
  const w = [], surface = p.surface || '#ffffff';
  const ok = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  if (!ok(surface)) return w;
  if (ok(p.text) && contrast(p.text, surface) < 4.5) w.push(`text on surface contrast ${contrast(p.text, surface).toFixed(1)} < 4.5`);
  if (ok(p['text-muted']) && contrast(p['text-muted'], surface) < 3) w.push(`text-muted on surface contrast ${contrast(p['text-muted'], surface).toFixed(1)} < 3`);
  for (const t of ['coral', 'green', 'teal', 'deep-blue', 'amber']) if (ok(p[t]) && contrast(p[t], surface) < 3) w.push(`${t} on surface contrast ${contrast(p[t], surface).toFixed(1)} < 3`);
  return w;
}

module.exports = { resolvePalette, themeFromOoxml, contrastWarnings, contrast };
