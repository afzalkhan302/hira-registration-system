'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { connectDB } = require('./config/db');
const applicationsRoutes = require('./routes/applications.routes');
const authRoutes = require('./routes/auth.routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();

// Behind a single proxy on most free hosts (needed for correct req.ip + rate limit).
app.set('trust proxy', 1);

// CORS — only the configured frontend origins may call the API with credentials.
const origins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origins.length === 0 || origins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
}));

// Photos travel as base64, so allow a larger JSON body.
app.use(express.json({ limit: '6mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'hira-registration', version: 3 });
});

app.use('/api/applications', applicationsRoutes);
app.use('/api/auth', authRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Only start listening when run directly (tests import the app instead).
if (require.main === module) {
  connectDB()
    .then(() => {
      console.log('MongoDB connected.');
      app.listen(PORT, '0.0.0.0', () => console.log('API listening on port ' + PORT));
    })
    .catch((err) => {
      console.error('Failed to start:', err.message);
      process.exit(1);
    });
}

module.exports = app;
