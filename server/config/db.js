'use strict';

const mongoose = require('mongoose');

/**
 * Connect to MongoDB. The URI comes from the environment so no connection
 * string is ever committed. Returns the mongoose connection.
 */
async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set. Copy server/.env.example to server/.env and fill it in.');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);

  return mongoose.connection;
}

module.exports = { connectDB };
