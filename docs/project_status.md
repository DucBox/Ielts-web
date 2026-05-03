# IELTS Web Platform - Project Status

> **Nguyen tac bao tri:** Moi khi implement hoac modify bat ky thu gi, cap nhat file nay ngay.
> Cap nhat lan cuoi: 2026-05-04 (batch: verified-codebase-storage-db-sync)
>
> **Da kiem chung 2026-05-04:** `teacher/backend/src/worker.js`, `teacher/backend/wrangler.toml`, `teacher/backend/schema.sql`, migrations `001-005`, metadata schema that tren NeonDB, `teacher/frontend/js/app.js`, `students/frontend/js/app.js`, 2 API clients va Pages `_headers`.

---

## 1. Kien Truc & Stack

```
Teacher App (teacher/frontend/)           Student App (students/frontend/)
Cloudflare Pages                          Cloudflare Pages
        |                                         |
        +-------------------+---------------------+
                            v
                 Cloudflare Worker API
                 teacher/backend/src/worker.js
                 Dev:  http://localhost:8787  (npm run dev / dev:remote)
                 Prod: https://ielts-teacher-api.quangducngo0811.workers.dev
                            |
          +-----------------+------------------+
          v                                    v
    NeonDB (PostgreSQL)                 Cloudflare R2
    @neondatabase/serverless             bucket: ielts-web
    HTTP driver                          public URL: https://pub-75b0370b5b5a4c15b26531707c369a0f.r2.dev
                            |
                            v
                Cloudflare KV (rate limit)
```

- **Frontend:** Vanilla HTML/CSS/JS, hash-based SPA router (`#/path`), khong co build step/framework.
- **Shared styling:** `shared/theme.css` + CSS rieng tung app.
- **Backend:** Cloudflare Workers JS module, `compatibility_flags = ["nodejs_compat"]`.
- **DB:** Neon PostgreSQL qua `@neondatabase/serverless`.
- **Storage:** Cloudflare R2 binding `R2`; public URL dung truc tiep cho media/images.
- **Rate limit:** Cloudflare KV binding `KV`, sliding window best-effort.
- **Auth teacher:** Khong co, by design cho single-teacher deployment tu quan ly.
- **Auth student:** PBKDF2 password hash + JWT HS256 24h. Legacy SHA-256 tu dong migrate khi login thanh cong.
- **AI/STT:** OpenAI Responses API cho AI feedback; OpenAI `gpt-4o-mini-transcribe` cho STT. Worker co ho tro proxy URL qua env neu Cloudflare egress bi chan vung.

---

## 2. Runtime Config & Secrets

### Wrangler bindings/vars

| Item | Gia tri/ghi chu |
|------|-----------------|
| Worker name | `ielts-teacher-api` |
| Main | `src/worker.js` |
| KV binding | `KV` |
| R2 binding | `R2` |
| R2 bucket | `ielts-web` |
| `R2_PUBLIC_URL` | `https://pub-75b0370b5b5a4c15b26531707c369a0f.r2.dev` |
| Observability | enabled |
| Placement | smart |

### Secrets/env duoc code su dung

| Env | Bat buoc? | Dung cho |
|-----|----------|----------|
| `DATABASE_URL` | Co | Ket noi NeonDB |
| `JWT_SECRET` | Co cho student endpoints | Ky/xac thuc JWT |
| `OPENAI_API_KEY` | Co cho STT/AI | OpenAI STT va AI feedback |
| `R2_ACCOUNT_ID` | Co neu dung presigned upload | Tao S3 presigned PUT URL |
| `R2_ACCESS_KEY_ID` | Co neu dung presigned upload | Tao S3 presigned PUT URL |
| `R2_SECRET_ACCESS_KEY` | Co neu dung presigned upload | Tao S3 presigned PUT URL |
| `R2_BUCKET_NAME` | Co neu dung presigned upload | Lay bucket khi ky URL |
| `OPENAI_BASE_URL` | Tuy chon | Override base OpenAI chung |
| `OPENAI_STT_URL` | Tuy chon | Route STT qua proxy rieng |
| `OPENAI_STT_BEARER_TOKEN` | Tuy chon | Bearer token gui toi STT proxy |
| `OPENAI_RESPONSES_URL` | Tuy chon | Route Responses API qua proxy rieng |

> `.dev.vars` local hien co key `DATABASE_URL`, `OPENAI_API_KEY`, `JWT_SECRET`. Khong duoc commit hoac in secret value ra tai lieu/log.

---

## 3. Database Schema (NeonDB - PostgreSQL)

> Metadata schema that da duoc query truc tiep tu NeonDB ngay 2026-05-04. Khong co bang nao trong danh sach duoi bi thieu. `teacher/backend/schema.sql` da duoc dong bo thanh bootstrap schema cho fresh DB; voi DB da ton tai, van dung migrations `001-005` de nang cap an toan.

### Enum

```sql
CREATE TYPE skill_type AS ENUM ('listening', 'reading', 'writing', 'speaking');
```

### `teachers`

