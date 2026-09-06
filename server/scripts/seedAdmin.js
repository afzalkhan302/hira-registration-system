'use strict';

/**
 * Create or update the office (admin) account from environment variables.
 *
 *   cd server && npm run seed
 *
 * Reads ADMIN_USERNAME and ADMIN_PASSWORD from .env, stores only the bcrypt
 * hash, and never prints the password. Safe to run again to change it.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Admin = require('../models/Admin');

(async () => {
  const username = String(process.env.ADMIN_USERNAME || '').trim();
  const password = String(process.env.ADMIN_PASSWORD || '');

  if (!username || password.length < 8) {
    console.error('Set ADMIN_USERNAME and an ADMIN_PASSWORD (>= 8 chars) in server/.env first.');
    process.exit(1);
  }

  try {
    await connectDB();
    const passwordHash = await Admin.hashPassword(password);

    const existing = await Admin.findOne({ username });
    if (existing) {
      existing.passwordHash = passwordHash;
      await existing.save();
      console.log('Admin "' + username + '" password updated.');
    } else {
      await Admin.create({ username, passwordHash });
      console.log('Admin "' + username + '" created.');
    }

    console.log('The password itself is not stored — only its bcrypt hash.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (e) {
    console.error('Seed failed:', e.message);
    process.exit(1);
  }
})();
