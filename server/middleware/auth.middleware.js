'use strict';

const jwt = require('jsonwebtoken');

/**
 * Require a valid admin JWT (Authorization: Bearer <token>). On success the
 * decoded payload is attached as req.admin.
 */
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return res.status(401).json({ ok: false, error: 'Sign in required.' });
  }

  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'Your session has ended. Please sign in again.' });
  }
}

module.exports = { requireAdmin };