| Cot | Kieu | Ghi chu |
|-----|------|---------|
| `id` | UUID PK | default `gen_random_uuid()` |
| `full_name` | TEXT NOT NULL | |
| `email` | TEXT NOT NULL UNIQUE | |
| `created_at` | TIMESTAMPTZ | default `now()` |

> Code lay `SELECT id FROM teachers LIMIT 1`; khong co teacher auth.

### `classes`

| Cot | Kieu | Ghi chu |
|-----|------|---------|
| `id` | UUID PK | default `gen_random_uuid()` |
| `teacher_id` | UUID FK -> `teachers.id` | nullable o DB, app insert tu teacher dau tien |
| `class_name` | TEXT NOT NULL | |
| `description` | TEXT | nullable |
| `created_at` | TIMESTAMPTZ | default `now()` |

### `students`

| Cot | Kieu | Ghi chu |
|-----|------|---------|
| `id` | UUID PK | default `gen_random_uuid()` |
| `full_name` | TEXT NOT NULL | |
| `username` | TEXT NOT NULL UNIQUE | auto-generated tu ho ten trong teacher UI |
| `password_hash` | TEXT NOT NULL | PBKDF2 `saltB64.hashB64`; legacy 64-char SHA-256 se auto-migrate |

> `students.class_id` **khong con ton tai trong DB that**. Quan he lop-hoc-sinh dung bang junction `student_classes`.

### `student_classes`

| Cot | Kieu | Ghi chu |
|-----|------|---------|
| `student_id` | UUID FK -> `students.id` | ON DELETE CASCADE |
| `class_id` | UUID FK -> `classes.id` | ON DELETE CASCADE |
| `joined_at` | TIMESTAMPTZ NOT NULL | default `now()` |
| PRIMARY KEY | (`student_id`, `class_id`) | student co the thuoc nhieu lop |

### `question_pool`

| Cot | Kieu | Ghi chu |
|-----|------|---------|
| `id` | UUID PK | default `gen_random_uuid()` |
| `teacher_id` | UUID FK -> `teachers.id` | |
| `skill` | `skill_type` NOT NULL | listening/reading/writing/speaking |
| `title` | TEXT NOT NULL | ten de |
| `content_text` | TEXT | plain text fallback/derived tu text blocks |
| `content_blocks` | JSONB | rich mixed content: text/html blocks + image blocks |
| `content_url` | TEXT | public R2 URL cho listening audio |
| `questions_data` | JSONB NOT NULL | default `[]`; reading/listening answers |
| `vocabulary` | JSONB | default `[]`; tu vung do GV bien soan |
| `tags` | TEXT[] | default `{}`; co GIN index |
| `script` | TEXT | listening transcript/script de locate va cho HS xem sau nop |
| `created_at` | TIMESTAMPTZ | default `now()` |

**`content_blocks`:**

```json
[
  { "id": "block-1", "type": "text", "text": "plain text", "html": "<p>optional sanitized html</p>" },
  { "id": "block-2", "type": "image", "url": "https://...r2.dev/images/uuid.png", "alt": "chart", "width": 80 }
]
```

**`questions_data`:**

```json
[
  {
    "q_no": 1,
    "answers": ["answer A", "answer B"],
    "location": "selected reference text",
    "location_meta": { "type": "content_blocks_range", "start_block_id": "...", "end_block_id": "..." },
    "explanation": "giai thich dap an"
  }
]
```

**`vocabulary`:**

```json
[
  { "word": "abandon", "definition": "tu bo", "example": "He abandoned his car." }
]
```

### `assignments`

| Cot | Kieu | Ghi chu |
|-----|------|---------|
| `id` | UUID PK | default `gen_random_uuid()` |
| `class_id` | UUID FK -> `classes.id` | app bat buoc |
| `question_id` | UUID FK -> `question_pool.id` | app bat buoc |
| `title` | TEXT NOT NULL | ten bai giao |
| `deadline` | TIMESTAMPTZ | nullable |
| `is_active` | BOOLEAN | default true |
| `last_auto_closed_at` | TIMESTAMPTZ | nullable; track auto-close gan nhat |
| `created_at` | TIMESTAMPTZ | default `now()` |

> Assignment la class-level. Deadline qua han chi tu dong dong 1 lan cho moi gia tri deadline. Neu GV mo lai bai qua han, backend chi check `is_active`, khong chan submit bang deadline rieng.

### `submissions`

| Cot | Kieu | Ghi chu |
|-----|------|---------|
| `id` | UUID PK | default `gen_random_uuid()` |
| `assignment_id` | UUID FK -> `assignments.id` | |
| `student_id` | UUID FK -> `students.id` | |
| `student_answers` | JSONB | reading/listening `[{ q_no, answer }]` |
| `writing_content` | TEXT | writing |
| `speaking_audio_url` | TEXT | public R2 URL |
| `speaking_script` | TEXT | transcript tu STT |
| `ai_feedback` | JSONB | teacher-only AI analysis |
| `teacher_feedback` | JSONB | annotations + overall + score |
| `overall_score` | DOUBLE PRECISION | band 0-9; auto-grade cho reading/listening |
| `status` | TEXT | default `submitted` |
| `submitted_at` | TIMESTAMPTZ | default `now()` |

**`teacher_feedback`:**

