# IELTS Web — Brainstorm UI/UX & Học tập

> **Mục đích:** Liệt kê toàn bộ ý tưởng cải thiện UI/UX và các tính năng học tập mới cho nền tảng IELTS Web.
> Người dùng sẽ chọn các hạng mục → gửi lại để triển khai.
> Ngày tạo: 2026-04-28 | Cập nhật: 2026-05-01

---

## A. Hiện trạng (tóm tắt)

Nền tảng đã có đầy đủ luồng cốt lõi:
- 4 kỹ năng: Reading / Listening / Writing / Speaking
- Auto-grade Reading/Listening; chấm tay + AI feedback cho Writing/Speaking
- Annotation Google-Docs-style (teacher app)
- Vocab list + 2 mini-game (Flashcard + Matching)
- Explanation + Locate trong bài đọc (smooth scroll)
- Dark mode (student app), CSP, JWT, PBKDF2
- **Auto-save draft** mỗi 5s + hiển thị "Đã lưu HH:MM"
- **Timer đếm ngược** sticky khi làm bài
- **Question navigator** + **flag** (tô vàng) khi làm bài
- **Listening**: replay ±5s/±10s
- **Writing**: word counter + cảnh báo < 150/250 từ
- **Speaking**: waveform + replay trước khi nộp
- **Confirm modal** trước khi submit (hiện số câu chưa làm + flagged)
- **Ghi chú cá nhân** (collapsible panel, lưu localStorage)
- **Toast notification** system
- **Trang Home** với streak + tiến độ tuần
- **Trang History** với filter skill
- **Calendar view** (dot xanh/đỏ theo ngày)
- **Empty state** + **Skeleton loaders**
- **Làm lại câu sai / Làm lại toàn bài** (practice mode, lưu `practice_attempts`)
- **Tags cho question pool** (filter + chip UI)
- **Bulk actions** cho student list (xoá khỏi lớp, export CSV)
- **Teacher inbox** (badge + trang tổng hợp bài cần chấm)
- **Quick filter cần chấm** (badge trên class card)
- **Duplicate question** (sao chép đề)
- **Preview đề as student** (hàm `previewAsStudent` đã có)
- **Drag & drop giao bài** (kéo question → thả vào lớp → mở modal pre-selected)
- **Annotation keyboard shortcuts** (Ctrl+S save, Esc close, ↑↓ navigate)
- **Audio waveform** khi chấm Speaking (canvas waveform + click to seek)

→ **Đã đủ tốt cho luồng "giao bài → làm → chấm → xem feedback → ôn lại".**
→ **Còn thiếu**: học chủ động, ôn luyện cá nhân hóa, gamification, analytics, mobile UX, social.

---

## Legend ưu tiên

| Ký hiệu | Ý nghĩa |
|---------|---------|
| 🔴 **S** | Làm ngay — impact cao, effort hợp lý, tạo giá trị cốt lõi |
| 🟠 **A** | Làm sớm — rõ ràng giá trị, phức tạp vừa phải |
| 🟡 **B** | Nên làm — nice-to-have, không urgent |
| ⚪ **C** | Thấp — effort cao hoặc giá trị hạn chế |
| ✗ **Bỏ** | Không nên làm trong giai đoạn này |

---

## B. CẢI THIỆN UI/UX — Còn lại

### B5. Tổng quan UI hệ thống

| # | Ý tưởng | Mô tả | Ưu tiên | Lý do |
|---|---------|-------|---------|-------|
| B5.2 | **Iconography nhất quán** | Thay emoji bằng SVG icon set (Lucide) | ⚪ C | Thuần cosmetic, effort cao (đổi hàng trăm chỗ), zero functional value. Làm sau khi có bandwidth |
| B5.3 | **Microanimation** | Button hover, card lift, modal slide-in | ⚪ C | Đã có page-transition. Thêm animation dễ gây distraction hơn là cải thiện nếu không tinh tế |
| B5.4 | **Accessibility (a11y)** | Aria labels, focus rings, contrast AA | 🟡 B | Quan trọng về mặt đúng đắn nhưng không urgent. Nên làm theo từng component khi có dịp, không cần pass lớn |
| B5.5 | **i18n EN/VI** | Switcher ngôn ngữ | ✗ Bỏ | Nền tảng cho HS Việt, double maintenance cost, giá trị thấp. Không nên làm |
| B5.6 | **Loading bar global** | NProgress-style trên cùng khi navigate | 🟡 B | Dễ implement (< 50 dòng), UX cảm giác nhanh hơn rõ. Làm được bất cứ lúc nào |

