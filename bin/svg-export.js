#!/usr/bin/env node
/**
 * svg-export.js: turn svg-library components into standalone .svg files.
 *
 * Library SVGs are built to be pasted into the HTML templates: colours are
 * `var(--token,#fallback)` + `color-mix()`, which only a browser resolves.
 * PowerPoint, Word, Keynote, Inkscape, Illustrator, Figma import and most
 * converters do not, so a raw library file renders black or blank there.
 * This script bakes one theme's palette into plain hex (+ fill/stroke-opacity),
 * drops the authoring comment, and gives the root a fixed width/height.
 *
 *     node bin/svg-export.js <name|path.svg>... [--theme light|dark] [--out DIR] [--png]
 *
 *   name     component name (e.g. mind-map) or a path to any token-driven .svg
 *            (e.g. a copy whose labels you already edited)
 *   --theme  light (default) or dark; dark also paints a background rect,
 *            since light-on-transparent text vanishes on white pages
 *   --out    output directory (default ./svg-export); files are <name>.svg
 *            or <name>-dark.svg
 *   --png    also write <name>[-dark].png at 2x, rendered from the exported
 *            file by headless Chrome (google-chrome/chromium on PATH, or $CHROME)
 *
 * Fails if any var()/color-mix() survives, so output is always renderer-safe.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { THEMES, exportSvg, colour } = require('./svg-bake.js');

const SVG_DIR = path.join(__dirname, '..', 'features', 'graphics', 'svg-library', 'svg');

if (require.main === module) {
  const args = process.argv.slice(2);
  let theme = 'light', out = 'svg-export', png = false;
  const names = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--theme') theme = args[++i];
    else if (args[i] === '--out') out = args[++i];
    else if (args[i] === '--png') png = true;
    else names.push(args[i]);
  }
  if (!names.length || !THEMES[theme]) {
    console.error('usage: node bin/svg-export.js <name|path.svg>... [--theme light|dark] [--out DIR] [--png]');
    process.exit(2);
  }
  fs.mkdirSync(out, { recursive: true });
  for (const n of names) {
    const file = n.endsWith('.svg') ? n : path.join(SVG_DIR, `${n}.svg`);
    const base = path.basename(file, '.svg') + (theme === 'dark' ? '-dark' : '');
    const dest = path.join(out, `${base}.svg`);
    const svg = exportSvg(fs.readFileSync(file, 'utf8'), theme);
    fs.writeFileSync(dest, svg);
    console.log(dest);
    if (png) console.log(renderPng(dest, svg));
  }
}

// Screenshot the exported (baked) file at its own size, 2x device pixels
function renderPng(dest, svg) {
  const [, w, h] = svg.match(/<svg[^>]*width="([\d.]+)" height="([\d.]+)"/);
  const chrome = process.env.CHROME || ['google-chrome', 'chromium', 'chromium-browser'].find((c) => {
    try { execFileSync('which', [c], { stdio: 'ignore' }); return true; } catch { return false; }
  });
  if (!chrome) throw new Error('--png needs google-chrome or chromium on PATH (or $CHROME)');
  const out = dest.replace(/\.svg$/, '.png');
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--force-device-scale-factor=2', `--window-size=${Math.ceil(w)},${Math.ceil(h)}`,
    `--screenshot=${path.resolve(out)}`, 'file://' + path.resolve(dest)], { stdio: 'ignore' });
  return out;
}

module.exports = { exportSvg, colour };