```json
{
  "annotations": [
    { "id": "uuid", "start": 0, "end": 50, "text": "selected text", "comment": "nhan xet GV" }
  ],
  "overall": "Nhan xet tong the",
  "score": 7.0
}
```

**`ai_feedback`:**

```json
{
  "lr_score": 6.5,
  "lr_feedback": "...",
  "gra_score": 6.0,
  "gra_feedback": "...",
  "generated_at": "ISO timestamp"
}
```

### `practice_attempts`

| Cot | Kieu | Ghi chu |
|-----|------|---------|
| `id` | UUID PK | default `gen_random_uuid()` |
| `student_id` | UUID FK -> `students.id` | |
| `assignment_id` | UUID FK -> `assignments.id` | |
| `attempt_type` | TEXT NOT NULL | `retry_wrong` hoac `retry_full` |
| `student_answers` | JSONB NOT NULL | default `[]` |
| `correct_count` | INT NOT NULL | default 0 |
| `total_count` | INT NOT NULL | default 0 |
| `attempted_at` | TIMESTAMPTZ | default `now()` |

### `profile_fields`

| Cot | Kieu | Ghi chu |
|-----|------|---------|
| `id` | UUID PK | default `gen_random_uuid()` |
| `label` | TEXT NOT NULL | cau hoi ho so do GV tao |
| `field_type` | TEXT NOT NULL | `text`, `textarea`, `select`, `date` |
| `options` | JSONB | list option cho select |
| `display_order` | INT | default 0 |
| `created_at` | TIMESTAMPTZ | default `now()` |

### `student_profile_answers`

| Cot | Kieu | Ghi chu |
|-----|------|---------|
| `student_id` | UUID FK -> `students.id` | |
| `field_id` | UUID FK -> `profile_fields.id` | |
| `value` | TEXT | |
| `updated_at` | TIMESTAMPTZ | default `now()` |
| PRIMARY KEY | (`student_id`, `field_id`) | |

### `student_vocab`

| Cot | Kieu | Ghi chu |
|-----|------|---------|
| `student_id` | UUID FK -> `students.id` | |
| `word` | TEXT NOT NULL | |
| `definition` | TEXT NOT NULL | default empty string |
| `example` | TEXT NOT NULL | default empty string |
| `source` | TEXT NOT NULL | default empty string |
| `saved_at` | TIMESTAMPTZ | default `now()` |
| PRIMARY KEY | (`student_id`, `word`) | |

### `vocab_sessions`

| Cot | Kieu | Ghi chu |
|-----|------|---------|
| `id` | UUID PK | default `gen_random_uuid()` |
| `student_id` | UUID FK -> `students.id` | |
| `practiced_at` | TIMESTAMPTZ | default `now()` |

### Indexes quan trong da co tren NeonDB

- `idx_classes_teacher_created`
- `idx_student_classes_class_student`
- `idx_assignments_class_created`
- `idx_assignments_question`
- `idx_assignments_auto_close`
- `idx_question_pool_skill_created`
- `idx_question_pool_teacher_created`
- `idx_question_pool_tags` (GIN)
- `idx_submissions_assignment_student`
- `idx_submissions_student_assignment`
- `idx_submissions_pending_grading`
- `idx_practice_attempts_student`, `idx_practice_attempts_assignment`, `idx_practice_attempts_student_attempted`
- `idx_profile_fields_order`
- `idx_student_vocab_saved`
- `idx_vocab_sessions_student_practiced`

---

## 4. Backend API - Cloudflare Worker

Base URL production: `https://ielts-teacher-api.quangducngo0811.workers.dev`

### Auth

| Method | Path | Mo ta |
|--------|------|-------|
| POST | `/auth/login` | `{ username, password }` -> `{ student, token }`; verify PBKDF2/legacy SHA-256, migrate SHA-256 sang PBKDF2, tra ve list `classes` |

### Classes

| Method | Path | Mo ta |
|--------|------|-------|
| GET | `/classes` | Danh sach lop + `student_count`, `assignment_count`, `submitted_student_count`, `upcoming_deadline_count`, `pending_grading_count` |
| POST | `/classes` | `{ class_name, description? }` |
| GET | `/classes/:id` | Chi tiet lop + `student_count` + `assignments[]` kem `submission_count` |
| PATCH | `/classes/:id` | `{ class_name?, description? }` |
| DELETE | `/classes/:id` | Xoa lop |
| GET | `/classes/:id/students` | Danh sach HS trong lop |

### Students & Class Membership

| Method | Path | Mo ta |
|--------|------|-------|
| POST | `/students` | `{ class_id?, students: [{ full_name }] }` -> tao batch account, auto username/password, optional add vao lop |
| POST | `/students/:id/reset-password` | Tao password moi, tra ve credentials de GV xuat CSV |
| PATCH | `/students/:id` | Hien chi update `full_name` |
| DELETE | `/students/:id` | Xoa account HS |
| POST | `/student-classes` | `{ class_id, student_id? }` hoac `{ class_id, username }` |
| DELETE | `/student-classes?student_id=&class_id=` | Xoa HS khoi lop, khong xoa account |

### Uploads / R2

