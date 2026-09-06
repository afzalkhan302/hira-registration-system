// Site settings (school name, courses, logo). No secrets here.
export const CONFIG = {
  LOGO: '/logo.webp',
  SCHOOL_NAME: 'HIRA Model School',
  ACADEMY_NAME: 'Sakhakot Academy',
  TAGLINE: 'Short courses in technology and pharmacy',
  LOCATION: 'Khanano Chowk, Sakhakot — Malakand',
  PHONE: '',

  COURSES: [
    { id: 'DIT', name: 'DIT', full: 'Diploma in Information Technology',
      blurb: 'Computer fundamentals, MS Office, typing, internet and practical office IT skills.', icon: 'monitor' },
    { id: 'Web Development', name: 'Web Development', full: 'Front-end web development',
      blurb: 'HTML, CSS and JavaScript — build and publish real, responsive websites.', icon: 'code' },
    { id: 'Pharmacy', name: 'Pharmacy', full: 'Dispenser / pharmacy assistant course',
      blurb: 'Medicines, dosage, dispensing practice and pharmacy record keeping.', icon: 'flask' },
  ],
};

export const STATUSES = ['New', 'Contacted', 'Approved', 'Rejected'];
