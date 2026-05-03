# SECURITY — IELTS Web Project

> Last updated: 2026-04-26
> Scope: `teacher/backend/`, `teacher/frontend/`, `students/frontend/`
> Note: Teacher login/authentication is intentionally not implemented (teacher controls the deployment directly).

---

## 1. Critical Issues (Fix Immediately)

### 1.1 Weak Password Hashing
**File:** `teacher/backend/src/worker.js` — lines 53–59
**Risk:** Student passwords hashed with plain SHA-256 (no salt, no work factor). Vulnerable to rainbow table attacks if DB is compromised.
**Fix:** Replace with PBKDF2 (available in Web Crypto API, Cloudflare Workers compatible):
```js
async function hashPassword(password) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, keyMaterial, 256);
  return btoa(String.fromCharCode(...new Uint8Array(salt))) + '.' + btoa(String.fromCharCode(...new Uint8Array(bits)));
}
```
Note: Existing hashed passwords in DB will need migration (reset all student passwords or add a one-time migration endpoint).

---

### 1.2 No Student Session Token — Student Identity Can Be Spoofed
**File:** `teacher/backend/src/worker.js` — login endpoint (~line 191), all `/assignments/{id}/submit` calls
**Risk:** Login returns student data but no JWT/session token. Subsequent requests pass `student_id` in the request body with no server-side verification — any client can impersonate any student by sending an arbitrary `student_id`.
**Fix:** Issue a signed JWT on login; verify it on all student-facing endpoints:
```js
// On login:
const token = await sign({ student_id: student.id, exp: Date.now() + 86400_000 }, env.JWT_SECRET);
return ok({ student, token });

// On protected endpoints:
const student = await verifyToken(request.headers.get('Authorization'), env.JWT_SECRET);
if (!student) return err('Unauthorized', 401);
```
Add `JWT_SECRET` to Cloudflare Worker secrets (`wrangler secret put JWT_SECRET`).
Frontend must store the token (localStorage) and send it as `Authorization: Bearer <token>` header on every API call.

---

### 1.3 XSS — Unescaped User Data in `innerHTML`
**File:** `teacher/frontend/js/app.js`
**Risk:**
- ~Line 2149: `openResetPasswordModal(studentId, studentName)` passes `studentName` directly into `openModal()`, which does `$('#modal-title').innerHTML = title` — no HTML escaping. A student name containing `<img src=x onerror="...">` would execute arbitrary JS.
- ~Line 1184: `className` in assign modal title has the same pattern.
- ~Line 739: API error messages rendered via `innerHTML` without escaping.

**Fix:**
```js
// Option A — use textContent for modal title (safest):
$('#modal-title').textContent = title;

// Option B — escape before innerHTML (if rich HTML is intentional):
$('#modal-title').innerHTML = escapeHtml(title);
```
Rule: always call `escapeHtml()` on any user-controlled string before inserting into `innerHTML`.

---

### 1.4 No File Upload Validation
**File:** `teacher/backend/src/worker.js` — audio upload handlers (~lines 600–632, 430–437)
**Risk:** No file size limit or MIME type check before uploading to R2. An attacker can upload arbitrarily large files → R2 storage exhaustion and expensive OpenAI/Groq STT API calls.
**Fix:**
```js
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50 MB
if (audioFile.size > MAX_AUDIO_SIZE) return err('File quá lớn (tối đa 50MB)', 413);
if (!audioFile.type.startsWith('audio/')) return err('Chỉ chấp nhận file âm thanh', 415);
```

---

## 2. High Priority Issues

### 2.1 CORS Allows All Origins
**File:** `teacher/backend/src/worker.js` — lines 3–7
**Current:** `'Access-Control-Allow-Origin': '*'`
**Risk:** Any website on the internet can make cross-origin requests to the API.
**Fix:** Restrict to known frontend origins:
```js
const ALLOWED_ORIGINS = [
  'https://ielts-teacher.pages.dev',
  'https://ielts-student.pages.dev',
];
const origin = request.headers.get('Origin') || '';
const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
// Use allowOrigin instead of '*' in CORS response headers
```

---

### 2.2 No Rate Limiting
**Risk:** No throttling on any endpoint.
- `/auth/login` can be brute-forced without limit.
- AI feedback and STT endpoints can be spammed → unexpected OpenAI/Groq billing.

**Fix:** Use Cloudflare Workers Rate Limiting API (paid plan) or a simple per-IP counter in a KV/Durable Object:
```toml
# wrangler.toml
[[unsafe.bindings]]
name = "RATE_LIMITER"
type = "ratelimit"
namespace_id = "your-namespace-id"
simple = { limit = 10, period = 60 }
```
At minimum, rate-limit `/auth/login` to 5 attempts per IP per minute and AI endpoints to 20 per hour per student.

---

### 2.3 Raw Error Messages Leak Internal Details
**File:** `teacher/backend/src/worker.js` — generic catch-all (~line 883)
**Current:** `return err(e.message, 500);`
**Risk:** DB errors expose table/column names and query structure to the client.
**Fix:**
```js
} catch (e) {
  console.error('[ERROR]', e);            // Log full error server-side
  return err('Lỗi máy chủ nội bộ', 500); // Generic message to client
}
```

---

### 2.4 JSON Parse Without Try-Catch
**File:** `teacher/backend/src/worker.js` — lines ~427–428
**Risk:** `JSON.parse(form.get('questions_data'))` throws and crashes the Worker on malformed input, causing a 500 with a stack trace.
**Fix:**
```js
let questionsData;
try { questionsData = JSON.parse(form.get('questions_data') || '[]'); }
catch { return err('Dữ liệu câu hỏi không hợp lệ', 400); }
```

