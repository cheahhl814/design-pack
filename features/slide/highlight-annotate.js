/* ============================================================
   design-pack · highlight-annotate.js
   Self-contained, offset-anchored highlight-comment annotation
   system + theme toggle. Migrated from the proven template.html
   pattern (gap-report family). No build step, no dependencies.

   Public API
   ----------
   On window load, the script auto-initializes by looking for:
     - <body data-annot-storage="...">            (or falls back to data-report-id / path)
     - <[data-annot-root]> or <main class="content"> or <body>
     - <[data-annot-skip]> (any descendant is excluded from the text walker)
     - the annotation UI DOM (see features/README.md § "Wiring snippet")

   Configuration (set on <body>)
   ------------------------------
     data-annot-storage="my-key"       localStorage key, per-report namespace
     data-annot-export="my-export.json"  JSON export filename (default: <id>-annotations-<date>.json)
     data-annot-theme-key="my-theme-key" localStorage key for theme persistence (default: 'report-theme')
     data-annot-default-theme="light"   "light" | "dark" | "auto" (default: "auto" = system pref)

   Schema (matches gap-report & eDNA-Darwin-EOI conventions)
   ---------------------------------------------------------
   {
     id, quote, comment, prefix, suffix,         // anchoring
     start, end,                                  // optional offsets (kept for migration)
     type,                                         // "comment" | "delete" | "insert" | "replace" (default "comment")
     replacement,                                  // suggested new text for "insert"/"replace" (unused otherwise)
     panel, sectionHeading,                       // multi-tab navigation
     createdAt, updatedAt,                        // ISO 8601
     orphaned                                      // true if re-anchor failed
   }
   ============================================================ */