---

## C. TÍNH NĂNG HỌC TẬP

### C1. Ôn lại bài đã làm

| # | Ý tưởng | Mô tả chi tiết | Ưu tiên | Lý do |
|---|---------|----------------|---------|-------|
| C1.3 | **Spaced Repetition câu sai** | Câu sai → "Hộp ôn tập" → hiện lại sau 1/3/7 ngày (SM-2) | 🟠 A | Cực kỳ hiệu quả về mặt học thuật (scientifically proven). Cần thêm `next_review_at` vào DB + scheduler. Phức tạp vừa |
| C1.4 | **"Bài giảng" tự động** | Sau result: lật từng câu sai + explanation → mini quiz | ⚪ C | Ý tưởng hay nhưng UX flow phức tạp để làm đúng. Ít HS thật sự dùng hết flow này. Effort cao, return thấp |

### C2. Tạo test tuỳ chỉnh

| # | Ý tưởng | Mô tả chi tiết | Ưu tiên | Lý do |
|---|---------|----------------|---------|-------|
| C2.1 | **🔥 Custom Test Builder** | Trang `#/practice/new`: chọn bài từ pool → ghép test → lưu `custom_tests` | 🔴 S | Mở khoá tự học chủ động — đây là bước nhảy từ "platform giao bài" sang "platform luyện thi". DB cần thêm 1 bảng + 2-3 endpoint |
| C2.2 | **Random Mock Test** | Random 1R+1L+1W, timer 2h45p, full flow | 🟡 B | Cần C2.1 + C2.6 làm nền. Sau khi có pool public mới có đủ đề để random có ý nghĩa |
| C2.3 | **Filter theo mức độ** | `difficulty` 1-3 sao trên `question_pool` | 🟠 A | Đơn giản (1 cột DB + UI filter). Phụ thuộc teacher gán difficulty — cần build habit này trước |
| C2.4 | **Test theo dạng câu hỏi** | Filter bài theo Matching/MCQ/Gap Fill | ⚪ C | Cần tag dạng câu hỏi vào từng `questions_data` item — data work nặng trước khi UI có ý nghĩa |
| C2.5 | **Test nhanh 10 câu** | Quick quiz 10 câu Reading random — 15p | 🟠 A | Rất dễ implement (subset của C2.1 logic), cực kỳ hữu ích cho luyện ngắn. Nên làm cùng C2.1 |
| C2.6 | **Public Question Pool** | Teacher toggle `is_public` → HS tự chọn làm | 🔴 S | Prerequisite của C2.1. Chỉ cần 1 cột boolean + 1 endpoint. Unlock toàn bộ C2.x |

### C3. Mini-game / Game ôn tập

