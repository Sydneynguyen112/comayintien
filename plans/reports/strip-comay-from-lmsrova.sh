#!/usr/bin/env bash
# Phase 3: Strip Cỗ Máy code khỏi repo lmsrova.
# CHẠY SAU KHI comayintien.vercel.app đã deploy thành công + verify.
#
# Usage:
#   1. cd c:/Users/Administrator/LMS_ROVA
#   2. bash plans/reports/strip-comay-from-lmsrova.sh
#   3. Manual edit: sidebar-nav-config, sub-nav, admin/students dialog (xoá tab Cỗ Máy)
#   4. git add -A && git commit -m "phase3: strip co-may from lms" && git push

set -e

ROOT="rova-lms"
if [ ! -d "$ROOT" ]; then
  echo "❌ Không thấy $ROOT/. Chạy từ root LMS_ROVA."
  exit 1
fi
cd "$ROOT"

echo "→ Strip Cỗ Máy app routes..."
rm -rf "app/(dashboard)/student/co-may"
rm -rf "app/(dashboard)/admin/co-may"
rm -rf "app/(dashboard)/mentor/co-may"

echo "→ Strip Cỗ Máy components + lib..."
rm -rf "components/co-may"
rm -rf "lib/co-may"
rm -rf "lib/feature-flags"

echo "→ Strip setup wizard cho cỗ máy..."
rm -rf "app/(dashboard)/student/co-may/setup" 2>/dev/null || true

echo "→ Strip phase 1 SQL (đã apply Supabase, không cần trong repo)..."
rm -f supabase-comay-setup.sql
rm -f supabase-phase1-consolidate.sql

echo ""
echo "✅ Cỗ Máy code đã xoá khỏi lmsrova."
echo ""
echo "📝 BƯỚC TIẾP THEO (manual):"
echo "  1. components/layout/sidebar-nav-config.ts → bỏ entry 'Cỗ Máy In Tiền'"
echo "     (hoặc thay bằng external link sang comayintien.vercel.app)"
echo "  2. components/co-may/sub-nav.tsx → file này sẽ bị xoá theo, OK"
echo "  3. app/(dashboard)/admin/students/page.tsx:"
echo "     - Xoá tab 'Cỗ Máy' trong dialog"
echo "     - Bỏ FeatureAccessMenu (hoặc giữ — admin vẫn cần quản lý money_machine?)"
echo "     - Hoặc giữ để cấp quyền cho user có account ở comay"
echo "  4. app/(dashboard)/admin/page.tsx → bỏ bảng 'Doanh thu' / revenue calc"
echo "  5. Build: cd $ROOT && npm run build"
echo "  6. git commit + push"
echo ""
echo "⚠️ LƯU Ý:"
echo "   - Quyết định: giữ admin tab Cỗ Máy ở LMS để cấp quyền user_features.money_machine?"
echo "     → CÓ: giữ 'feature-access-menu' và 'students/page.tsx' tab Cỗ Máy"
echo "     → KHÔNG: chuyển sang Admin Hub (Phase 4)"
