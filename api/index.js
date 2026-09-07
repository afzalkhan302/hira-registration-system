'use strict';

// Vercel serverless entry point. Vercel does not run `node server.js` as a
// long-lived process; instead each request invokes this function. We reuse the
// exact same Express app (which does NOT call app.listen when imported) and
// ensure a single cached MongoDB connection is reused across warm invocations.

require('dotenv').config();

const mongoose = require('mongoose');
const app = require('../server/server.js');
const { connectDB } = require('../server/config/db');

// Cache the connect promise so concurrent/warm invocations share one connection
// instead of opening a new one each time (which would exhaust Atlas).
let connPromise = null;

module.exports = async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    connPromise = connPromise || connectDB(); // reads MONGODB_URI from env
    await connPromise;
  }
  return app(req, res);
};
