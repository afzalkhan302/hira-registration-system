// REST client for the Express backend.
// Base URL: empty in dev (Vite proxies /api), the backend origin in production.
const BASE = import.meta.env.VITE_API_URL || '';

async function req(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(BASE + '/api' + path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    return { status: 0, data: { ok: false, error: 'Could not reach the server. Check your connection and that the API is running.' } };
  }

  let data;
  try { data = await res.json(); }
  catch (e) { data = { ok: false, error: 'The server sent an unexpected reply.' }; }

  return { status: res.status, data };
}

export const api = {
  health:     () => req('/health'),
  submit:     (d) => req('/applications', { method: 'POST', body: d }),
  login:      (username, password) => req('/auth/login', { method: 'POST', body: { username, password } }),
  me:         (token) => req('/auth/me', { token }),
  list:       (token) => req('/applications', { token }),
  getOne:     (id, token) => req('/applications/' + id, { token }),
  setStatus:  (id, status, note, token) => req('/applications/' + id, { method: 'PATCH', body: { status, note }, token }),
  remove:     (id, token) => req('/applications/' + id, { method: 'DELETE', token }),
};

// Token persistence for the admin session.
const KEY = 'hira_admin_token';
export const tokenStore = {
  get() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } },
  set(t) { try { localStorage.setItem(KEY, t); } catch (e) {} },
  clear() { try { localStorage.removeItem(KEY); } catch (e) {} },
};