| Method | Path | Mo ta |
|--------|------|-------|
| POST | `/uploads/images/presign` | Tao presigned PUT URL cho image, max 12MB, MIME `image/*`, key `images/<uuid>.<ext>` |
| POST | `/uploads/images` | Legacy direct multipart image upload qua Worker, max 12MB |
| POST | `/uploads/audio/presign` | Tao presigned PUT URL cho audio. Scope `teacher-listening` max 200MB hoac `student-speaking` max 50MB + JWT |
| POST | `/uploads/audio` | Legacy direct multipart listening audio upload qua Worker, max 200MB |
| GET | `/files/:key` | Serve R2 object fallback, validate key khong chua `..` va khong bat dau bang `/` |

### Question Pool

| Method | Path | Mo ta |
|--------|------|-------|
| GET | `/questions` | Danh sach de; filter `?skill=` |
| POST | `/questions` | JSON hoac multipart; luu `content_text`, `content_blocks`, `questions_data`, `vocabulary`, `tags`, `script`, `content_url` |
| POST | `/questions/transcribe-audio` | `{ key }` -> Worker doc audio tu R2 va goi STT, khong browser upload lan 2 |
| POST | `/questions/:id/duplicate` | Duplicate de; hien copy skill/title/content/audio/questions/vocab, **chua copy tags/script** |
| GET | `/questions/:id` | Chi tiet de |
| PATCH | `/questions/:id` | Update title/content blocks/questions/vocab/tags/script; cleanup R2 images bi go khoi content |
| DELETE | `/questions/:id` | Tu choi neu dang duoc assignment dung; xoa DB truoc, cleanup R2 audio/images sau |

### Assignments

| Method | Path | Mo ta |
|--------|------|-------|
| GET | `/assignments?class_id=` | Bai tap cua lop, auto-close bai qua deadline |
| POST | `/assignments` | `{ class_id, question_id, title, deadline? }` |
| GET | `/assignments/:id/submissions` | Teacher view: assignment + danh sach HS + submission status |
| GET | `/assignments/:id/question` | Student JWT required; chi tra content, audio URL, skill, title, `question_count`; khong tra `questions_data` |
| GET | `/assignments/:id/vocabulary` | Student JWT required; tra vocabulary cua bai |
| POST | `/assignments/:id/submit` | Student JWT required; JSON reading/listening/writing hoac speaking audio key/multipart; chong nop lan 2; auto-grade reading/listening |
| PATCH | `/assignments/:id` | `{ title?, deadline?, is_active? }` |
| DELETE | `/assignments/:id` | Xoa assignment |

> Student identity tren cac endpoint submit/query lay tu JWT. `student_id` query/body con xuat hien o frontend vi legacy compatibility, nhung backend khong tin vao gia tri do cho cac flow student chinh.

### Submissions

| Method | Path | Mo ta |
|--------|------|-------|
| GET | `/submissions?assignment_id=&student_id=` | Student JWT required; backend lay `student_id` tu token; tra submission + question data/content/vocab/script de xem result/practice |
| GET | `/submissions/:id` | Teacher detail: submission + assignment/class/question/student info |
| PATCH | `/submissions/:id` | Luu `teacher_feedback` va/hoac `overall_score` |
| POST | `/submissions/:id/ai-feedback` | Rate-limited; goi OpenAI `gpt-5-mini` qua Responses API, luu LR/GRA feedback |

### Teacher Inbox

| Method | Path | Mo ta |
|--------|------|-------|
| GET | `/inbox` | Top 100 writing/speaking submissions chua co `overall_score`, sort cu nhat truoc |

### Student Dashboard / Account / Practice

| Method | Path | Mo ta |
|--------|------|-------|
| GET | `/student/assignments?student_id=&class_id=` | JWT required; verify membership qua `student_classes`; tra assignments + submission state + `vocab_count` |
| POST | `/student/change-password` | JWT expected; verify old password, enforce new password >= 8 chars |
| POST | `/practice/submit` | JWT required; `retry_wrong`/`retry_full`; save vao `practice_attempts`; khong ghi diem chinh thuc |
| GET | `/practice/history?assignment_id=` | JWT required; 20 attempt gan nhat |

### Profile Fields & Student Profile

| Method | Path | Mo ta |
|--------|------|-------|
| GET | `/profile-fields` | Teacher/student doc danh sach field |
| POST | `/profile-fields` | Teacher tao field: `text`, `textarea`, `select`, `date` |
| DELETE | `/profile-fields/:id` | Teacher xoa field |
| GET | `/students/:id/profile-answers` | Teacher xem ho so/answers cua HS |
| GET | `/student/profile-answers` | Student JWT required; xem fields + answers cua minh |
| PATCH | `/student/profile-answers` | Student JWT required; upsert/delete answers rong |

### Student Vocab

| Method | Path | Mo ta |
|--------|------|-------|
| GET | `/student/vocab` | JWT required; wordlist ca nhan |
| POST | `/student/vocab` | JWT required; upsert word/definition/example/source |
| DELETE | `/student/vocab/:word` | JWT required; xoa word ca nhan |
| GET | `/student/vocab/sessions` | JWT required; lich su ngay luyen vocab |
| POST | `/student/vocab/sessions` | JWT required; them session, dung cho streak khi hoan thanh full matching |

