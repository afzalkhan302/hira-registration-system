'use strict';

const mongoose = require('mongoose');

// A tiny atomic counter, used to hand out sequential application numbers per
// year. Unlike the serverless version, the server is authoritative here, so
// numbers are strictly sequential with no race.
const counterSchema = new mongoose.Schema({
  _id: { type: String },     // e.g. "application-2026"
  seq: { type: Number, default: 0 },
});

counterSchema.statics.next = async function (name) {
  const doc = await this.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
