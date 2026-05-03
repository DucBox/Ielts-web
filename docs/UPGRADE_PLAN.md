# IELTS Web Platform — UX/UI Upgrade Plan

> Cập nhật: 2026-04-25  
> Mục tiêu: Tối đa hóa trải nghiệm, đảm bảo mọi thứ dễ dàng và mượt mà cho cả Giáo viên và Học sinh.

---

## I. TEACHER APP

### 1. Trang Quản lý Lớp học (`#/classes`)

**Hiện trạng:** Cards hiển thị đơn giản, không có thống kê nhanh, không search/filter.

| # | Cải tiến | Ưu tiên |
|---|----------|---------|
| T1 | **Search bar** tìm kiếm lớp theo tên — thêm input filter ngay phía trên grid | 🔴 Cao |
| T2 | **Sort lớp** theo ngày tạo / student count (dropdown) | 🟡 Trung |
| T3 | Card lớp hiện thêm **tỉ lệ hoàn thành bài tập tổng** (% HS đã nộp ít nhất 1 bài) | 🟡 Trung |
| T4 | Card lớp thêm **chip màu deadline sắp tới** "⚠️ 2 bài sắp hết hạn" để nhắc nhở | 🟡 Trung |
| T5 | Tooltip/Hover trên card hiển thị danh sách bài tập gần nhất | 🟢 Thấp |

---

### 2. Trang Chi tiết Lớp (`#/class/:id`)

**Hiện trạng:** 2 bảng riêng biệt (bài tập và học sinh). Không có overview tổng quan, bảng đơn điệu.

| # | Cải tiến | Ưu tiên |
|---|----------|---------|
| T6 | Thêm **Tab bar** ở đầu trang để switch giữa "Bài tập", "Học sinh", "Thống kê" thay vì scroll dài | 🔴 Cao |
| T7 | Bảng bài tập: thêm **mini progress bar** cho từng assignment (VD: `8/12 đã nộp` → bar 67%) | 🔴 Cao |
| T8 | Bảng bài tập: thêm **column "Điểm TB"** tính từ overall_score của những HS đã nộp + được chấm | 🟡 Trung |
| T9 | Bảng học sinh: **avatar fallback** bằng chữ cái đầu tên (initials circle) thay vì bare text | 🟡 Trung |
| T10 | Bảng học sinh: thêm **số bài đã nộp / tổng bài tập lớp** cho từng HS → "4/6 bài" | 🟡 Trung |
| T11 | Bảng học sinh: click vào tên HS → modal xem lịch sử nộp bài (tất cả assignment + điểm) | 🟡 Trung |
| T12 | **Xác nhận xoá bài tập** bằng modal đẹp thay vì `window.confirm()` native | 🟡 Trung |
| T13 | Tab "Thống kê": biểu đồ đơn giản hoàn thành theo kỹ năng (dùng CSS bar chart thuần, không thư viện) | 🟢 Thấp |

---

### 3. Trang Xem Bài Nộp (`#/assignment/:id`)

**Hiện trạng:** Bảng danh sách đơn giản. Không có filter, search. Bài nộp reading/listening xem xong là đóng modal — không có context.

| # | Cải tiến | Ưu tiên |
|---|----------|---------|
| T14 | Thêm **Filter bar**: "Tất cả / Đã nộp / Chưa nộp / Chờ chấm / Đã chấm" | 🔴 Cao |
| T15 | Thêm **Search box** tìm tên học sinh nhanh | 🔴 Cao |
| T16 | Row bài nộp: hiện **thời gian nộp** (submitted_at) ngay trong bảng để biết ai nộp muộn | 🟡 Trung |
| T17 | **Export CSV** danh sách điểm một click (Tên, Username, Score, Submitted At) | 🟡 Trung |
| T18 | Bảng: **Sort** theo tên / điểm / thời gian nộp | 🟡 Trung |
| T19 | Thêm **Bulk action**: "Gửi nhắc nhở cho những HS chưa nộp" (chức năng placeholder, nghiệp vụ sau) | 🟢 Thấp |

---

### 4. Trang Chấm Bài Writing/Speaking (`#/grading/:id`)

**Hiện trạng:** Rất tốt nhưng còn một số điểm có thể mượt hơn.

