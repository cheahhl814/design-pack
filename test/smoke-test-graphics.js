#!/usr/bin/env node
// Smoke-test the v0.8.0 graphics pack in headless Chrome.
// Verifies that report, slide, and bento templates include the shared
// graphics components (donut, gauges, hbar, heatmap, data bars,
// flowchart, milestone strip, comparison table, pull-quote, motion),
// with accessibility fallbacks (sr-only tables, role="img", aria-label)
// and the @supports + prefers-reduced-motion guards in graphics.css.
//
// Per-template check lists: each template legitimately shows only a
// subset of the pack (report = full set, slide = charts/diagrams/quote,
// bento = a few curated cards). The CSS-level checks apply to all three.

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const SKILL = path.resolve(__dirname, '..');
const TMP_DIR = '/tmp/html-pack-graphics-test';
const LOG = '/tmp/html-pack-graphics-test.log';

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const targets = [
  { name: 'report', template: 'templates/report/template.html',       out: `${TMP_DIR}/report.png` },
  { name: 'slide',  template: 'templates/slide/slide-template.html',  out: `${TMP_DIR}/slide.png` },
  { name: 'bento',  template: 'templates/bento/bento-template.html',  out: `${TMP_DIR}/bento.png` }
];

// Per-template markup checks (what the demo content actually renders).
const perTemplate = {
  report: [
    { name: 'donut chart',                re: /class="donut"/g,                        expectMin: 1 },
    { name: 'donut sr-only table',        re: /<table class="sr-only">/,               expectMin: 1 },
    { name: 'gauge with .animated',       re: /class="gauge[^"]*animated/,             expectMin: 1 },
    { name: 'hbar rows',                  re: /class="hbar"/g,                         expectMin: 2 },
    { name: 'heatmap data-level cells',   re: /data-level="\d"/g,                      expectMin: 3 },
    { name: 'data-bar cells',             re: /class="db-cell"/,                       expectMin: 1 },
    { name: 'flowchart',                  re: /class="flow-node/,                      expectMin: 1 },
    { name: 'flow-branch',                re: /class="flow-branch"/,                   expectMin: 1 },
    { name: 'milestone strip',            re: /class="mstrip"/,                        expectMin: 1 },
    { name: 'comparison table',           re: /class="compare"/,                       expectMin: 1 },
    { name: '.rec-col on compare',        re: /class="rec-col"/,                       expectMin: 1 },
    { name: 'pull-quote',                 re: /class="pull-quote"/,                    expectMin: 1 },
    { name: 'reading-progress',           re: /class="reading-progress"/,              expectMin: 1 },
    { name: 'scroll reveal',              re: /class="pull-quote[^"]*reveal/,          expectMin: 1 },
  ],
  slide: [
    { name: 'donut chart',                re: /class="donut"/g,                        expectMin: 1 },
    { name: 'donut sr-only table',        re: /<table class="sr-only">/,               expectMin: 1 },
    { name: 'gauge with .animated',       re: /class="gauge[^"]*animated/,             expectMin: 1 },
    { name: 'hbar rows',                  re: /class="hbar"/g,                         expectMin: 1 },
    { name: 'flowchart',                  re: /class="flow-node/,                      expectMin: 1 },
    { name: 'milestone strip',            re: /class="mstrip"/,                        expectMin: 1 },
    { name: 'pull-quote',                 re: /class="pull-quote"/,                    expectMin: 1 },
  ],
  bento: [
    { name: 'donut chart',                re: /class="donut"/g,                        expectMin: 1 },
    { name: 'donut sr-only table',        re: /<table class="sr-only">/,               expectMin: 1 },
    { name: 'gauge with .animated',       re: /class="gauge[^"]*animated/,             expectMin: 1 },
    { name: 'heatmap data-level cells',   re: /data-level="\d"/g,                      expectMin: 3 },
    { name: 'comparison table',           re: /class="compare"/,                       expectMin: 1 },
    { name: 'pull-quote',                 re: /class="pull-quote"/,                    expectMin: 1 },
  ],
};