---

## 5. Cloudflare R2 Storage

- **Bucket:** `ielts-web`
- **Public URL base:** `https://pub-75b0370b5b5a4c15b26531707c369a0f.r2.dev`
- **Listening audio key:** `audio/<uuid>-<sanitized-filename>`
- **Student speaking key:** `speaking/<assignment_id>/<student_id>-<uuid>-<sanitized-filename>`
- **Content image key:** `images/<uuid>.<jpg|jpeg|png|gif|webp|svg>`

### Upload patterns

- Teacher listening audio va content images uu tien **presigned PUT direct-to-R2** de tranh Worker bandwidth; endpoints legacy multipart van ton tai.
- Student speaking co 2 duong: direct presigned upload + submit `audio_upload_key`, hoac multipart submit qua Worker.
- STT voi direct upload: Worker fetch audio tu R2 theo key roi goi STT.
- `/files/:key` chi la fallback proxy; media UI dung public R2 URL truc tiep.

### Atomicity / cleanup

- Multipart `/questions` co rollback: upload R2 -> DB fail -> `R2.delete(key)`.
- Direct presigned upload chi rollback khi da goi backend save/submit va backend biet `content_upload_key`/`audio_upload_key`; neu user upload roi huy truoc khi save, co the tao orphan R2 object.
- Question DELETE: xoa DB truoc, cleanup R2 audio/images sau (best-effort, log error).
- Question PATCH with content_blocks: xoa image cu khong con nam trong content_blocks moi.
- Speaking duplicate/pre-existing submission: neu direct uploaded key hop le nhung submit bi tu choi, backend co gang xoa object vua upload.

---

## 6. Security

### Da implement

| Layer | Bien phap | File/ghi chu |
|-------|-----------|--------------|
| Password hashing | PBKDF2 SHA-256, 100k iterations, 16-byte random salt | `hashPassword()`, `verifyPassword()` |
| Legacy password migration | 64-char SHA-256 duoc verify va rehash khi login thanh cong | `/auth/login` |
| Student JWT | HS256, exp 24h, `JWT_SECRET` | `signJWT()`, `verifyJWT()`, `requireStudentAuth()` |
| Student identity | Submit/result/dashboard dung `claims.student_id` tu JWT | khong tin `student_id` client gui cho flow chinh |
| CORS | Dynamic whitelist `ielts-teacher.pages.dev`, `ielts-student.pages.dev`; `Vary: Origin` | closure trong `fetch()` |
| KV rate limit | Global 600 req/60s/IP; login 10 req/60s/IP; AI feedback 60 req/60s/IP; fail-open neu KV loi | `checkRateLimit()` |
| Upload validation | Image 12MB `image/*`; teacher audio 200MB `audio/*`; student speaking 50MB `audio/*`; STT R2 max 25MB | Worker |
| R2 key validation | `/files/:key` reject `..` va leading `/` | Worker |
| Presigned key scoping | Student speaking key phai prefix `speaking/<assignment>/<student>-` | Worker |
| JSON parse safety | Multipart JSON fields co try/catch | `/questions` |
| Error handling | Catch-all log server-side, client nhan `Loi may chu noi bo` | Worker |
| XSS modal title | Modal title dung `textContent` | teacher app |
| XSS user strings | UI dung `escapeHtml`/DOM API o cac path chinh | teacher/student apps |
| HTML content sanitization | Worker sanitize `block.html`: strip dangerous tags/attrs/javascript URL | `sanitizeHtml()` |
| CSP/security headers | `_headers` cho 2 Pages app | CSP van can `'unsafe-inline'` vi UI dung inline handlers |
| Auth expiry UX | Student API dispatch `auth:expired` khi 401 -> clear session + login | student `api.js`, `app.js` |

### Accepted risks / known gaps

| Item | Ly do / ghi chu |
|------|-----------------|
| Teacher auth chua co | By design cho single-teacher deployment; neu public/admin multi-teacher thi phai them auth/ACL |
| Student PII trong localStorage | Dang luu student/class/token de SPA khoi dong nhanh; can `/auth/me` neu muon chi luu token |
| Presigned upload orphan | Direct-to-R2 co the de orphan neu user upload roi dong form truoc khi save |
| `/questions/:id/duplicate` chua copy tags/script | Feature duplicate dang copy core content/questions/vocab/audio, nhung bo sot metadata nay |
| Student endpoint hardening | Mot so endpoint student phu (`/assignments/:id/vocabulary`, practice) dua vao JWT nhung chua verify membership theo assignment rieng nhu `/student/assignments` |
| `student/change-password` missing-token path | Code expected JWT; neu request khong co token co the roi vao catch-all thay vi 401 explicit |
| CSP con `'unsafe-inline'` | Can refactor inline `onclick` sang event delegation neu muon CSP nghiem hon |

---

## 7. Teacher App

**Routes:** `teacher/frontend/js/app.js`

