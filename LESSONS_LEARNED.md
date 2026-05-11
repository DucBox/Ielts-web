# Tài Liệu Tổng Hợp: Bài Học Từ Thiết Kế & Triển Khai Hệ Thống IELTS Web

> Tài liệu này tổng hợp toàn bộ kiến thức, lỗi sai, và bài học rút ra từ quá trình xây dựng hệ thống học IELTS online — từ kiến trúc, database, API, frontend, email, AI, đến bảo mật, timezone, và vận hành. Mục tiêu: **giúp tránh lặp lại những sai lầm này trong các dự án tương lai**.

---

## Mục Lục

1. [Kiến Trúc Tổng Quan](#1-kiến-trúc-tổng-quan)
2. [Thiết Kế Database](#2-thiết-kế-database)
3. [Thiết Kế API](#3-thiết-kế-api)
4. [Xác Thực & Bảo Mật](#4-xác-thực--bảo-mật)
5. [Frontend SPA Không Framework](#5-frontend-spa-không-framework)
6. [Hệ Thống Upload File & Storage](#6-hệ-thống-upload-file--storage)
7. [Email & Thông Báo](#7-email--thông-báo)
8. [Timezone & Quốc Tế Hóa](#8-timezone--quốc-tế-hóa)
9. [Tích Hợp AI](#9-tích-hợp-ai)
10. [Serverless & Triển Khai](#10-serverless--triển-khai)
11. [Domain, DNS & CDN](#11-domain-dns--cdn)
12. [Hiệu Năng & Khả Năng Chịu Tải](#12-hiệu-năng--khả-năng-chịu-tải)
13. [Các Lỗi Điển Hình Cần Tránh](#13-các-lỗi-điển-hình-cần-tránh)

---

## 1. Kiến Trúc Tổng Quan

### Stack được chọn

| Layer | Công nghệ | Lý do |
|---|---|---|
| Compute | Cloudflare Workers | Serverless, edge, 0ms cold start, free tier |
| Database | Neon PostgreSQL | Serverless Postgres, auto-sleep, free tier |
| Storage | Cloudflare R2 | S3-compatible, không egress fee |
| Cache/Rate limit | Cloudflare KV | Distributed key-value gần worker |
| Email | Resend API | Developer-friendly, idempotency key, free tier |
| AI | OpenAI API | GPT-4o cho feedback, gpt-4o-mini-transcribe cho STT |
| Frontend | Vanilla JS | Zero dependency, deploy trên Cloudflare Pages |

### Bài học về lựa chọn stack

**1. Serverless không phải là silver bullet**

Cloudflare Workers có giới hạn CPU time (10ms free / 30ms paid per request). Nếu logic phức tạp (nhiều DB queries, xử lý file lớn), sẽ bị timeout. Cần thiết kế để mỗi request làm ít việc nhất có thể.

> **Ví dụ thực tế:** Khi teacher tạo bài mới, hệ thống phải notify TẤT CẢ học sinh trong lớp. Thay vì loop tuần tự, phải dùng `Promise.allSettled()` để chạy song song, sau đó dùng `ctx.waitUntil()` để xử lý email NGOÀI response — tránh block user.

```javascript
// Sai: block response cho đến khi xong
for (const student of students) {
  await sendEmail(student);
}

// Đúng: trả response trước, xử lý email nền
ctx.waitUntil(processQueuedStudentEmails(sql, env, { limit: students.length * 2 }));
return json(row, 201);
```

**2. Kết hợp Serverless DB + Serverless Compute cần cẩn thận về cold start**

Neon PostgreSQL có thể bị "suspend" sau vài phút idle. Kết hợp với Cloudflare Worker (cũng stateless), mỗi request có thể phải "wake up" cả hai. Dùng connection pooling mode của Neon để giảm latency.

**3. Tách biệt rõ giữa teacher frontend và student frontend**

Dự án có 2 SPA hoàn toàn tách biệt (`teacher/frontend` và `students/frontend`). Đây là quyết định đúng vì:
- Mỗi bên có UX flow riêng biệt hoàn toàn
- Bảo mật: student không thể nhìn thấy code logic của teacher
- Deploy độc lập

**NHƯNG:** Cả hai đều gọi chung một backend API → cần CORS config cẩn thận.

---

## 2. Thiết Kế Database

### Schema thực tế của dự án

```
teachers → classes → assignments → submissions
              ↓                         ↑
          student_classes ← students ──┘
              
question_pool → assignments
students → notifications (type: new_assignment | deadline_reminder | score_released)
students → student_email_events (type: new_assignment | score_released | deadline_1day)
students → student_profile_answers ← profile_fields
students → student_vocab
students → practice_attempts
```

### Bài học về Database Design

**1. Dùng UUID làm Primary Key — luôn luôn**

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

- Không đoán được ID từ bên ngoài (bảo mật)
- Không bị conflict khi merge data từ nhiều nguồn
- Trade-off: index lớn hơn integer, nhưng không đáng kể ở scale nhỏ-vừa

**2. Luôn có `created_at` và `updated_at`**

```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

Mọi bảng đều nên có. Giúp debug, audit, và sort mặc định. Dùng `TIMESTAMPTZ` (not `TIMESTAMP`) — luôn lưu timezone.

**3. Dùng `ON DELETE CASCADE` có chủ đích**

```sql
-- Khi xóa student → xóa luôn tất cả answers, submissions, notifications
student_id UUID REFERENCES students(id) ON DELETE CASCADE

-- Khi xóa question_pool → KHÔNG cho xóa nếu đang được dùng trong assignment
question_id UUID REFERENCES question_pool(id) ON DELETE RESTRICT
```

Quy tắc: Entity con phụ thuộc vào entity cha (không có nghĩa gì nếu cha bị xóa) → `CASCADE`. Entity quan trọng cần bảo vệ (xóa nhầm gây mất dữ liệu lớn) → `RESTRICT`.

**4. JSONB cho dữ liệu có cấu trúc linh hoạt**

```sql
questions_data JSONB NOT NULL DEFAULT '[]'::jsonb  -- Array câu hỏi
content_blocks JSONB                                -- Blocks text + image
ai_feedback    JSONB                                -- AI output
metadata       JSONB NOT NULL DEFAULT '{}'          -- Notification metadata
```

Dùng JSONB khi:
- Schema thay đổi thường xuyên (AI output format)
- Mảng có số phần tử không biết trước (questions, blocks)
- Không cần query sâu vào từng field

**KHÔNG dùng JSONB khi:**
- Cần WHERE/ORDER BY/JOIN trên field đó
- Cần foreign key constraint
- Cần unique constraint

**5. Index đúng chỗ là sống còn**

```sql
-- Hot path: lấy assignments của class (gọi mỗi lần vào trang)
CREATE INDEX idx_assignments_class ON assignments(class_id, created_at DESC);

-- Hot path: check xem student đã submit bài chưa
CREATE INDEX idx_submissions_assignment_student ON submissions(assignment_id, student_id);

-- Hot path: auto-close expired assignments
CREATE INDEX idx_assignments_active_deadline ON assignments(is_active, deadline)
  WHERE deadline IS NOT NULL;
```

> **Bài học:** Thiếu index trên `(assignment_id, student_id)` trong submissions → mỗi lần render danh sách bài tập, phải full-scan submissions table → chậm dần theo dữ liệu.

**6. Unique constraint thay vì check trong code**

```sql
-- Dedup: một học sinh chỉ có 1 notification mới bài/assignment
CREATE UNIQUE INDEX idx_notifications_new_assignment_dedup
  ON notifications(student_id, ref_id)
  WHERE type = 'new_assignment';

-- Dedup: 1 email/1 sự kiện/1 (student, assignment, event_type)
PRIMARY KEY (student_id, assignment_id, event_type)
```

Để DB xử lý dedup thay vì code: `INSERT ... ON CONFLICT DO NOTHING` — atomic, không có race condition.

**7. Migrations phải là files độc lập, đánh số**

```
migrations/
  001_assignment_auto_close.sql
  002_question_tags.sql
  003_practice_attempts.sql
  ...
  011_student_email_notifications.sql
```

Không sửa schema.sql trực tiếp rồi chạy lại — dễ mất dữ liệu production. Mỗi migration là một file SQL chạy một lần, idempotent (`IF NOT EXISTS`, `IF EXISTS`, `DO NOTHING`).

**8. Partial indexes tiết kiệm tài nguyên**

```sql
-- Chỉ index deadline_reminder dedup (không phải tất cả notifications)
CREATE UNIQUE INDEX idx_notifications_deadline_dedup
  ON notifications(student_id, ref_id, day_bucket)
  WHERE type = 'deadline_reminder';
```

Partial index nhỏ hơn full index → nhanh hơn, tốn ít storage hơn.

---

## 3. Thiết Kế API

### Patterns được dùng trong dự án

**1. Cấu trúc response nhất quán**

```javascript
// Luôn trả JSON
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

const err = (msg, status = 400) =>
  new Response(JSON.stringify({ error: msg }), { status, headers: { 'Content-Type': 'application/json' } });
```

Không bao giờ trả string thuần, HTML, hay mixed format. Client chỉ cần check một pattern.

**2. Path matching với named params**

```javascript
function matchPath(pattern, path) {
  // '/assignments/:id/submissions' + '/assignments/abc123/submissions'
  // → { id: 'abc123' }
}

if ((p = matchPath('/assignments/:id/submissions', path)) && method === 'GET') {
  // p.id = 'abc123'
}
```

Thứ tự match QUAN TRỌNG. Specific path phải đứng trước generic:

```javascript
// ĐÚNG thứ tự:
if (path === '/student/notifications/count') { ... }  // specific
if (path === '/student/notifications/read-all') { ... } // specific
if ((p = matchPath('/student/notifications/:id/read', path))) { ... } // parameterized
if ((p = matchPath('/student/notifications/:id', path))) { ... } // generic
```

> **Lỗi thường gặp:** Đặt `/student/notifications/:id` trước `/student/notifications/count` → "count" bị bắt như id.

**3. PATCH chỉ update field được gửi lên**

```javascript
// Không: cập nhật tất cả fields
UPDATE assignments SET title = $1, deadline = $2, is_active = $3 WHERE id = $4

// Đúng: chỉ update fields có trong body
const fields = [], vals = [];
if (body.title !== undefined)     { fields.push('title');     vals.push(body.title); }
if (body.deadline !== undefined)  { fields.push('deadline');  vals.push(body.deadline); }
if (body.is_active !== undefined) { fields.push('is_active'); vals.push(body.is_active); }
// → UPDATE assignments SET title=$1 WHERE id=$2
```

**4. Idempotency cho các thao tác quan trọng**

```sql
-- Không báo lỗi nếu đã tồn tại, không tạo duplicate
INSERT INTO student_email_events (...) VALUES (...)
ON CONFLICT (student_id, assignment_id, event_type) DO NOTHING;

-- Hoặc upsert
INSERT INTO student_profile_answers (student_id, field_id, value)
VALUES ($1, $2, $3)
ON CONFLICT (student_id, field_id) DO UPDATE SET value = EXCLUDED.value;
```

**5. Auto-close trước khi đọc dữ liệu nhạy cảm**

```javascript
// Gọi autoCloseExpired() trước khi trả dữ liệu assignment
if (...path === '/assignments/:id/question'...) {
  await autoCloseExpired(sql, { assignmentId: p.id });
  // Sau đó mới trả question data
}
```

Tránh trường hợp học sinh đọc đề bài NGAY SAU khi hết hạn trước cron chạy.

**6. Atomic claim pattern cho concurrent processing**

```javascript
// claimStudentEmailEvent: dùng UPDATE ... RETURNING để claim atomically
const [row] = await sql`
  UPDATE student_email_events
  SET status = 'sending', updated_at = NOW()
  WHERE student_id = ${studentId}
    AND status IN ('pending', 'failed')
  RETURNING student_id, assignment_id, event_type
`;
if (!row) return false; // Ai đó đã claim trước
```

Tránh 2 worker cùng xử lý một email → duplicate delivery.

---

## 4. Xác Thực & Bảo Mật

### Authentication

**1. Teacher auth — sai lầm trong thiết kế sớm**

Dự án hiện tại **không có teacher authentication** — mọi `/teacher/*` endpoint đều open. Đây là thiếu sót lớn nếu scale lên nhiều teacher. Ngay từ đầu cần xác định rõ:

- Một teacher hay nhiều?
- Nếu nhiều: cần JWT/session cho teacher ngay từ đầu, thêm `teacher_id` vào mọi query

> **Bài học:** Bắt đầu với "single-teacher mode" có thể OK cho MVP, nhưng cần ghi nhận rõ là technical debt và thiết kế schema có sẵn `teacher_id` FK để dễ mở rộng sau.

**2. Student JWT — implement đúng**

```javascript
// Signing
async function signJWT(payload, secret) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({ ...payload, exp: Date.now() + 86400000 })); // 24h
  const signature = await hmacSign(`${header}.${body}`, secret);
  return `${header}.${body}.${signature}`;
}

// Verification — luôn check cả signature VÀ expiry
async function verifyJWT(token, secret) {
  try {
    const [header, body, sig] = token.split('.');
    if (!header || !body || !sig) return null;
    const valid = await hmacVerify(`${header}.${body}`, sig, secret);
    if (!valid) return null;
    const payload = JSON.parse(atob(body));
    if (payload.exp < Date.now()) return null; // Expired
    return payload;
  } catch { return null; }
}
```

**3. Password hashing — dùng PBKDF2, không MD5/SHA-256 thuần**

```javascript
// Legacy (sai): SHA-256 không có salt
const hash = await crypto.subtle.digest('SHA-256', encode(password));

// Đúng: PBKDF2 với salt ngẫu nhiên
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey('raw', encode(password), 'PBKDF2', false, ['deriveBits']);
const bits = await crypto.subtle.deriveBits(
  { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
  key, 256
);
```

Dự án còn xử lý **migration tự động**: khi user login với password cũ (SHA-256), detect và re-hash bằng PBKDF2 ngay lúc đó — seamless migration không cần reset toàn bộ.

**4. SQL Injection — dùng template literals của Neon**

```javascript
// Sai — vulnerable to SQL injection
const rows = await sql(`SELECT * FROM students WHERE username = '${username}'`);

// Đúng — parameterized, Neon tự escape
const rows = await sql`SELECT * FROM students WHERE username = ${username}`;
```

**5. XSS — escape tất cả user input trước khi render HTML**

```javascript
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Luôn dùng escapeHtml khi render vào innerHTML
titleEl.innerHTML = `<strong>${escapeHtml(assignment.title)}</strong>`;

// Hoặc dùng textContent cho plain text
titleEl.textContent = assignment.title; // Tự escape
```

**6. Rate Limiting — KV-based sliding window**

```javascript
async function checkRateLimit(kv, key, limit, windowSecs) {
  const raw = await kv.get(key, 'json').catch(() => null);
  const now = Date.now();
  let { count = 0, reset = now + windowSecs * 1000 } = raw || {};
  if (now >= reset) { count = 0; reset = now + windowSecs * 1000; }
  count++;
  await kv.put(key, JSON.stringify({ count, reset }), { expirationTtl: windowSecs });
  return count > limit;
}

// Áp dụng:
// Global: 600 req/60s per IP
// Login: 10 req/60s per IP  
// AI feedback: 60 req/60s per IP
```

> **Lưu ý:** Nếu KV không available → graceful degrade (không block request). Không để rate limiting failure làm crash toàn bộ service.

**7. CORS — dynamic origin check**

```javascript
const ALLOWED_ORIGINS = [
  'https://ielts-teacher.pages.dev',
  'https://ielts-student.pages.dev',
];

const origin = request.headers.get('Origin') || '';
const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : null;
```

Không dùng `*` khi có authentication. Check exact origin string.

---

## 5. Frontend SPA Không Framework

### Kiến trúc được chọn: Vanilla JS

**Tại sao không dùng React/Vue?**
- Không cần build step → deploy trực tiếp lên Cloudflare Pages
- Bundle size nhỏ → tải nhanh hơn trên mobile
- Ít abstraction → dễ debug hơn cho team nhỏ

**Nhưng phải trả giá bằng:**
- Tự quản lý state thủ công (global variables)
- Tự implement router
- Dễ spaghetti code nếu không có kỷ luật

### Bài học Frontend

**1. Hash-based routing đơn giản và hiệu quả**

```javascript
function navigate(hash) {
  window.location.hash = hash;
  closeNavMenu();
}

window.addEventListener('hashchange', router);
window.addEventListener('load', router);

function router() {
  const hash = window.location.hash || '#/login';
  if (hash.startsWith('#/assignment/')) return renderAssignment(hash.split('/')[2]);
  if (hash === '#/home') return renderHome();
  // ...
}
```

Không cần pushState, không cần server-side routing config — hash change không reload trang.

**2. Global state — đặt tên rõ ràng với prefix `_`**

```javascript
let _student = null;           // Logged-in student info
let _selectedClass = null;     // Currently selected class
let _cachedCls = null;         // Cached class detail data
let _notifPanelOpen = false;   // UI state
let _flaggedSet = new Set();   // Question flags in exam
```

Quy ước: biến global bắt đầu bằng `_` để phân biệt với local variable.

**3. Draft autosave — cứu học sinh khi mất kết nối**

```javascript
const DRAFT_KEYS = {
  answers: `ielts_draft:${studentId}:${assignmentId}:answers`,
  writing: `ielts_draft:${studentId}:${assignmentId}:writing`,
  flags: `ielts_draft:${studentId}:${assignmentId}:flags`,
  startedAt: `ielts_draft:${studentId}:${assignmentId}:startedAt`,
};

// Auto-save mỗi 30 giây
_autoSaveTimer = setInterval(saveDraft, 30_000);

// Load draft khi vào lại trang
function loadDraft() {
  const answers = localStorage.getItem(DRAFT_KEYS.answers);
  if (answers) applyDraftAnswers(JSON.parse(answers));
}
```

**4. Tách biệt render và data fetch**

```javascript
// Sai: fetch và render lẫn lộn
async function showHome() {
  const data = await api.get('/classes');
  document.getElementById('main').innerHTML = data.map(c => `<div>${c.class_name}</div>`).join('');
}

// Đúng: tách rõ
async function loadHomeData() { return api.get('/classes'); }
function renderHome(classes) {
  return classes.map(c => `<div>${escapeHtml(c.class_name)}</div>`).join('');
}
async function showHome() {
  const classes = await loadHomeData();
  $('#main').innerHTML = renderHome(classes);
}
```

**5. Notification polling — không poll quá thường xuyên**

```javascript
// Poll badge count mỗi 60 giây — đủ real-time cho UX, không spam server
_notifPollTimer = setInterval(refreshNotifBadge, 60_000);

// Chỉ poll khi user đang ở trang (stop khi logout/class change)
function stopNotifPolling() {
  if (_notifPollTimer) clearInterval(_notifPollTimer);
  _notifPollTimer = null;
}
```

**6. escapeHtml cho MỌI user-generated content**

```javascript
// Bất kỳ chỗ nào render tên, tiêu đề, nội dung từ DB vào innerHTML
`<div class="title">${escapeHtml(assignment.title)}</div>`
`<td>${escapeHtml(student.full_name)}</td>`
```

Không có ngoại lệ.

---

## 6. Hệ Thống Upload File & Storage

### Thiết kế 2 luồng upload

**Luồng 1: Direct upload (server nhận file)**
```
Client → POST /uploads/audio (FormData) → Worker → R2
```
Đơn giản nhưng Worker phải buffer toàn bộ file trong memory → giới hạn 50-200MB, tốn CPU time của Worker.

**Luồng 2: Presigned URL (client upload thẳng vào R2)**
```
Client → POST /uploads/audio/presign → Worker → { upload_url, key }
Client → PUT upload_url (file thẳng vào R2, không qua Worker)
Client → POST /submit với { key }
```
Tốt hơn nhiều cho file lớn: Worker không cần buffer, không tốn CPU time.

> **Bài học:** Luôn dùng presigned URL cho file > 10MB. Direct upload chỉ dùng cho file nhỏ hoặc khi cần validate trước khi lưu.

### R2 Reference Counting — tránh orphaned files

```javascript
// Khi tạo file mới: tăng ref count
await r2RefIncrement(sql, r2Key);

// Khi xóa reference đến file: giảm ref count
// Chỉ xóa file thật sự khi ref_count <= 0
await r2SafeDelete(env, sql, r2Key);
```

**Tại sao cần điều này?**
Một file audio có thể được share giữa nhiều records. Nếu xóa record A → xóa file luôn → record B bị broken. Ref counting giải quyết vấn đề này.

### Magic byte sniffing cho audio

```javascript
async function sniffAudioFormat(buffer) {
  const bytes = new Uint8Array(buffer.slice(0, 16));
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return { mime: 'audio/wav', ext: 'wav' };    // RIFF
  if (bytes[0] === 0x49 && bytes[1] === 0x44) return { mime: 'audio/mpeg', ext: 'mp3' };   // ID3
  if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) return { mime: 'audio/mpeg', ext: 'mp3' }; // MPEG
  if (bytes[0] === 0x4F && bytes[1] === 0x67) return { mime: 'audio/ogg', ext: 'ogg' };    // OggS
  // ...
}
```

**Tại sao?** Browser đôi khi ghi sai Content-Type header. OpenAI STT từ chối file nếu MIME type không khớp. Magic byte check phát hiện format thật, không tin vào metadata của browser.

---

## 7. Email & Thông Báo

### Queue/Claim/Deliver Pattern

Đây là pattern quan trọng nhất cho hệ thống email production:

```
[Event xảy ra]
     ↓
queueStudentEmailEvent()     ← INSERT với ON CONFLICT DO NOTHING
     ↓
[Cron trigger mỗi giờ]
     ↓
processQueuedStudentEmails()
     ↓
claimStudentEmailEvent()     ← UPDATE status='sending' ATOMICALLY
     ↓
sendResendEmail()            ← Gọi Resend với idempotency key
     ↓
updateStudentEmailEvent()    ← status = 'sent' | 'failed' | 'skipped'
```

**Tại sao cần 3 bước riêng?**
- **Queue**: Tách việc "quyết định gửi email" khỏi "thực sự gửi email" → không block response
- **Claim**: Atomic UPDATE đảm bảo không có 2 worker cùng gửi 1 email
- **Deliver**: Isolated, có thể retry độc lập nếu fail

### Lỗi nghiêm trọng đã gặp: scheduled() đặt sai chỗ

```javascript
// SAI: scheduled() nằm bên trong AI_FEEDBACK_RESPONSE_SCHEMA
const AI_FEEDBACK_RESPONSE_SCHEMA = {
  type: 'object',
  properties: { ... },
  
  async scheduled(controller, env, ctx) { // ← ĐẶT SAI CHỖ!
    ...
  },
};

// ĐÚNG: scheduled() phải nằm trong export default
export default {
  async fetch(request, env, ctx) { ... },
  
  async scheduled(controller, env, ctx) { // ← ĐÚNG
    const sql = neon(env.DATABASE_URL);
    ctx.waitUntil((async () => {
      await autoCloseExpired(sql);
      await enqueueDeadline1DayEmails(sql);
      await processQueuedStudentEmails(sql, env, { limit: 200 });
    })());
  },
};
```

**Hậu quả:** Cloudflare throw "Handler does not export a scheduled() function" mỗi lần cron chạy. **Toàn bộ email nhắc deadline không bao giờ được gửi** từ ngày đầu triển khai. Lỗi này hoàn toàn silent — không có gì báo ra ngoài nếu không check Cloudflare Logs.

> **Bài học:** Luôn verify scheduled handler hoạt động ngay sau deploy đầu tiên. Check Cloudflare Dashboard → Logs → filter theo "cron" event.

### Bug: stale 'sending' không bao giờ được retry

```javascript
// processQueuedStudentEmails chỉ lấy pending và failed
WHERE status IN ('pending', 'failed')
// → Record bị kẹt ở 'sending' (do crash) không bao giờ được retry!

// Cần thêm:
WHERE status IN ('pending', 'failed')
   OR (status = 'sending' AND updated_at < NOW() - INTERVAL '15 minutes')
```

### Notification: 2 kênh riêng biệt

| | Bell (in-app) | Email |
|---|---|---|
| Type | new_assignment, deadline_reminder, score_released | new_assignment, score_released, deadline_1day |
| Trigger | Immediate / lazy-create | Cron hoặc immediate |
| Dedup | DB unique index | PK table |
| Retry | Không (stateless) | Có (status machine) |

**Điểm dễ nhầm:** `deadline_reminder` (bell, 3 ngày) ≠ `deadline_1day` (email, 24 giờ). Hai cơ chế hoàn toàn khác nhau, ngưỡng thời gian khác nhau.

### Lazy-create deadline_reminder: lợi và hại

**Lợi:** Không cần cron riêng để tạo bell notification, không tạo data thừa cho học sinh không bao giờ mở app.

**Hại:** Học sinh phải MỞ APP mới thấy reminder. Nếu không mở app trong 3 ngày trước deadline → không thấy bell notification (nhưng vẫn có email nếu setup đúng).

---

## 8. Timezone & Quốc Tế Hóa

### Lỗi timezone kinh điển — đã gặp thực tế

**Vấn đề:** `datetime-local` trả về string `"2026-05-08T07:00"` — **không có timezone info**.

```javascript
// SAI: gửi string naive lên server
const deadline = document.getElementById('assign-deadline').value;
// → "2026-05-08T07:00" (không TZ)
await api.post('/assignments', { deadline });
// → PostgreSQL interpret là UTC: 7:00 UTC = 14:00 Vietnam
```

**Hậu quả:** Teacher set deadline "7 giờ sáng" → database lưu "14 giờ" → học sinh thấy deadline "14 giờ" — lệch 7 tiếng.

**Fix:**
```javascript
// ĐÚNG: convert sang UTC trước khi gửi
const deadlineRaw = document.getElementById('assign-deadline').value;
const deadline = deadlineRaw ? new Date(deadlineRaw).toISOString() : null;
// → "2026-05-08T00:00:00.000Z" (7AM Vietnam = 0AM UTC)
```

**Tại sao `new Date("2026-05-08T07:00")` hoạt động đúng?**
Theo ECMAScript spec: string có cả date + time nhưng không có timezone → browser treat là **local time**. Gọi `.toISOString()` → convert sang UTC. Ở Vietnam (UTC+7), 7:00 local → 0:00 UTC. ✓

### Calendar date grouping bug

```javascript
// SAI: slice UTC date từ ISO string
const dateKey = assignment.deadline.slice(0, 10);
// "2026-05-08T18:30:00.000Z".slice(0, 10) = "2026-05-08"
// Nhưng ở Vietnam: 18:30 UTC = 01:30 ngày 09/05 Vietnam → hiện sai ngày!

// ĐÚNG: convert sang local date
function toDateKey(iso) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(iso));
}
```

### Quy tắc tuyệt đối về timezone

1. **Database**: Luôn dùng `TIMESTAMPTZ`, luôn lưu UTC
2. **API in/out**: Luôn dùng ISO 8601 với UTC (`Z` suffix hoặc `+00:00`)
3. **Frontend input** (`datetime-local`): Convert sang UTC bằng `new Date(value).toISOString()` TRƯỚC khi gửi lên API
4. **Frontend display**: Dùng `toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })`
5. **Email display**: Dùng `Intl.DateTimeFormat` với explicit timezone, không dùng `.toString()`
6. **Không bao giờ** `slice(0, 10)` một ISO string để lấy date — đó là UTC date, không phải local date

```javascript
// Luôn dùng pattern này cho display:
function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
```

---

## 9. Tích Hợp AI

### Lessons from OpenAI integration

**1. Dùng Structured Output (JSON Schema) — không parse tự do**

```javascript
const AI_FEEDBACK_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lr_score', 'lr', 'gra_score', 'gra'],
  properties: {
    lr_score: { type: 'number' },
    lr: {
      type: 'object',
      required: ['band_justification_md', 'strengths_md', 'errors_md', 'tips_md'],
      properties: { ... },
    },
  },
};
```

Không parse tự do bằng regex hay JSON.parse(response) không kiểm soát — dễ crash khi AI output sai format.

**2. Tách endpoint STT và Text — có thể cần key riêng cho proxy**

```javascript
const sttUrl = env.OPENAI_STT_URL || `${env.OPENAI_BASE_URL || 'https://api.openai.com'}/v1/audio/transcriptions`;
const sttKey = env.OPENAI_STT_BEARER_TOKEN || env.OPENAI_API_KEY;
```

**3. Magic byte sniffing trước khi gửi audio lên OpenAI**

OpenAI STT từ chối file nếu Content-Type không khớp. Browser có thể ghi sai MIME type. Luôn sniff actual format từ bytes trước khi gửi.

**4. Rate limit AI endpoint riêng**

```javascript
if (await checkRateLimit(env.KV, `ai:${clientIp}`, 60, 60))
  return err('Quá nhiều yêu cầu AI', 429);
```

AI calls tốn tiền và chậm (3-10s). Rate limit chặt hơn so với API chung.

**5. Detect region blocking**

```javascript
function isUnsupportedRegionOpenAIError(rawText) {
  return rawText.includes('unsupported_country_region_territory');
}
```

OpenAI block một số quốc gia. Trả lỗi friendly thay vì crash.

**6. Auto-grade cho Reading/Listening — exact match có vấn đề**

```javascript
// Hiện tại: exact string match (case-insensitive, trimmed)
if (q.answers.some(a => a.toLowerCase().trim() === normalized)) correct++;
```

Vấn đề: "a novel" vs "novel" → chưa handle. Cho IELTS thực tế, cần thêm các biến thể đáp án.

---

## 10. Serverless & Triển Khai

### Cloudflare Workers specifics

**1. `export default` phải có đủ handlers**

```javascript
export default {
  async fetch(request, env, ctx) { ... },    // HTTP requests
  async scheduled(controller, env, ctx) { }, // Cron triggers — ĐỪNG QUÊN!
};
```

Nếu thiếu `scheduled`, cron trigger sẽ throw `"Handler does not export a scheduled() function"` — **silent failure**, không có alert.

**2. `ctx.waitUntil()` cho background work**

```javascript
// Trả response ngay, xử lý email tiếp trong nền
ctx.waitUntil(processQueuedStudentEmails(sql, env));
return json(assignment, 201);
```

`waitUntil` không gia hạn CPU time limit (10ms free tier), chỉ gia hạn wall-clock time.

**3. Env vars — phân biệt `[vars]` và secrets**

```toml
# wrangler.toml — public config
[vars]
APP_TIMEZONE = "Asia/Ho_Chi_Minh"
R2_PUBLIC_URL = "https://..."

# Cloudflare Dashboard → Secrets — KHÔNG đưa vào repo
# DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, RESEND_API_KEY, EMAIL_FROM
```

**4. Verify deployment sau mỗi lần push**

Checklist tối thiểu sau deploy:
- [ ] HTTP endpoint trả đúng status
- [ ] Cron trigger hiện trong Dashboard → Triggers (count > 0)
- [ ] Check Logs sau giờ đầu tiên — có error nào không?
- [ ] Test một email flow end-to-end

**5. Placement mode**

```toml
[placement]
mode = "smart"
```

Cloudflare tự chọn data center gần database nhất để giảm latency.

### Cron trigger gotchas

**Cron `5 * * * *`** = "Phút thứ 5 của MỖI giờ" = 00:05, 01:05, 02:05, ..., 23:05

**Tác động đến deadline email:**
- Nếu teacher giao bài lúc 20:42 với deadline gần 23h sau → deadline_1day email queue ngay lúc 21:05 (23 phút sau khi giao bài).
- Học sinh nhận 2 email cách nhau < 30 phút: "Bài mới" rồi ngay "Sắp hết hạn" — UX không tốt.

---

## 11. Domain, DNS & CDN

### Cloudflare Pages + Workers setup

```
Teacher frontend: ielts-teacher.pages.dev → Cloudflare Pages
Student frontend: ielts-student.pages.dev → Cloudflare Pages
API:             ielts-teacher-api.workers.dev → Cloudflare Worker
R2 public:       pub-xxx.r2.dev → Cloudflare R2 CDN
```

### Bài học về Domain & DNS

**1. Dùng custom domain ngay từ đầu nếu có thể**

`*.pages.dev` và `*.workers.dev` ổn cho dev/staging, nhưng production nên dùng custom domain. Lý do:
- Branding và trust
- Dễ migrate provider sau này
- Custom domain trên Cloudflare Pages/Workers → miễn phí

**2. CORS phải match EXACT origin — không dùng wildcard**

```javascript
// Sai cho production (có authentication):
'Access-Control-Allow-Origin': '*'

// Đúng:
const ALLOWED_ORIGINS = ['https://ielts-teacher.pages.dev', 'https://ielts-student.pages.dev'];
const allowOrigin = ALLOWED_ORIGINS.includes(request.headers.get('Origin'))
  ? request.headers.get('Origin') : null;
```

**3. DNS propagation có thể mất đến 48h**

TTL thấp hơn (300s thay vì 86400s) giúp propagate nhanh hơn khi thay đổi.

**4. HTTPS là bắt buộc cho Web Crypto API**

`crypto.subtle` chỉ hoạt động trên HTTPS (hoặc localhost). Cloudflare Pages tự động HTTPS.

**5. Cache headers cho static assets**

```javascript
// Files trên R2 — cache 1 năm vì URL chứa UUID (content-addressed)
'Cache-Control': 'public, max-age=31536000, immutable'

// API responses — không cache
'Cache-Control': 'no-store'
```

---

## 12. Hiệu Năng & Khả Năng Chịu Tải

### Những gì đã làm đúng

**1. Edge computing** — Cloudflare Worker chạy tại 300+ PoP, request từ Vietnam đến edge gần nhất < 5ms.

**2. Batch operations thay vì N+1 queries**

```javascript
// SAI: N+1 query
for (const student of students) {
  const submission = await sql`SELECT ... WHERE student_id = ${student.id}`;
}

// ĐÚNG: single JOIN query
const data = await sql`
  SELECT s.*, sub.overall_score
  FROM student_classes sc
  JOIN students s ON s.id = sc.student_id
  LEFT JOIN submissions sub ON sub.assignment_id = ${id} AND sub.student_id = s.id
  WHERE sc.class_id = ${classId}
`;
```

**3. `Promise.allSettled()` cho parallel operations**

```javascript
await Promise.allSettled(rows.map(row =>
  deliverQueuedStudentEmail(sql, env, { ...row })
));
```

**4. Phân trang — limit kết quả mọi lúc**

```sql
LIMIT 50   -- Notification list
LIMIT 200  -- Email batch per cron run
```

### Những điểm cần cải thiện

**1. Không có connection pooling** — Mỗi Worker request tạo `neon()` connection mới. Nên dùng pooling endpoint của Neon ở scale cao.

**2. Không có background job queue thực sự** — `ctx.waitUntil()` có thể bị terminate. Production nên dùng Cloudflare Queues.

**3. KV rate limiting không chính xác 100%** — Eventual consistency → bypass nhẹ ở traffic cao. Chấp nhận được cho hệ thống học, không OK cho payment.

**4. Chưa có CDN cho API responses** — Data ít thay đổi (question pool) có thể cache với TTL ngắn.

---

## 13. Các Lỗi Điển Hình Cần Tránh

### Nhóm 1: Timezone & Datetime

| Lỗi | Hậu quả | Fix |
|---|---|---|
| Dùng `datetime-local` value trực tiếp không convert | Deadline lệch N giờ = UTC offset | `new Date(value).toISOString()` |
| `deadline.slice(0, 10)` để lấy date | Ngày sai ở timezone UTC+N | `Intl.DateTimeFormat` với timeZone |
| Lưu `TIMESTAMP` thay vì `TIMESTAMPTZ` | Mất timezone info trong DB | Luôn dùng `TIMESTAMPTZ` |
| Display trực tiếp ISO string | User thấy "2026-05-08T07:00:00.000Z" | `toLocaleString('vi-VN', { timeZone: '...' })` |

### Nhóm 2: Export & Module Structure

| Lỗi | Hậu quả | Fix |
|---|---|---|
| `scheduled()` đặt trong object khác thay vì `export default` | Cron chạy nhưng handler không được gọi — silent failure | Luôn verify structure của export default |
| Quên `export default` cho handler | 404 mọi request | Check build output |

### Nhóm 3: Database & Data Integrity

| Lỗi | Hậu quả | Fix |
|---|---|---|
| Không có unique constraint → check bằng code | Race condition → duplicate data | Dùng DB constraint + `ON CONFLICT` |
| `ON DELETE CASCADE` thiếu cân nhắc | Xóa nhầm cascade dữ liệu quan trọng | Phân tích kỹ trước khi chọn CASCADE vs RESTRICT |
| Không có index trên FK columns | Full table scan trên mọi JOIN | Index mọi FK column + hot WHERE columns |
| Query không có LIMIT | Trả toàn bộ table khi data lớn | Luôn LIMIT kết quả, phân trang |

### Nhóm 4: Security

| Lỗi | Hậu quả | Fix |
|---|---|---|
| String concatenation trong SQL | SQL Injection | Parameterized queries luôn luôn |
| Render user input trực tiếp vào innerHTML | XSS | `escapeHtml()` hoặc `.textContent` |
| `Access-Control-Allow-Origin: *` với auth | CSRF, data leak | Whitelist exact origins |
| Secrets trong `wrangler.toml` | Lộ vào git history | Cloudflare Secrets hoặc `.env` không commit |
| JWT không check expiry | Token cũ vẫn hoạt động mãi | Luôn check `exp < Date.now()` |

### Nhóm 5: Async & Background Jobs

| Lỗi | Hậu quả | Fix |
|---|---|---|
| Email queue stuck ở `sending` không retry | Email lost vĩnh viễn | Thêm stale-sending vào batch query |
| `await` tuần tự trong loop | N×latency thay vì 1×latency | `Promise.allSettled()` cho independent ops |
| Không dùng `ON CONFLICT DO NOTHING` cho queue | Duplicate email khi retry | Idempotent inserts |
| Không có idempotency key cho email provider | Duplicate delivery khi retry | `Idempotency-Key` header |

### Nhóm 6: API Design

| Lỗi | Hậu quả | Fix |
|---|---|---|
| Generic path match trước specific | `/notifications/count` bị bắt như `/:id` | Order: specific → generic |
| PATCH update tất cả fields | Mất data nếu client không gửi đủ | Chỉ update fields có trong request body |
| Không validate path params là UUID | Crash khi inject ký tự đặc biệt | Parse và validate UUID trước khi query |
| Không có rate limiting cho AI endpoint | Chi phí API không giới hạn | Rate limit riêng cho các endpoint tốn tiền |

### Nhóm 7: Frontend

| Lỗi | Hậu quả | Fix |
|---|---|---|
| Thiếu `stopNotifPolling()` khi logout | Memory leak, stale poll | Clear interval khi user logout hoặc class change |
| Không save draft | Mất data khi mất kết nối | Auto-save vào localStorage mỗi 30s |
| render innerHTML không escape | XSS từ DB content | `escapeHtml()` mọi user-generated field |
| `datetime-local` pre-fill sai giờ | Form hiển thị sai deadline hiện tại | Convert UTC → local khi pre-fill |

### Nhóm 8: Vận Hành

| Lỗi | Hậu quả | Fix |
|---|---|---|
| Không verify cron hoạt động sau deploy | Cron silent fail mãi mãi | Check Dashboard Logs sau lần deploy đầu |
| Secrets không set trong Cloudflare | Feature bị lỗi, khó debug | Checklist secrets khi deploy |
| Không có migration versioning | Không biết DB đang ở state nào | Migrations đánh số, chạy một chiều |
| R2 files không được cleanup | Storage leak, tốn chi phí | Ref counting + cleanup job |

---

## Checklist Trước Khi Start Implement

### Thiết kế hệ thống

- [ ] Xác định rõ có bao nhiêu loại user (role) và auth mechanism cho từng role
- [ ] Thiết kế schema database với đầy đủ FK, constraint, index từ đầu
- [ ] Xác định timezone của app và convention lưu/hiển thị ngay từ đầu
- [ ] Phân loại data nào cần consistent, data nào có thể eventual
- [ ] Thiết kế API response format nhất quán trước khi code

### Bảo mật

- [ ] Tất cả secrets ở đâu? Không bao giờ trong code/repo
- [ ] CORS config đúng chưa?
- [ ] Rate limiting cho endpoint nào?
- [ ] Authentication cho endpoint nào? Authorization check đúng không?
- [ ] Tất cả user input có được sanitize/escape không?

### Infrastructure

- [ ] Cron trigger/scheduled job có được verify hoạt động ngay sau deploy?
- [ ] Environment variables (secrets) đã setup đủ chưa?
- [ ] File upload có size limit? MIME type validation?
- [ ] Background jobs có retry mechanism không? Có thể stuck không?

### Testing trước launch

- [ ] End-to-end flow: tạo → giao → nộp → chấm → nhận điểm
- [ ] Email: gửi thực tế, check inbox lẫn spam
- [ ] Timezone: set deadline 7h sáng → hiển thị đúng không? auto-close đúng không?
- [ ] Mobile: UI có responsive không?
- [ ] Error cases: invalid input, auth fail, network fail

---

*Tài liệu này được tổng hợp từ quá trình xây dựng và debug hệ thống IELTS Web. Cập nhật lần cuối: 2026-05-11.*
