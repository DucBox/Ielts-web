# TEACHER APP IMPLEMENTATION PLAN

## Giai đoạn hiện tại: Phase 1A - Data Pipeline & Assignment Builder
**Mục tiêu:** Xây dựng thành công luồng tạo dữ liệu chuẩn từ phía Giáo viên xuống Database và Storage. Trọng tâm là tối ưu hóa trải nghiệm (UX) "Nhập liệu một lần", giúp giáo viên tạo đề thi 4 kỹ năng nhanh chóng, sát với thực tế đề thi giấy.

---

### Bước 1: Khởi tạo và Hạ tầng (Infrastructure Setup)
- [ ] Khởi tạo project Frontend/Backend (Ví dụ: Next.js kết hợp Node.js hoặc dùng Next.js Server Actions).
- [ ] Khởi tạo Database PostgreSQL trên **NeonDB**.
- [ ] Cập nhật Schema Database (Thêm cột `content_text` kiểu `TEXT` vào bảng `question_pool`).
- [ ] Tích hợp ORM (Prisma hoặc Drizzle) để map Schema và tương tác với DB.
- [ ] Thiết lập Cloudflare R2 bucket. Viết API lấy **Presigned URL** để Client có thể upload trực tiếp file lên R2 (giảm tải cho Backend).

---

### Bước 2: Quản lý Lớp học (Class Management)
- [ ] **UI:** Giao diện hiển thị danh sách lớp học hiện có và Nút "Tạo lớp học mới".
- [ ] **UI:** Form tạo lớp học gồm các trường: Tên lớp, Mô tả ngắn.
- [ ] **API:** Viết các endpoint (hoặc Server Actions) thực hiện lệnh `INSERT`/`SELECT` vào bảng `classes`.

---

### Bước 3: Kho Đề & Builder (Question Pool - Trọng tâm Phase 1A)
Xây dựng một **Dynamic Form** (Form động) thay đổi giao diện dựa trên lựa chọn Kỹ năng (Skill) của giáo viên.

**1. Thông tin chung (Luôn hiển thị)**
- Input Tiêu đề bài tập (Ví dụ: *Cam 18 - Test 1 - Reading Passage 1*).
- Dropdown Chọn Kỹ năng: `[Reading, Listening, Writing, Speaking]`.

**2. Xử lý Logic Form theo từng Kỹ năng:**

* **Trường hợp A: Chọn Kỹ năng READING**
    * **Nội dung:** Hiển thị 1 Rich Text Editor cỡ lớn. Giáo viên copy TOÀN BỘ bài đọc và danh sách câu hỏi paste vào đây.
    * **Đáp án:** Ô input hỏi "Số lượng câu hỏi?". Khi nhập số (VD: 13), hệ thống render 13 hàng. Mỗi hàng cho phép nhập đáp án dạng Tag/Chip (Ví dụ gõ `A` -> Enter, `True` -> Enter).

* **Trường hợp B: Chọn Kỹ năng LISTENING**
    * **Nội dung:** * Nút `Upload Audio`. Khi chọn file `.mp3`, trigger API lấy Presigned URL -> Đẩy lên R2 -> Lấy link trả về.
        * Hiển thị 1 Rich Text Editor để giáo viên paste danh sách câu hỏi text vào.
    * **Đáp án:** Form nhập đáp án dạng Tag/Chip y hệt như Reading.

* **Trường hợp C: Chọn Kỹ năng WRITING**
    * **Nội dung:** Hiển thị Rich Text Editor để giáo viên paste đề bài (Được phép chèn ảnh trực tiếp vào Editor cho Task 1, ảnh này cũng gọi API đẩy lên R2 ngầm).
    * **Đáp án:** BỊ ẨN HOÀN TOÀN (Vì chấm tự luận, không đối chiếu auto-matching).

* **Trường hợp D: Chọn Kỹ năng SPEAKING**
    * **Nội dung:** Hiển thị Rich Text Editor để giáo viên nhập danh sách câu hỏi / cue cards.
    * **Đáp án:** BỊ ẨN HOÀN TOÀN.

**3. Đóng gói dữ liệu (Data Payload) & Submit:**
- [ ] Xây dựng logic gom dữ liệu form thành một Payload Object chuẩn trước khi Submit:
```javascript
// Cấu trúc Payload đẩy xuống API / Backend
const payload = {
  title: "Đề thi thử tháng 10",
  skill: "reading", // listening, writing, speaking
  content_text: "<html_chuỗi_chứa_đề_bài>", 
  content_url: "https://pub-r2.../audio.mp3", // Sẽ là null nếu không có file đính kèm
  questions_data: [
    { "q_no": 1, "answers": ["A", "a"] },
    { "q_no": 2, "answers": ["sunflower", "sun flowers"] }
  ] // Sẽ là mảng rỗng [] nếu là Writing/Speaking
}
[ ] API nhận Payload, thực hiện INSERT vào bảng question_pool.

Bước 4: Giao bài (Assignment Flow)
[ ] UI: Giao diện kho đề (fetch danh sách từ bảng question_pool để giáo viên xem lại).

[ ] UI: Nút "Giao bài tập" mở ra một Modal (Popup).

[ ] Modal Workflow:

Dropdown chọn Lớp học (Load từ bảng classes).

Dropdown/Danh sách chọn Đề thi.

Bộ chọn Ngày/Giờ (Date & Time Picker) để thiết lập Hạn nộp bài (Deadline).

[ ] API: Nhận thông tin từ Modal, tạo bản ghi mới vào bảng assignments với is_active = true.

Giai đoạn Tương lai: Phase 2 & 3 (Grading & AI Integration)
(Lưu ý: Chỉ thực hiện sau khi Phase 1A và Phase 1B của Học sinh đã hoàn thiện)

Xây dựng Dashboard hiển thị bài nộp (submissions) của học sinh theo từng assignment.

Tích hợp Editor chuyên dụng hỗ trợ Annotation/Inline-comment (Bôi đen text để nhận xét).

Gọi API hiển thị feedback AI (Grammar/Vocab) cho Writing và Speaking.