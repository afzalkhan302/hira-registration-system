/**
 * Firebase backend adapter.
 *
 * This is the only file that talks to Firebase. It implements the same small
 * set of "actions" the old PHP endpoint did, and returns the same JSON-ish
 * shapes ({ ok: true, ... } / { ok: false, error, code }), so register.js and
 * admin.js keep working unchanged. The seam is App.api() in common.js, which
 * simply forwards to App._backend defined here.
 *
 *   submit   public   create an application (+ optional photo upload)
 *   ping     public   health check
 *   login    admin    Firebase Auth sign-in (username is mapped to an e-mail)
 *   session  admin    is someone signed in?
 *   logout   admin    sign out
 *   list     admin    every application, newest first
 *   status   admin    change one application's status + note
 *   delete   admin    remove one application and its photo
 *   photo    admin    resolve a stored photo path to a download URL
 *
 * Security is enforced by firestore.rules / storage.rules, never here: anything
 * in this file can be edited by whoever opens the page.
 */
(function (window, document) {
  'use strict';

  var App   = window.App || (window.App = {});
  var ready = !!window.FIREBASE_READY;

  // Firebase Storage requires the paid Blaze plan. When it is off (free Spark
  // plan) photo upload is skipped and no Storage call is ever made.
  var storageEnabled = window.STORAGE_ENABLED === true;

  var auth, db, storage, currentUser = null, authResolved;

  if (ready && window.firebase) {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      auth = firebase.auth();
      db   = firebase.firestore();

      // Storage is initialised only when enabled, and its failure must never
      // take down Firestore or Auth, so it gets its own guard.
      if (storageEnabled && firebase.storage) {
        try {
          storage = firebase.storage();
        } catch (se) {
          storage = null;
          if (window.console) console.warn('Firebase Storage unavailable; photo upload disabled.', se);
        }
      }

      // Resolves once, with the initial signed-in state; also keeps currentUser
      // fresh for later checks.
      authResolved = new Promise(function (resolve) {
        auth.onAuthStateChanged(function (user) {
          currentUser = user;
          resolve(user);
        });
      });
    } catch (e) {
      ready = false;
      if (window.console) console.error('Firebase init failed:', e);
    }
  }

  /* --------------------------------------------------------------- helpers */

  function serverTime() {
    return firebase.firestore.FieldValue.serverTimestamp();
  }

  // A Firestore Timestamp -> ISO string (what the dashboard's formatDate wants).
  function iso(ts) {
    if (ts && typeof ts.toDate === 'function') return ts.toDate().toISOString();
    return '';
  }

  // A unique, human-readable application number. Strictly sequential numbering
  // (…-0001, …-0002) would need a server-authoritative counter (a Cloud
  // Function), which is outside the requested service set, so this is unique
  // per submission without requiring the public to read other rows.
  function applicationNumber() {
    var year = new Date().getFullYear();
    var n    = Math.floor(100000 + Math.random() * 900000); // 6 digits
    return 'HIRA-' + year + '-' + n;
  }

  function fail(error, code) {
    return { ok: false, error: error, code: code || 0 };
  }

  /* ---------------------------------------------------------------- submit */

  function submit(data) {
    data = data || {};

    var docRef    = db.collection('applications').doc(); // auto-id
    var appNo     = applicationNumber();
    var photoPath = null;

    var start = Promise.resolve();

    // Photo upload only runs when Storage is enabled (Blaze). On Spark the
    // picked photo is simply not uploaded and the application saves without one.
    if (storageEnabled && storage && data.photo && typeof data.photo.data === 'string') {
      photoPath = 'applications/' + docRef.id + '/photo.jpg';
      start = storage.ref(photoPath).putString(data.photo.data, 'data_url')
        .catch(function () {
          // A failed photo upload must not lose the whole application.
          photoPath = null;
        });
    }

    return start.then(function () {
      return docRef.set({
        applicationNo: appNo,
        fullName:      String(data.fullName || ''),
        fatherName:    String(data.fatherName || ''),
        dob:           String(data.dob || ''),
        gender:        String(data.gender || ''),
        mobile:        String(data.mobile || ''),
        whatsapp:      String(data.whatsapp || ''),
        email:         String(data.email || ''),
        address:       String(data.address || ''),
        qualification: String(data.qualification || ''),
        course:        String(data.course || ''),
        knowledge:     String(data.knowledge || ''),
        message:       String(data.message || ''),
        photoPath:     photoPath,
        status:        'New',
        note:          '',
        createdAt:     serverTime(),
        updatedAt:     serverTime()
      });
    }).then(function () {
      // The number is generated here, so there is no need to read the row back
      // (the public cannot read applications, by design).
      return { ok: true, applicationNo: appNo };
    }).catch(function (e) {
      return fail(friendly(e), 0);
    });
  }

  /* ----------------------------------------------------------------- login */

  function login(username, password, remember) {
    var email = (String(username) === window.ADMIN_USERNAME)
      ? window.ADMIN_EMAIL
      : String(username); // allow signing in with a full e-mail too

    var persistence = remember
      ? firebase.auth.Auth.Persistence.LOCAL
      : firebase.auth.Auth.Persistence.SESSION;

    return auth.setPersistence(persistence).then(function () {
      return auth.signInWithEmailAndPassword(email, password);
    }).then(function () {
      currentUser = auth.currentUser;
      return { ok: true, user: window.ADMIN_USERNAME, csrf: '' };
    }).catch(function () {
      // Which of the two was wrong is deliberately not revealed.
      return fail('Those details were not accepted.', 401);
    });
  }

  function session() {
    return (authResolved || Promise.resolve(null)).then(function () {
      return (auth && auth.currentUser)
        ? { ok: true, user: window.ADMIN_USERNAME, csrf: '' }
        : fail('Signed out', 401);
    });
  }

  function logout() {
    return auth.signOut().then(function () {
      currentUser = null;
      return { ok: true };
    }).catch(function () {
      return { ok: true };
    });
  }

  /* ------------------------------------------------------------------ list */

  function mapRow(doc) {
    var r = doc.data() || {};
    return {
      id:            doc.id,
      applicationNo: String(r.applicationNo || ''),
      fullName:      String(r.fullName || ''),
      fatherName:    String(r.fatherName || ''),
      dob:           String(r.dob || ''),
      gender:        String(r.gender || ''),
      mobile:        String(r.mobile || ''),
      whatsapp:      String(r.whatsapp || ''),
      email:         String(r.email || ''),
      address:       String(r.address || ''),
      qualification: String(r.qualification || ''),
      course:        String(r.course || ''),
      knowledge:     String(r.knowledge || ''),
      message:       String(r.message || ''),
      hasPhoto:      !!r.photoPath,
      photoId:       String(r.photoPath || ''),
      status:        String(r.status || 'New'),
      note:          String(r.note || ''),
      submittedAt:   iso(r.createdAt),
      updatedAt:     iso(r.updatedAt)
    };
  }

  function list() {
    return db.collection('applications').orderBy('createdAt', 'desc').get()
      .then(function (snap) {
        var apps = [];
        snap.forEach(function (doc) { apps.push(mapRow(doc)); });
        return { ok: true, applications: apps };
      })
      .catch(function (e) {
        return fail(friendly(e), e && e.code === 'permission-denied' ? 401 : 0);
      });
  }

  /* ---------------------------------------------------------- status/delete */

  function setStatus(id, status, note) {
    if (!id) return Promise.resolve(fail('Unknown application.'));

    return db.collection('applications').doc(String(id)).update({
      status:    String(status || ''),
      note:      String(note || ''),
      updatedAt: serverTime()
    }).then(function () {
      return { ok: true };
    }).catch(function (e) {
      return fail(friendly(e), e && e.code === 'permission-denied' ? 401 : 0);
    });
  }

  function remove(id) {
    if (!id) return Promise.resolve(fail('Unknown application.'));

    var ref = db.collection('applications').doc(String(id));

    return ref.get().then(function (snap) {
      var path = snap.exists ? (snap.data() || {}).photoPath : null;

      return ref.delete().then(function () {
        if (storageEnabled && storage && path) {
          return storage.ref(path).delete().catch(function () {}); // orphan photo is non-fatal
        }
      });
    }).then(function () {
      return { ok: true };
    }).catch(function (e) {
      return fail(friendly(e), e && e.code === 'permission-denied' ? 401 : 0);
    });
  }

  /* ----------------------------------------------------------------- photo */

  function photo(fileId) {
    if (!storageEnabled || !storage) {
      return Promise.resolve(fail('Photo storage is disabled on this plan.'));
    }
    if (!fileId) return Promise.resolve(fail('The photo could not be read.'));

    return storage.ref(String(fileId)).getDownloadURL().then(function (url) {
      return { ok: true, dataUrl: url };
    }).catch(function () {
      return fail('The photo could not be read.');
    });
  }

  /* -------------------------------------------------------------- dispatch */

  function friendly(e) {
    if (e && e.code === 'permission-denied') {
      return 'You are not allowed to do that. Please sign in as the office.';
    }
    return (e && e.message) || 'Something went wrong. Please try again.';
  }

  App._backend = function (payload) {
    if (!ready) {
      return Promise.reject(new Error(
        'Firebase is not configured yet. Paste your project credentials into '
        + 'assets/js/firebase-config.js.'
      ));
    }

    payload = payload || {};

    switch (payload.action) {
      case 'ping':    return Promise.resolve({ ok: true });
      case 'submit':  return submit(payload.data);
      case 'login':   return login(payload.username, payload.password, payload.remember);
      case 'session': return session();
      case 'logout':  return logout();
      case 'list':    return list();
      case 'status':  return setStatus(payload.id, payload.status, payload.note);
      case 'delete':  return remove(payload.id);
      case 'photo':   return photo(payload.fileId);
      default:        return Promise.resolve(fail('Unknown action'));
    }
  };
})(window, document);
