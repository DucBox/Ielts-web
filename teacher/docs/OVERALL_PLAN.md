# OVERALL PROJECT PLAN: IELTS TESTING PLATFORM

## 1. Giới thiệu dự án (Project Overview)
Hệ thống thi và chấm điểm IELTS nội bộ, phục vụ mô hình 1 Giáo viên - Nhiều Lớp học - Nhiều Học sinh. 
Hệ thống cho phép giáo viên giao bài (4 kỹ năng), chấm điểm bằng AI (Writing, Speaking) và nhận xét chi tiết (Inline-comment). Học sinh làm bài trực tiếp trên nền tảng với trải nghiệm tối ưu (Highlight, Split-pane).

## 2. Kiến trúc Hệ thống (System Architecture)
- **Frontend / Client:** Tách biệt 2 ứng dụng (Teacher App & Student App).
- **Database:** PostgreSQL (NeonDB) - Lưu trữ toàn bộ dữ liệu quan hệ và JSONB.
- **Storage:** Cloudflare R2 - Lưu trữ file tĩnh (Audio, PDF, TXT) không giới hạn băng thông.
- **AI Integration:** OpenAI API (Chấm điểm Writing, Speech-to-Text cho Speaking).

## 3. Core Business Flow (Luồng nghiệp vụ cốt lõi)
1. **Quản lý (Teacher):** Tạo lớp học -> Thêm học sinh.
2. **Chuẩn bị (Teacher):** Tạo câu hỏi (Question Pool) -> Upload file (R2) -> Lưu cấu trúc đáp án (NeonDB).
3. **Giao bài (Teacher):** Assign bài từ Pool cho một Class cụ thể với Deadline.
4. **Làm bài (Student):** Truy cập Assignment -> Làm bài (Reading/Listening split-pane, Writing typing, Speaking upload/record audio) -> Submit.
5. **AI Pre-grading (System):** Hệ thống gọi OpenAI API chấm điểm sơ bộ từ vựng, ngữ pháp (Writing/Speaking) -> Trả kết quả về DB.
6. **Chấm bài (Teacher):** Xem bài làm -> Bôi đen đoạn text để nhận xét chi tiết (Google Docs style) -> Chấm điểm tổng.
7. **Xem kết quả (Student):** Xem điểm tổng và các highlight nhận xét chi tiết của giáo viên.

## 4. Cấu trúc Database (NeonDB)
- `teachers`: Thông tin giáo viên.
- `classes`: Quản lý lớp học.
- `students`: Thông tin học sinh, map với classes.
- `question_pool`: Kho đề, lưu trữ URL nội dung (R2) và cấu trúc câu hỏi/đáp án dạng JSONB linh hoạt.
- `assignments`: Quản lý việc giao bài.
- `submissions`: Bài làm của học sinh, lưu state, URL audio, AI feedback và Teacher feedback.