| # | Cải tiến | Ưu tiên |
|---|----------|---------|
| T20 | **Auto-save draft** mỗi 30 giây: lưu `teacher_feedback` tạm vào `localStorage` để không mất khi lỡ đóng tab. Show indicator "💾 Đã lưu nháp lúc 14:05" | 🔴 Cao |
| T21 | **Unsaved changes warning**: khi có annotation chưa Save mà bấm back → toast/dialog xác nhận | 🔴 Cao |
| T22 | Annotation card: thêm nút **Edit comment** inline (click → textarea editable → confirm) thay phải xoá và bôi lại | 🟡 Trung |
| T23 | Click vào annotation card → **Scroll + Flash highlight** tương ứng trên văn bản bên trái (hiện chỉ click highlight mới scroll về card) | 🟡 Trung |
| T24 | **Keyboard shortcut**: `Ctrl+S` → trigger Save | 🟡 Trung |
| T25 | Sidebar: thêm **Collapse/Expand** cho phần AI Feedback section | 🟢 Thấp |
| T26 | Thanh progress phía trên: hiển thị **"Bài X/Y của lớp"** + nút Next/Prev để duyệt lần lượt (cần thêm API) | 🟢 Thấp |

---

### 5. Kho Đề (`#/questions`, `#/questions/new`, `#/questions/:id`)

**Hiện trạng:** Table đơn giản, form tạo đề ổn nhưng chưa có preview, không có search.

| # | Cải tiến | Ưu tiên |
|---|----------|---------|
| T27 | **Search box** tìm tên đề ngay trên kho đề | 🔴 Cao |
| T28 | **Preview live**: khi tạo/sửa Reading, panel phải hiển thị preview đề bài khi học sinh làm (split view) | 🟡 Trung |
| T29 | Form tạo đề: **số câu hỏi auto-detect** từ text nhập vào bằng regex (VD: phát hiện "Questions 1–13") → gợi ý fill input số câu | 🟡 Trung |
| T30 | Kho đề: **Duplicate đề** (clone một đề để chỉnh sửa thành phiên bản mới) | 🟡 Trung |
| T31 | Kho đề - trong table: click tiêu đề → **Modal xem nhanh nội dung đề** (tooltip preview) thay phải navigate sang trang riêng | 🟢 Thấp |

---

### 6. Navigation & Global UX (Teacher)

| # | Cải tiến | Ưu tiên |
|---|----------|---------|
| T32 | **Breadcrumb** ở đầu mỗi trang sâu (Lớp học → IELTS 5.5 → Bài tập Reading tháng 5 → Bài nộp của Nguyễn A) | 🔴 Cao |
| T33 | **Page title động** (`document.title`) theo trang đang xem | 🟡 Trung |
| T34 | **Notification dot** trên sidebar "Bài nộp" nếu có bài chưa chấm | 🟢 Thấp |

---

## II. STUDENT APP

### 1. Trang Login

**Hiện trạng:** Đơn giản, functional. Thiếu show/hide password.

| # | Cải tiến | Ưu tiên |
|---|----------|---------|
| S1 | **Show/hide password** button (icon mắt) trong input | 🔴 Cao |
| S2 | **"Nhớ đăng nhập"** checkbox → lưu username vào localStorage để lần sau tự điền | 🟡 Trung |
| S3 | **Login animation smooth** hơn khi card xuất hiện (fade-in slide-up) | 🟢 Thấp |

---

### 2. Trang Danh sách Bài tập (`#/assignments`)

**Hiện trạng:** Chia 2 nhóm "Cần làm / Đã nộp". Không có deadline countdown, không có filter.

| # | Cải tiến | Ưu tiên |
|---|----------|---------|
| S4 | **Deadline countdown** trực tiếp trên card: "⏰ Còn 2 ngày 3 giờ" thay vì chỉ hiện datetime | 🔴 Cao |
| S5 | **Filter tab**: "Tất cả / Reading / Listening / Writing / Speaking" phía trên list | 🟡 Trung |
| S6 | Card bài "Đã nộp" hiển thị **icon trạng thái chấm điểm** rõ ràng hơn: "⏳ Chờ chấm" / "✅ Đã có điểm" badge màu khác nhau | 🟡 Trung |
| S7 | Card bài **"Đã nộp + có điểm"**: hiện **Band Score** lớn trực tiếp trên card góc phải (hiện đã có `score_pill` nhưng nhỏ) | 🟡 Trung |
| S8 | Card bài **"Quá hạn + Chưa nộp"**: thêm thông báo inline "Bài tập này đã hết hạn. Liên hệ GV để nộp muộn." và disable click | 🟡 Trung |
| S9 | **Pull-to-refresh** UX trên mobile: show spinner khi kéo đầu trang xuống để reload | 🟢 Thấp |