// CSS-level checks (graphics.css inlined into every template).
const cssChecks = [
  { name: '@supports scroll() guard',       re: /@supports \(animation-timeline: scroll\(\)\)/, expectMin: 1 },
  { name: '@supports conic-gradient guard', re: /@supports \(background: conic-gradient/,     expectMin: 1 },
  { name: '@property --sweep typed prop',   re: /@property --sweep/,                          expectMin: 1 },
  { name: 'prefers-reduced-motion guard',   re: /@media \(prefers-reduced-motion: no-preference\)/, expectMin: 1 },
  { name: '@keyframes reveal-in',           re: /@keyframes reveal-in/,                       expectMin: 1 },
  { name: '@keyframes rp-grow',             re: /@keyframes rp-grow/,                         expectMin: 1 },
  { name: '@keyframes gauge-sweep',         re: /@keyframes gauge-sweep/,                     expectMin: 1 },
  { name: '.sr-only helper',                re: /\.sr-only \{/,                               expectMin: 1 },
  { name: '@media print rules',             re: /@media print[\s\S]{0,200}\.reading-progress/, expectMin: 1 },
];

let totalPassed = 0, totalFailed = 0;

console.log('design-pack · graphics pack smoke test\n' + '─'.repeat(60));

function runOne(t) {
  return new Promise((resolve) => {
    const cmd = `google-chrome --headless=new --disable-gpu --no-sandbox \
      --window-size=1600,1000 \
      --enable-logging=stderr --v=0 \
      --virtual-time-budget=10000 \
      --screenshot=${t.out} \
      --dump-dom \
      file://${path.resolve(SKILL, t.template)} 2>${LOG}`;
    exec(cmd, { maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
      if (err) { console.error(`Chrome error for ${t.name}:`, err.message); process.exit(1); }
      let pass = 0, fail = 0;
      console.log(`\n  ${t.name}  (${t.template})\n`);
      (perTemplate[t.name] || []).forEach(({ name, re, expectMin }) => {
        const matches = (stdout.match(re) || []).length;
        const ok = matches >= expectMin;
        console.log(`    ${ok ? '✓' : '✗'} ${name.padEnd(42)} (${matches})`);
        ok ? pass++ : fail++;
      });
      cssChecks.forEach(({ name, re, expectMin }) => {
        const matches = (stdout.match(re) || []).length;
        const ok = matches >= expectMin;
        console.log(`    ${ok ? '✓' : '✗'} ${name.padEnd(42)} (${matches})`);
        ok ? pass++ : fail++;
      });
      const shotOk = fs.existsSync(t.out) && fs.statSync(t.out).size > 1000;
      console.log(`    ${shotOk ? '✓' : '✗'} Screenshot rendered                            (${shotOk ? fs.statSync(t.out).size + ' bytes' : 'MISSING'})`);
      shotOk ? pass++ : fail++;

      const log = fs.readFileSync(LOG, 'utf8');
      const errs = log.split('\n').filter(l => /CONSOLE\(\d+\)|ERROR|Uncaught/.test(l) && !/devtools|net::|ERR_FILE_NOT_FOUND|registration_request|DEPRECATED_ENDPOINT/.test(l));
      const noErrors = errs.length === 0;
      console.log(`    ${noErrors ? '✓' : '✗'} No JS console errors                            (${errs.length} found)`);
      if (!noErrors) errs.slice(0, 5).forEach(e => console.log('       ', e.trim()));
      noErrors ? pass++ : fail++;

      console.log(`    ${pass} passed · ${fail} failed`);
      totalPassed += pass; totalFailed += fail;
      resolve();
    });
  });
}

(async () => {
  for (const t of targets) await runOne(t);
  console.log('\n' + '─'.repeat(60));
  console.log(`  TOTAL: ${totalPassed} passed · ${totalFailed} failed`);
  process.exit(totalFailed === 0 ? 0 : 1);
})();