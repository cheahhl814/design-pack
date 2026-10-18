/* ============================================================
   design-pack · theme-toggle.js
   Self-contained light/dark theme toggle. Persists to
   localStorage, honours system preference on first visit,
   and respects an explicit data-default-theme on <body>.

   Usage
   -----
   1. Define CSS variables for [data-theme="light"] and
      [data-theme="dark"] on <html> or :root (the page
      template usually does this).
   2. Add the button anywhere:
        <button class="theme-btn" id="theme-toggle" aria-label="Toggle color theme">◐ dark</button>
   3. Include this script anywhere — it auto-initializes.

   Configuration (set on <body>)
   ------------------------------
     data-theme-storage="my-key"        (default: "report-theme")
     data-default-theme="light|dark|auto" (default: "auto" = system pref)
   ============================================================ */
(function () {
  'use strict';
  var body = document.body;
  var KEY = (body && body.getAttribute('data-theme-storage')) || 'report-theme';
  var PREF = (body && body.getAttribute('data-default-theme')) || 'auto';
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;

  function systemTheme() {
    if (PREF === 'light' || PREF === 'dark') return PREF;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  function readSaved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function writeSaved(t) { try { localStorage.setItem(KEY, t); } catch (e) {} }
  function label(t) { return t === 'light' ? '◐ dark' : '◑ light'; }

  var saved = readSaved();
  var initial = saved || systemTheme();
  document.documentElement.setAttribute('data-theme', initial);
  btn.textContent = label(initial);
  btn.setAttribute('aria-pressed', initial === 'dark' ? 'true' : 'false');

  btn.addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') || 'light';
    var next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    writeSaved(next);
    btn.textContent = label(next);
    btn.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
  });

  // Optional: react to OS theme change when in "auto" mode and no explicit save.
  if (window.matchMedia && PREF === 'auto' && !saved) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var handler = function (e) {
      var next = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      btn.textContent = label(next);
      btn.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
    };
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
  }
})();
