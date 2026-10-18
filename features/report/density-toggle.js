/* ============================================================
   design-pack · density-toggle.js
   Cycles the report between 'comfortable' and 'compact' spacing.
   Persists to localStorage. Composes with the theme toggle
   and font-size toggle — independent state.

   Usage
   -----
   1. Add a button anywhere:
        <button class="theme-btn" id="density-toggle">▤ comfortable</button>
   2. Include this script — it auto-initializes.

   Storage
   -------
     localStorage["report-density"] = "comfortable" | "compact"
   (default: "comfortable")
   ============================================================ */
(function () {
  'use strict';
  var KEY = 'report-density';
  var MODES = ['comfortable', 'compact'];
  var LABELS = { comfortable: '▤ comfortable', compact: '▥ compact' };
  var btn = document.getElementById('density-toggle');
  if (!btn) return;

  function readSaved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function writeSaved(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  var saved = readSaved();
  var initial = (saved && MODES.indexOf(saved) >= 0) ? saved : 'comfortable';
  document.documentElement.setAttribute('data-density', initial);
  btn.textContent = LABELS[initial];
  btn.setAttribute('aria-pressed', initial === 'compact' ? 'true' : 'false');

  btn.addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-density') || 'comfortable';
    var idx = MODES.indexOf(cur);
    var next = MODES[(idx + 1) % MODES.length];
    document.documentElement.setAttribute('data-density', next);
    writeSaved(next);
    btn.textContent = LABELS[next];
    btn.setAttribute('aria-pressed', next === 'compact' ? 'true' : 'false');
  });
})();