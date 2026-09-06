'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    username:     { type: String, required: true, unique: true, trim: true },
    // Only the bcrypt hash is ever stored — never the plain password.
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

adminSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

adminSchema.statics.hashPassword = function (password) {
  return bcrypt.hash(password, 12);
};

module.exports = mongoose.model('Admin', adminSchema);
