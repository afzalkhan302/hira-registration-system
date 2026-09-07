'use strict';

// Vercel serverless entry point. Vercel does not run `node server.js` as a
// long-lived process; instead each request invokes this function. We reuse the
// exact same Express app (which does NOT call app.listen when imported).
//
// IMPORTANT: we must NOT `await` the MongoDB connection before handing the
// request to Express. On a cold start that await lets the incoming POST body
// stream end before express.json() attaches its listeners, so body parsing
// throws ("stream is not readable") and every POST returns 500. Instead we
// start the connection in the background and let Mongoose buffer model calls
// until it is ready, while Express parses the request body synchronously as
// usual.
//
// Note: no dotenv here — on Vercel env vars come from the project settings, and
// server.js already loads dotenv for local use. This keeps the wrapper's only
// requires relative paths into server/, which is what Vercel bundles.

const app = require('../server/server.js');
const { connectDB } = require('../server/config/db');

// Start (and cache) the connection once per warm instance. Attach a catch so a
// failed connect never becomes an unhandled rejection, and reset the cache so a
// later invocation can retry instead of reusing a rejected promise. The actual
// error still surfaces to the route handler through Mongoose's buffered query.
let connPromise = null;
function ensureDb() {
  if (!connPromise) {
    connPromise = connectDB(); // reads MONGODB_URI from env
    connPromise.catch(() => { connPromise = null; });
  }
  return connPromise;
}

module.exports = (req, res) => {
  ensureDb();           // connect in the background; Mongoose buffers queries
  return app(req, res); // Express reads the body immediately — no lost stream
};
