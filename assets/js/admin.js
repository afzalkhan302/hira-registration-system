/**
 * Staff dashboard.
 *
 * The password is typed once, exchanged for a session cookie, and then
 * forgotten: nothing in this file, and nothing in the browser's storage, ever
 * holds a credential. The cookie is httponly, so this script cannot read it
 * either — it only knows whether the server still recognises the session.
 *
 * What is kept in memory is the CSRF token the server issued at sign-in, which
 * accompanies every action that changes data.
 */
(function (window, document) {
  'use strict';

  var App = window.App;

  var state = { csrf: '', user: '', all: [], view: [], current: null };

  var gate = document.getElementById('gate');
  var board = document.getElementById('board');
  var modal = document.getElementById('modal');

  App.paintIcons();
  App.paintLogo();
  buildCourseFilter();
  restore();

  /* ------------------------------------------------------------ sign in */

  /**
   * Ask the server whether this browser is still signed in. If the cookie is
   * good the dashboard opens straight away — nobody is made to type a password
   * they do not have to.
   */
  function restore() {
    App.api({ action: 'session' }).then(function (res) {
      if (res && res.ok) {
        state.csrf = res.csrf || '';
        state.user = res.user || '';
        load(true);
      }
    }).catch(function () {
      // Server unreachable; the sign-in form is already on screen.
    });
  }

  document.getElementById('gateForm').addEventListener('submit', function (e) {
    e.preventDefault();

    var userInput = document.getElementById('username');
    var passInput = document.getElementById('password');
    var username  = (userInput.value || '').trim();
    var password  = passInput.value || '';

    clearGateErrors();

    if (!username) { gateError('username', 'Enter your username.'); return; }
    if (!password) { gateError('password', 'Enter your password.'); return; }

    var btn = document.getElementById('gateBtn');
    btn.disabled = true;
    btn.classList.add('is-busy');

    App.api({
      action: 'login',
      username: username,
      password: password,
      remember: document.getElementById('remember').checked
    }).then(function (res) {
      btn.disabled = false;
      btn.classList.remove('is-busy');

      if (!res || !res.ok) {
        // Which of the two was wrong is deliberately not said: confirming that
        // a username exists is half the answer given away.
        gateError('password', (res && res.error) || 'Sign in failed.');
        return;
      }

      state.csrf = res.csrf || '';
      state.user = res.user || '';

      // Cleared the moment it has been exchanged, so the password is not left
      // sitting in the DOM of a page on a shared computer.
      passInput.value = '';

      load();
    }).catch(function (err) {
      btn.disabled = false;
      btn.classList.remove('is-busy');
      gateError('password', err.message);
    });
  });

  function gateError(field, message) {
    var holder = document.getElementById(field).closest('.field');

    holder.classList.add('invalid');
    holder.querySelector('[data-err="' + field + '"]').textContent = message;
  }

  function clearGateErrors() {
    ['username', 'password'].forEach(function (field) {
      var holder = document.getElementById(field).closest('.field');

      holder.classList.remove('invalid');
      holder.querySelector('[data-err="' + field + '"]').textContent = '';
    });
  }

  document.getElementById('signOutBtn').addEventListener('click', function () {
    // Told to the server, so the session is destroyed there rather than merely
    // forgotten here. A cookie the server still honours is still a way in.
    App.api({ action: 'logout', csrf: state.csrf }).catch(function () {}).then(showGate);
  });

  function showGate() {
    state.csrf = '';
    state.user = '';
    state.all  = [];

    board.classList.add('hidden');
    document.getElementById('headActions').hidden = true;
    document.getElementById('password').value = '';
    clearGateErrors();
    gate.classList.remove('hidden');
  }

  document.getElementById('refreshBtn').addEventListener('click', function () { load(); });

  /* --------------------------------------------------------------- loading */

  function load(quiet) {
    App.api({ action: 'list' }).then(function (res) {
      if (!res || !res.ok) {
        if (res && res.code === 401) {
          // The session expired while the page sat open.
          showGate();
          App.toast('Your session has ended. Please sign in again.', 'bad');
          return;
        }

        App.toast((res && res.error) || 'The applications could not be loaded.', 'bad');
        return;
      }

      state.all = res.applications || [];

      gate.classList.add('hidden');
      board.classList.remove('hidden');
      document.getElementById('headActions').hidden = false;
      document.getElementById('whoami').textContent = state.user;

      render();

      if (!quiet) App.toast('Loaded ' + state.all.length + ' application(s).', 'ok');
    }).catch(function (err) {
      if (!quiet) App.toast(err.message, 'bad');
    });
  }

  /* --------------------------------------------------------------- filters */

  function buildCourseFilter() {
    var select = document.getElementById('fCourse');
    var list = App.cfg.COURSES || [];

    for (var i = 0; i < list.length; i++) {
      select.insertAdjacentHTML('beforeend',
        '<option value="' + App.esc(list[i].id) + '">' + App.esc(list[i].name) + '</option>');
    }
  }

  ['q', 'fCourse', 'fStatus'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', render);
    document.getElementById(id).addEventListener('change', render);
  });

  document.getElementById('resetBtn').addEventListener('click', function () {
    document.getElementById('q').value = '';
    document.getElementById('fCourse').value = '';
    document.getElementById('fStatus').value = '';
    render();
  });

  function filtered() {
    var q = document.getElementById('q').value.trim().toLowerCase();
    var course = document.getElementById('fCourse').value;
    var status = document.getElementById('fStatus').value;

    return state.all.filter(function (a) {
      if (course && a.course !== course) return false;
      if (status && a.status !== status) return false;

      if (q) {
        var hay = (a.fullName + ' ' + a.fatherName + ' ' + a.mobile + ' ' +
                   a.whatsapp + ' ' + a.email + ' ' + a.applicationNo).toLowerCase();

        if (hay.indexOf(q) === -1) return false;
      }

      return true;
    });
  }

  /* ---------------------------------------------------------------- render */

  function render() {
    state.view = filtered();

    renderStats();
    renderRows();
  }

  /**
   * The four tiles count every application ever filed, not the rows on screen:
   * a filtered view must not look as though applications have disappeared.
   */
  function renderStats() {
    var list = App.cfg.COURSES || [];
    var tiles = [{ label: 'Total applications', value: state.all.length, icon: 'inbox' }];

    for (var i = 0; i < list.length; i++) {
      tiles.push({
        label: list[i].name,
        value: state.all.filter(function (a) { return a.course === list[i].id; }).length,
        icon: list[i].icon
      });
    }

    var html = '';

    for (var j = 0; j < tiles.length; j++) {
      html +=
        '<article class="stat">' +
          '<div class="stat__top">' +
            '<span class="stat__label">' + App.esc(tiles[j].label) + '</span>' +
            '<span class="stat__ico">' + App.icon(tiles[j].icon) + '</span>' +
          '</div>' +
          '<div class="stat__value">' + tiles[j].value + '</div>' +
        '</article>';
    }

    document.getElementById('stats').innerHTML = html;
  }

  function renderRows() {
    var host = document.getElementById('rows');
    var counter = document.getElementById('count');

    counter.textContent = state.view.length === state.all.length
      ? 'Showing all ' + state.all.length + ' application(s)'
      : 'Showing ' + state.view.length + ' of ' + state.all.length + ' application(s)';

    if (!state.view.length) {
      host.innerHTML =
        '<div class="empty">' + App.icon(state.all.length ? 'search' : 'inbox') +
        '<p><strong>' + (state.all.length ? 'Nothing matched your search' : 'No applications yet') + '</strong></p>' +
        '<p class="small">' + (state.all.length
          ? 'Try a different word, or reset the filters.'
          : 'Applications appear here the moment somebody submits the public form.') + '</p></div>';
      return;
    }

    var html = '';

    for (var i = 0; i < state.view.length; i++) {
      var a = state.view[i];

      html +=
        '<button type="button" class="row" data-id="' + a.id + '">' +
          '<span class="row__avatar">' + App.esc(App.initials(a.fullName)) + '</span>' +
          '<span class="row__id">' +
            '<span class="row__name">' + App.esc(a.fullName) + '</span><br>' +
            '<span class="row__meta mono">' + App.esc(a.applicationNo) + '</span>' +
          '</span>' +
          '<span class="row__course">' +
            '<span class="row__label">Course</span>' +
            '<span>' + App.esc(a.course) + '</span>' +
          '</span>' +
          '<span class="row__mobile">' +
            '<span class="row__label">Mobile</span>' +
            '<span class="mono">' + App.esc(a.mobile) + '</span>' +
          '</span>' +
          '<span class="row__state">' +
            badge(a.status) +
            '<span class="tiny muted">' + App.esc(App.formatDate(a.submittedAt, true)) + '</span>' +
          '</span>' +
        '</button>';
    }

    host.innerHTML = html;
  }

  function badge(status) {
    return '<span class="badge badge--' + String(status).toLowerCase() + '">' + App.esc(status) + '</span>';
  }

  /* ---------------------------------------------------------------- detail */

  document.getElementById('rows').addEventListener('click', function (e) {
    var row = e.target.closest('.row');
    if (!row) return;

    // Firestore document ids are strings, so this is not coerced to a number.
    open(row.getAttribute('data-id'));
  });

  function open(id) {
    var a = null;

    for (var i = 0; i < state.all.length; i++) {
      if (state.all[i].id === id) { a = state.all[i]; break; }
    }

    if (!a) return;

    state.current = a;
    document.getElementById('mTitle').textContent = a.applicationNo;

    var rows = [
      ['Full name', a.fullName],
      ['Father name', a.fatherName],
      ['Date of birth', App.formatDate(a.dob)],
      ['Gender', a.gender],
      ['Mobile', a.mobile],
      ['WhatsApp', a.whatsapp],
      ['E-mail', a.email],
      ['Address', a.address],
      ['Qualification', a.qualification],
      ['Course', a.course],
      ['Computer knowledge', a.knowledge],
      ['Message', a.message],
      ['Submitted', App.formatDate(a.submittedAt, true)],
      ['Last updated', App.formatDate(a.updatedAt, true)]
    ];

    var detail = '';

    for (var j = 0; j < rows.length; j++) {
      detail +=
        '<div class="detail__row"><dt>' + App.esc(rows[j][0]) + '</dt><dd>' +
        (rows[j][1] ? App.esc(rows[j][1]) : '<span class="muted">—</span>') + '</dd></div>';
    }

    var actions = '';
    var statuses = ['New', 'Contacted', 'Approved', 'Rejected'];

    for (var k = 0; k < statuses.length; k++) {
      actions +=
        '<button type="button" class="btn btn--sm ' +
        (a.status === statuses[k] ? 'btn--primary' : 'btn--ghost') +
        '" data-status="' + statuses[k] + '">' + statuses[k] + '</button>';
    }

    document.getElementById('mBody').innerHTML =
      '<div style="display:flex;gap:14px;align-items:center;margin-bottom:16px">' +
        '<span class="avatar-lg" id="mPhoto">' +
          (a.hasPhoto ? '<span class="tiny muted">Loading…</span>' : App.icon('user', 'icon--lg')) +
        '</span>' +
        '<span>' +
          '<div style="font-weight:700;font-size:1.05rem">' + App.esc(a.fullName) + '</div>' +
          '<div class="small muted">' + App.esc(a.course) + '</div>' +
          '<div style="margin-top:6px">' + badge(a.status) + '</div>' +
        '</span>' +
      '</div>' +

      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">' +
        '<a class="btn btn--ghost btn--sm" href="tel:' + App.esc(a.mobile) + '">' +
          App.icon('phone', 'icon--sm') + ' Call</a>' +
        (a.whatsapp
          ? '<a class="btn btn--ghost btn--sm" target="_blank" rel="noopener" href="https://wa.me/92' +
            App.esc(a.whatsapp.replace(/^0/, '')) + '">' + App.icon('send', 'icon--sm') + ' WhatsApp</a>'
          : '') +
        (a.email
          ? '<a class="btn btn--ghost btn--sm" href="mailto:' + App.esc(a.email) + '">' +
            App.icon('mail', 'icon--sm') + ' E-mail</a>'
          : '') +
      '</div>' +

      '<div class="field" style="margin-bottom:14px">' +
        '<label>Mark this application as</label>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap" id="mStatuses">' + actions + '</div>' +
      '</div>' +

      '<div class="field" style="margin-bottom:18px">' +
        '<label for="mNote">Office remarks</label>' +
        '<textarea class="control" id="mNote" rows="2" maxlength="500" ' +
          'placeholder="Notes for the office. The applicant never sees these.">' + App.esc(a.note) + '</textarea>' +
      '</div>' +

      '<dl class="detail">' + detail + '</dl>';

    document.getElementById('mStatuses').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-status]');
      if (btn) saveStatus(btn.getAttribute('data-status'));
    });

    if (a.hasPhoto) loadPhoto(a.photoId);

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function loadPhoto(fileId) {
    App.api({ action: 'photo', fileId: fileId }).then(function (res) {
      var host = document.getElementById('mPhoto');
      if (!host) return;

      host.innerHTML = (res && res.ok && res.dataUrl)
        ? '<img src="' + res.dataUrl + '" alt="Student photo">'
        : App.icon('user', 'icon--lg');
    }).catch(function () {
      var host = document.getElementById('mPhoto');
      if (host) host.innerHTML = App.icon('user', 'icon--lg');
    });
  }

  function close() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    state.current = null;
  }

  document.getElementById('mClose').addEventListener('click', close);
  document.getElementById('mCancel').addEventListener('click', close);

  modal.addEventListener('click', function (e) {
    if (e.target === modal) close();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) close();
  });

  /* --------------------------------------------------------------- actions */

  function saveStatus(status) {
    if (!state.current) return;

    var a = state.current;
    var note = (document.getElementById('mNote').value || '').trim();

    App.api({ action: 'status', csrf: state.csrf, id: a.id, status: status, note: note })
      .then(function (res) {
        if (!res || !res.ok) {
          App.toast((res && res.error) || 'The status could not be saved.', 'bad');
          return;
        }

        a.status = status;
        a.note = note;
        a.updatedAt = new Date().toISOString();

        render();
        open(a.id);
        App.toast('Marked as ' + status + '.', 'ok');
      })
      .catch(function (err) { App.toast(err.message, 'bad'); });
  }

  document.getElementById('mDelete').addEventListener('click', function () {
    if (!state.current) return;

    var a = state.current;

    if (!window.confirm('Delete ' + a.applicationNo + ' (' + a.fullName + ')?\n\n' +
        'The row and any photo are removed for good. Reject it instead if you may need it later.')) {
      return;
    }

    App.api({ action: 'delete', csrf: state.csrf, id: a.id }).then(function (res) {
      if (!res || !res.ok) {
        App.toast((res && res.error) || 'The application could not be deleted.', 'bad');
        return;
      }

      close();
      App.toast('Deleted ' + a.applicationNo + '.', 'ok');

      // Deleting shifts every later row number, so the list is read again
      // rather than patched — a stale id would delete the wrong application.
      load(true);
    }).catch(function (err) { App.toast(err.message, 'bad'); });
  });
})(window, document);
