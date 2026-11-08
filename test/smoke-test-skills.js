#!/usr/bin/env node
// Skill-split check: every SKILL.md has a unique name + description <= 1024 chars,
// and every relative markdown link / backticked tool path in a sub-skill resolves.
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.log('  FAIL ' + m); } };
const names = new Set();
for (const rel of ['SKILL.md', 'html/SKILL.md', 'svg/SKILL.md']) {
  const dir = path.join(ROOT, path.dirname(rel)), txt = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const fm = txt.split('---')[1] || '';
  const name = (fm.match(/^name:\s*(\S+)/m) || [])[1];
  const desc = (fm.match(/^description:\s*'([\s\S]*?)'\s*$/m) || [])[1] || '';
  ok(name && !names.has(name), `${rel}: unique name`); names.add(name);
  ok(desc.length > 0 && desc.length <= 1024, `${rel}: description ${desc.length} chars (1..1024)`);
  ok(txt.length < 25000, `${rel}: ${txt.length} bytes < 25000`);
  for (const m of txt.matchAll(/\]\((\.[^)#]+)\)/g)) ok(fs.existsSync(path.join(dir, m[1])), `${rel}: link ${m[1]}`);
  for (const m of txt.matchAll(/`((?:bin|templates|features)\/[\w./-]+\.(?:js|py|html|md|css))`/g))
    ok(fs.existsSync(path.join(dir, m[1])), `${rel}: path ${m[1]}`);
}
console.log(`skills: ${n - fail}/${n} checks passed`);
process.exit(fail ? 1 : 0);
