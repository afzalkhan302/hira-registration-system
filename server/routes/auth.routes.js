'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/auth.controller');
const { requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// Throttle login attempts per IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many attempts. Try again in a few minutes.' },
});

router.post('/login', loginLimiter, ctrl.login);
router.get('/me', requireAdmin, ctrl.me);

module.exports = router;
