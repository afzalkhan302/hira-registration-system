'use strict';

const Application = require('../models/Application');
const Counter = require('../models/Counter');
const { validateApplication } = require('../utils/validate');

const DUPLICATE_MINUTES = 10;

// Shape a document the way the dashboard expects (no heavy photo blob here).
function toListItem(a) {
  return {
    id: a._id.toString(),
    applicationNo: a.applicationNo,
    fullName: a.fullName,
    fatherName: a.fatherName,
    dob: a.dob,
    gender: a.gender,
    mobile: a.mobile,
    whatsapp: a.whatsapp || '',
    email: a.email || '',
    address: a.address,
    qualification: a.qualification,
    course: a.course,
    knowledge: a.knowledge || '',
    message: a.message || '',
    hasPhoto: !!a.hasPhoto,
    status: a.status,
    note: a.note || '',
    submittedAt: a.createdAt ? a.createdAt.toISOString() : '',
    updatedAt: a.updatedAt ? a.updatedAt.toISOString() : '',
  };
}

async function nextApplicationNo() {
  const year = new Date().getFullYear();
  const seq = await Counter.next('application-' + year);
  return 'HIRA-' + year + '-' + String(seq).padStart(4, '0');
}

// POST /api/applications  (public)
exports.create = async (req, res, next) => {
  try {
    const { clean, errors } = validateApplication(req.body || {});

    if (Object.keys(errors).length) {
      return res.status(400).json({ ok: false, error: 'Please check the highlighted fields.', fields: errors });
    }

    // A double-click / back-button re-submit must not file the same person twice.
    const since = new Date(Date.now() - DUPLICATE_MINUTES * 60 * 1000);
    const existing = await Application.findOne({
      mobile: clean.mobile,
      course: clean.course,
      createdAt: { $gte: since },
    }).sort({ createdAt: -1 });

    if (existing) {
      return res.json({ ok: true, applicationNo: existing.applicationNo, duplicate: true });
    }

    clean.sourceIp = (req.ip || '').slice(0, 45);
    clean.hasPhoto = !!clean.photo;

    // Retry on the rare unique-index clash for the generated number.
    let saved = null;
    for (let attempt = 0; attempt < 5 && !saved; attempt++) {
      try {
        clean.applicationNo = await nextApplicationNo();
        saved = await Application.create(clean);
      } catch (e) {
        if (e && e.code === 11000) continue;
        throw e;
      }
    }

    if (!saved) throw new Error('Could not issue an application number.');

    return res.json({ ok: true, applicationNo: saved.applicationNo });
  } catch (e) {
    return next(e);
  }
};

// GET /api/applications  (admin)
exports.list = async (req, res, next) => {
  try {
    const rows = await Application.find({}, { photo: 0 }).sort({ createdAt: -1 });
    return res.json({
      ok: true,
      applications: rows.map(toListItem),
      courses: Application.COURSES,
      statuses: Application.STATUSES,
    });
  } catch (e) {
    return next(e);
  }
};

// GET /api/applications/:id  (admin) — full record incl. photo
exports.getOne = async (req, res, next) => {
  try {
    const a = await Application.findById(req.params.id);
    if (!a) return res.status(404).json({ ok: false, error: 'Unknown application.' });
    return res.json({ ok: true, application: Object.assign(toListItem(a), { photo: a.photo || '' }) });
  } catch (e) {
    return next(e);
  }
};

// PATCH /api/applications/:id  (admin) — status + note
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body || {};
    if (!Application.STATUSES.includes(status)) {
      return res.status(400).json({ ok: false, error: 'Unknown status.' });
    }
    const a = await Application.findByIdAndUpdate(
      req.params.id,
      { status, note: String(note || '').slice(0, 500) },
      { new: true }
    );
    if (!a) return res.status(404).json({ ok: false, error: 'Unknown application.' });
    return res.json({ ok: true });
  } catch (e) {
    return next(e);
  }
};

// DELETE /api/applications/:id  (admin)
exports.remove = async (req, res, next) => {
  try {
    const a = await Application.findByIdAndDelete(req.params.id);
    if (!a) return res.status(404).json({ ok: false, error: 'Unknown application.' });
    return res.json({ ok: true });
  } catch (e) {
    return next(e);
  }
};
