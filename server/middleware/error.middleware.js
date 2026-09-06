'use strict';

// 404 for unknown routes.
function notFound(req, res) {
  res.status(404).json({ ok: false, error: 'Not found.' });
}

// Central error handler. Never leaks internals or secrets to the client.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Duplicate key (e.g. a re-used application number) — surface as a conflict.
  if (err && err.code === 11000) {
    return res.status(409).json({ ok: false, error: 'That record already exists.' });
  }

  console.error('[api-error]', err && err.message ? err.message : err);
  res.status(500).json({ ok: false, error: 'Something went wrong on the server.' });
}

module.exports = { notFound, errorHandler };
