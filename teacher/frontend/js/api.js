// Change this to your deployed Worker URL when deploying
const API_BASE = 'https://ielts-teacher-api.quangducngo0811.workers.dev';
const API_CACHE_TTL_MS = 10 * 1000;
const API_CACHE_PREFIX = 'ielts_teacher_api_cache:';
const TEACHER_AUTH_TOKEN_KEY = 'teacher_auth_token';

const api = {
  _base: API_BASE,
  _cache: new Map(),

  _authToken() {
    try { return sessionStorage.getItem(TEACHER_AUTH_TOKEN_KEY) || ''; } catch { return ''; }
  },

  setAuthToken(token) {
    try {
      if (token) sessionStorage.setItem(TEACHER_AUTH_TOKEN_KEY, token);
      else sessionStorage.removeItem(TEACHER_AUTH_TOKEN_KEY);
    } catch {}
  },

  _authHeaders(extra = {}) {
    const headers = { ...extra };
    const token = this._authToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  },

  _cacheKey(path) {
    return API_CACHE_PREFIX + path;
  },

  _readCache(path) {
    const key = this._cacheKey(path);
    const mem = this._cache.get(key);
    if (mem && mem.expires > Date.now()) return mem.data;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (!cached || cached.expires <= Date.now()) {
        sessionStorage.removeItem(key);
        this._cache.delete(key);
        return null;
      }
      this._cache.set(key, cached);
      return cached.data;
    } catch {
      return null;
    }
  },

  _writeCache(path, data) {
    const key = this._cacheKey(path);
    const cached = { expires: Date.now() + API_CACHE_TTL_MS, data };
    this._cache.set(key, cached);
    try { sessionStorage.setItem(key, JSON.stringify(cached)); } catch {}
  },

  clearCache() {
    this._cache.clear();
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(API_CACHE_PREFIX)) sessionStorage.removeItem(key);
      }
    } catch {}
  },

  _handle401(res) {
    if (res.status === 401) {
      this.clearCache();
      window._onTeacherUnauthorized?.();
    }
  },

  async get(path) {
    const cached = this._readCache(path);
    if (cached) return cached;
    const res = await fetch(API_BASE + path, {
      headers: this._authHeaders(),
      credentials: 'include',
    });
    if (!res.ok) { this._handle401(res); throw await res.json(); }
    const data = await res.json();
    this._writeCache(path, data);
    return data;
  },

  async post(path, data) {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: this._authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) { this._handle401(res); throw await res.json(); }
    this.clearCache();
    return res.json();
  },

  async postForm(path, formData) {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: this._authHeaders(),
      body: formData,
      credentials: 'include',
    });
    if (!res.ok) { this._handle401(res); throw await res.json(); }
    this.clearCache();
    return res.json();
  },

  async patch(path, data) {
    const res = await fetch(API_BASE + path, {
      method: 'PATCH',
      headers: this._authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!res.ok) { this._handle401(res); throw await res.json(); }
    this.clearCache();
    return res.json();
  },

  async delete(path) {
    const res = await fetch(API_BASE + path, {
      method: 'DELETE',
      headers: this._authHeaders(),
      credentials: 'include',
    });
    if (!res.ok) { this._handle401(res); throw await res.json(); }
    this.clearCache();
    return res.json();
  },

  fileUrl(key) {
    if (!key) return null;
    if (key.startsWith('http')) return key;
    return API_BASE + key;
  },
};
