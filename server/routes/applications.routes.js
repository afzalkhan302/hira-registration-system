'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/applications.controller');
const { requireAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// Light throttle on public submissions to blunt spam/abuse.
const submitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many submissions. Please try again later.' },
});

// Public
router.post('/', submitLimiter, ctrl.create);

// Admin only
router.get('/', requireAdmin, ctrl.list);
router.get('/:id', requireAdmin, ctrl.getOne);
router.patch('/:id', requireAdmin, ctrl.updateStatus);
router.delete('/:id', requireAdmin, ctrl.remove);

module.exports = router;