---

### 3. Trang Làm Bài Reading (`#/assignment/:id` + skill=reading)

**Hiện trạng:** Split view ổn, có highlight màu. Thiếu một số tiện lợi.

| # | Cải tiến | Ưu tiên |
|---|----------|---------|
| S10 | **Đếm ngược thời gian** nếu bài có deadline (timer phía trên toolbar) | 🔴 Cao |
| S11 | **Auto-save draft đáp án** vào localStorage — nếu lỡ đóng tab, khi mở lại bài đáp án vẫn còn | 🔴 Cao |
| S12 | **Highlight persist**: lưu highlight vào localStorage theo assignment_id → mở lại bài vẫn còn highlight | 🟡 Trung |
| S13 | Khi hover vào đáp án đúng trong phần kết quả → **flash vị trí tương ứng** trên bài đọc (📍 feature đã có, nâng cấp UX hover) | 🟡 Trung |
| S14 | **"Câu chưa làm"** badge nổi bật ở pane bên phải, auto-scroll đến câu trống đầu tiên khi click | 🟡 Trung |
| S15 | Toolbar nộp bài: hiển thị **"Đã điền X/Y câu"** realtime | 🟡 Trung |

---

### 4. Trang Làm Bài Listening

**Hiện trạng:** Giống Reading về UX. Riêng audio player là browser native.

| # | Cải tiến | Ưu tiên |
|---|----------|---------|
| S16 | Tất cả improvements từ Reading (S10, S11, S12, S14, S15) áp dụng tương tự | 🔴 Cao |
| S17 | **Playback speed control**: thêm nút 0.75x – 1x – 1.25x – 1.5x trên audio player | 🟡 Trung |
| S18 | Audio: **hiển thị waveform tĩnh đẹp** (không cần realtime — chỉ dùng bar CSS ngẫu nhiên) thay thế browser native | 🟢 Thấp |

---

### 5. Trang Làm Bài Writing

**Hiện trạng:** Textarea đơn giản, word count. Thiếu một số công cụ hữu ích.

| # | Cải tiến | Ưu tiên |
|---|----------|---------|
| S19 | **Auto-save draft essay** vào localStorage, restore khi quay lại | 🔴 Cao |
| S20 | **Word count target visual**: thanh progress màu (đỏ → vàng → xanh) theo ngưỡng 150/250 từ | 🔴 Cao |
| S21 | **Thời gian còn lại** nếu có deadline (timer) | 🟡 Trung |
| S22 | **"Xem đề bài"** button thu gọn khi đề quá dài — hiện đề chiếm nhiều không gian screen | 🟡 Trung |

---

### 6. Trang Làm Bài Speaking

**Hiện trạng:** Recorder functional. UX khi nộp STT thất bại chưa rõ message.

| # | Cải tiến | Ưu tiên |
|---|----------|---------|
| S23 | Khi STT thất bại: hiển thị **thông báo lỗi chi tiết hơn** thay vì generic error. Gợi ý học sinh kiểm tra file audio / thử lại | 🔴 Cao |
| S24 | **Waveform trực quan** khi đang ghi âm: dải sóng CSS animation thay cho timer đơn giản | 🟡 Trung |
| S25 | Sau khi stop recording: thêm nút **"Nghe lại"** (hiện đã có audio preview) + **"Xoá và ghi lại"** rõ ràng hơn | 🟡 Trung |
| S26 | **Cue card** bài Speaking: có thể thu gọn/phóng to để học sinh tập trung vào recorder | 🟡 Trung |
| S27 | Thanh nộp bài: hiện thêm **cảnh báo "AI sẽ tự động chuyển audio thành text"** để học sinh biết | 🟢 Thấp |

---

