#!/usr/bin/env node
// Master test runner for html-template-pack.
// Verifies every template, the graphics/SVG tooling and the pptx deck builder.

const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
process.chdir(ROOT);

const suites = [
  { name: 'Report template (multi-tab capable, v2 annotation, theme toggle)', script: 'test/smoke-test-report.js' },
  { name: 'Slide template (5-slide deck, v1 inline annotation, theme toggle, print)', script: 'test/smoke-test-slide.js' },
  { name: 'Bento template (one-page bento grid, v2 inline annotation, dark-first glass)', script: 'test/smoke-test-bento.js' },
  { name: 'Dashboard template (htmx panels, demo-mode mock backend, theme toggle)', script: 'test/smoke-test-dashboard.js' },
  { name: 'Graphics pack (v0.8.0 shared component library in report + slide + bento)', script: 'test/smoke-test-graphics.js' },
  { name: 'SVG export (standalone, renderer-safe .svg from the svg-library)', script: 'test/smoke-test-svg-export.js' },
  // Python suite (optional deps; skips itself if python-pptx/cairosvg/lxml/Pillow are missing)
  { name: 'PPTX deck builder (house bases, native SVG embed, structural QA)', cmd: 'python3 test/smoke-test-pptx-deck.py' }
];

console.log('html-template-pack · test suite\n' + '─'.repeat(60));
let allOk = true;
for (const suite of suites) {
  console.log(`\n  ${suite.name}\n`);
  try {
    const out = execSync(suite.cmd || `node ${suite.script}`, { encoding: 'utf8' });
    const lines = out.trim().split('\n');
    const tail = lines.slice(Math.max(0, lines.length - 35)).join('\n');
    console.log(tail);
  } catch (e) {
    console.error(e.stdout || e.message);
    allOk = false;
  }
}
console.log('\n' + '─'.repeat(60));
console.log(allOk ? '  All suites passed.' : '  Some suites failed.');
process.exit(allOk ? 0 : 1);
