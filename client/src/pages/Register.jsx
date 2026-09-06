import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CONFIG } from '../config.js';
import { Icon } from '../lib/icons.jsx';
import { api } from '../lib/api.js';
import { resizeImage, toast, digits, isMobileNo } from '../lib/helpers.js';

const BLANK = {
  fullName: '', fatherName: '', dob: '', gender: '', mobile: '', whatsapp: '',
  email: '', address: '', qualification: '', course: '', knowledge: 'None', message: '',
};

export default function Register() {
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [sameWhatsapp, setSameWhatsapp] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoHint, setPhotoHint] = useState('JPG or PNG. It is resized on your phone before sending.');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(null); // { applicationNo, fullName, course }
  const honeypot = useRef('');
  const photoInput = useRef(null);

  const set = (k) => (e) => {
    const value = e && e.target ? e.target.value : e;
    setForm((f) => ({ ...f, [k]: value }));
    if (errors[k]) setErrors((x) => { const n = { ...x }; delete n[k]; return n; });
    if (k === 'mobile' && sameWhatsapp) setForm((f) => ({ ...f, whatsapp: value }));
  };

  function pickCourse(id) {
    setForm((f) => ({ ...f, course: id }));
    setErrors((x) => { const n = { ...x }; delete n.course; return n; });
  }

  function onSameWhatsapp(e) {
    const on = e.target.checked;
    setSameWhatsapp(on);
    if (on) setForm((f) => ({ ...f, whatsapp: f.mobile }));
  }

  function onPhoto(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setErrors((x) => ({ ...x, photo: 'That file is not an image.' }));
      e.target.value = '';
      return;
    }
    resizeImage(file, 700).then((dataUrl) => {
      setPhoto(dataUrl);
      setPhotoHint('Ready — about ' + Math.round((dataUrl.length * 0.75) / 1024) + ' KB.');
      setErrors((x) => { const n = { ...x }; delete n.photo; return n; });
    }).catch(() => {
      setErrors((x) => ({ ...x, photo: 'That image could not be read. Try another one.' }));
    });
  }

  function clearPhoto() {
    setPhoto(null);
    if (photoInput.current) photoInput.current.value = '';
    setPhotoHint('JPG or PNG. It is resized on your phone before sending.');
  }

  function validate() {
    const d = { ...form, mobile: digits(form.mobile), whatsapp: digits(form.whatsapp) };
    const e = {};
    if (d.fullName.trim().length < 3) e.fullName = 'Please enter the full name.';
    if (d.fatherName.trim().length < 3) e.fatherName = 'Please enter the father’s name.';
    if (!d.dob) e.dob = 'Please choose the date of birth.';
    else {
      const age = (Date.now() - new Date(d.dob + 'T00:00:00').getTime()) / (365.25 * 864e5);
      if (!(age > 8 && age < 90)) e.dob = 'Please check the date of birth.';
    }
    if (!d.gender) e.gender = 'Please choose one.';
    if (!isMobileNo(d.mobile)) e.mobile = 'Enter a valid mobile number, e.g. 03001234567.';
    if (d.whatsapp && !isMobileNo(d.whatsapp)) e.whatsapp = 'Enter a valid WhatsApp number.';
    if (d.email && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(d.email)) e.email = 'Enter a valid e-mail address.';
    if (d.address.trim().length < 5) e.address = 'Please enter the address.';
    if (!d.qualification.trim()) e.qualification = 'Please enter the last qualification.';
    if (!d.course) e.course = 'Please choose a course.';
    return { clean: d, errors: e };
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (sending) return;
    setFormError('');

    // Honeypot: a bot that fills every field fills this too.
    if (honeypot.current && honeypot.current.value.trim() !== '') {
      setDone({ applicationNo: 'PENDING', fullName: form.fullName, course: form.course });
      return;
    }

    const { clean, errors: errs } = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      setFormError('Please check the highlighted fields.');
      return;
    }

    setSending(true);
    const payload = { ...clean };
    if (photo) payload.photo = photo;
    const { data } = await api.submit(payload);
    setSending(false);

    if (!data || !data.ok) {
      if (data && data.fields) setErrors(data.fields);
      setFormError((data && data.error) || 'The application could not be saved. Please try again.');
      toast((data && data.error) || 'The application could not be saved.', 'bad');
      return;
    }
    setDone({ applicationNo: data.applicationNo, fullName: clean.fullName, course: clean.course, duplicate: data.duplicate });
    if (data.duplicate) toast('You had already applied — here is your existing number.', 'ok');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function registerAnother() {
    setForm(BLANK); setErrors({}); setPhoto(null); setSameWhatsapp(false);
    setFormError(''); setDone(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function share() {
    const url = window.location.origin + '/';
    const text = 'Admissions open at ' + (CONFIG.SCHOOL_NAME || 'our academy') +
      ' — DIT, Web Development and Pharmacy. Register here: ';
    if (navigator.share) { navigator.share({ title: document.title, text, url }).catch(() => {}); return; }
    if (navigator.clipboard) { navigator.clipboard.writeText(text + url).then(() => toast('Link copied. Paste it into WhatsApp or Facebook.', 'ok')); return; }
    window.prompt('Copy this link:', url);
  }

  const err = (name) => errors[name]
    ? <span className="err" style={{ display: 'block' }}>{errors[name]}</span>
    : <span className="err" data-err={name} />;
  const invalid = (name) => 'field' + (errors[name] ? ' invalid' : '');

  return (
    <>
      <header className="site-head">
        <div className="wrap site-head__in">
          <Link className="brand" to="/">
            <span className="brand__mark brand__mark--logo"><img src={CONFIG.LOGO} alt={CONFIG.SCHOOL_NAME} /></span>
            <span className="brand__text">
              <span className="brand__name">{CONFIG.SCHOOL_NAME}</span>
              <span className="brand__sub">{CONFIG.ACADEMY_NAME}</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="wrap">
        {!done ? (
          <div>
            <section className="hero">
              <span className="hero__crest brand__mark--logo"><img src={CONFIG.LOGO} alt="" /></span>
              <span className="pill"><Icon name="graduate" className="icon--sm" /> Admissions open</span>
              <h1>Register for a short course</h1>
              <p>Fill this form in and our office will call you on the number you give. Applying is free and you do not need an account.</p>
            </section>

            <section aria-labelledby="coursesTitle">
              <h2 id="coursesTitle" className="sr-only">Courses on offer</h2>
              <div className="courses">
                {CONFIG.COURSES.map((c) => (
                  <button type="button" key={c.id} className="course" aria-pressed={form.course === c.id}
                          data-course={c.id} onClick={() => pickCourse(c.id)}>
                    <span className="course__tick"><Icon name="check" /></span>
                    <span className="course__top">
                      <span className="course__ico"><Icon name={c.icon} /></span>
                      <span><span className="course__name">{c.name}</span><br /><span className="course__full">{c.full}</span></span>
                    </span>
                    <span className="course__blurb">{c.blurb}</span>
                  </button>
                ))}
              </div>
            </section>

            <form className="card" style={{ marginTop: 18 }} onSubmit={onSubmit} noValidate>
              <div className="card__body">
                <div className="section-title"><Icon name="user" /><h2>Student details</h2></div>
                <p className="small muted" style={{ marginBottom: 14 }}>Exactly as it should appear on the certificate.</p>

                <div className="grid grid--2">
                  <div className={invalid('fullName')}>
                    <label htmlFor="fullName">Full name <span className="req">*</span></label>
                    <input className="control" id="fullName" type="text" autoComplete="name" maxLength={150}
                           value={form.fullName} onChange={set('fullName')} />
                    {err('fullName')}
                  </div>
                  <div className={invalid('fatherName')}>
                    <label htmlFor="fatherName">Father name <span className="req">*</span></label>
                    <input className="control" id="fatherName" type="text" maxLength={150}
                           value={form.fatherName} onChange={set('fatherName')} />
                    {err('fatherName')}
                  </div>
                  <div className={invalid('dob')}>
                    <label htmlFor="dob">Date of birth <span className="req">*</span></label>
                    <input className="control" id="dob" type="date" value={form.dob} onChange={set('dob')} />
                    {err('dob')}
                  </div>
                  <div className={invalid('gender')}>
                    <label id="genderLabel">Gender <span className="req">*</span></label>
                    <div className="choices" role="radiogroup" aria-labelledby="genderLabel">
                      {['Male', 'Female'].map((g) => (
                        <label className="choice" key={g}>
                          <input type="radio" name="gender" value={g} checked={form.gender === g} onChange={set('gender')} />
                          <span>{g}</span>
                        </label>
                      ))}
                    </div>
                    {err('gender')}
                  </div>
                </div>

                <hr style={{ border: 0, borderTop: '1px solid var(--line-soft)', margin: '22px 0' }} />
                <div className="section-title"><Icon name="phone" /><h2>How we reach you</h2></div>
                <p className="small muted" style={{ marginBottom: 14 }}>We ring the mobile number first, so please check it.</p>

                <div className="grid grid--2">
                  <div className={invalid('mobile')}>
                    <label htmlFor="mobile">Mobile number <span className="req">*</span></label>
                    <input className="control" id="mobile" type="tel" inputMode="tel" autoComplete="tel"
                           placeholder="03001234567" maxLength={20} value={form.mobile} onChange={set('mobile')} />
                    <span className="hint">Pakistani mobile, for example 03001234567.</span>
                    {err('mobile')}
                  </div>
                  <div className={invalid('whatsapp')}>
                    <label htmlFor="whatsapp">WhatsApp number <span className="opt">(optional)</span></label>
                    <input className="control" id="whatsapp" type="tel" inputMode="tel" placeholder="03001234567"
                           maxLength={20} value={form.whatsapp} onChange={set('whatsapp')} readOnly={sameWhatsapp} />
                    <label className="small muted" style={{ display: 'flex', gap: 7, alignItems: 'center', marginTop: 2 }}>
                      <input type="checkbox" checked={sameWhatsapp} onChange={onSameWhatsapp} /> Same as my mobile number
                    </label>
                    {err('whatsapp')}
                  </div>
                  <div className={invalid('email')}>
                    <label htmlFor="email">E-mail <span className="opt">(optional)</span></label>
                    <input className="control" id="email" type="email" autoComplete="email" maxLength={150}
                           value={form.email} onChange={set('email')} />
                    {err('email')}
                  </div>
                  <div className={invalid('address') + ' span-2'}>
                    <label htmlFor="address">Address <span className="req">*</span></label>
                    <textarea className="control" id="address" rows={2} maxLength={300}
                              placeholder="Village or town, and the district" value={form.address} onChange={set('address')} />
                    {err('address')}
                  </div>
                </div>

                <hr style={{ border: 0, borderTop: '1px solid var(--line-soft)', margin: '22px 0' }} />
                <div className="section-title"><Icon name="book" /><h2>Education &amp; course</h2></div>
                <p className="small muted" style={{ marginBottom: 14 }}>Tell us where you are starting from — every level is welcome.</p>

                <div className="grid grid--2">
                  <div className={invalid('qualification')}>
                    <label htmlFor="qualification">Last qualification <span className="req">*</span></label>
                    <input className="control" id="qualification" list="qualList" maxLength={120}
                           placeholder="Matric, FA / FSc, BA…" value={form.qualification} onChange={set('qualification')} />
                    <datalist id="qualList">
                      <option value="Middle" /><option value="Matric" /><option value="FA" />
                      <option value="FSc" /><option value="BA / BSc" /><option value="Graduate" />
                    </datalist>
                    {err('qualification')}
                  </div>
                  <div className={invalid('course')}>
                    <label htmlFor="course">Course <span className="req">*</span></label>
                    <select className="control" id="course" value={form.course} onChange={set('course')}>
                      <option value="">Choose a course</option>
                      {CONFIG.COURSES.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.full}</option>)}
                    </select>
                    {err('course')}
                  </div>
                  <div className="field span-2">
                    <label id="knowLabel">Previous computer / technical knowledge</label>
                    <div className="choices" role="radiogroup" aria-labelledby="knowLabel">
                      {['None', 'Basic', 'Intermediate', 'Advanced'].map((k) => (
                        <label className="choice" key={k}>
                          <input type="radio" name="knowledge" value={k} checked={form.knowledge === k} onChange={set('knowledge')} />
                          <span>{k}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="field span-2">
                    <label htmlFor="message">Message / remarks <span className="opt">(optional)</span></label>
                    <textarea className="control" id="message" rows={3} maxLength={800}
                              placeholder="Anything you would like the office to know — preferred timing, questions…"
                              value={form.message} onChange={set('message')} />
                  </div>
                  <div className={invalid('photo') + ' span-2'}>
                    <label htmlFor="photo">Passport-size photo <span className="opt">(optional)</span></label>
                    <div className="photo">
                      <span className="photo__preview">{photo ? <img src={photo} alt="" /> : <Icon name="camera" />}</span>
                      <span className="photo__actions">
                        <input className="sr-only" id="photo" ref={photoInput} type="file" accept="image/*" onChange={onPhoto} />
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => photoInput.current && photoInput.current.click()}>Choose a photo</button>
                        {photo && <button type="button" className="btn btn--ghost btn--sm" onClick={clearPhoto}>Remove</button>}
                        <span className="hint">{photoHint}</span>
                      </span>
                    </div>
                    {err('photo')}
                  </div>
                </div>

                <div aria-hidden="true" style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}>
                  <label htmlFor="website">Website</label>
                  <input id="website" type="text" tabIndex={-1} autoComplete="off" ref={honeypot} />
                </div>

                {formError && (
                  <div className="note note--bad" style={{ marginTop: 18 }}>
                    <Icon name="alert" /><span>{formError}</span>
                  </div>
                )}

                <button type="submit" className={'btn btn--primary btn--lg btn--block' + (sending ? ' is-busy' : '')}
                        style={{ marginTop: 20 }} disabled={sending}>
                  <span className="spinner" />
                  <span className="btn__label">{sending ? 'Sending…' : 'Submit application'}</span>
                </button>
                <p className="tiny muted center" style={{ marginTop: 12 }}>
                  By submitting you agree that the academy may contact you about this application.
                </p>
              </div>
            </form>
          </div>
        ) : (
          <div className="card" style={{ marginTop: 26 }}>
            <div className="card__body done">
              <div className="done__mark"><Icon name="check" /></div>
              <h1>Application received</h1>
              <p className="muted" style={{ marginTop: 8 }}>Thank you, <strong>{done.fullName}</strong>. Your application for <strong>{done.course}</strong> has been recorded.</p>
              <div className="ref">
                <div className="tiny muted">Your application number</div>
                <div className="ref__no mono">{done.applicationNo || '—'}</div>
              </div>
              <p className="small muted">Keep this number. Quote it when our office calls you, or when you visit. Your application is <strong>pending</strong> until a member of staff has spoken to you.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20 }}>
                <button type="button" className="btn btn--primary" onClick={share}><Icon name="share" className="icon--sm" /> Share this page</button>
                <button type="button" className="btn btn--ghost" onClick={registerAnother}>Register somebody else</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="site-foot">
        <div className="wrap center">
          <p>{[CONFIG.SCHOOL_NAME, CONFIG.ACADEMY_NAME].filter(Boolean).join(' & ') + (CONFIG.LOCATION ? ' · ' + CONFIG.LOCATION : '')}</p>
          <p className="tiny" style={{ marginTop: 4 }}>Office use: <Link to="/admin">staff dashboard</Link></p>
        </div>
      </footer>
    </>
  );
}
