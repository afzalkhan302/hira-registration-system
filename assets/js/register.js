/**
 * The public registration form.
 *
 * Every field is checked here before the request leaves the phone — that is a
 * courtesy, not a guarantee. The same checks run again in the PHP API, which is
 * the side that actually decides, because anything in this file can be edited
 * by whoever opens the page.
 */
(function (window, document) {
  'use strict';

  var App = window.App;
  var CFG = App.cfg;

  var form = document.getElementById('regForm');
  var formView = document.getElementById('formView');
  var doneView = document.getElementById('doneView');
  var submitBtn = document.getElementById('submitBtn');
  var courseSelect = document.getElementById('course');
  var photoInput = document.getElementById('photo');

  var photoData = null;   // the resized data URL, or null
  var sending = false;

  App.paintIcons();
  App.paintLogo();
  brand();
  buildCourses();

  if (!App.configured) {
    document.getElementById('setupNote').classList.remove('hidden');
  }

  /* ------------------------------------------------------------- branding */

  function brand() {
    document.getElementById('brandName').textContent = CFG.SCHOOL_NAME || 'Academy';
    document.getElementById('brandSub').textContent = CFG.ACADEMY_NAME || '';
    document.getElementById('footLine').textContent =
      [CFG.SCHOOL_NAME, CFG.ACADEMY_NAME].filter(Boolean).join(' & ') +
      (CFG.LOCATION ? ' · ' + CFG.LOCATION : '');
  }

  /* ------------------------------------------------- course cards + select */

  function buildCourses() {
    var host = document.getElementById('courseCards');
    var list = CFG.COURSES || [];
    var html = '';

    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      html +=
        '<button type="button" class="course" aria-pressed="false" data-course="' + App.esc(c.id) + '">' +
          '<span class="course__tick">' + App.icon('check') + '</span>' +
          '<span class="course__top">' +
            '<span class="course__ico">' + App.icon(c.icon) + '</span>' +
            '<span><span class="course__name">' + App.esc(c.name) + '</span><br>' +
            '<span class="course__full">' + App.esc(c.full) + '</span></span>' +
          '</span>' +
          '<span class="course__blurb">' + App.esc(c.blurb) + '</span>' +
        '</button>';

      courseSelect.insertAdjacentHTML('beforeend',
        '<option value="' + App.esc(c.id) + '">' + App.esc(c.name) + ' — ' + App.esc(c.full) + '</option>');
    }

    host.innerHTML = html;

    host.addEventListener('click', function (e) {
      var card = e.target.closest('.course');
      if (!card) return;

      courseSelect.value = card.getAttribute('data-course');
      paintCards();
      clearError('course');
    });

    courseSelect.addEventListener('change', paintCards);
  }

  function paintCards() {
    var cards = document.querySelectorAll('.course');

    for (var i = 0; i < cards.length; i++) {
      cards[i].setAttribute('aria-pressed',
        cards[i].getAttribute('data-course') === courseSelect.value ? 'true' : 'false');
    }
  }

  /* ------------------------------------------------------ WhatsApp shortcut */

  var same = document.getElementById('sameWhatsapp');
  var mobile = document.getElementById('mobile');
  var whatsapp = document.getElementById('whatsapp');

  same.addEventListener('change', function () {
    if (same.checked) {
      whatsapp.value = mobile.value;
      whatsapp.readOnly = true;
      clearError('whatsapp');
    } else {
      whatsapp.readOnly = false;
    }
  });

  mobile.addEventListener('input', function () {
    if (same.checked) whatsapp.value = mobile.value;
  });

  /* ------------------------------------------------------------------ photo */

  document.getElementById('photoPick').addEventListener('click', function () { photoInput.click(); });

  document.getElementById('photoClear').addEventListener('click', function () {
    photoData = null;
    photoInput.value = '';
    document.getElementById('photoPreview').innerHTML = App.icon('camera');
    document.getElementById('photoClear').classList.add('hidden');
    document.getElementById('photoHint').textContent = 'JPG or PNG. It is resized on your phone before sending.';
    clearError('photo');
  });

  photoInput.addEventListener('change', function () {
    var file = photoInput.files && photoInput.files[0];
    if (!file) return;

    if (!/^image\//.test(file.type)) {
      showError('photo', 'That file is not an image.');
      photoInput.value = '';
      return;
    }

    // Anything a phone camera produces is far bigger than a passport photo
    // needs to be, so it is scaled down here rather than uploaded whole.
    resize(file, 700).then(function (dataUrl) {
      photoData = dataUrl;
      document.getElementById('photoPreview').innerHTML = '<img src="' + dataUrl + '" alt="">';
      document.getElementById('photoClear').classList.remove('hidden');
      document.getElementById('photoHint').textContent =
        'Ready — about ' + Math.round(dataUrl.length * 0.75 / 1024) + ' KB.';
      clearError('photo');
    }).catch(function () {
      showError('photo', 'That image could not be read. Try another one.');
      photoInput.value = '';
    });
  });

  function resize(file, maxSide) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();

      reader.onerror = reject;
      reader.onload = function () {
        var img = new Image();

        img.onerror = reject;
        img.onload = function () {
          var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          var w = Math.max(1, Math.round(img.width * scale));
          var h = Math.max(1, Math.round(img.height * scale));

          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);

          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };

        img.src = reader.result;
      };

      reader.readAsDataURL(file);
    });
  }

  /* ------------------------------------------------------------ validation */

  function field(name) {
    var el = document.querySelector('[data-err="' + name + '"]');

    return el ? el.closest('.field') : null;
  }

  function showError(name, message) {
    var holder = field(name);
    if (!holder) return;

    holder.classList.add('invalid');
    holder.querySelector('[data-err="' + name + '"]').textContent = message;
  }

  function clearError(name) {
    var holder = field(name);
    if (!holder) return;

    holder.classList.remove('invalid');
    holder.querySelector('[data-err="' + name + '"]').textContent = '';
  }

  function clearAllErrors() {
    var holders = document.querySelectorAll('.field.invalid');

    for (var i = 0; i < holders.length; i++) holders[i].classList.remove('invalid');

    document.getElementById('formError').classList.add('hidden');
  }

  function digits(value) {
    var d = String(value || '').replace(/\D+/g, '');

    if (d.length === 12 && d.indexOf('92') === 0) d = '0' + d.slice(2);
    if (d.length === 10 && d.charAt(0) === '3') d = '0' + d;

    return d;
  }

  var isMobileNo = function (d) { return /^03\d{9}$/.test(d); };

  function collect() {
    var get = function (id) { return (document.getElementById(id).value || '').trim(); };
    var radio = function (name) {
      var el = form.querySelector('input[name="' + name + '"]:checked');
      return el ? el.value : '';
    };

    return {
      fullName: get('fullName'),
      fatherName: get('fatherName'),
      dob: get('dob'),
      gender: radio('gender'),
      mobile: digits(get('mobile')),
      whatsapp: digits(get('whatsapp')),
      email: get('email'),
      address: get('address'),
      qualification: get('qualification'),
      course: get('course'),
      knowledge: radio('knowledge'),
      message: get('message')
    };
  }

  function validate(data) {
    var errors = {};

    if (data.fullName.length < 3) errors.fullName = 'Please enter the full name.';
    if (data.fatherName.length < 3) errors.fatherName = 'Please enter the father’s name.';

    if (!data.dob) {
      errors.dob = 'Please choose the date of birth.';
    } else {
      var age = (Date.now() - new Date(data.dob + 'T00:00:00').getTime()) / (365.25 * 864e5);
      if (!(age > 8 && age < 90)) errors.dob = 'Please check the date of birth.';
    }

    if (!data.gender) errors.gender = 'Please choose one.';
    if (!isMobileNo(data.mobile)) errors.mobile = 'Enter a valid mobile number, e.g. 03001234567.';
    if (data.whatsapp && !isMobileNo(data.whatsapp)) errors.whatsapp = 'Enter a valid WhatsApp number.';
    if (data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(data.email)) errors.email = 'Enter a valid e-mail address.';
    if (data.address.length < 5) errors.address = 'Please enter the address.';
    if (!data.qualification) errors.qualification = 'Please enter the last qualification.';
    if (!data.course) errors.course = 'Please choose a course.';

    return errors;
  }

  /* ---------------------------------------------------------------- submit */

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (sending) return;

    clearAllErrors();

    // The honeypot. Silence is the right answer: a bot told it failed retries.
    if ((document.getElementById('website').value || '').trim() !== '') {
      succeed({ applicationNo: 'PENDING' }, collect());
      return;
    }

    var data = collect();
    var errors = validate(data);
    var names = Object.keys(errors);

    if (names.length) {
      for (var i = 0; i < names.length; i++) showError(names[i], errors[names[i]]);
      fail('Please check the highlighted fields.');
      var firstHolder = field(names[0]);
      if (firstHolder) firstHolder.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    busy(true);

    App.api({
      action: 'submit',
      data: photoData ? Object.assign({}, data, { photo: { data: photoData } }) : data
    }).then(function (res) {
      busy(false);

      if (!res || !res.ok) {
        if (res && res.fields) {
          var keys = Object.keys(res.fields);
          for (var i = 0; i < keys.length; i++) showError(keys[i], res.fields[keys[i]]);
        }

        fail((res && res.error) || 'The application could not be saved. Please try again.');
        return;
      }

      succeed(res, data);
    }).catch(function (err) {
      busy(false);
      fail(err.message || 'No connection. Check your internet and try again.');
    });
  });

  function busy(on) {
    sending = on;
    submitBtn.disabled = on;
    submitBtn.classList.toggle('is-busy', on);
    submitBtn.querySelector('.btn__label').textContent = on ? 'Sending…' : 'Submit application';
  }

  function fail(message) {
    var box = document.getElementById('formError');

    document.getElementById('formErrorText').textContent = message;
    box.classList.remove('hidden');
    App.toast(message, 'bad');
  }

  function succeed(res, data) {
    document.getElementById('doneName').textContent = data.fullName;
    document.getElementById('doneCourse').textContent = data.course;
    document.getElementById('doneNo').textContent = res.applicationNo || '—';

    formView.classList.add('hidden');
    doneView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (res.duplicate) {
      App.toast('You had already applied — here is your existing number.', 'ok');
    }
  }

  /* ------------------------------------------------------- after the event */

  document.getElementById('againBtn').addEventListener('click', function () {
    form.reset();
    photoData = null;
    document.getElementById('photoPreview').innerHTML = App.icon('camera');
    document.getElementById('photoClear').classList.add('hidden');
    whatsapp.readOnly = false;
    clearAllErrors();
    paintCards();

    doneView.classList.add('hidden');
    formView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('shareBtn').addEventListener('click', function () {
    var url = window.location.origin + window.location.pathname;
    var text = 'Admissions open at ' + (CFG.SCHOOL_NAME || 'our academy') +
      ' — DIT, Web Development and Pharmacy. Register here: ';

    if (navigator.share) {
      navigator.share({ title: document.title, text: text, url: url }).catch(function () {});
      return;
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text + url).then(function () {
        App.toast('Link copied. Paste it into WhatsApp or Facebook.', 'ok');
      });
      return;
    }

    window.prompt('Copy this link:', url);
  });

  /* Clear a field's error as soon as the person starts fixing it. */
  form.addEventListener('input', function (e) {
    if (e.target.name) clearError(e.target.name);
  });

  form.addEventListener('change', function (e) {
    if (e.target.name) clearError(e.target.name);
  });
})(window, document);
