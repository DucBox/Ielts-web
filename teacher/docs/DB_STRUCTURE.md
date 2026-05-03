Dưới đây là tài liệu thiết kế cơ sở dữ liệu (Data Dictionary) được chuyển đổi sang định dạng Markdown để bạn dễ dàng đưa vào Github hoặc tài liệu dự án:

# Database Schema: IELTS Testing Platform

## 1. Quản lý Giáo viên & Lớp học

### Bảng `teachers`
Lưu trữ thông tin tài khoản của giáo viên.

| Cột | Kiểu dữ liệu | Ràng buộc / Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Khóa chính |
| `full_name` | `TEXT` | `NOT NULL` | Họ và tên giáo viên |
| `email` | `TEXT` | `UNIQUE`, `NOT NULL` | Email đăng nhập |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `DEFAULT NOW()` | Thời gian tạo tài khoản |

### Bảng `classes`
Quản lý các lớp học do giáo viên tạo ra.

| Cột | Kiểu dữ liệu | Ràng buộc / Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Khóa chính |
| `teacher_id` | `UUID` | `REFERENCES teachers(id)` | Khóa ngoại liên kết tới `teachers` |
| `class_name` | `TEXT` | `NOT NULL` | Tên lớp học |
| `description` | `TEXT` | | Mô tả thêm về lớp học |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `DEFAULT NOW()` | Thời gian tạo lớp |

### Bảng `students`
Lưu trữ thông tin tài khoản của học sinh thuộc các lớp học.

| Cột | Kiểu dữ liệu | Ràng buộc / Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Khóa chính |
| `class_id` | `UUID` | `REFERENCES classes(id)` | Khóa ngoại liên kết tới `classes` |
| `full_name` | `TEXT` | `NOT NULL` | Họ và tên học sinh |
| `username` | `TEXT` | `UNIQUE`, `NOT NULL` | Tên đăng nhập |
| `password_hash`| `TEXT` | `NOT NULL` | Mật khẩu đã được mã hóa |

---

## 2. Kho đề (Question Pool)

**Custom Enum Type:** `skill_type`
* Các giá trị: `'listening'`, `'reading'`, `'writing'`, `'speaking'`

### Bảng `question_pool`
Lưu trữ các đề bài IELTS theo từng kỹ năng.

| Cột | Kiểu dữ liệu | Ràng buộc / Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Khóa chính |
| `teacher_id` | `UUID` | `REFERENCES teachers(id)` | Khóa ngoại liên kết tới `teachers` |
| `skill` | `skill_type` | `NOT NULL` | Kỹ năng của bài thi |
| `title` | `TEXT` | `NOT NULL` | Tiêu đề bài tập |
| `content_url` | `TEXT` | | Link file TXT/Audio lưu trữ trên Cloudflare R2 |
| `questions_data`| `JSONB` | `NOT NULL` | Cấu trúc câu hỏi và đáp án mẫu. *Ví dụ:* `[{"q_no": 1, "type": "fill_in", "answers": ["sunflower", "sun flowers"]}]` |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `DEFAULT NOW()` | Thời gian tạo đề |

---

## 3. Giao bài tập (Assignments)

### Bảng `assignments`
Quản lý việc giáo viên giao một bài tập từ kho đề cho một lớp học cụ thể.

| Cột | Kiểu dữ liệu | Ràng buộc / Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Khóa chính |
| `class_id` | `UUID` | `REFERENCES classes(id)` | Khóa ngoại liên kết tới `classes` |
| `question_id` | `UUID` | `REFERENCES question_pool(id)`| Khóa ngoại lấy đề từ `question_pool` |
| `title` | `TEXT` | `NOT NULL` | Tên phiên giao bài |
| `deadline` | `TIMESTAMP WITH TIME ZONE` | | Hạn nộp bài |
| `is_active` | `BOOLEAN` | `DEFAULT TRUE` | Trạng thái hiển thị/mở bài tập |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `DEFAULT NOW()` | Thời gian giao bài |

---

## 4. Bài làm của học sinh (Submissions)

### Bảng `submissions`
Lưu trữ chi tiết bài làm, kết quả AI và đánh giá của giáo viên cho từng học sinh.

| Cột | Kiểu dữ liệu | Ràng buộc / Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Khóa chính |
| `assignment_id`| `UUID` | `REFERENCES assignments(id)` | Khóa ngoại liên kết phiên giao bài |
| `student_id` | `UUID` | `REFERENCES students(id)` | Khóa ngoại liên kết học sinh nộp bài |
| `student_answers`|`JSONB` | | Lịch sử làm bài (Reading/Listening). *Ví dụ:* `[{"q_no": 1, "user_answer": "sunflower"}]`|
| `writing_content`| `TEXT` | | Nội dung text bài làm Writing |
| `speaking_audio_url`| `TEXT`| | Link file audio Speaking lưu trên R2 |
| `speaking_script`| `TEXT` | | Script STT do AI xử lý từ file audio |
| `ai_feedback` | `JSONB` | | Kết quả AI chấm nhanh (score, grammar_notes) |
| `teacher_feedback`| `JSONB` | | Nhận xét inline của giáo viên (Google Docs style) |
| `overall_score`| `FLOAT` | | Điểm số tổng quát |
| `status` | `TEXT` | `DEFAULT 'submitted'` | Trạng thái bài nộp (`submitted`, `marking`, `completed`) |
| `submitted_at` | `TIMESTAMP WITH TIME ZONE` | `DEFAULT NOW()` | Thời gian nộp bài |