-- Migration 038: học sinh tự làm lại có tính điểm (Reading/Listening, đề riêng)
--
-- Trước migration này, đường DUY NHẤT để một assignment có attempt_number > 1 là giáo viên
-- bấm "Yêu cầu làm lại" — nút đó chỉ render cho Writing/Speaking. Reading/Listening nộp một
-- lần là khoá vĩnh viễn.
--
-- Hai thứ được thêm:
--   1. `attempt_kind` — phân biệt ba nguồn gốc của một lần nộp. Cần vì badge phía giáo viên
--      hiện suy ra "bài làm lại" từ `attempt_number > 1`, mà từ nay điều đó có thể đến từ
--      học sinh tự bấm chứ không chỉ từ yêu cầu của giáo viên.
--   2. `assignment_retakes` — ghi "học sinh đang mở một lượt làm lại". Cố tình KHÔNG mượn
--      `rewrite_status = 'requested'` của luồng giáo viên: hai luồng có quyền và ngữ nghĩa
--      khác nhau (giáo viên được bỏ qua gate đóng bài, học sinh thì không), trộn chung sẽ
--      khiến mọi truy vấn phải phân biệt lại bằng heuristic.

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS attempt_kind TEXT NOT NULL DEFAULT 'original';

-- Backfill dữ liệu cũ. An toàn tuyệt đối: tại thời điểm migration này, mọi row có
-- attempt_number > 1 đều bắt buộc phải đi qua cửa rewrite của giáo viên (worker.js gate
-- "Bạn đã nộp bài này rồi" chỉ mở khi rewrite_status = 'requested'), và kiểm chứng trên DB
-- thật cho thấy 33/33 row như vậy đều là writing/speaking — không có reading/listening nào.
UPDATE submissions
SET attempt_kind = 'rewrite'
WHERE attempt_number > 1 AND attempt_kind = 'original';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_attempt_kind_check') THEN
    ALTER TABLE submissions
      ADD CONSTRAINT submissions_attempt_kind_check
      CHECK (attempt_kind IN ('original', 'rewrite', 'retake'));
  END IF;
END$$;

-- Một học sinh chỉ có tối đa MỘT lượt làm lại đang mở trên mỗi assignment (PK kép), nên
-- không thể mở chồng nhiều lượt rồi nộp lẫn. Row bị xoá ngay khi nộp, trong cùng transaction
-- với INSERT submission.
CREATE TABLE IF NOT EXISTS assignment_retakes (
  student_id     UUID        NOT NULL REFERENCES students(id)    ON DELETE CASCADE,
  assignment_id  UUID        NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  attempt_number INTEGER     NOT NULL,
  opened_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_retakes_assignment
  ON assignment_retakes (assignment_id);
