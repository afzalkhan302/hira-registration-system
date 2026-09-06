'use strict';

const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

function sign(admin) {
  return jwt.sign(
    { sub: admin._id.toString(), username: admin.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const username = String((req.body && req.body.username) || '').trim();
    const password = String((req.body && req.body.password) || '');

    if (!username || !password) {
      return res.status(400).json({ ok: false, error: 'Enter your username and password.' });
    }

    const admin = await Admin.findOne({ username });

    // Same generic answer whether the username or the password was wrong.
    const ok = admin ? await admin.verifyPassword(password) : false;
    if (!ok) {
      return res.status(401).json({ ok: false, error: 'Those details were not accepted.' });
    }

    return res.json({ ok: true, token: sign(admin), user: admin.username });
  } catch (e) {
    return next(e);
  }
};

// GET /api/auth/me  (admin) — used to restore a session on page load
exports.me = async (req, res) => {
  return res.json({ ok: true, user: req.admin.username });
};
