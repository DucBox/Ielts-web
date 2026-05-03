# IELTS Web Platform — Context Document

> **Mục đích:** File này mô tả kiến trúc và thiết kế tổng quan của toàn bộ hệ thống IELTS Web, dùng làm reference khi phát triển tiếp.
> **Chi tiết trạng thái implement:** xem `docs/project_status.md`

---

## 1. Kiến trúc tổng quan

```
Teacher App                         Student App
teacher/frontend/  (Cloudflare Pages)   students/frontend/  (Cloudflare Pages)
        │                                       │
        └──────────────┬────────────────────────┘
                       ▼
            Cloudflare Worker API
            teacher/backend/src/worker.js
            Prod: https://ielts-teacher-api.quangducngo0811.workers.dev
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
      NeonDB (PostgreSQL)    Cloudflare R2
      @neondatabase/serverless  bucket: ielts-web
      HTTP-based driver         Public URL: https://pub-75b0370b5b5a4c15b26531707c369a0f.r2.dev
```

- **Frontend:** Vanilla HTML/CSS/JS, hash-based SPA router (`#/path`), không framework
- **Backend:** Cloudflare Workers (JS module), `@neondatabase/serverless` kết nối NeonDB qua HTTP
- **Storage:** Cloudflare R2 — audio files với public URL trực tiếp
- **Auth teacher:** Không có (teacher quản lý deployment trực tiếp — by design)
- **Auth student:** PBKDF2 password hash (Web Crypto API, 100k iterations) + JWT HS256 session token

---

## 2. Database Schema (NeonDB — PostgreSQL)

### Enum
```sql
CREATE TYPE skill_type AS ENUM ('listening', 'reading', 'writing', 'speaking');
```

### Bảng `teachers`
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
full_name   TEXT NOT NULL
email       TEXT UNIQUE NOT NULL
created_at  TIMESTAMPTZ DEFAULT NOW()
```
> Hiện chỉ có 1 record mặc định, không có auth.

### Bảng `classes`
```sql
id          UUID PRIMARY KEY
teacher_id  UUID REFERENCES teachers(id) ON DELETE CASCADE
class_name  TEXT NOT NULL
description TEXT
created_at  TIMESTAMPTZ
```

### Bảng `students`
```sql
id            UUID PRIMARY KEY
full_name     TEXT NOT NULL
username      TEXT UNIQUE NOT NULL
password_hash TEXT NOT NULL   -- PBKDF2 format: "saltB64.hashB64" (legacy: 64-char hex SHA-256)
```
> Student không còn có `class_id` — đã migrate sang `student_classes` junction table.

### Bảng `student_classes` *(junction — student có thể thuộc nhiều lớp)*
```sql
student_id  UUID REFERENCES students(id) ON DELETE CASCADE
class_id    UUID REFERENCES classes(id)  ON DELETE CASCADE
joined_at   TIMESTAMPTZ DEFAULT NOW()
PRIMARY KEY (student_id, class_id)
```

### Bảng `question_pool`
```sql
id             UUID PRIMARY KEY
teacher_id     UUID REFERENCES teachers(id)
skill          skill_type NOT NULL
title          TEXT NOT NULL
content_text   TEXT                  -- bài đọc (reading), câu hỏi (listening/speaking), đề bài (writing)
content_url    TEXT                  -- public R2 URL của audio (listening)
questions_data JSONB DEFAULT '[]'    -- reading & listening (xem cấu trúc bên dưới)
vocabulary     JSONB DEFAULT '[]'    -- từ vựng trong bài (reading & listening)
created_at     TIMESTAMPTZ
```

**Cấu trúc `questions_data`:**
```json
[
  {
    "q_no": 1,
    "answers": ["answer A", "answer B"],
    "location": "đoạn text tham chiếu trong bài đọc",
    "explanation": "giải thích tại sao đáp án đúng"
  }
]
```

**Cấu trúc `vocabulary`:**
```json
[
  { "word": "abandon", "definition": "từ bỏ, bỏ rơi", "example": "He abandoned his car." }
]
```

### Bảng `assignments`
```sql
id                  UUID PRIMARY KEY
class_id            UUID REFERENCES classes(id)       ON DELETE CASCADE
question_id         UUID REFERENCES question_pool(id) ON DELETE CASCADE
title               TEXT NOT NULL
deadline            TIMESTAMPTZ   -- nullable
is_active           BOOLEAN DEFAULT TRUE
last_auto_closed_at TIMESTAMPTZ   -- nullable; tracks last auto-close to allow manual reopen
created_at          TIMESTAMPTZ
```
> Class-level: toàn bộ học sinh trong lớp làm chung 1 đề.
> Auto-close: helper `autoCloseExpired()` chạy ở mọi endpoint GET assignment. Chỉ đóng 1 lần per deadline (điều kiện `last_auto_closed_at IS NULL OR last_auto_closed_at < deadline`). Teacher reopen bài quá hạn không bị đóng lại. Submit chỉ check `is_active`, không check `deadline` (Phương án X).

### Bảng `submissions`
```sql
id                  UUID PRIMARY KEY
assignment_id       UUID REFERENCES assignments(id) ON DELETE CASCADE
student_id          UUID REFERENCES students(id)    ON DELETE CASCADE
student_answers     JSONB   -- [{ q_no, answer: "string" }] — reading/listening
writing_content     TEXT    -- writing
speaking_audio_url  TEXT    -- public R2 URL — speaking
speaking_script     TEXT    -- AI transcript (OpenAI gpt-4o-mini-transcribe)
ai_feedback         JSONB   -- AI analysis (writing/speaking, teacher-only)
teacher_feedback    JSONB   -- { annotations: [...], overall: "...", score: 7.0 }
overall_score       FLOAT   -- 0–9 band score
status              TEXT DEFAULT 'submitted'
submitted_at        TIMESTAMPTZ
```

---

## 3. API Endpoints

Base URL prod: `https://ielts-teacher-api.quangducngo0811.workers.dev`

