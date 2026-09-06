'use strict';

const mongoose = require('mongoose');

const COURSES  = ['DIT', 'Web Development', 'Pharmacy'];
const STATUSES = ['New', 'Contacted', 'Approved', 'Rejected'];
const GENDERS  = ['Male', 'Female'];

const applicationSchema = new mongoose.Schema(
  {
    applicationNo: { type: String, required: true, unique: true, index: true },

    fullName:      { type: String, required: true, trim: true, maxlength: 150 },
    fatherName:    { type: String, required: true, trim: true, maxlength: 150 },
    dob:           { type: String, required: true, maxlength: 10 }, // YYYY-MM-DD
    gender:        { type: String, required: true, enum: GENDERS },
    mobile:        { type: String, required: true, trim: true, maxlength: 20, index: true },
    whatsapp:      { type: String, default: '', trim: true, maxlength: 20 },
    email:         { type: String, default: '', trim: true, maxlength: 150 },
    address:       { type: String, required: true, trim: true, maxlength: 300 },
    qualification: { type: String, required: true, trim: true, maxlength: 120 },
    course:        { type: String, required: true, enum: COURSES, index: true },
    knowledge:     { type: String, default: '', maxlength: 60 },
    message:       { type: String, default: '', maxlength: 800 },

    // Optional passport photo, stored as a resized base64 data URL. No paid
    // object storage is required. Kept out of list responses to stay light, so
    // a separate boolean records its presence for the list view.
    photo:         { type: String, default: '' },
    hasPhoto:      { type: Boolean, default: false },

    status:        { type: String, enum: STATUSES, default: 'New', index: true },
    note:          { type: String, default: '', maxlength: 500 },
    sourceIp:      { type: String, default: '' },
  },
  { timestamps: true } // createdAt / updatedAt, set by the server
);

applicationSchema.statics.COURSES  = COURSES;
applicationSchema.statics.STATUSES = STATUSES;
applicationSchema.statics.GENDERS  = GENDERS;

module.exports = mongoose.model('Application', applicationSchema);
module.exports.COURSES = COURSES;
module.exports.STATUSES = STATUSES;
module.exports.GENDERS = GENDERS;