| Hash route | Mo ta |
|------------|-------|
| `#/classes` | Danh sach lop, search/sort, card metrics |
| `#/class/:id` | Chi tiet lop: assignments, students, stats |
| `#/assignment/:id` | Danh sach HS + trang thai nop bai |
| `#/grading/:id` | Cham writing/speaking |
| `#/questions` | Kho de, skill tabs, search, tag filter |
| `#/questions/new` | Tao de moi |
| `#/questions/:id` | Xem/sua de |
| `#/inbox` | Writing/Speaking can cham |
| `#/profile-fields` | Cau hinh field ho so HS |

### Lop & hoc sinh

- CRUD lop.
- Dashboard class cards co `student_count`, `assignment_count`, submitted-student progress, bai sap den han, pending grading.
- Chi tiet lop co tabs: Bai tap, Hoc sinh, Thong ke.
- Filter assignments theo title/skill.
- Toggle `is_active`, xoa assignment, vao submission list.
- Tao HS batch tu textarea moi dong 1 ho ten; username/password auto-generated.
- Modal credentials + export CSV sau khi tao/reset password.
- Add existing student vao lop bang username.
- Xoa HS khoi lop khong xoa account.
- Bulk select HS -> xoa khoi lop / export CSV.
- Teacher xem profile answers cua HS tu modal.

### Kho de

- Reading/Listening/Writing/Speaking deu dung content composer rich document:
  - text/html block, bold/italic/underline, font size, color;
  - table picker 5x6 + add/delete row/column + resize table;
  - image upload/paste inline vao dung vi tri cursor, resize image;
  - preview render tu `content_blocks`.
- PDF import client-side bang vendored PDF.js de extract text vao composer.
- Reading/Listening answer grid co multi-answer chips, explanation, location picker.
- Location picker:
  - Reading: drag-select tren preview content blocks, co metadata block range.
  - Listening: drag-select trong script textarea, co metadata script range.
- Listening:
  - direct-to-R2 upload audio bang presigned URL + progress/ETA;
  - auto transcribe script tu R2 key;
  - GV co the sua script thu cong.
- Tags: chip input khi tao/sua, list/filter/click tag trong kho de.
- Vocabulary: word/definition/example cho reading/listening; HS xem sau khi nop.
- Preview nhu HS tu question list/detail.
- Duplicate question hien co; caveat: chua copy tags/script.
- Sửa đề: skill readonly, audio listening khong thay duoc.

### Cham bai & inbox

- Inbox lay writing/speaking submissions `overall_score IS NULL`, hien badge sidebar.
- Assignment submission list co export CSV.
- Reading/Listening modal so dap an, diem auto-grade, correct/wrong.
- Speaking modal co audio player + transcript.
- Grading page writing/speaking:
  - 2 cot text/transcript + sidebar;
  - annotation bang character offsets;
  - boi den -> popup nhan xet -> highlight + card;
  - khong cho overlap;
  - click annotation scroll;
  - Cmd/Ctrl+S de save, phim len/xuong navigate annotations;
  - AI feedback collapsible: POST `/submissions/:id/ai-feedback`.

---

## 8. Student App

**Routes:** `students/frontend/js/app.js`

| Hash route | Mo ta |
|------------|-------|
| `#/login` | Login username/password |
| `#/select-class` | Chon lop neu HS thuoc nhieu lop |
| `#/home` | Trang chu sau login: stats, streak, progress charts, due cards |
| `#/assignments` | Dashboard bai tap |
| `#/assignment/:id` | Lam bai |
| `#/result/:id` | Xem ket qua/feedback |
| `#/history` | Lich su bai da nop, filter skill/min band |
| `#/calendar` | Lich deadline theo thang |
| `#/vocab-games` | Hub tu vung: tu bai hoc + tu ca nhan |
| `#/vocab-game/:id` | Flashcard/matching game cho vocab cua 1 assignment |
| `#/practice/:id` | Retry wrong/full cho reading/listening da nop |
| `#/profile` | Ho so, target band, charts, profile fields, doi password |
| `#/my-vocab` | Wordlist ca nhan + flashcard ca nhan |

### Auth/session

- Login nhan `{ student, token }`, luu `ielts_student`, `ielts_class`, `ielts_token`.
- 1 lop -> auto select; nhieu lop -> `#/select-class`.
- API client gan `Authorization: Bearer <token>`.
- 401 -> `auth:expired` -> clear session/cache -> redirect login.
- Doi mat khau tu profile: verify old password, confirm modal, min 8 chars.

### Dashboard/profile/progress

- Home co quick actions, due today/upcoming, streak, progress charts per skill.
- History filter theo skill va band toi thieu.
- Calendar gom assignments theo deadline.
- Profile:
  - target band per skill + overall target tinh tu 4 ky nang;
  - charts theo 7/30/90 ngay;
  - streak tinh theo ngay co submit hoac vocab session;
  - answers cho `profile_fields` do GV cau hinh;
  - links nhanh toi My Vocab/History/Assignments.

### Lam bai

- Reading/Listening:
  - split pane content/audio + answer pane;
  - highlight 4 mau trong bai doc;
  - sticky notes tren selection;
  - question navigator + flag cau;
  - count-up timer persist qua refresh;
  - autosave answers/flags/notes moi 5s vao localStorage;
  - confirm submit modal neu con cau trong/flag.