| # | Ý tưởng | Mô tả chi tiết | Ưu tiên | Lý do |
|---|---------|----------------|---------|-------|
| C3.1 | **Vocab Speed Run** | 4 đáp án VI, đếm ngược 5s, combo streak | 🟠 A | Build trực tiếp trên vocab system có sẵn. High engagement, dễ implement (< 1 ngày). Tốt cho retention |
| C3.2 | **Vocab Typing** | Hiện nghĩa VI → gõ từ EN, fuzzy match | 🟡 B | Luyện active recall + spelling — khác với Speed Run. Sau C3.1 |
| C3.3 | **Listening Dictation** | Phát 1 câu audio → gõ lại, fuzzy chấm | 🟡 B | Rất phù hợp IELTS, nhưng cần audio clip từng câu (không có sẵn). Complexity ở infra, không ở logic |
| C3.4 | **Word in Context (Cloze)** | Câu từ bài reading, blank 1 từ vocab → điền | 🟠 A | Pedagogically hiệu quả nhất (context learning). Data có sẵn trong `content_text` + vocab. Medium effort |
| C3.5 | **Pronunciation Game** | Record → AI so transcript → điểm phát âm | ⚪ C | Pain point thật của IELTS, nhưng cần API bên ngoài (Whisper/Azure), latency cao, chi phí. Phase sau |
| C3.6 | **Sentence Reorder** | Câu xáo trộn → kéo thả sắp đúng | ⚪ C | Luyện grammar tốt nhưng cần viết riêng drag-drop UI phức tạp. Giá trị không tương xứng effort |
| C3.7 | **Idiom Match** | Matching game cho idiom/phrasal verbs | ✗ Bỏ | Phụ thuộc teacher tag idiom — data sẽ không bao giờ đủ để game này meaningful |
| C3.8 | **Vocab Boss Battle** | Mini RPG: đúng vocab → đánh boss | ✗ Bỏ | Fun cao nhưng zero pedagogical structure. Effort lớn, không core |
| C3.9 | **Daily Vocab Challenge** | 10 từ mỗi ngày random từ bài đã làm | 🟠 A | Dễ implement, kết hợp tốt với streak. Tạo habit học từ vựng hàng ngày |
| C3.10 | **Word Cloud — Memory** | Từ chưa ôn phai mờ dần | ✗ Bỏ | Novelty cao nhưng không actionable — HS nhìn rồi không biết phải làm gì. Chỉ là visualization |

### C4. Học chủ động & cá nhân hoá

| # | Ý tưởng | Mô tả chi tiết | Ưu tiên | Lý do |
|---|---------|----------------|---------|-------|
| C4.1 | **Trang "Hồ sơ học tập"** | Target band, số bài, band TB theo skill, biểu đồ | 🔴 S | Data đã có trong DB, chỉ cần query + render. Trang này là anchor cho mọi tính năng cá nhân hoá. Effort thấp, value cao |
| C4.2 | **Phân tích điểm yếu** | "Yếu nhất ở Matching: 2/8 đúng" → gợi ý luyện | 🟠 A | Rất meaningful (insight thực tế). SQL aggregation + render. Cần có đủ submissions mới chính xác |
| C4.3 | **Lộ trình học** | Target band + ngày thi → "Tuần này: 2R + 1W..." | ⚪ C | Logic scheduling phức tạp để làm đúng. Nếu làm sai sẽ recommend vô nghĩa và mất tin tưởng |
| C4.4 | **Smart recommendations** | "Thử bài Y — cùng topic, khó hơn 1 bậc" | ✗ Bỏ | Cần collaborative filtering hoặc content-based matching → overengineering cho scale hiện tại |
| C4.5 | **Vocab cá nhân (My Wordlist)** | Save từ vào wordlist riêng → flashcard cá nhân | 🟠 A | Enables personal learning path. Cần bảng `student_vocab` + UI lưu từ ở nhiều điểm (result, vocab list) |
| C4.6 | **Notes tổng hợp** | Trang tổng hợp mọi ghi chú (hiện per-localStorage) | ⚪ C | Ghi chú hiện lưu localStorage — aggregate phải move lên server. Effort lớn, ít HS dùng notes nhiều |
| C4.7 | **Daily Goal** | Mỗi ngày: 1 bài hoặc 20 từ. Progress ring | 🟡 B | Đơn giản, kết hợp tốt với C4.1 và streak. Effort thấp |

### C5. Gamification

