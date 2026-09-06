import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CONFIG, STATUSES } from '../config.js';
import { Icon } from '../lib/icons.jsx';
import { api, tokenStore } from '../lib/api.js';
import { initials, formatDate, toast } from '../lib/helpers.js';

export default function Admin() {
  const [token, setToken] = useState(tokenStore.get());
  const [signedIn, setSignedIn] = useState(false);
  const [user, setUser] = useState('');
  const [apps, setApps] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);

  // sign-in form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [gateErr, setGateErr] = useState('');
  const [busy, setBusy] = useState(false);

  // filters
  const [q, setQ] = useState('');
  const [fCourse, setFCourse] = useState('');
  const [fStatus, setFStatus] = useState('');

  // Restore session on load.
  useEffect(() => {
    const t = tokenStore.get();
    if (!t) return;
    api.me(t).then(({ data }) => {
      if (data && data.ok) { setToken(t); setSignedIn(true); setUser(data.user); load(t, true); }
      else { tokenStore.clear(); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(tok, quiet) {
    const t = tok || token;
    setLoading(true);
    const { status, data } = await api.list(t);
    setLoading(false);
    if (!data || !data.ok) {
      if (status === 401) { doSignOut(); toast('Your session has ended. Please sign in again.', 'bad'); return; }
      toast((data && data.error) || 'The applications could not be loaded.', 'bad');
      return;
    }
    setApps(data.applications || []);
    if (!quiet) toast('Loaded ' + (data.applications || []).length + ' application(s).', 'ok');
  }

  async function onLogin(e) {
    e.preventDefault();
    setGateErr('');
    if (!username.trim()) { setGateErr('Enter your username.'); return; }
    if (!password) { setGateErr('Enter your password.'); return; }
    setBusy(true);
    const { data } = await api.login(username.trim(), password);
    setBusy(false);
    if (!data || !data.ok) { setGateErr((data && data.error) || 'Sign in failed.'); return; }
    tokenStore.set(data.token);
    setToken(data.token); setUser(data.user); setSignedIn(true); setPassword('');
    load(data.token);
  }

  function doSignOut() {
    tokenStore.clear();
    setToken(''); setSignedIn(false); setUser(''); setApps([]); setCurrent(null);
    setPassword('');
  }

  // Stats over ALL applications, not the filtered view.
  const stats = useMemo(() => {
    const tiles = [{ label: 'Total applications', value: apps.length, icon: 'inbox' }];
    CONFIG.COURSES.forEach((c) =>
      tiles.push({ label: c.name, value: apps.filter((a) => a.course === c.id).length, icon: c.icon }));
    return tiles;
  }, [apps]);

  const view = useMemo(() => {
    const query = q.trim().toLowerCase();
    return apps.filter((a) => {
      if (fCourse && a.course !== fCourse) return false;
      if (fStatus && a.status !== fStatus) return false;
      if (query) {
        const hay = (a.fullName + ' ' + a.fatherName + ' ' + a.mobile + ' ' +
          a.whatsapp + ' ' + a.email + ' ' + a.applicationNo).toLowerCase();
        if (hay.indexOf(query) === -1) return false;
      }
      return true;
    });
  }, [apps, q, fCourse, fStatus]);

  function resetFilters() { setQ(''); setFCourse(''); setFStatus(''); }

  async function openDetail(a) {
    setCurrent({ ...a, note: a.note || '', photo: null });
    if (a.hasPhoto) {
      const { data } = await api.getOne(a.id, token);
      if (data && data.ok) setCurrent((c) => (c && c.id === a.id ? { ...c, photo: data.application.photo } : c));
    }
    document.body.style.overflow = 'hidden';
  }
  function closeDetail() { setCurrent(null); document.body.style.overflow = ''; }

  async function saveStatus(status) {
    if (!current) return;
    const note = (current.note || '').trim();
    const { data } = await api.setStatus(current.id, status, note, token);
    if (!data || !data.ok) { toast((data && data.error) || 'The status could not be saved.', 'bad'); return; }
    setApps((list) => list.map((a) => (a.id === current.id ? { ...a, status, note, updatedAt: new Date().toISOString() } : a)));
    setCurrent((c) => ({ ...c, status, updatedAt: new Date().toISOString() }));
    toast('Marked as ' + status + '.', 'ok');
  }

  async function removeCurrent() {
    if (!current) return;
    if (!window.confirm('Delete ' + current.applicationNo + ' (' + current.fullName + ')?\n\nThe row is removed for good. Reject it instead if you may need it later.')) return;
    const { data } = await api.remove(current.id, token);
    if (!data || !data.ok) { toast((data && data.error) || 'The application could not be deleted.', 'bad'); return; }
    const no = current.applicationNo;
    closeDetail();
    toast('Deleted ' + no + '.', 'ok');
    load(token, true);
  }

  const badge = (s) => <span className={'badge badge--' + String(s).toLowerCase()}>{s}</span>;

  return (
    <>
      <header className="site-head">
        <div className="wrap wrap--wide site-head__in">
          <Link className="brand" to="/">
            <span className="brand__mark brand__mark--logo"><img src={CONFIG.LOGO} alt="" /></span>
            <span className="brand__text">
              <span className="brand__name">Staff dashboard</span>
              <span className="brand__sub">Course applications</span>
            </span>
          </Link>
          {signedIn && (
            <div className="site-head__end">
              <span className="small muted" style={{ marginInlineEnd: 4 }}>{user}</span>
              <button className="icon-btn" title="Refresh" aria-label="Refresh" onClick={() => load()}><Icon name="refresh" /></button>
              <button className="icon-btn" title="Sign out" aria-label="Sign out" onClick={doSignOut}><Icon name="logout" /></button>
            </div>
          )}
        </div>
      </header>

      {!signedIn ? (
        <main className="wrap gate">
          <form className="card" onSubmit={onLogin}>
            <div className="card__body">
              <div className="center" style={{ marginBottom: 18 }}>
                <div className="done__mark" style={{ background: 'var(--brand-soft)', color: 'var(--brand-dark)', width: 54, height: 54, marginBottom: 12 }}>
                  <Icon name="lock" />
                </div>
                <h1 style={{ fontSize: '1.2rem' }}>Staff sign in</h1>
                <p className="small muted" style={{ marginTop: 6 }}>Sign in to see the course applications.</p>
              </div>
              <div className="field" style={{ marginBottom: 14 }}>
                <label htmlFor="username">Username</label>
                <input className="control" id="username" type="text" autoComplete="username" autoCapitalize="none"
                       spellCheck="false" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className={'field' + (gateErr ? ' invalid' : '')}>
                <label htmlFor="password">Password</label>
                <input className="control" id="password" type="password" autoComplete="current-password"
                       value={password} onChange={(e) => setPassword(e.target.value)} />
                {gateErr && <span className="err" style={{ display: 'block' }}>{gateErr}</span>}
              </div>
              <label className="small muted" style={{ display: 'flex', gap: 7, alignItems: 'center', margin: '10px 0 4px' }}>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Keep me signed in on this device
              </label>
              <button type="submit" className={'btn btn--primary btn--block' + (busy ? ' is-busy' : '')} style={{ marginTop: 12 }} disabled={busy}>
                <span className="spinner" /><span className="btn__label">Log in</span>
              </button>
              <p className="tiny muted center" style={{ marginTop: 14 }}>Checked on the server. The password is never stored in this website's code.</p>
            </div>
          </form>
        </main>
      ) : (
        <main className="wrap wrap--wide" style={{ paddingTop: 22 }}>
          <section className="stats" aria-label="Application counts">
            {stats.map((t, i) => (
              <article className="stat" key={i}>
                <div className="stat__top">
                  <span className="stat__label">{t.label}</span>
                  <span className="stat__ico"><Icon name={t.icon} /></span>
                </div>
                <div className="stat__value">{t.value}</div>
              </article>
            ))}
          </section>

          <section className="toolbar">
            <div className="field">
              <label htmlFor="q">Search</label>
              <div className="search">
                <Icon name="search" className="icon--sm" />
                <input className="control" id="q" type="search" placeholder="Name, phone or application number"
                       value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="fCourse">Course</label>
              <select className="control" id="fCourse" value={fCourse} onChange={(e) => setFCourse(e.target.value)}>
                <option value="">All courses</option>
                {CONFIG.COURSES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="fStatus">Status</label>
              <select className="control" id="fStatus" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                <option value="">All statuses</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button type="button" className="btn btn--ghost" onClick={resetFilters}>Reset</button>
          </section>

          <p className="small muted" style={{ marginBottom: 10 }}>
            {view.length === apps.length ? 'Showing all ' + apps.length + ' application(s)' : 'Showing ' + view.length + ' of ' + apps.length + ' application(s)'}
          </p>

          <section className="rows" aria-live="polite">
            {view.length === 0 ? (
              <div className="empty">
                <Icon name={apps.length ? 'search' : 'inbox'} />
                <p><strong>{apps.length ? 'Nothing matched your search' : 'No applications yet'}</strong></p>
                <p className="small">{apps.length ? 'Try a different word, or reset the filters.' : 'Applications appear here the moment somebody submits the public form.'}</p>
              </div>
            ) : view.map((a) => (
              <button type="button" className="row" key={a.id} onClick={() => openDetail(a)}>
                <span className="row__avatar">{initials(a.fullName)}</span>
                <span className="row__id">
                  <span className="row__name">{a.fullName}</span><br />
                  <span className="row__meta mono">{a.applicationNo}</span>
                </span>
                <span className="row__course"><span className="row__label">Course</span><span>{a.course}</span></span>
                <span className="row__mobile"><span className="row__label">Mobile</span><span className="mono">{a.mobile}</span></span>
                <span className="row__state">{badge(a.status)}<span className="tiny muted">{formatDate(a.submittedAt, true)}</span></span>
              </button>
            ))}
          </section>
        </main>
      )}

      {current && (
        <div className="modal open" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) closeDetail(); }}>
          <div className="modal__box">
            <div className="modal__head">
              <h2>{current.applicationNo}</h2>
              <button type="button" className="icon-btn" aria-label="Close" onClick={closeDetail}><Icon name="x" /></button>
            </div>
            <div className="modal__body">
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
                <span className="avatar-lg">
                  {current.hasPhoto
                    ? (current.photo ? <img src={current.photo} alt="Student photo" /> : <span className="tiny muted">Loading…</span>)
                    : <Icon name="user" className="icon--lg" />}
                </span>
                <span>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{current.fullName}</div>
                  <div className="small muted">{current.course}</div>
                  <div style={{ marginTop: 6 }}>{badge(current.status)}</div>
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <a className="btn btn--ghost btn--sm" href={'tel:' + current.mobile}><Icon name="phone" className="icon--sm" /> Call</a>
                {current.whatsapp && <a className="btn btn--ghost btn--sm" target="_blank" rel="noopener" href={'https://wa.me/92' + current.whatsapp.replace(/^0/, '')}><Icon name="send" className="icon--sm" /> WhatsApp</a>}
                {current.email && <a className="btn btn--ghost btn--sm" href={'mailto:' + current.email}><Icon name="mail" className="icon--sm" /> E-mail</a>}
              </div>

              <div className="field" style={{ marginBottom: 14 }}>
                <label>Mark this application as</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {STATUSES.map((s) => (
                    <button type="button" key={s} className={'btn btn--sm ' + (current.status === s ? 'btn--primary' : 'btn--ghost')} onClick={() => saveStatus(s)}>{s}</button>
                  ))}
                </div>
              </div>

              <div className="field" style={{ marginBottom: 18 }}>
                <label htmlFor="mNote">Office remarks</label>
                <textarea className="control" id="mNote" rows={2} maxLength={500}
                          placeholder="Notes for the office. The applicant never sees these."
                          value={current.note} onChange={(e) => setCurrent((c) => ({ ...c, note: e.target.value }))} />
              </div>

              <dl className="detail">
                {[
                  ['Full name', current.fullName], ['Father name', current.fatherName],
                  ['Date of birth', formatDate(current.dob)], ['Gender', current.gender],
                  ['Mobile', current.mobile], ['WhatsApp', current.whatsapp], ['E-mail', current.email],
                  ['Address', current.address], ['Qualification', current.qualification], ['Course', current.course],
                  ['Computer knowledge', current.knowledge], ['Message', current.message],
                  ['Submitted', formatDate(current.submittedAt, true)], ['Last updated', formatDate(current.updatedAt, true)],
                ].map(([k, v], i) => (
                  <div className="detail__row" key={i}><dt>{k}</dt><dd>{v ? v : <span className="muted">—</span>}</dd></div>
                ))}
              </dl>
            </div>
            <div className="modal__foot">
              <button type="button" className="btn btn--danger btn--sm" onClick={removeCurrent}><Icon name="trash" className="icon--sm" /> Delete</button>
              <span style={{ flex: 1 }} />
              <button type="button" className="btn btn--ghost btn--sm" onClick={closeDetail}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
