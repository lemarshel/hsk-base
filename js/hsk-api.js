/* ==========================================================================
   js/hsk-api.js — Shared API contract and registration system.

   PURPOSE
     Declares window._hsk ONCE with stub implementations.
     Exposes window._hsk._register() so each module registers only
     the keys it owns through a single, explicit call site.

   REGISTRATION CONTRACT
     Each module calls:
       window._hsk._register('moduleName', { key: fn, ... });
     Stubs (._isStub === true) are replaced at module load time.
     A console.warn fires if a live (non-stub) key is re-registered —
     useful for catching accidental double-loads.

   LOAD ORDER
     Must be loaded after app-config.js, before all other js/*.js files.

   OWNERSHIP MAP
     hsk.js    → renum, updateHSKStats, confirm
     tts.js    → getTtsVolume, stopAllAudio
     lang.js   → getLang
     sort.js   → applySort, getCurrentSort, sortRows, sortRowsByHsk,
                  updateDragState, getTbodiesForSort
     filter.js → rebuildView, stripTones, applyAlphaFilter, getCurrentAlpha,
                  renumVisible, getVisibleRowCount, updateWordCount

   AUXILIARY GLOBALS (managed outside the _hsk bridge)
     window._cdxOrigOrder  — row order snapshot; owned by hsk.js,
                             consumed by hsk.js and sort.js
     window._cdxSortables  — SortableJS instances; written by hsk.js
                             (setTimeout patch) and sort.js;
                             consumed by sort.js updateDragState
   ========================================================================== */
(function () {
  "use strict";

  /* ── Stub helpers ──────────────────────────────────────────────────────── */
  /* Stubs carry ._isStub = true so _register can detect double-registration. */

  function _noop() {}
  _noop._isStub = true;

  function _makeStub(fn) {
    fn._isStub = true;
    return fn;
  }

  /* ── Registration helper ───────────────────────────────────────────────── */
  function registerHskApi(moduleName, api) {
    var k, cur;
    for (k in api) {
      if (!Object.prototype.hasOwnProperty.call(api, k)) { continue; }
      cur = window._hsk[k];
      if (cur && typeof cur === 'function' && !cur._isStub) {
        typeof console !== 'undefined' && console.warn(
          '[hsk-api] "' + k + '" re-registered by ' + moduleName
        );
      }
      window._hsk[k] = api[k];
    }
  }

  /* ── API contract — full shape with safe stubs ─────────────────────────── */
  window._hsk = {
    /* hsk.js */
    renum:           _noop,
    updateHSKStats:  _noop,
    confirm:         _noop,

    /* tts.js */
    getTtsVolume:    _makeStub(function() { return 1; }),
    stopAllAudio:    _noop,

    /* lang.js */
    getLang:         _makeStub(function() { return 'ru'; }),

    /* sort.js */
    applySort:          _noop,
    getCurrentSort:     _makeStub(function() { return 'default'; }),
    sortRows:           _makeStub(function(rows) { return rows; }),
    sortRowsByHsk:      _makeStub(function(rows) { return rows; }),
    updateDragState:    _noop,
    getTbodiesForSort:  _makeStub(function() { return []; }),

    /* filter.js */
    rebuildView:        _noop,
    stripTones:         _makeStub(function(s) { return s; }),
    applyAlphaFilter:   _noop,
    getCurrentAlpha:    _makeStub(function() { return 'all'; }),
    renumVisible:       _noop,
    getVisibleRowCount: _makeStub(function() { return 0; }),
    updateWordCount:    _noop,

    /* registration helper — internal, not an API export */
    _register: registerHskApi
  };

  /* ── Auxiliary globals ─────────────────────────────────────────────────── */
  /* hsk.js unconditionally overwrites _cdxOrigOrder; initialise here only as
     a safety net for any code that reads before hsk.js runs. */
  window._cdxOrigOrder = window._cdxOrigOrder || {};
  window._cdxSortables = window._cdxSortables || [];
})();