### Auth (Student)
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/auth/login` | `{ username, password }` → `{ student, token }`. Auto-migrate SHA-256 → PBKDF2 on success |

### Classes
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/classes` | Danh sách lớp + `student_count`, `assignment_count` |
| POST | `/classes` | `{ class_name, description? }` |
| GET | `/classes/:id` | Chi tiết lớp + `assignments[]` |
| PATCH | `/classes/:id` | `{ class_name?, description? }` |
| DELETE | `/classes/:id` | |
| GET | `/classes/:id/students` | Danh sách học sinh trong lớp |

### Students
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/students` | `{ full_name, username, password, class_id? }` |
| PATCH | `/students/:id` | `{ full_name?, password? }` |
| DELETE | `/students/:id` | |
| POST | `/student-classes` | `{ class_id, student_id? }` hoặc `{ class_id, username }` |
| DELETE | `/student-classes?student_id=&class_id=` | Xoá khỏi lớp |

### Question Pool
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/questions` | Danh sách đề. Filter: `?skill=` |
| POST | `/questions` | JSON hoặc multipart (có audio). R2 atomicity rollback |
| GET | `/questions/:id` | Chi tiết đề |
| PATCH | `/questions/:id` | `{ title?, content_text?, questions_data?, vocabulary? }` |
| DELETE | `/questions/:id` | Từ chối nếu đang dùng trong assignment |

