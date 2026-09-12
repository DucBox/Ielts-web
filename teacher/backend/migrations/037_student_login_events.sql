-- Migration 037: lịch sử đăng nhập của học sinh
--
-- Ngày 2026-09-12 một học sinh bị văng phiên giữa bài thi Reading 35 phút và nộp ra lưới
-- trắng 40/40. Khi truy nguyên thì không có cách nào biết em ấy đăng nhập lúc nào: bảng
-- `students` không lưu mốc đăng nhập, `/auth/login` không log gì, và request log của
-- Cloudflare không chứa body nên một `POST /auth/login` không quy được về học sinh nào.
-- Bảng này để lần sau câu hỏi đó trả lời được ngay.
--
-- `ip` và `user_agent` được lưu vì chính ca đó cần chúng: nghi vấn là em ấy đăng nhập lại
-- từ một trình duyệt/thiết bị khác (nơi không có bản nháp đáp án), và chỉ hai trường này
-- mới phân biệt được.
--
-- Giữ 10 lượt gần nhất mỗi học sinh — prune ngay trong lúc đăng nhập (xem worker.js
-- `/auth/login`), nên bảng bị chặn cứng ở 10 × số học sinh, không phình theo thời gian.

CREATE TABLE IF NOT EXISTS student_login_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip           TEXT,
  user_agent   TEXT
);

-- Phục vụ cả truy vấn tra cứu lẫn bước prune (cùng student_id, sắp theo thời gian giảm dần).
CREATE INDEX IF NOT EXISTS idx_student_login_events_student
  ON student_login_events (student_id, logged_in_at DESC);
