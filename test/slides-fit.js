#!/usr/bin/env node
// Writes an HTML page that fills every text slot of every set's slide designs to its
// budget, bakes it in the set's fonts, and measures each line in the browser.
// test/smoke-test-slides.py opens it in headless Chrome and reads the
// "FIT <n> lines" report: one line per text that leaves its slot box.
//
//     node test/slides-fit.js out.html
const fs = require('fs');
const { listSets, listDesigns, loadDesign, compose, bake } = require('../bin/compose-slide.js');

// average English prose; tracked slots (eyebrows) are written in caps, as the README asks
const PROSE = 'Most failed runs were not chemistry but bubbles in the inlet channel and a small fillet fixed nine in ten of them over the quarter '.repeat(4);
let k = 0;
const filler = (n, caps) => {
  k = (k + 7) % 60; // a different window per slot, so no two lines on a slide are equal
  const s = PROSE.slice(k, k + n).replace(/^\s|\s$/g, 'x');
  return caps ? s.toUpperCase() : s;
};

let html = '<!doctype html><meta charset="utf-8"><body>';
const lines = [];
for (const set of listSets()) {
  for (const name of listDesigns(set)) {
    const design = loadDesign(name, set);
    if (design.decorOnly) continue;
    const payload = {};
    for (const s of design.slots) {
      payload[s.name] = s.kind === 'graphic' ? 'flow-pipeline'
        : s.name === 'number' ? '88'
          : Array.from({ length: s.maxlines }, () => filler(s.maxchars, !!s.tracking));
    }
    const c = compose(design, payload);
    html += `<div data-k="${set}/${name}">${bake(c.svg, 'light', set).replace(/<\?xml[^>]*\?>/, '')}</div>`;
    for (const t of c.text) for (const l of t.lines) lines.push([`${set}/${name}`, t.slot, l, t.box[0], t.box[2]]);
  }
}
html += `<pre id="out"></pre><script>
const L = ${JSON.stringify(lines)}, bad = [];
for (const [key, slot, text, x, w] of L) {
  const t = [...document.querySelector('[data-k="' + key + '"]').querySelectorAll('text')].find((e) => e.textContent === text);
  if (!t) { bad.push(key + ' ' + slot + ': line not found'); continue; }
  const b = t.getBBox();
  if (b.x < x - 1 || b.x + b.width > x + w + 1) bad.push(key + ' ' + slot + ': ' + Math.round(b.x) + '..' + Math.round(b.x + b.width) + ' outside ' + x + '..' + (x + w));
}
document.getElementById('out').textContent = 'FIT ' + L.length + ' lines\\n' + bad.join('\\n');
</script>`;
fs.writeFileSync(process.argv[2] || 'slides-fit.html', html);