### 7. Trang Kết Quả Reading/Listening

**Hiện trạng:** Split-pane tốt. Có feature locate-in-text, vocab, explanation.

| # | Cải tiến | Ưu tiên |
|---|----------|---------|
| S28 | **Highlight tất cả câu sai** trên bài đọc lên màu đỏ mờ ngay khi vào trang kết quả — học sinh thấy vị trí lỗi ngay | 🔴 Cao |
| S29 | **Click câu trong bảng kết quả → scroll + flash** đoạn tương ứng trên bài đọc (hiện chỉ có 📍 button) | 🟡 Trung |
| S30 | Vocab section: thêm **"Ẩn/Hiện tất cả"** button ngoài toggle từng item | 🟡 Trung |
| S31 | Trang kết quả: thêm **"Chia sẻ kết quả"** button (copy-to-clipboard link hoặc screenshot preview) | 🟢 Thấp |

---

### 8. Trang Kết Quả Writing (sau khi được chấm)

**Hiện trạng:** Rất tốt — Band Score, overall feedback, highlight annotation. Một vài điểm nâng cấp nhỏ.

| # | Cải tiến | Ưu tiên |
|---|----------|---------|
| S32 | Khi click annotation card → **scroll đến đúng phần highlight** trên bài văn bên dưới (Two-way sync) | 🔴 Cao |
| S33 | **Band score visualization**: thêm gauge/dial đẹp thay chỉ hiện con số (CSS-only) | 🟡 Trung |
| S34 | Nút **"Tải xuống nhận xét"** dạng text hoặc HTML (print-friendly PDF) | 🟢 Thấp |

---

### 9. Trang Kết Quả Speaking (sau khi được chấm)

**Hiện trạng:** Audio + Transcript + Annotation. Giống Writing. Cùng các cải tiến cần thiết.

| # | Cải tiến | Ưu tiên |
|---|----------|---------|
| S35 | Sync click annotation ↔ scroll transcript (giống S32) | 🔴 Cao |
| S36 | Label rõ **"Transcript được tạo bởi AI"** + disclaimer nhỏ | 🟡 Trung |

---

## III. CROSS-CUTTING (Cả hai app)

| # | Cải tiến | Mô tả | Ưu tiên |
|---|----------|-------|---------|
| X1 | **Smooth page transitions** | Fade animation khi navigate giữa các trang (class transition trên `#app`) | 🟡 Trung |
| X2 | **Loading skeleton** | Thay spinner text bằng skeleton cards khi load data (shimmer effect) | 🟡 Trung |
| X3 | **Toast nâng cấp** | Toast hiện tại text-only — thêm icon, progress bar auto-dismiss, click-to-dismiss | 🟡 Trung |
| X4 | **Empty state đẹp hơn** | Thêm illustration (SVG inline đơn giản) cho các empty state hiện tại | 🟢 Thấp |
| X5 | **Responsive Mobile** | Layout trang làm bài (split pane) chưa tốt trên màn hình nhỏ — cần stack vertical + tab switch | 🔴 Cao |
| X6 | **Dark mode** | Toggle dark/light mode, lưu preference vào localStorage | 🟢 Thấp |
| X7 | **Keyboard navigation** | ESC đóng modal, Tab focus order hợp lý, Enter submit form | 🟡 Trung |

---

## IV. THỨ TỰ TRIỂN KHAI ĐỀ XUẤT

### Phase 1 — Must Have (Làm ngay)
Ưu tiên 🔴 Cao từ cả Teacher lẫn Student:
1. `S11` Auto-save draft đáp án Reading/Writing/Listening
2. `S10/S21` Countdown timer deadline  
3. `T20` Auto-save draft grading (teacher)
4. `T21` Unsaved changes warning (teacher grading)
5. `S1` Show/hide password
6. `X5` Responsive mobile split-pane

### Phase 2 — Nice to Have
Ưu tiên 🟡 Trung:
1. `T6` Tab bar lớp học
2. `T7` Progress bar từng assignment
3. `T14/T15` Filter/Search bài nộp
4. `S4` Deadline countdown card
5. `T27` Search kho đề

### Phase 3 — Polish
Ưu tiên 🟢 Thấp: Dark mode, animations, skeleton loaders, etc.