| # | Ý tưởng | Mô tả chi tiết | Ưu tiên | Lý do |
|---|---------|----------------|---------|-------|
| C5.1 | **🔥 Streak server-side** | Persist streak lên DB, không mất khi đổi device | 🔴 S | Streak hiện chỉ localStorage — mất khi clear cache. 3 cột DB + 1 endpoint. Foundational cho mọi C5.x |
| C5.2 | **XP & Level** | XP theo action → level up → unlock | 🟠 A | Sau C5.1. Medium complexity (trigger XP tại nhiều điểm trong code). Motivation loop mạnh |
| C5.3 | **Achievements / Badges** | "Lần đầu Band 7", "Streak 30 ngày"... | 🟠 A | High motivation impact, tương đối dễ (check conditions khi save submission). Sau C5.1 |
| C5.4 | **Leaderboard** | Xếp hạng lớp theo XP/streak/% cải thiện | 🟡 B | Cần C5.1+C5.2. Fun nhưng có thể gây áp lực tiêu cực — nên dùng % cải thiện, không điểm tuyệt đối |
| C5.5 | **Quests / Nhiệm vụ tuần** | Checklist tuần: 3 listening + 100 từ + 1 writing | ⚪ C | Complex vì cần engine tạo quest + track progress đa chiều. Cần C5.1-C5.3 làm nền trước |
| C5.6 | **Avatar & Customization** | Avatar đổi màu/hat khi unlock level | ✗ Bỏ | Zero educational value, high design effort. Chỉ nên xét nếu platform scale lên hàng nghìn HS |
| C5.7 | **Coins & Shop** | XP đổi coin → mua theme/sticker | ✗ Bỏ | Economy system tốn nhiều design/dev, dễ tạo incentive sai (HS grind thay vì học thật). Bỏ qua |

### C6. AI cho học sinh

| # | Ý tưởng | Mô tả chi tiết | Ưu tiên | Lý do |
|---|---------|----------------|---------|-------|
| C6.1 | **🔥 AI Tutor chat** | 💬 trong result → chat: "Tại sao câu 5 là X?" → AI giải thích | 🔴 S | Differentiator thực sự. Data context (`content_text` + `explanation`) đã có sẵn — chỉ cần ghép vào prompt. 1 API call + stream UI |
| C6.2 | **AI Speaking Partner** | AI hỏi như examiner Part 2/3 → HS record → AI phản hồi | ⚪ C | Full conversational flow rất phức tạp (turn-taking, transcription, evaluation). Chi phí API cao. Phase sau |
| C6.3 | **AI Writing Suggestions** | Khi viết → gợi từ vựng/cấu trúc (không viết hộ) | 🟡 B | Hữu ích nhưng ranh giới "gợi ý" vs "làm hộ" dễ bị lạm dụng. Cần UX thiết kế cẩn thận |
| C6.4 | **AI Pronunciation Score** | Record → AI điểm phát âm từng từ | ⚪ C | Cần Whisper + word-level alignment → latency + chi phí cao. Accuracy của word-level scoring còn hạn chế |
| C6.5 | **AI band predict** | Trước nộp → "Dự đoán band: 6.5" | 🟡 B | Motivating, dễ implement (1 API call với rubric prompt). Nhưng accuracy phụ thuộc model — cần set expectations rõ |
| C6.6 | **AI tóm tắt bài đọc** | Sau result reading → AI tóm tắt 3-5 câu chính | 🟠 A | Rất dễ (1 API call), giá trị cao (HS ôn nhanh nội dung). Context (`content_text`) đã có |

### C7. Social & Cộng đồng

| # | Ý tưởng | Mô tả chi tiết | Ưu tiên | Lý do |
|---|---------|----------------|---------|-------|
| C7.1 | **Discussion thread per question** | Comments HS/GV, upvote | ⚪ C | Cần full comment system (DB + realtime hoặc poll + moderation). Effort lớn, value phụ thuộc vào adoption |
| C7.2 | **Study Buddy / Pair** | Pair với bạn → progress side-by-side | ✗ Bỏ | Social graph complexity không tương xứng với quy mô lớp học IELTS hiện tại |
| C7.3 | **Reaction trên feedback** | HS react 👍❤️🤯 vào nhận xét GV | 🟡 B | Cực dễ implement (1 cột `reactions JSONB`), tạo emotional connection tích cực GV↔HS |
| C7.4 | **Speaking gallery (opt-in)** | Chia sẻ bản thu speaking cho cả lớp | ⚪ C | Privacy sensitivity cao, cần careful opt-in flow, ít HS tự nguyện chia sẻ thực tế |

### C8. Phân tích & Báo cáo