(function () {
  'use strict';

  // ---- Resolve storage namespace and theme key from <body> ----
  var body = document.body;
  if (!body) {
    console.warn('[design-pack/annotate] No <body> found — annotation system disabled.');
    return;
  }
  var reportId =
    body.getAttribute('data-annot-storage') ||
    body.getAttribute('data-report-id') ||
    (location.pathname || 'default').replace(/\W+/g, '-').toLowerCase();
  var STORE_KEY = 'annotations:' + reportId;
  var THEME_KEY = body.getAttribute('data-annot-theme-key') || 'report-theme';

  var today = new Date().toISOString().slice(0, 10);
  var DEFAULT_EXPORT_NAME = reportId + '-annotations-' + today + '.json';
  var EXPORT_NAME = body.getAttribute('data-annot-export') || DEFAULT_EXPORT_NAME;

  // ---- Annotation root: the element whose text is annotatable ----
  var root =
    document.querySelector('[data-annot-root]') ||
    document.querySelector('main.content') ||
    document.querySelector('main') ||
    document.body;
  if (!root) {
    console.warn('[design-pack/annotate] No annotation root found — annotation system disabled.');
    return;
  }

  // ---- DOM refs (the new convention: mark.annot / .annot-drawer / .annot-toggle) ----
  var els = {
    toggle:        document.getElementById('annot-toggle'),
    insertToggle:  document.getElementById('annot-insert-toggle'),
    count:         document.getElementById('annot-count'),
    toolbar:       document.getElementById('annot-toolbar'),
    toolbarComment: document.getElementById('annot-toolbar-comment'),
    toolbarDelete:  document.getElementById('annot-toolbar-delete'),
    toolbarReplace: document.getElementById('annot-toolbar-replace'),
    editor:        document.getElementById('annot-editor'),
    editorQuote:   document.getElementById('annot-editor-quote'),
    editorReplacement: document.getElementById('annot-editor-replacement'),
    editorText:    document.getElementById('annot-editor-text'),
    editorSave:    document.getElementById('annot-editor-save'),
    editorCancel:  document.getElementById('annot-editor-cancel'),
    backdrop:      document.getElementById('annot-backdrop'),
    drawer:        document.getElementById('annot-drawer'),
    drawerClose:   document.getElementById('annot-drawer-close'),
    list:          document.getElementById('annot-list'),
    exportBtn:     document.getElementById('annot-export'),
    importBtn:     document.getElementById('annot-import'),
    clearBtn:      document.getElementById('annot-clear'),
    file:          document.getElementById('annot-file'),
    themeBtn:      document.getElementById('theme-toggle')
  };

  var hasAnnotationUi = !!(els.toggle && els.drawer && els.list && els.toolbar && els.editor);
  if (!hasAnnotationUi) {
    console.info('[design-pack/annotate] Annotation UI not wired in — skipping. (Theme toggle still runs.)');
  }

  // ---- Theme toggle (runs unconditionally if button present) ----
  function initTheme() {
    if (!els.themeBtn) return;
    var pref = body.getAttribute('data-annot-default-theme') || 'auto';
    var saved = localStorage.getItem(THEME_KEY);
    var initial = saved || (pref === 'auto'
      ? ((window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light')
      : pref);
    document.documentElement.setAttribute('data-theme', initial);
    function label(t) { return t === 'light' ? '◐ dark' : '◑ light'; }
    els.themeBtn.textContent = label(initial);
    els.themeBtn.setAttribute('aria-pressed', initial === 'dark' ? 'true' : 'false');
    els.themeBtn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme') || 'light';
      var next = cur === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      els.themeBtn.textContent = label(next);
      els.themeBtn.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
    });
  }
  initTheme();

  // ---- Bail out of annotation logic if UI not wired ----
  if (!hasAnnotationUi) return;

  // ---- State ----
  var annotations = [];
  var pending = null;     // {start,end,quote,prefix,suffix,panel,heading,rect} for a new note
  var editingId = null;   // id currently being edited, or null for a new note
  var editingType = null; // "comment" | "delete" | "insert" | "replace" | null
  var focusedId = null;
  var clearArmed = false;
  var insertArmed = false;

  /* ── Persistence ──────────────────────────────────────── */
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      annotations = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(annotations)) annotations = [];
    } catch (e) {
      annotations = [];
    }
    annotations.forEach(function (a) { if (!a.type) a.type = 'comment'; });
  }
  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(annotations)); } catch (e) {}
  }
  function uid() {
    return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ── Filtered text walker ─────────────────────────────
     Skips Mermaid/SVG/code/script/style and any [data-annot-skip]
     descendants so offsets stay stable regardless of diagram
     render state. */
  function makeWalker() {
    return document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.length) return NodeFilter.FILTER_REJECT;
        var p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest('.mermaid, svg, script, style, .annot-insert-text, [data-annot-skip]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
  }
  function fullText() {
    var w = makeWalker(), s = '', n;
    while ((n = w.nextNode())) s += n.nodeValue;
    return s;
  }
  // Map a DOM boundary to its character offset in the filtered text.
  function offsetOf(container, offsetInContainer) {
    var w = makeWalker(), pos = 0, node;
    if (container.nodeType === Node.TEXT_NODE) {
      while ((node = w.nextNode())) {
        if (node === container) return pos + offsetInContainer;
        pos += node.nodeValue.length;
      }
      return pos;
    }
    // Element-node boundary: count text nodes that lie strictly before the
    // point. For a collapsed range `b`:
    //   comparePoint(node, 0) <  0 → boundary is AFTER the start of this text
    //                                  node (i.e. node is fully before boundary)
    //   comparePoint(node, 0) >= 0 → boundary is at or before the start of
    //                                  this text node (i.e. boundary is here)
    // We walk text nodes in document order; for each, if the boundary is past
    // its start, the whole text node is before the boundary, so add its
    // length. The first text node whose start is at or after the boundary
    // means we're at the boundary, so return pos.
    var b = document.createRange();
    b.setStart(container, offsetInContainer);
    b.collapse(true);
    while ((node = w.nextNode())) {
      if (b.comparePoint(node, 0) >= 0) {
        // Boundary is at or before the start of this text node
        return pos;
      }
      // Boundary is after the start of this text node → fully before us
      pos += node.nodeValue.length;
    }
    return pos;
  }
  // Build a DOM range spanning filtered-text offsets [start, end).
  function buildRange(start, end) {
    var w = makeWalker(), pos = 0, node, range = document.createRange(),
        started = false, last = null;
    while ((node = w.nextNode())) {
      last = node;
      var len = node.nodeValue.length;
      if (!started && start <= pos + len) {
        range.setStart(node, Math.max(0, start - pos));
        started = true;
      }
      if (started && end <= pos + len) {
        range.setEnd(node, Math.max(0, end - pos));
        return range;
      }
      pos += len;
    }
    if (started && last) { range.setEnd(last, last.nodeValue.length); return range; }
    return null;
  }

  /* ── Highlight rendering ─────────────────────────────── */
  function unwrapAll() {
    var marks = root.querySelectorAll('mark.annot');
    for (var i = 0; i < marks.length; i++) {
      var m = marks[i], parent = m.parentNode;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
      parent.normalize();
    }
    var extras = root.querySelectorAll('.annot-caret, ins.annot-insert-text');
    for (var j = 0; j < extras.length; j++) {
      extras[j].parentNode.removeChild(extras[j]);
    }
  }
  function wrapRange(range, id, extraClass) {
    var nodes = [], ca = range.commonAncestorContainer;
    if (ca.nodeType === Node.TEXT_NODE) {
      nodes.push(ca);
    } else {
      var w = document.createTreeWalker(ca, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          if (!n.nodeValue.length) return NodeFilter.FILTER_REJECT;
          if (n.parentElement && n.parentElement.closest('.mermaid, svg, script, style, .annot-insert-text, .annot-caret, [data-annot-skip]')) return NodeFilter.FILTER_REJECT;
          return range.intersectsNode(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      var n; while ((n = w.nextNode())) nodes.push(n);
    }
    var lastMark = null;
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var s = (node === range.startContainer) ? range.startOffset : 0;
      var e = (node === range.endContainer) ? range.endOffset : node.nodeValue.length;
      if (e <= s) continue;
      var target = node;
      if (e < node.nodeValue.length) target.splitText(e);
      if (s > 0) target = target.splitText(s);
      var mark = document.createElement('mark');
      mark.className = 'annot' + (extraClass ? ' ' + extraClass : '');
      mark.setAttribute('data-annot-id', id);
      target.parentNode.insertBefore(mark, target);
      mark.appendChild(target);
      lastMark = mark;
    }
    return lastMark;
  }
  // Resolve an annotation to its current {start,end} or null.
  function resolve(a, ft) {
    if (a.type === 'insert') {
      var iprobe = (a.prefix || '') + (a.suffix || '');
      var ii = ft.indexOf(iprobe);
      if (ii < 0) return null;
      var at = ii + (a.prefix || '').length;
      return { start: at, end: at };
    }
    var start = a.start, end = a.end;
    if (typeof start !== 'number' || typeof end !== 'number' || ft.slice(start, end) !== a.quote) {
      var probe = (a.prefix || '') + a.quote + (a.suffix || '');
      var i = ft.indexOf(probe);
      if (i >= 0) { start = i + (a.prefix || '').length; end = start + a.quote.length; }
      else { i = ft.indexOf(a.quote); if (i < 0) return null; start = i; end = i + a.quote.length; }
    }
    return { start: start, end: end };
  }
  function makeInsertNode(id, text) {
    var ins = document.createElement('ins');
    ins.className = 'annot-insert-text';
    ins.setAttribute('data-annot-id', id);
    ins.textContent = text || '';
    return ins;
  }
  function applyHighlights() {
    unwrapAll();
    var ft = fullText();
    // Two-pass: insert annotations first (caret + ins go into the text stream,
    // and the makeWalker excludes them from offset math so they don't perturb
    // quote-based range resolution). Then wrap quote-based annotations.
    var insertFirst = [], other = [];
    for (var i = 0; i < annotations.length; i++) {
      (annotations[i].type === 'insert' ? insertFirst : other).push(annotations[i]);
    }
    function applyOne(a) {
      var pos = resolve(a, ft);
      a._orphan = !pos;
      if (!pos) return;
      if (a.type === 'insert') {
        var iRange = buildRange(pos.start, pos.start);
        if (!iRange) { a._orphan = true; return; }
        try {
          var caret = document.createElement('span');
          caret.className = 'annot-caret';
          caret.setAttribute('data-annot-id', a.id);
          var frag = document.createDocumentFragment();
          frag.appendChild(caret);
          frag.appendChild(makeInsertNode(a.id, a.replacement));
          iRange.insertNode(frag);
        } catch (e) { a._orphan = true; }
        return;
      }
      var range = buildRange(pos.start, pos.end);
      if (!range) { a._orphan = true; return; }
      try {
        var extraClass = a.type === 'delete' ? 'annot-delete' : a.type === 'replace' ? 'annot-replace' : '';
        var mark = wrapRange(range, a.id, extraClass);
        if (a.type === 'replace' && mark) {
          mark.parentNode.insertBefore(makeInsertNode(a.id, a.replacement), mark.nextSibling);
        }
      } catch (e) { a._orphan = true; }
    }
    insertFirst.forEach(applyOne);
    other.forEach(applyOne);
  }

  /* ── Context: nearest [data-panel] + nearest heading ─── */
  function contextOf(node) {
    var el = node.nodeType === 1 ? node : node.parentElement;
    var panelEl = el ? el.closest('[data-panel]') : null;
    var panel = panelEl ? panelEl.getAttribute('data-panel') : null;
    var heading = '';
    var scan = el;
    while (scan && scan !== root) {
      var h = scan.previousElementSibling;
      while (h) {
        if (/^H[1-6]$/.test(h.tagName)) { heading = h.textContent.trim(); break; }
        var inner = h.querySelector ? h.querySelector('h1,h2,h3,h4,h5,h6') : null;
        if (inner) { heading = inner.textContent.trim(); break; }
        h = h.previousElementSibling;
      }
      if (heading) break;
      scan = scan.parentElement;
    }
    return { panel: panel, heading: heading };
  }

  /* ── Selection → toolbar ─────────────────────────────── */
  function caretRangeAt(x, y) {
    if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
    if (document.caretPositionFromPoint) {
      var pos = document.caretPositionFromPoint(x, y);
      if (!pos || !pos.offsetNode) return null;
      var r = document.createRange();
      r.setStart(pos.offsetNode, pos.offset);
      r.collapse(true);
      return r;
    }
    return null;
  }
  function readSelection() {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) return null;
    var range = sel.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
    var quote = sel.toString();
    if (!quote || !quote.trim()) return null;
    var start = offsetOf(range.startContainer, range.startOffset);
    var end = offsetOf(range.endContainer, range.endOffset);
    if (end <= start) return null;
    var ft = fullText();
    var ctx = contextOf(range.startContainer);
    return {
      start: start, end: end, quote: quote,
      prefix: ft.slice(Math.max(0, start - 48), start),
      suffix: ft.slice(end, Math.min(ft.length, end + 48)),
      panel: ctx.panel, heading: ctx.heading,
      rect: range.getBoundingClientRect()
    };
  }
  function showToolbar(rect) {
    els.toolbar.hidden = false;
    els.toolbar.style.left = (window.scrollX + rect.left + rect.width / 2) + 'px';
    els.toolbar.style.top  = (window.scrollY + rect.top) + 'px';
  }
  function hideToolbar() { els.toolbar.hidden = true; }

  document.addEventListener('mouseup', function (e) {
    if (els.editor.contains(e.target) || els.toolbar.contains(e.target) ||
        els.drawer.contains(e.target) || els.toggle.contains(e.target)) return;
    setTimeout(function () {
      var info = readSelection();
      if (info) { pending = info; showToolbar(info.rect); }
      else hideToolbar();
    }, 0);
  });
  document.addEventListener('mousedown', function (e) {
    if (!els.toolbar.contains(e.target)) hideToolbar();
  });

  if (els.insertToggle) {
    els.insertToggle.addEventListener('click', function () {
      insertArmed = !insertArmed;
      body.classList.toggle('annot-insert-armed', insertArmed);
      els.insertToggle.textContent = insertArmed ? '➕ Click a point…' : '➕ Insert';
      els.insertToggle.setAttribute('aria-pressed', insertArmed ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (!insertArmed) return;
      if (els.editor.contains(e.target) || els.toolbar.contains(e.target) || els.insertToggle.contains(e.target)) return;
      if (!root.contains(e.target)) return;
      var range = caretRangeAt(e.clientX, e.clientY);
      if (!range) return;
      insertArmed = false;
      body.classList.remove('annot-insert-armed');
      els.insertToggle.textContent = '➕ Insert';
      els.insertToggle.setAttribute('aria-pressed', 'false');
      var at = offsetOf(range.startContainer, range.startOffset);
      var ft = fullText();
      var ctx = contextOf(range.startContainer);
      pending = {
        start: at, end: at, quote: '',
        prefix: ft.slice(Math.max(0, at - 48), at),
        suffix: ft.slice(at, Math.min(ft.length, at + 48)),
        panel: ctx.panel, heading: ctx.heading,
        rect: (range.getClientRects()[0] || { left: e.clientX, top: e.clientY, width: 0, bottom: e.clientY })
      };
      editingId = null;
      editingType = 'insert';
      openEditor('', '', '', pending.rect);
    });
  }

  els.toolbar.addEventListener('mousedown', function (e) { e.preventDefault(); });
  function startNewAnnotation(type) {
    if (!pending) return;
    hideToolbar();
    editingId = null;
    editingType = type;
    openEditor(pending.quote, '', '', pending.rect);
  }
  if (els.toolbarComment) els.toolbarComment.addEventListener('click', function () { startNewAnnotation('comment'); });
  if (els.toolbarDelete)  els.toolbarDelete.addEventListener('click',  function () { startNewAnnotation('delete'); });
  if (els.toolbarReplace) els.toolbarReplace.addEventListener('click', function () { startNewAnnotation('replace'); });

  /* ── Comment editor ──────────────────────────────────── */
  function openEditor(quote, comment, replacement, rect, centered) {
    var type = editingId
      ? ((annotations.find(function (x) { return x.id === editingId; }) || {}).type || 'comment')
      : (editingType || 'comment');
    els.editorQuote.textContent = type === 'insert' ? '(insertion point)' : quote;
    var needsReplacement = (type === 'replace' || type === 'insert');
    if (els.editorReplacement) {
      els.editorReplacement.hidden = !needsReplacement;
      els.editorReplacement.value = replacement || '';
      els.editorReplacement.placeholder = type === 'insert' ? 'Text to insert…' : 'Replacement text…';
    }
    els.editorText.value = comment || '';
    els.editorSave.textContent = type === 'delete' ? 'Confirm delete' : 'Save';
    els.editor.hidden = false;
    if (centered || !rect) {
      els.editor.style.left = '50%';
      els.editor.style.top = (window.scrollY + Math.max(80, window.innerHeight / 2 - 120)) + 'px';
    } else {
      var left = window.scrollX + rect.left + rect.width / 2;
      left = Math.max(window.scrollX + 170, Math.min(left, window.scrollX + document.documentElement.clientWidth - 170));
      els.editor.style.left = left + 'px';
      els.editor.style.top  = (window.scrollY + rect.bottom + 10) + 'px';
    }
    setTimeout(function () {
      (needsReplacement && els.editorReplacement ? els.editorReplacement : els.editorText).focus();
    }, 0);
  }
  function closeEditor() {
    els.editor.hidden = true;
    editingId = null;
    editingType = null;
  }
  els.editorCancel.addEventListener('click', closeEditor);
  els.editorSave.addEventListener('click', function () {
    var text = els.editorText.value.trim();
    var replacement = els.editorReplacement ? els.editorReplacement.value : '';
    var existing = editingId ? annotations.find(function (x) { return x.id === editingId; }) : null;
    var type = existing ? (existing.type || 'comment') : (editingType || 'comment');
    if (type === 'comment' && !text) { els.editorText.focus(); return; }
    if ((type === 'replace' || type === 'insert') && !replacement.trim()) {
      if (els.editorReplacement) els.editorReplacement.focus();
      return;
    }
    var now = new Date().toISOString();
    if (existing) {
      existing.comment = text;
      if (type === 'replace' || type === 'insert') existing.replacement = replacement;
      existing.updatedAt = now;
    } else if (pending) {
      annotations.push({
        id: uid(), quote: pending.quote, comment: text,
        type: type, replacement: (type === 'replace' || type === 'insert') ? replacement : '',
        start: pending.start, end: pending.end,
        prefix: pending.prefix, suffix: pending.suffix,
        panel: pending.panel, heading: pending.heading,
        createdAt: now, updatedAt: now
      });
    }
    persist();
    applyHighlights();
    renderList();
    updateCount();
    closeEditor();
    window.getSelection().removeAllRanges();
    pending = null;
  });
  els.editorText.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); els.editorSave.click(); }
    if (e.key === 'Escape') { e.preventDefault(); closeEditor(); }
  });

  /* ── Drawer ──────────────────────────────────────────── */
  function openDrawer() {
    renderList();
    els.backdrop.hidden = false;
    els.drawer.hidden = false;
    requestAnimationFrame(function () { els.drawer.classList.add('open'); });
  }
  function closeDrawer() {
    els.drawer.classList.remove('open');
    els.backdrop.hidden = true;
    resetClear();
    setTimeout(function () { els.drawer.hidden = true; }, 220);
  }
  els.toggle.addEventListener('click', function () {
    if (els.drawer.hidden) openDrawer(); else closeDrawer();
  });
  els.drawerClose.addEventListener('click', closeDrawer);
  els.backdrop.addEventListener('click', closeDrawer);

  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function setFocus(id) {
    focusedId = id;
    var marks = root.querySelectorAll('mark.annot, .annot-caret, ins.annot-insert-text');
    for (var i = 0; i < marks.length; i++) {
      marks[i].classList.toggle('annot-focus', marks[i].getAttribute('data-annot-id') === id);
    }
    var items = els.list.querySelectorAll('.annot-item');
    for (var j = 0; j < items.length; j++) {
      items[j].classList.toggle('annot-focus', items[j].getAttribute('data-id') === id);
    }
  }
  function jumpTo(id) {
    var a = annotations.find(function (x) { return x.id === id; });
    if (!a) return;
    if (a.panel) {
      var tabBtn = document.querySelector('[data-tab="' + a.panel + '"]');
      if (tabBtn && !tabBtn.classList.contains('active')) tabBtn.click();
    }
    setTimeout(function () {
      var mark = root.querySelector('mark.annot[data-annot-id="' + id + '"], .annot-caret[data-annot-id="' + id + '"]');
      if (mark) {
        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setFocus(id);
      }
    }, 60);
  }
  function renderList() {
    els.list.innerHTML = '';
    if (!annotations.length) {
      var empty = document.createElement('li');
      empty.className = 'annot-empty';
      empty.textContent = 'No annotations yet. Select any text, then click “💬 Comment”.';
      els.list.appendChild(empty);
      return;
    }
    annotations.forEach(function (a) {
      var li = document.createElement('li');
      li.className = 'annot-item' + (a._orphan ? ' annot-orphan' : '');
      li.setAttribute('data-id', a.id);
      if (a.id === focusedId) li.classList.add('annot-focus');

      var badgeLabel = { comment: 'Comment', delete: 'Delete', insert: 'Insert', replace: 'Replace' }[a.type || 'comment'];
      var badge = document.createElement('span');
      badge.className = 'annot-type-badge annot-type-' + (a.type || 'comment');
      badge.textContent = badgeLabel;
      li.appendChild(badge);

      var q = document.createElement('div');
      q.className = 'annot-item-quote';
      q.title = 'Jump to highlight';
      q.textContent = '“' + a.quote + '”' + (a._orphan ? '  ⚠ text not found' : '');
      q.addEventListener('click', function () { jumpTo(a.id); });
      li.appendChild(q);

      if (a._orphan) {
        var w = document.createElement('div');
        w.className = 'annot-orphan-warning';
        w.textContent = '⚠️ Orphaned — original text not found on page';
        li.appendChild(w);
      }

      var c = document.createElement('div');
      c.className = 'annot-item-comment';
      c.textContent = a.comment;
      li.appendChild(c);

      if (a.type === 'replace' || a.type === 'insert') {
        var repl = document.createElement('div');
        repl.className = 'annot-item-replacement';
        repl.textContent = '→ ' + (a.replacement || '');
        li.appendChild(repl);
      }

      var meta = document.createElement('div');
      meta.className = 'annot-item-meta';
      meta.textContent = (a.heading ? a.heading + ' · ' : '') + fmtDate(a.updatedAt || a.createdAt);
      li.appendChild(meta);

      var actions = document.createElement('div');
      actions.className = 'annot-item-actions';
      var edit = document.createElement('button');
      edit.className = 'annot-btn';
      edit.textContent = 'Edit';
      edit.addEventListener('click', function () {
        editingId = a.id;
        pending = null;
        editingType = a.type || 'comment';
        openEditor(a.quote, a.comment, a.replacement, null, true);
      });
      var del = document.createElement('button');
      del.className = 'annot-btn danger';
      del.textContent = 'Delete';
      del.addEventListener('click', function () {
        annotations = annotations.filter(function (x) { return x.id !== a.id; });
        persist(); applyHighlights(); renderList(); updateCount();
      });
      actions.appendChild(edit);
      actions.appendChild(del);
      li.appendChild(actions);
      els.list.appendChild(li);
    });
  }
  function updateCount() {
    var n = annotations.length;
    els.count.textContent = n;
    els.count.hidden = n === 0;
  }

  /* ── Click a highlight → open drawer + focus ────────── */
  root.addEventListener('click', function (e) {
    var mark = e.target.closest ? e.target.closest('mark.annot, .annot-caret, ins.annot-insert-text') : null;
    if (!mark) return;
    var id = mark.getAttribute('data-annot-id');
    if (els.drawer.hidden) openDrawer();
    setFocus(id);
    var item = els.list.querySelector('.annot-item[data-id="' + id + '"]');
    if (item) item.scrollIntoView({ block: 'nearest' });
  });

  /* ── Export / Import / Clear ─────────────────────────── */
  els.exportBtn.addEventListener('click', function () {
    var payload = {
      report: reportId,
      exportedAt: new Date().toISOString(),
      count: annotations.length,
      annotations: annotations.map(function (a) {
        return {
          id: a.id, quote: a.quote, comment: a.comment,
          type: a.type || 'comment', replacement: a.replacement || '',
          panel: a.panel, sectionHeading: a.heading,
          prefix: a.prefix, suffix: a.suffix,
          start: a.start, end: a.end,
          createdAt: a.createdAt, updatedAt: a.updatedAt
        };
      })
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = EXPORT_NAME;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  els.importBtn.addEventListener('click', function () { els.file.click(); });
  els.file.addEventListener('change', function () {
    var f = els.file.files && els.file.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var incoming = Array.isArray(data) ? data : (data.annotations || []);
        var byId = {};
        annotations.forEach(function (a) { byId[a.id] = a; });
        incoming.forEach(function (raw) {
          if (!raw || !raw.quote) return;
          var a = {
            id: raw.id || uid(), quote: raw.quote, comment: raw.comment || '',
            type: raw.type || 'comment', replacement: raw.replacement || '',
            start: typeof raw.start === 'number' ? raw.start : 0,
            end: typeof raw.end === 'number' ? raw.end : 0,
            prefix: raw.prefix || '', suffix: raw.suffix || '',
            panel: raw.panel || null, heading: raw.sectionHeading || raw.heading || '',
            createdAt: raw.createdAt || new Date().toISOString(),
            updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString()
          };
          byId[a.id] = a;
        });
        annotations = Object.keys(byId).map(function (k) { return byId[k]; });
        persist(); applyHighlights(); renderList(); updateCount();
        els.importBtn.textContent = '✓ Imported';
      } catch (err) {
        els.importBtn.textContent = '⚠ Invalid file';
      }
      setTimeout(function () { els.importBtn.textContent = '⬆ Import'; }, 1800);
      els.file.value = '';
    };
    reader.readAsText(f);
  });

  function resetClear() { clearArmed = false; els.clearBtn.textContent = 'Clear all'; els.clearBtn.classList.remove('danger'); }
  els.clearBtn.addEventListener('click', function () {
    if (!annotations.length) return;
    if (!clearArmed) { clearArmed = true; els.clearBtn.textContent = 'Click again to confirm'; els.clearBtn.classList.add('danger'); return; }
    annotations = [];
    persist(); applyHighlights(); renderList(); updateCount();
    resetClear();
  });

  /* ── Init ────────────────────────────────────────────── */
  load();
  updateCount();
  applyHighlights();
  // Re-anchor after late DOM changes (e.g. Mermaid finishing) settle.
  window.addEventListener('load', function () { setTimeout(applyHighlights, 400); });
})();