- Writing:
  - rich prompt render tu `content_blocks`;
  - textarea autosave;
  - realtime word/char/sentence counter;
  - confirm submit.
- Speaking:
  - cue card render rich content;
  - MediaRecorder + upload file fallback;
  - waveform khi record;
  - direct-to-R2 presigned upload cho file speaking;
  - submit `audio_upload_key`, Worker STT tu R2 roi luu transcript.

### Result/practice/vocab

- Reading/Listening result:
  - split pane original content/audio + answer comparison;
  - band score, correct/wrong/total;
  - Explain toggle per question;
  - Locate scroll/flash theo `location_meta` hoac fallback text;
  - vocab list, locate word, save word vao My Vocab;
  - retry wrong va retry full.
- Writing/Speaking result:
  - pending state neu chua cham;
  - da cham: band, overall feedback, highlighted annotations + sidebar;
  - Speaking co audio player + transcript.
- Practice:
  - chi reading/listening da co submission;
  - `retry_wrong` chi hien cau sai; `retry_full` hien tat ca;
  - luu attempt vao `practice_attempts`, khong thay diem chinh thuc.
- Vocab:
  - Teacher vocab games: flashcard, quick matching 10 cap, full matching tat ca cap;
  - full matching POST `/student/vocab/sessions` de tinh streak;
  - My Vocab DB-backed: save/delete/search words, flashcard ca nhan.
- Dark mode luu `localStorage('theme')`.

---

## 9. Frontend API Cache & Pages Headers

- Teacher `api.js`: in-memory + `sessionStorage`, TTL **10 giay**, clear sau POST/PATCH/DELETE.
- Student `api.js`: in-memory + `sessionStorage`, TTL **10 giay**, cache key co token-scope hash, clear sau mutation/logout/auth expired.
- Teacher `_headers`:
  - CSP connect API + R2 S3 host; media/img R2 public URL;
  - vendor PDF.js cache 1 nam immutable;
  - `api.js`, `app.js`, CSS cache 10 giay.
- Student `_headers`:
  - CSP connect API + R2 S3 host; media/img R2 public URL;
  - `api.js`, `app.js`, CSS cache 10 giay;
  - microphone permission `(self)`.

---

## 10. End-to-End Flows

### Tao de va giao bai

```
GV tao rich-content question (+ audio/image/vocab/tags/script/location/explanation)
  -> GV vao class
  -> giao assignment cho ca lop (+ deadline)
  -> HS thay bai trong dashboard/class
```

### HS nop bai

```
HS login JWT -> chon lop -> mo assignment
  -> reading/listening/writing/speaking lam bai
  -> submit
  -> backend dung JWT student_id
  -> reading/listening auto-grade
  -> writing/speaking luu content/audio/transcript de GV cham
```

### Cham va tra feedback

```
GV vao Inbox hoac Assignment submissions
  -> mo Grading page
  -> annotation + overall + score
  -> optional AI feedback LR/GRA
  -> save
  -> HS xem result voi highlight/annotation/score
```

### Hoc lai

```
HS xem result reading/listening
  -> Explain/Locate dap an
  -> Save words vao My Vocab
  -> Vocab games / My Vocab flashcards
  -> Retry wrong/full practice (khong ghi diem chinh thuc)
```

---

## 11. Trang Thai Chuc Nang

| Chuc nang | Trang thai | Ghi chu |
|-----------|------------|---------|
| Class CRUD | Hoan thien | |
| Class cards metrics | Hoan thien | submitted count, upcoming deadline, pending grading |
| Student multi-class | Hoan thien | qua `student_classes` |
| Batch student creation | Hoan thien | auto username/password, credentials CSV |
| Add existing student by username | Hoan thien | |
| Reset student password | Hoan thien | endpoint rieng, CSV credentials |
| Bulk student remove/export | Hoan thien | |
| Profile fields teacher config | Hoan thien | text/textarea/select/date |
| Student profile answers | Hoan thien | student edit, teacher view |
| Question CRUD | Hoan thien | rich content blocks |
| Rich content composer | Hoan thien | text/html, image, table, formatting |
| PDF text import | Hoan thien | client-side PDF.js, text PDFs only |
| Image upload direct R2 | Hoan thien | presigned PUT, 12MB |
| Listening audio direct R2 | Hoan thien | presigned PUT, 200MB |
| Listening auto transcript | Hoan thien | R2 key -> STT |
| Tags | Hoan thien | tags array + GIN index |
| Duplicate question | Gan hoan thien | chua copy tags/script |
| Assignment CRUD/toggle | Hoan thien | |
| Auto-close assignment deadline | Hoan thien | 1 lan per deadline, manual reopen allowed |
| Reading/Listening auto-grade | Hoan thien | exact normalized string match, score scale 0-9 |
| Teacher submissions view/export | Hoan thien | |
| Teacher Inbox | Hoan thien | pending writing/speaking |
| Writing/Speaking grading annotations | Hoan thien | |
| AI feedback LR/GRA | Hoan thien | OpenAI `gpt-5-mini`, teacher-only |
| Student login JWT | Hoan thien | SHA-256 auto migration |
| Student change password | Hoan thien trong UI | known missing-token guard caveat |
| Student home/history/calendar/profile | Hoan thien | charts, target, streak |
| Student assignment UX B1.x | Hoan thien | autosave, timer, flags, notes, confirm, waveform |
| Student reading/listening result | Hoan thien | Explain/Locate/vocab/practice |
| Student writing/speaking feedback | Hoan thien | annotation rendering |
| Practice retry wrong/full | Hoan thien | `practice_attempts` |
| Teacher vocab games | Hoan thien | flashcard, quick/full matching |
| My Vocab DB-backed | Hoan thien | save/delete/search/flashcard |
| Vocab sessions streak | Hoan thien | full matching adds session |
| Dark mode | Hoan thien | teacher + student |
| CORS/JWT/PBKDF2/upload validation/CSP | Hoan thien | core security layers |
| KV rate limit | Hoan thien co ban | global/login/AI; fail-open |
| Teacher auth | Chua lam | by design |
| Student PII out of localStorage | Chua lam | can them `/auth/me` |
| Strict CSP without inline handlers | Chua lam | can refactor event handlers |
| R2 orphan cleanup job | Chua lam | can them lifecycle/manual cleanup |