| # | Ý tưởng | Mô tả chi tiết | Ưu tiên | Lý do |
|---|---------|----------------|---------|-------|
| C8.1 | **🔥 Teacher Class Analytics** | Heatmap câu sai, band TB, top/bottom HS, biểu đồ | 🔴 S | Data đã có trong DB. SQL aggregation + Chart.js/D3. Cực kỳ có ích cho GV — giảm thời gian review thủ công |
| C8.2 | **Student Progress Chart** | Line chart band 4 skill theo thời gian vs target | 🟠 A | Động lực quan trọng (thấy mình tiến bộ). Dễ implement. Kết hợp với C4.1 |
| C8.3 | **Question Difficulty Auto-detect** | Sau N submissions, tính % đúng → suggest difficulty | 🟡 B | Dễ implement (1 query), giúp GV calibrate đề. Cần đủ volume submissions để reliable |
| C8.4 | **Teacher: detect cheating signal** | Pattern câu sai giống nhau giữa 2 HS | ✗ Bỏ | False positive cao, có thể gây oan. Cần context trước khi kết luận. Không phù hợp tự động hoá |
| C8.5 | **Report PDF tự động** | Cuối tháng xuất báo cáo lớp PDF | ⚪ C | Hữu ích cho phụ huynh/nhà trường nhưng PDF generation trên Cloudflare Worker là khó. Cần workaround |

### C9. Nội dung & Question Authoring

| # | Ý tưởng | Mô tả | Ưu tiên | Lý do |
|---|---------|-------|---------|-------|
| C9.1 | **AI generate question từ passage** | Dán bài đọc → AI tạo nháp 13 câu + answers + explanation | 🔴 S | Giảm 80% thời gian GV soạn đề. Context đủ để prompt. Moderate complexity (UI review + API). ROI cực cao cho GV |
| C9.2 | **AI generate vocab list** | Dán bài đọc → AI extract 15 từ vocab + nghĩa VI + ví dụ | 🔴 S | Tương tự C9.1, dễ hơn (output đơn giản hơn). GV chỉ cần duyệt. Nên làm cùng C9.1 |
| C9.3 | **Import từ Cambridge book** | Import qua CSV/JSON template | ⚪ C | Format Cambridge không chuẩn hóa, cần clean pipeline. Nếu có C9.1 thì không cần import nữa |
| C9.4 | **OCR đề từ ảnh** | Chụp ảnh → OCR → trích bài đọc + câu hỏi | ✗ Bỏ | OCR quality không đủ tốt cho đề thi structured. Tốn công clean hơn là gõ tay |
| C9.5 | **Public marketplace đề** | Teachers chia sẻ đề cho cộng đồng | ✗ Bỏ | Phase 3+ — cần moderation, curation, licensing. Không phù hợp giai đoạn hiện tại |

### C10. Mobile / PWA

| # | Ý tưởng | Mô tả | Ưu tiên | Lý do |
|---|---------|-------|---------|-------|
| C10.1 | **PWA (Progressive Web App)** | manifest + service worker → install như app, offline | 🟠 A | Phần lớn HS dùng mobile. Install-to-homescreen tăng retention. Manifest dễ, service worker phức tạp hơn |
| C10.2 | **Push notification deadline** | Nhắc trước deadline 24h/1h | 🟡 B | Requires C10.1. Effective cho retention nhưng cần permission UX tốt |
| C10.3 | **Offline mode cho vocab** | Cache vocab + flashcard offline | ⚪ C | Tricky với dynamic data (vocab thay đổi khi GV cập nhật). Service worker caching strategy phức tạp |

---

## D. PRIORITY MATRIX — Tổng hợp

### 🔴 S-tier — Làm trước tiên (6 mục)

| # | Tính năng | Impact | Effort | Lý do chọn |
|---|-----------|--------|--------|------------|
| C8.1 | Teacher Class Analytics | ⭐⭐⭐ | M | Data có sẵn, SQL + chart. Giá trị lớn nhất cho GV ngay lập tức |
| C9.1+C9.2 | AI generate question + vocab | ⭐⭐⭐ | M | Tiết kiệm 80% thời gian soạn đề — GV benefit trực tiếp, ngay lập tức |
| C4.1 | Hồ sơ học tập | ⭐⭐⭐ | S | Anchor page, data đã có, effort nhỏ nhất trong S-tier |
| C5.1 | Streak server-side | ⭐⭐⭐ | S | 3 cột DB, foundational cho toàn bộ gamification. Streak hiện mất khi clear cache |
| C6.1 | AI Tutor chat | ⭐⭐⭐ | M | Differentiator thực sự, context đã có. 1 API call + stream UI |
| C2.1+C2.6 | Custom Test + Public Pool | ⭐⭐⭐ | M | Mở khoá tự học — bước nhảy platform lớn nhất hiện tại |

