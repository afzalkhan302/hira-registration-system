/**
 * Shared helpers: icons, the API call, toasts and escaping.
 * Loaded by both pages.
 */
(function (window, document) {
  'use strict';

  var CFG = window.APP_CONFIG || {};

  /* ------------------------------------------------------------------ icons */

  var PATHS = {
    monitor:  '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    code:     '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    flask:    '<path d="M9 3h6M10 3v6.2a2 2 0 0 1-.3 1L4.6 19a2 2 0 0 0 1.7 3h11.4a2 2 0 0 0 1.7-3l-5.1-8.8a2 2 0 0 1-.3-1V3"/><path d="M7.5 15h9"/>',
    check:    '<path d="M20 6 9 17l-5-5"/>',
    user:     '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users:    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
    search:   '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    inbox:    '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5Z"/>',
    x:        '<path d="M18 6 6 18M6 6l12 12"/>',
    trash:    '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    phone:    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
    mail:     '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    pin:      '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    book:     '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    camera:   '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/>',
    lock:     '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    logout:   '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    refresh:  '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
    info:     '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    alert:    '<circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/>',
    send:     '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/>',
    share:    '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    edit:     '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z"/>',
    graduate: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 2.5 9 2.5 12 0v-5"/>'
  };

  function icon(name, cls) {
    return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' +
      (PATHS[name] || PATHS.info) + '</svg>';
  }

  /** Replaces every <i data-icon="x"> already in the markup. */
  function paintIcons(root) {
    var nodes = (root || document).querySelectorAll('[data-icon]');

    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      el.outerHTML = icon(el.getAttribute('data-icon'), el.getAttribute('data-icon-class') || '');
    }
  }

  /* --------------------------------------------------------------- escaping */

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ------------------------------------------------------------------- api */

  // "Connected" now means Firebase has real credentials (see firebase-config.js).
  // Until then the pages still load and show the same "not connected yet" note.
  var CONFIGURED = !!window.FIREBASE_READY;

  /**
   * One promise-returning call for every action.
   *
   * The actual work is done by the Firebase adapter (assets/js/firebase-api.js),
   * which registers itself as App._backend. This keeps register.js and admin.js
   * unaware of which backend is behind them — they only ever see { ok, ... }.
   */
  function api(payload) {
    if (window.App && typeof window.App._backend === 'function') {
      return window.App._backend(payload);
    }

    return Promise.reject(new Error(
      'The app is still loading. Please wait a moment and try again.'
    ));
  }

  /* ---------------------------------------------------------------- toasts */

  function toast(message, kind) {
    var host = document.querySelector('.toasts');

    if (!host) {
      host = document.createElement('div');
      host.className = 'toasts';
      document.body.appendChild(host);
    }

    var el = document.createElement('div');
    el.className = 'toast toast--' + (kind === 'bad' ? 'bad' : 'ok');
    el.setAttribute('role', kind === 'bad' ? 'alert' : 'status');
    el.innerHTML = icon(kind === 'bad' ? 'alert' : 'check', 'icon--sm') + '<span>' + esc(message) + '</span>';
    host.appendChild(el);

    setTimeout(function () {
      el.style.transition = 'opacity .3s';
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 320);
    }, 3600);
  }

  /* ------------------------------------------------------------- formatting */

  /**
   * Swaps the initials block for the school crest wherever one is configured.
   * Called by both pages, so the two headers cannot drift apart.
   */
  function paintLogo() {
    if (!CFG.LOGO) return;

    var marks = document.querySelectorAll('[data-logo]');

    for (var i = 0; i < marks.length; i++) {
      marks[i].classList.add('brand__mark--logo');
      marks[i].innerHTML = '<img src="' + esc(CFG.LOGO) + '" alt="' + esc(CFG.SCHOOL_NAME || '') + '">';
    }
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).slice(0, 2);
    var out = '';

    for (var i = 0; i < parts.length; i++) out += parts[i].charAt(0).toUpperCase();

    return out || '?';
  }

  function formatDate(value, withTime) {
    if (!value) return '';
    var d = new Date(value);
    if (isNaN(d.getTime())) return String(value);

    var out = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    if (withTime) {
      out += ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }

    return out;
  }

  window.App = {
    cfg: CFG,
    configured: CONFIGURED,
    icon: icon,
    paintIcons: paintIcons,
    paintLogo: paintLogo,
    esc: esc,
    api: api,
    toast: toast,
    initials: initials,
    formatDate: formatDate
  };
})(window, document);
