#!/usr/bin/env node
/**
 * preflight.js: design-pack REQUIRES GenOffice (app + CLI + its skill). Run this first.
 *   node bin/preflight.js          exit 0 = ready, 1 = a hard dependency is missing, 2 never
 * Checks: genoffice CLI >= 0.9.0 (PATH, then ~/.genoffice/launcher), the genoffice SKILL.md,
 * and Chrome (PNG/PDF export; warning only for the report/PDF path, hard for decks).
 */
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const MIN = [0, 9, 0], URL = 'https://github.com/genspark-ai/genoffice';
const SKILL_DIRS = [path.join(os.homedir(), '.agents/skills/genoffice'), path.join(os.homedir(), '.claude/skills/genoffice'), path.join(os.homedir(), '.pi/agent/skills/genoffice')];

function genofficeBin() {
  const cands = ['genoffice'];
  try { cands.push(path.join(fs.readFileSync(path.join(os.homedir(), '.genoffice/launcher'), 'utf8').trim(), 'genoffice')); } catch {}
  for (const c of cands) { try { return { bin: c, version: execFileSync(c, ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() }; } catch {} }
  return null;
}
const ge = (v) => { const a = (v.match(/\d+\.\d+\.\d+/) || ['0.0.0'])[0].split('.').map(Number); for (let i = 0; i < 3; i++) if (a[i] !== MIN[i]) return a[i] > MIN[i]; return true; };

function check() {
  const res = [], g = genofficeBin();
  res.push({ ok: !!g && ge(g.version), hard: true, what: 'genoffice CLI >= 0.9.0', detail: g ? `${g.bin} ${g.version}` : `not found; install GenOffice (${URL})` });
  const sk = SKILL_DIRS.find((d) => fs.existsSync(path.join(d, 'SKILL.md')));
  res.push({ ok: !!sk, hard: true, what: 'genoffice SKILL.md', detail: sk || `missing; install the genoffice skill (${URL}/blob/main/skills/genoffice/SKILL.md) into ~/.agents/skills/genoffice` });
  const chrome = process.env.CHROME || ['google-chrome', 'chromium', 'chromium-browser'].find((c) => { try { execFileSync('which', [c], { stdio: 'ignore' }); return true; } catch { return false; } });
  res.push({ ok: !!chrome, hard: true, what: 'Chrome/Chromium (PNG art for decks)', detail: chrome || 'not found; install google-chrome or set $CHROME' });
  return res;
}
if (require.main === module) {
  const res = check();
  for (const r of res) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.what}: ${r.detail}`);
  process.exit(res.some((r) => r.hard && !r.ok) ? 1 : 0);
}
module.exports = { check, genofficeBin };