---

### 2.5 No Input Validation on Numeric IDs
**File:** `teacher/backend/src/worker.js` — ~lines 839–841
**Risk:** `student_id`, `class_id`, `assignment_id` from URL query params are passed directly to SQL without being validated as positive integers.
**Fix:**
```js
const classId = parseInt(url.searchParams.get('class_id'));
if (!Number.isInteger(classId) || classId <= 0) return err('class_id không hợp lệ', 400);
```
Apply consistently to all ID params.

---

## 3. Medium Priority Issues

### 3.1 No Content Security Policy (CSP)
**Files:** `teacher/frontend/index.html`, `students/frontend/index.html`
**Risk:** No CSP header is set. Inline event handlers (`onclick`, `onchange`) are widely used, which prevents a strict CSP from being enforced and leaves XSS mitigation entirely dependent on correct escaping.
**Recommended approach:** Add a `_headers` file to each Pages project:
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src https://ielts-teacher-api.quangducngo0811.workers.dev; media-src https://pub-75b0370b5b5a4c15b26531707c369a0f.r2.dev blob:; img-src 'self' data:;
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```
Note: `'unsafe-inline'` is needed as long as inline handlers exist. Long-term, migrate to event delegation to allow a stricter policy.

---

### 3.2 Student PII in localStorage
**File:** `students/frontend/js/app.js` — lines ~130–151
**Risk:** Full student object (id, full_name, username, class list) stored in plaintext localStorage. Any XSS can read this data.
**Fix:** Once JWT is implemented (§1.2), store only the token in localStorage. Fetch the student profile from the API at app start using the token.

---

### 3.3 Hardcoded Teacher Auto-Create in Production Code
**File:** `teacher/backend/src/worker.js` — lines ~42–50
**Issue:** `getTeacherId()` auto-creates a teacher with email `teacher@local.dev` if no teacher row exists. This is a dev convenience that should not be in production.
**Fix:** Remove the INSERT fallback. Fail explicitly if no teacher is found. Seed the teacher row via a one-time migration script or SQL command.

---

### 3.4 R2 File Serve — Path Not Validated
**File:** `teacher/backend/src/worker.js` — lines ~866–878
**Current:** `const key = path.slice('/files/'.length);` — the R2 key is taken directly from the URL path.
**Risk:** Low (R2 is flat, no real directories), but a malformed key with `..` or leading `/` could cause unexpected behavior.
**Fix:**
```js
if (!key || key.includes('..') || key.startsWith('/')) return err('Invalid file path', 400);
```

---

## 4. Accepted Risks / By Design

| Item | Reason |
|------|--------|
| No teacher login/authentication | Teacher controls the deployment directly; the admin UI is not publicly advertised |
| Hardcoded API URL in frontend JS | Single deployment environment; no dev/staging separation needed at this scale |
| Minimal backend dependencies | Only `@neondatabase/serverless` — reduces supply chain attack surface |
| SQL queries use template literal parameterization | `neon` library properly escapes template interpolations — not string concatenation |

---

## 5. Secrets Management

| Secret | Storage | Status |
|--------|---------|--------|
| `DATABASE_URL` | Cloudflare Worker secret (`wrangler secret put`) | ✅ Properly secret |
| `OPENAI_API_KEY` | Cloudflare Worker secret | ✅ Properly secret |
| `GROQ_API_KEY` | Cloudflare Worker secret (to add when STT is migrated) | ⬜ Not yet configured |
| `JWT_SECRET` | Cloudflare Worker secret (to add) | ⬜ Needed for §1.2 |
| `.dev.vars` | Local file only, gitignored in both root and `teacher/backend/` | ✅ Not committed to git |

**Rules:**
- Never commit `.dev.vars`, `.env`, or any file containing live credentials.
- Rotate `DATABASE_URL` and `OPENAI_API_KEY` immediately if either has ever been accidentally exposed (e.g., logged, shared in a chat, or pushed to a public repo).
- All production secrets must be set via `wrangler secret put <KEY>` — never as plaintext values in `wrangler.toml [vars]`.

---

## 6. Dependency Security

| Package | Version | Notes |
|---------|---------|-------|
| `@neondatabase/serverless` | `^0.10.4` | Keep updated; consider pinning to exact version |
| `wrangler` | `^3.95.0` | Keep updated |

Run `npm audit` periodically. For production stability, consider pinning to exact versions (`"0.10.4"` not `"^0.10.4"`) to prevent unexpected updates.

---

## 7. Remediation Checklist

- [ ] **P0** Replace SHA-256 password hashing with PBKDF2; migrate existing password hashes
- [ ] **P0** Issue JWT on student login; verify token on all student-facing endpoints
- [ ] **P0** Fix XSS: use `escapeHtml()` or `textContent` in all `innerHTML` assignments that include user-controlled data (student name, class name, error messages)
- [ ] **P0** Add file size + MIME type validation on all audio upload handlers
- [ ] **P1** Restrict CORS `Access-Control-Allow-Origin` to specific Pages domains
- [ ] **P1** Add rate limiting on `/auth/login` and AI/STT endpoints
- [ ] **P1** Replace raw `e.message` in catch-all with generic 500 message; log internally
- [ ] **P1** Wrap all `JSON.parse()` calls on user-supplied form data in try-catch
- [ ] **P1** Validate all numeric ID params as positive integers before SQL
- [ ] **P2** Add `_headers` file to both Pages deployments (CSP + security headers)
- [ ] **P2** Move student PII out of localStorage; store token only after §1.2 is done
- [ ] **P2** Remove `getTeacherId()` auto-create fallback; use explicit seeding
- [ ] **P2** Validate R2 key path to reject `..` and leading `/`
