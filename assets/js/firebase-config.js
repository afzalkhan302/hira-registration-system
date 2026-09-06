/**
 * Firebase project configuration.
 *
 * These values identify your Firebase project to the client SDK. The apiKey is
 * NOT a secret — Firebase is designed to ship it in the browser; what protects
 * your data is Firebase Authentication + the Firestore/Storage security rules
 * (see firestore.rules and storage.rules), not hiding this file.
 *
 * STATUS
 *   Project ID / authDomain are filled in for project "ahira-registration".
 *   THREE values still need to be pasted from the Firebase Console (they are
 *   unique to your Web app and cannot be guessed): apiKey, messagingSenderId,
 *   appId. Until they are pasted the pages load but show "not connected yet".
 *
 * WHERE TO GET THEM
 *   Firebase Console → Project settings (gear) → "Your apps" → the
 *   "HIRA Registration Web" app → "SDK setup and configuration" → Config.
 *   Copy apiKey, messagingSenderId and appId over the PASTE_FROM_CONSOLE_*
 *   markers below, and confirm storageBucket matches what the Console shows.
 *
 * ALSO
 *   Create the office account under Authentication → Users (Email/Password),
 *   then set ADMIN_EMAIL below to that e-mail and replace ADMIN_EMAIL_PLACEHOLDER
 *   in firestore.rules and storage.rules with the same e-mail.
 */
(function (window) {
  'use strict';

  window.FIREBASE_CONFIG = {
    apiKey:            'PASTE_FROM_CONSOLE_apiKey',
    authDomain:        'ahira-registration.firebaseapp.com',
    projectId:         'ahira-registration',
    // New Firebase projects use the *.firebasestorage.app bucket. If the Console
    // shows "ahira-registration.appspot.com" instead, use that value here.
    storageBucket:     'ahira-registration.firebasestorage.app',
    messagingSenderId: 'PASTE_FROM_CONSOLE_messagingSenderId',
    appId:             'PASTE_FROM_CONSOLE_appId'
  };

  // The staff dashboard keeps its "username" field. This maps that username to
  // the e-mail of the Firebase Auth account you create for the office.
  window.ADMIN_USERNAME = 'admin';
  window.ADMIN_EMAIL    = 'admin@example.com'; // <-- set to the admin account's e-mail

  // Firebase Storage needs the paid Blaze plan. On the free Spark plan it is
  // unavailable, so photo upload is turned off here: applications still save,
  // just without a passport photo. To re-enable later, upgrade the project to
  // Blaze, enable Storage in the Console, add the "storage" block back to
  // firebase.json, deploy storage.rules, then set this to true.
  window.STORAGE_ENABLED = false;

  // True only once every required field holds a real value (no placeholder and
  // no PASTE marker left). Keeping this strict means the app never claims to be
  // connected while it would in fact fail to authenticate.
  function filled(v) {
    return typeof v === 'string' && v.length > 0 &&
      v.indexOf('YOUR_') !== 0 && v.indexOf('PASTE') === -1;
  }

  var cfg = window.FIREBASE_CONFIG;
  window.FIREBASE_READY = filled(cfg.apiKey) && filled(cfg.projectId) && filled(cfg.appId);
})(window);