---

## 12. Quyet Dinh Ky Thuat Quan Trong

| Van de | Quyet dinh | Ly do |
|--------|------------|-------|
| Frontend framework | Vanilla JS | Static deploy don gian, khong build step |
| Router | Hash route | Khong can server rewrite |
| State | Module-level variables + local/sessionStorage | Du nho cho SPA hien tai |
| Teacher auth | Khong co | Single teacher, deployment tu quan ly |
| Student auth | PBKDF2 + JWT | Stateless, Worker-native Web Crypto |
| Legacy password | Auto-migrate SHA-256 khi login | Zero-downtime |
| Student identity | JWT la source of truth | Chong spoof `student_id` tu client |
| Assignment scope | Class-level | Dung nghiep vu GV giao cho ca lop |
| Deadline policy | `is_active` moi chan submit | GV co the mo lai bai qua han |
| Question content | `content_blocks` + `content_text` fallback | Rich document nhung van co plain text cho search/AI/locate |
| Images/audio storage | R2 public URL truc tiep | Giam Worker bandwidth |
| Direct uploads | Presigned PUT | Ho tro file lon/progress |
| DB + R2 cleanup | Rollback khi backend biet key; best-effort cleanup khi xoa/update | Can bang trade-off direct upload |
| Listening STT | Transcribe tu R2 key | Khong upload file lan 2 tu browser |
| STT proxy | Optional `OPENAI_STT_URL` | Xu ly loi OpenAI region tu Cloudflare egress |
| AI feedback | Manual trigger, teacher-only | Kiem soat chi phi |
| AI model | `gpt-5-mini` via Responses API | LR/GRA JSON feedback |
| Reading/listening score | Exact normalized match -> 0-9 scale | Don gian, minh bach |
| Vocab game data | Endpoint rieng `/assignments/:id/vocabulary` | Khong tra vocab trong question-doing endpoint |
| Practice data | Load tu submission result | Chi practice sau khi nop, khong lo answer key truoc |
| CORS | Per-request closure | Tranh race module-level headers |
| Cache TTL | 10 giay | Giam stale UI sau mutation |
| IDs | UUID string | Khong parseInt |

---

## 13. Migration History

| File | Noi dung |
|------|----------|
| `001_assignment_auto_close.sql` | Them `assignments.last_auto_closed_at` |
| `002_question_tags.sql` | Them `question_pool.tags` + GIN index |
| `003_practice_attempts.sql` | Them `practice_attempts` + indexes co ban |
| `004_question_content_blocks.sql` | Them `question_pool.content_blocks` |
| `005_runtime_ddl_and_hot_path_indexes.sql` | Them `question_pool.script`, `profile_fields`, `student_profile_answers`, `student_vocab`, `vocab_sessions`, hot-path indexes |

> Runtime endpoints hien khong con chay `ALTER TABLE`/`CREATE TABLE IF NOT EXISTS` trong normal page loads. `teacher/backend/schema.sql` hien la fresh-DB snapshot khop DB production da verify ngay 2026-05-04.

---

## 14. Commands Huu Ich

```bash
cd teacher/backend
npm run dev          # wrangler dev
npm run dev:remote   # wrangler dev --remote
npm run deploy       # wrangler deploy
npm run stt-proxy:dev
```

```bash
# Kiem tra nhanh syntax backend worker trong Node parser
node --check teacher/backend/src/worker.js
node --check teacher/backend/src/stt-proxy.mjs
```

---

## 15. Viec Nen Lam Tiep Theo

1. Sua `/questions/:id/duplicate` de copy `tags` va `script`.
2. Them guard 401 explicit cho `/student/change-password` khi thieu/invalid JWT.
3. Them membership/assignment authorization cho `/assignments/:id/vocabulary` va practice endpoints neu can hardening.
4. Thiet ke cleanup/lifecycle cho orphan R2 objects tu presigned uploads.
5. Them `/auth/me` de giam PII trong localStorage.
6. Refactor inline handlers de tien toi CSP khong can `'unsafe-inline'`.