### Assignments
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/assignments?class_id=` | Bài tập của lớp |
| POST | `/assignments` | `{ class_id, question_id, title, deadline? }` |
| PATCH | `/assignments/:id` | `{ title?, deadline?, is_active? }` |
| DELETE | `/assignments/:id` | |
| GET | `/assignments/:id/submissions` | Danh sách học sinh + trạng thái nộp |
| GET | `/assignments/:id/question` | Chi tiết đề (student — JWT required) |
| GET | `/assignments/:id/vocabulary` | Từ vựng của bài (student — JWT required) |
| POST | `/assignments/:id/submit` | Nộp bài. JSON hoặc multipart (speaking). Auto-grade reading/listening |

### Submissions
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/submissions?assignment_id=&student_id=` | Bài nộp (student — JWT required) |
| GET | `/submissions/:id` | Chi tiết bài nộp (teacher) |
| PATCH | `/submissions/:id` | `{ teacher_feedback?, overall_score? }` |
| POST | `/submissions/:id/ai-feedback` | Gọi OpenAI phân tích, lưu vào `ai_feedback` |

### Student Dashboard
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/student/assignments?student_id=&class_id=` | Bài tập active + trạng thái submission |

### File Serving
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/files/:key` | Serve R2 file (fallback legacy) |

---

## 4. Cloudflare R2 Storage

- **Bucket:** `ielts-web`
- **Public URL:** `https://pub-75b0370b5b5a4c15b26531707c369a0f.r2.dev`
- **Key format listening audio:** `audio/<uuid>-<filename>`
- **Key format speaking audio:** `speaking/<assignment_id>/<student_id>-<uuid>`

**Atomicity rule (bắt buộc):**
- Upload R2 → DB fail → `R2.delete(key)` rollback
- Xoá: xoá DB record trước → xoá R2 sau (best effort, log error không throw)

---

## 5. Security (hiện trạng)

| Layer | Biện pháp |
|-------|-----------|
| Password | PBKDF2 100k iterations + random 16-byte salt (Web Crypto API). Auto-migrate SHA-256 cũ khi login thành công |
| Session | JWT HS256, exp 24h, signed bằng `JWT_SECRET` (Cloudflare secret) |
| CORS | Dynamic per-origin: whitelist `ielts-teacher.pages.dev` và `ielts-student.pages.dev` |
| File upload | 50MB max + `audio/*` MIME check cho student submissions; 200MB max cho teacher audio |
| XSS | `escapeHtml()` cho mọi user data trong innerHTML; `textContent` cho modal titles |
| R2 path | Validate key không chứa `..` hoặc bắt đầu bằng `/` |
| Error messages | Generic 500 cho client; detail chỉ log server-side |
| CSP | Via Cloudflare Pages `_headers` file — cả teacher và student frontend |

---

## 6. Dev Setup

```bash
# Backend
cd teacher/backend
npm install
npm run dev:remote   # wrangler dev --remote

# Student frontend — mở trực tiếp trong browser hoặc dùng Live Server
# Teacher frontend — tương tự
```

**Secrets (không commit):** `teacher/backend/.dev.vars`
```
DATABASE_URL="..."
OPENAI_API_KEY="..."
JWT_SECRET="..."
```

---

## 7. Quyết định kỹ thuật quan trọng

| Vấn đề | Quyết định | Lý do |
|--------|-----------|-------|
| Framework | Không dùng — vanilla JS | Dễ deploy static, không build step |
| Router | Hash-based (`#/path`) | Không cần web server config |
| State | Module-level vars | Tránh JSON-in-onclick bug với ký tự đặc biệt |
| Teacher auth | Không có | Single teacher, deployment tự quản lý |
| Student auth | PBKDF2 + JWT | Bảo mật đủ cho quy mô, không cần framework auth |
| Assignment scope | Class-level | Thiết kế nghiệp vụ |
| Audio storage | R2 public URL trực tiếp | Tránh băng thông Worker |
| DB + R2 atomicity | Upload → DB fail → rollback R2 | Tránh orphan files |
| CORS | Per-request dynamic (closure) | Tránh race condition module-level state |
| Student IDs | UUID (không phải integer) | Validation chỉ cần non-empty check, không parseInt |
