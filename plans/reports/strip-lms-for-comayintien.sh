#!/usr/bin/env bash
# Strip LMS code khỏi clone của lmsrova để biến thành comayintien.
# Chạy ở thư mục root của repo cloned (ngang hàng với rova-lms/).
#
# Usage:
#   1. git clone https://github.com/Sydneynguyen112/lmsrova.git comayintien-temp
#   2. cd comayintien-temp
#   3. bash <path-to-script>/strip-lms-for-comayintien.sh
#   4. Manual: edit components/layout/Sidebar.tsx, register, ensureProfile (xem plan file)
#   5. git push origin main → comayintien repo

set -e

ROOT="rova-lms"

if [ ! -d "$ROOT" ]; then
  echo "❌ Không thấy folder $ROOT. Chạy từ root của clone repo."
  exit 1
fi

cd "$ROOT"

echo "→ Strip admin LMS pages..."
rm -rf "app/(dashboard)/admin/courses"
rm -rf "app/(dashboard)/admin/users"
rm -rf "app/(dashboard)/admin/students"
rm -rf "app/(dashboard)/admin/mentors"
rm -rf "app/(dashboard)/admin/blog"
rm -rf "app/(dashboard)/admin/forms"
rm -rf "app/(dashboard)/admin/reviews"
rm -rf "app/(dashboard)/admin/profile"
rm -f "app/(dashboard)/admin/page.tsx"

echo "→ Strip student LMS pages..."
rm -rf "app/(dashboard)/student/courses"
rm -rf "app/(dashboard)/student/checkout"
rm -rf "app/(dashboard)/student/blog"
rm -rf "app/(dashboard)/student/journal"
rm -rf "app/(dashboard)/student/submissions"
rm -rf "app/(dashboard)/student/review"
rm -rf "app/(dashboard)/student/profile"
rm -f "app/(dashboard)/student/page.tsx"

echo "→ Strip mentor LMS pages..."
rm -rf "app/(dashboard)/mentor/students"
rm -rf "app/(dashboard)/mentor/submissions"
rm -rf "app/(dashboard)/mentor/reviews"
rm -rf "app/(dashboard)/mentor/profile"
rm -f "app/(dashboard)/mentor/page.tsx"

echo "→ Strip public LMS pages..."
rm -rf "app/(public)/blog"
rm -rf "app/(public)/courses"
rm -rf "app/(public)/mentors"
rm -rf "app/(public)/pricing"

echo "→ Strip LMS components..."
rm -rf components/admin
rm -rf components/blog
rm -rf components/courses
rm -rf components/forms
rm -rf components/landing
rm -rf components/mentor
rm -rf components/student

echo "→ Strip LMS lib..."
rm -f lib/mock-data.ts

echo ""
echo "✅ LMS code đã xoá khỏi $ROOT/"
echo ""
echo "📝 BƯỚC TIẾP THEO (manual edits):"
echo "  1. Sửa $ROOT/components/layout/sidebar-nav-config.ts → bỏ hết items LMS, giữ Cỗ Máy + Hồ sơ"
echo "  2. Sửa $ROOT/components/layout/Sidebar.tsx nếu có hardcode link LMS"
echo "  3. Sửa $ROOT/app/(auth)/register/page.tsx → thêm \`source: 'comay'\` + insert apps_access + user_features"
echo "  4. Sửa $ROOT/lib/auth.ts ensureProfile → tương tự"
echo "  5. Sửa $ROOT/app/page.tsx → redirect /student/co-may/tong-quan"
echo "  6. Build local kiểm tra: cd $ROOT && npm install && npm run build"
echo "  7. git add -A && git commit -m 'init: split from lmsrova' && git push"
echo ""
echo "Snippets ready-to-paste có ở plans/reports/plan-260508-0916-phase2-strip-lms.md"
