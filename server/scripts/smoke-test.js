'use strict';

/**
 * End-to-end API test against an in-memory MongoDB. No external database or
 * network is needed. Run: cd server && npm test
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGINS = '';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Admin = require('../models/Admin');
const app = require('../server');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  console.log((cond ? '  [PASS] ' : '  [FAIL] ') + name + (extra ? ' -> ' + extra : ''));
  cond ? pass++ : fail++;
}

const validApp = (over) => Object.assign({
  fullName: 'Test Applicant', fatherName: 'Test Father', dob: '2000-01-01', gender: 'Male',
  mobile: '03001234567', whatsapp: '', email: '', address: 'Somewhere in Sakhakot',
  qualification: 'Matric', course: 'DIT', knowledge: 'None', message: '',
}, over || {});

(async () => {
  const mem = await MongoMemoryServer.create();
  await connectDB(mem.getUri());
  await Admin.create({ username: 'admin', passwordHash: await Admin.hashPassword('test-password-123') });

  const server = app.listen(0);
  const base = 'http://127.0.0.1:' + server.address().port;
  const J = { 'Content-Type': 'application/json' };
  const post = (p, b, h) => fetch(base + p, { method: 'POST', headers: Object.assign({}, J, h), body: JSON.stringify(b) });
  const get = (p, h) => fetch(base + p, { headers: h || {} });

  try {
    let r = await get('/api/health'); let d = await r.json();
    check('health', r.status === 200 && d.ok === true);

    r = await post('/api/applications', validApp()); d = await r.json();
    check('public create application', r.status === 200 && d.ok && /^HIRA-\d{4}-\d{4}$/.test(d.applicationNo), d.applicationNo);

    r = await post('/api/applications', validApp({ course: 'Hacking' })); d = await r.json();
    check('reject invalid course (400 + fields)', r.status === 400 && d.fields && d.fields.course);

    r = await post('/api/applications', validApp({ mobile: '123' })); d = await r.json();
    check('reject invalid mobile', r.status === 400 && d.fields && d.fields.mobile);

    r = await post('/api/auth/login', { username: 'admin', password: 'wrong' }); d = await r.json();
    check('login wrong password -> 401', r.status === 401 && d.ok === false);

    r = await post('/api/auth/login', { username: 'admin', password: 'test-password-123' }); d = await r.json();
    check('login correct -> token', r.status === 200 && d.ok && !!d.token, 'user=' + d.user);
    const auth = { Authorization: 'Bearer ' + d.token };

    r = await get('/api/applications');
    check('list without token -> 401', r.status === 401);

    r = await get('/api/auth/me', auth); d = await r.json();
    check('me with token', r.status === 200 && d.user === 'admin');

    r = await get('/api/applications', auth); d = await r.json();
    const item = d.applications && d.applications[0];
    check('list with token returns rows', r.status === 200 && d.applications.length === 1, 'count=' + d.applications.length);
    check('list omits heavy photo blob', item && item.photo === undefined);

    const id = item.id;
    r = await fetch(base + '/api/applications/' + id, { method: 'PATCH', headers: Object.assign({}, J, auth), body: JSON.stringify({ status: 'Approved', note: 'called' }) });
    d = await r.json();
    check('update status', r.status === 200 && d.ok);

    r = await get('/api/applications', auth); d = await r.json();
    check('status persisted', d.applications[0].status === 'Approved', d.applications[0].status);

    r = await fetch(base + '/api/applications/' + id, { method: 'DELETE', headers: auth });
    d = await r.json();
    check('delete', r.status === 200 && d.ok);

    r = await get('/api/applications', auth); d = await r.json();
    check('deleted row gone', d.applications.length === 0);

    // photo persistence (base64, optional)
    const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCA',
      pr = await post('/api/applications', validApp({ mobile: '03007654321', photo: tinyPng }));
    const pj = await pr.json();
    const lr = await get('/api/applications', auth); const lj = await lr.json();
    const withPhoto = lj.applications.find((a) => a.applicationNo === pj.applicationNo);
    check('optional photo stored (hasPhoto true)', !!(withPhoto && withPhoto.hasPhoto));
    const one = await (await get('/api/applications/' + withPhoto.id, auth)).json();
    check('photo retrievable on detail', one.application.photo.startsWith('data:image/'));
  } catch (e) {
    check('unexpected error', false, e.message);
  } finally {
    server.close();
    await mongoose.connection.close();
    await mem.stop();
  }

  console.log('\n=========================================');
  console.log('RESULT: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
})();