### 🟠 A-tier — Làm sau S-tier

| # | Tính năng | Ghi chú |
|---|-----------|---------|
| C8.2 | Student Progress Chart | Kết hợp với C4.1 |
| C5.2+C5.3 | XP + Achievements | Sau C5.1 |
| C4.2 | Phân tích điểm yếu | SQL aggregation |
| C4.5 | My Wordlist cá nhân | Cần bảng `student_vocab` |
| C1.3 | Spaced Repetition | SM-2, cần `next_review_at` |
| C3.1 | Vocab Speed Run | Build trên vocab có sẵn |
| C3.4 | Word in Context (Cloze) | Data có sẵn trong content_text |
| C3.9 | Daily Vocab Challenge | Kết hợp với streak |
| C2.3 | Filter theo difficulty | 1 cột DB, sau khi GV build habit gán difficulty |
| C2.5 | Test nhanh 10 câu | Subset của C2.1 |
| C6.6 | AI tóm tắt bài đọc | 1 API call, dễ |
| C10.1 | PWA | Manifest dễ, sw phức tạp hơn |

### 🟡 B-tier — Nice-to-have

| # | Tính năng | Ghi chú |
|---|-----------|---------|
| B5.4 | Accessibility (a11y) | Làm dần theo component |
| B5.6 | Loading bar global | Dễ, < 1h |
| C4.7 | Daily Goal | Kết hợp C4.1 |
| C5.4 | Leaderboard | Sau C5.1+C5.2 |
| C6.3 | AI Writing Suggestions | Cần UX cẩn thận |
| C6.5 | AI band predict | 1 API call |
| C7.3 | Reaction trên feedback | 1 cột DB, dễ |
| C3.2 | Vocab Typing | Sau C3.1 |
| C3.3 | Listening Dictation | Infra audio clipping |
| C8.3 | Question Difficulty Auto-detect | 1 query |
| C10.2 | Push notification deadline | Sau C10.1 |
| C2.2 | Random Mock Test | Sau C2.1+C2.6 |

### ⚪ C-tier — Thấp (làm nếu có thời gian dư)

C1.4, C2.4, C3.5, C3.6, C4.3, C4.6, C5.5, C6.2, C6.4, C7.1, C7.4, C8.5, C9.3, C10.3, B5.2, B5.3

### ✗ Bỏ qua hoàn toàn

C4.4 (over-engineering), C5.6 (zero edu value), C5.7 (incentive sai), C7.2 (social graph complex), C8.4 (false positive), C9.4 (OCR quality), C9.5 (marketplace phase 3+), C3.7 (data dependency), C3.8 (RPG), C3.10 (word cloud), B5.5 (i18n)

---

## E. Thay đổi DB còn cần thiết

```sql
-- Cho C2.1 Custom test
CREATE TABLE custom_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  title TEXT,
  question_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cho C5 Gamification (server-side)
ALTER TABLE students ADD COLUMN xp INT DEFAULT 0;
ALTER TABLE students ADD COLUMN current_streak INT DEFAULT 0;
ALTER TABLE students ADD COLUMN last_active_date DATE;
ALTER TABLE students ADD COLUMN target_band FLOAT;

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  code TEXT,
  unlocked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cho C2.3 difficulty, C2.6 public pool (tags đã có)
ALTER TABLE question_pool ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE question_pool ADD COLUMN difficulty INT; -- 1-3

-- Cho C4.5 My Wordlist + C1.3 Spaced Repetition
CREATE TABLE student_vocab (
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  word TEXT,
  definition TEXT,
  example TEXT,
  source_question_id UUID,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  next_review_at TIMESTAMPTZ,
  ease_factor FLOAT DEFAULT 2.5, -- SM-2
  PRIMARY KEY (student_id, word)
);
```

*(Đã apply: `practice_attempts`, `question_pool.tags`)*
