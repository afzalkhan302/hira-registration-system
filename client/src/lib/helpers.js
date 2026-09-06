export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).slice(0, 2);
  let out = '';
  for (let i = 0; i < parts.length; i++) out += parts[i].charAt(0).toUpperCase();
  return out || '?';
}

export function formatDate(value, withTime) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  let out = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  if (withTime) out += ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return out;
}

// Resize a picked image file to a data URL (same behaviour as the old form:
// scaled down on the device before sending, so no big uploads).
export function resizeImage(file, maxSide) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
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

// Minimal toast, matching the original .toasts / .toast markup and timing.
export function toast(message, kind) {
  let host = document.querySelector('.toasts');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toasts';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = 'toast toast--' + (kind === 'bad' ? 'bad' : 'ok');
  el.setAttribute('role', kind === 'bad' ? 'alert' : 'status');
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 320);
  }, 3600);
}

export function digits(value) {
  let d = String(value || '').replace(/\D+/g, '');
  if (d.length === 12 && d.indexOf('92') === 0) d = '0' + d.slice(2);
  if (d.length === 10 && d.charAt(0) === '3') d = '0' + d;
  return d;
}

export const isMobileNo = (d) => /^03\d{9}$/.test(d);
