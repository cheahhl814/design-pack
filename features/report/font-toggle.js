/* ============================================================
   design-pack · font-toggle.js
   Cycles the report through 3 font sizes (S / M / L).
   Persists to localStorage. Scales the root font-size so
   every rem-based text element cascades proportionally.

   Usage
   -----
   1. Add a button anywhere:
        <button class="theme-btn" id="font-toggle">M</button>
   2. Include this script — it auto-initializes.

   Storage
   -------
     localStorage["report-font-size"] = "S" | "M" | "L"
   (default: "M" = 16px)

   Pair with CSS:
     :root, [data-font-size="M"] { font-size: 16px; }
     [data-font-size="S"] { font-size: 14px; }
     [data-font-size="L"] { font-size: 18px; }
   ============================================================ */
(function () {
  'use strict';
  var KEY = 'report-font-size';
  var SIZES = ['S', 'M', 'L'];
  var btn = document.getElementById('font-toggle');
  if (!btn) return;

  function readSaved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function writeSaved(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  var saved = readSaved();
  var initial = (saved && SIZES.indexOf(saved) >= 0) ? saved : 'M';
  document.documentElement.setAttribute('data-font-size', initial);
  btn.textContent = initial;
  btn.setAttribute('aria-label', 'Font size: ' + initial + ' (click to change)');

  btn.addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-font-size') || 'M';
    var idx = SIZES.indexOf(cur);
    var next = SIZES[(idx + 1) % SIZES.length];
    document.documentElement.setAttribute('data-font-size', next);
    writeSaved(next);
    btn.textContent = next;
    btn.setAttribute('aria-label', 'Font size: ' + next + ' (click to change)');
  });
})();