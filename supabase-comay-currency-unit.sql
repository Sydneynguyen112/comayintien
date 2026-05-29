-- ⚠️ CHẠY FILE NÀY TRƯỚC khi deploy code currency_unit.
-- Thêm cột đơn vị hiển thị cho cỗ máy (tài khoản cent USC).
-- Số liệu vẫn lưu canonical theo USD; cột này chỉ quyết định cách HIỂN THỊ.
-- Idempotent — chạy lại nhiều lần không sao.

ALTER TABLE public.comay_machines
  ADD COLUMN IF NOT EXISTS currency_unit TEXT NOT NULL DEFAULT 'USD'
  CHECK (currency_unit IN ('USD', 'USC'));

-- Báo cáo chu kỳ ghi lại đơn vị của máy lúc đóng (để màn báo cáo hiển thị đúng USC/USD).
ALTER TABLE public.comay_reports
  ADD COLUMN IF NOT EXISTS currency_unit TEXT
  CHECK (currency_unit IN ('USD', 'USC'));
