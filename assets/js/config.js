/**
 * Site settings (school name, courses, logo, contact).
 *
 * The backend is Firebase now — its credentials live in firebase-config.js, not
 * here. Nothing secret belongs in this file: it is downloaded by every visitor.
 */
window.APP_CONFIG = {
  // Leave empty to fall back to the initials mark.
  LOGO: 'assets/img/logo.webp',

  SCHOOL_NAME: 'HIRA Model School',
  ACADEMY_NAME: 'Sakhakot Academy',
  TAGLINE: 'Short courses in technology and pharmacy',
  LOCATION: 'Khanano Chowk, Sakhakot — Malakand',
  PHONE: '',

  COURSES: [
    {
      id: 'DIT',
      name: 'DIT',
      full: 'Diploma in Information Technology',
      blurb: 'Computer fundamentals, MS Office, typing, internet and practical office IT skills.',
      icon: 'monitor'
    },
    {
      id: 'Web Development',
      name: 'Web Development',
      full: 'Front-end web development',
      blurb: 'HTML, CSS and JavaScript — build and publish real, responsive websites.',
      icon: 'code'
    },
    {
      id: 'Pharmacy',
      name: 'Pharmacy',
      full: 'Dispenser / pharmacy assistant course',
      blurb: 'Medicines, dosage, dispensing practice and pharmacy record keeping.',
      icon: 'flask'
    }
  ]
};
