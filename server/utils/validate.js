'use strict';

const { COURSES, GENDERS } = require('../models/Application');

const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const digits = (v) => String(v == null ? '' : v).replace(/\D+/g, '');
const isMobile = (d) => /^03\d{9}$/.test(d);

/**
 * Validate + clean an incoming public application. Mirrors the client checks in
 * the React form; this is the copy that actually decides what reaches the DB.
 * Returns { clean, errors } where errors is a map of field -> message.
 */
function validateApplication(data = {}) {
  const errors = {};
  const clean = {};

  clean.fullName = str(data.fullName, 150);
  if (clean.fullName.length < 3) errors.fullName = 'Please enter the full name.';

  clean.fatherName = str(data.fatherName, 150);
  if (clean.fatherName.length < 3) errors.fatherName = "Please enter the father's name.";

  clean.dob = str(data.dob, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean.dob)) {
    errors.dob = 'Please check the date of birth.';
  } else {
    const age = (Date.now() - new Date(clean.dob + 'T00:00:00').getTime()) / (365.25 * 864e5);
    if (!(age > 8 && age < 90)) errors.dob = 'Please check the date of birth.';
  }

  clean.gender = str(data.gender, 10);
  if (!GENDERS.includes(clean.gender)) errors.gender = 'Please choose one.';

  clean.mobile = digits(data.mobile);
  if (!isMobile(clean.mobile)) errors.mobile = 'Enter a valid mobile number, e.g. 03001234567.';

  clean.whatsapp = digits(data.whatsapp);
  if (clean.whatsapp && !isMobile(clean.whatsapp)) errors.whatsapp = 'Enter a valid WhatsApp number.';

  clean.email = str(data.email, 150);
  if (clean.email && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(clean.email)) {
    errors.email = 'Enter a valid e-mail address.';
  }

  clean.address = str(data.address, 300);
  if (clean.address.length < 5) errors.address = 'Please enter the address.';

  clean.qualification = str(data.qualification, 120);
  if (!clean.qualification) errors.qualification = 'Please enter the last qualification.';

  clean.course = str(data.course, 40);
  if (!COURSES.includes(clean.course)) errors.course = 'Please choose one of the courses on offer.';

  clean.knowledge = str(data.knowledge, 60);
  clean.message = str(data.message, 800);

  // Optional photo: accept only a reasonably sized image data URL, else drop it.
  clean.photo = '';
  if (typeof data.photo === 'string' && /^data:image\/(png|jpe?g|webp);base64,/i.test(data.photo)) {
    if (data.photo.length <= 3 * 1024 * 1024) clean.photo = data.photo; // ~2.2MB decoded
  }

  return { clean, errors };
}

module.exports = { validateApplication };
