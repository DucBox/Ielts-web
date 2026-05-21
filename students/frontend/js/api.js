const API_BASE = 'https://ielts-teacher-api.quangducngo0811.workers.dev';
const API_CACHE_TTL_MS = 10 * 1000;
const API_CACHE_PREFIX = 'ielts_student_api_cache:';

const api = {
  _token: null,
  _cache: new Map(),

  _tokenScope() {
    if (!this._token) return 'anon';
    let hash = 0;
    for (let i = 0; i < this._token.length; i++) {
      hash = ((hash << 5) - hash + this._token.charCodeAt(i)) | 0;
    }
    return String(hash >>> 0);
  },

  _cacheKey(path) {
    return `${API_CACHE_PREFIX}${this._tokenScope()}:${path}`;
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

  _authHeaders(extra = {}) {
    const h = { ...extra };
    if (this._token) h['Authorization'] = `Bearer ${this._token}`;
    return h;
  },

  async _readJsonSafe(res) {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return { error: text };
    }
  },

  // Centralized response handler — fires 'auth:expired' on 401 so app redirects to login
  async _handle(res) {
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
      throw (await this._readJsonSafe(res)) || { error: 'Unauthorized' };
    }
    if (!res.ok) throw (await this._readJsonSafe(res)) || { error: 'Request failed' };
    return this._readJsonSafe(res);
  },

  async get(path) {
    const cached = this._readCache(path);
    if (cached) return cached;
    const res = await fetch(API_BASE + path, { headers: this._authHeaders() });
    const data = await this._handle(res);
    this._writeCache(path, data);
    return data;
  },

  async post(path, data) {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: this._authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const out = await this._handle(res);
    this.clearCache();
    return out;
  },

  async postForm(path, formData) {
    // No Content-Type header — browser sets it automatically for FormData (with boundary)
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: this._authHeaders(),
      body: formData,
    });
    const out = await this._handle(res);
    this.clearCache();
    return out;
  },

  async patch(path, data) {
    const res = await fetch(API_BASE + path, {
      method: 'PATCH',
      headers: this._authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    const out = await this._handle(res);
    this.clearCache();
    return out;
  },

  async delete(path) {
    const res = await fetch(API_BASE + path, {
      method: 'DELETE',
      headers: this._authHeaders(),
    });
    const out = await this._handle(res);
    this.clearCache();
    return out;
  },
};
