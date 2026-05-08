const { createClient } = require("@supabase/supabase-js");

const sb = createClient(
  "https://uxmrvrwaotmctthjiotw.supabase.co",
  "sb_publishable_0yYw615L9zEnvqgQF_2jtQ_nOypG6Ft"
);

async function seed() {
  console.log("🌱 Seeding ROVA LMS database...\n");

  // ─── 1. PROFILES (admin → mentors → students) ───
  console.log("1/8 Profiles...");

  // Admin first
  const { data: admin } = await sb.from("profiles").insert({
    full_name: "ROVA Admin",
    email: "admin@rova.vn",
    phone: "0900000000",
    role: "admin",
  }).select().single();

  // Mentors
  const { data: mentor1 } = await sb.from("profiles").insert({
    full_name: "Trương Văn Tiến",
    email: "tien@rova.vn",
    phone: "0901000001",
    role: "mentor",
    discord_handle: "tien_mentor#0001",
  }).select().single();

  const { data: mentor2 } = await sb.from("profiles").insert({
    full_name: "Nguyễn Xuân Bảo",
    email: "bao@rova.vn",
    phone: "0901000002",
    role: "mentor",
    discord_handle: "bao_mentor#0002",
  }).select().single();

  // Students
  const students = [
    { full_name: "Lê Quốc Huy", email: "huy@gmail.com", phone: "0912000001", mentor_id: mentor1.id, classification: "newbie", risk_tag: "normal", discord_handle: "huy_newbie#0001" },
    { full_name: "Phạm Thị Mai", email: "mai@gmail.com", phone: "0912000002", mentor_id: mentor1.id, classification: "beginner", risk_tag: "normal", discord_handle: "mai_beginner#0002" },
    { full_name: "Trần Văn Đức", email: "duc@gmail.com", phone: "0912000003", mentor_id: mentor1.id, classification: "beginner", risk_tag: "at_risk", discord_handle: "duc_beginner#0003" },
    { full_name: "Nguyễn Thuỳ Trang", email: "trang@gmail.com", phone: "0912000004", mentor_id: mentor2.id, classification: "intermediate", risk_tag: "normal", discord_handle: "trang_inter#0004" },
    { full_name: "Vũ Hoàng Long", email: "long@gmail.com", phone: "0912000005", mentor_id: mentor2.id, classification: "advanced", risk_tag: "normal", discord_handle: "long_adv#0005" },
    { full_name: "Hoàng Việt Anh", email: "anh@gmail.com", phone: "0912000006", mentor_id: mentor2.id, classification: "newbie", risk_tag: "watch", discord_handle: "anh_newbie#0006" },
    { full_name: "Bùi Đăng Khoa", email: "khoa@gmail.com", phone: "0912000007", mentor_id: mentor1.id, classification: "newbie", risk_tag: "churned", discord_handle: "khoa_newbie#0007" },
  ];

  const { data: studentRows } = await sb.from("profiles").insert(
    students.map((s) => ({ ...s, role: "student" }))
  ).select();

  const studentMap = {};
  studentRows.forEach((s) => { studentMap[s.email] = s.id; });

  console.log(`   ✓ ${3 + studentRows.length} profiles`);

  // ─── 2. COURSES ───
  console.log("2/8 Courses...");
  await sb.from("courses").insert([
    {
      id: "c-pro",
      title: "Khoá 3 Hộp PRO",
      description: "Hệ thống giao dịch 3 Hộp — từ nền tảng đến thực chiến. Phù hợp cho người mới bắt đầu muốn có lộ trình rõ ràng.",
      price: 7990000,
      total_lessons: 12,
      total_duration_sec: 9660,
    },
    {
      id: "c-coaching",
      title: "Coaching 1-on-1",
      description: "Mentoring cá nhân hoá cùng chuyên gia. Review bài, phân tích portfolio, xây dựng Trading Plan riêng.",
      price_label: "Nhận tư vấn",
      total_lessons: 0,
      total_duration_sec: 0,
    },
  ]);
  console.log("   ✓ 2 courses");

  // ─── 3. MODULES ───
  console.log("3/8 Modules...");
  await sb.from("modules").insert({ id: "m-pro-all", course_id: "c-pro", title: "Toàn bộ bài học", order_index: 1 });
  console.log("   ✓ 1 module");

  // ─── 4. LESSONS ───
  console.log("4/8 Lessons...");
  const lessons = [
    { id: "l-pro-01", module_id: "m-pro-all", title: "Giới thiệu khoá học & Tư duy đúng về Trading", duration_sec: 720, order_index: 1 },
    { id: "l-pro-02", module_id: "m-pro-all", title: "Cách đọc biểu đồ nến Nhật", duration_sec: 840, order_index: 2 },
    { id: "l-pro-03", module_id: "m-pro-all", title: "Cách vẽ Trendline chính xác", duration_sec: 780, order_index: 3 },
    { id: "l-pro-04", module_id: "m-pro-all", title: "Vùng hỗ trợ & kháng cự (S/R)", duration_sec: 900, order_index: 4 },
    { id: "l-pro-05", module_id: "m-pro-all", title: "Cung cầu (Supply/Demand) cơ bản", duration_sec: 840, order_index: 5 },
    { id: "l-pro-06", module_id: "m-pro-all", title: "Mô hình giá (Chart Patterns)", duration_sec: 900, order_index: 6 },
    { id: "l-pro-07", module_id: "m-pro-all", title: "Công thức 1: Entry cơ bản", duration_sec: 780, order_index: 7 },
    { id: "l-pro-08", module_id: "m-pro-all", title: "Stoploss & Take Profit đúng cách", duration_sec: 720, order_index: 8 },
    { id: "l-pro-09", module_id: "m-pro-all", title: "Quản lý vốn (Risk Management)", duration_sec: 900, order_index: 9 },
    { id: "l-pro-10", module_id: "m-pro-all", title: "Tâm lý giao dịch — Kẻ thù lớn nhất là chính mình", duration_sec: 840, order_index: 10 },
    { id: "l-pro-11", module_id: "m-pro-all", title: "Xây dựng Trading Plan cá nhân", duration_sec: 840, order_index: 11 },
    { id: "l-pro-12", module_id: "m-pro-all", title: "Tổng kết & Bước tiếp theo", duration_sec: 600, order_index: 12 },
  ];
  await sb.from("lessons").insert(lessons);
  console.log(`   ✓ ${lessons.length} lessons`);

  // ─── 5. ASSIGNMENTS ───
  console.log("5/8 Assignments...");
  await sb.from("assignments").insert([
    {
      id: "a-pro-nen", course_id: "c-pro", order_index: 1,
      title: "Bài tập: Nến chủ",
      description: "Phân tích nến chủ trên chart thực tế. Tìm ít nhất 3 nến chủ trên EUR/USD hoặc XAU/USD khung H4/D1.",
      instructions: "**Yêu cầu:**\n1. Mở TradingView, chọn EUR/USD hoặc XAU/USD khung H4/D1\n2. Tìm ít nhất 3 nến chủ\n3. Chụp screenshot, khoanh vùng nến chủ\n4. Ghi chú giải thích\n\n**Tiêu chí chấm:**\n- Xác định đúng nến chủ (50%)\n- Giải thích logic (30%)\n- Trình bày (20%)",
      materials: '[{"name":"Cheatsheet: Nhận diện nến chủ","url":"/files/a-nen-chu-guide.pdf","type":"pdf"}]',
    },
    {
      id: "a-pro-cautruc", course_id: "c-pro", order_index: 2,
      title: "Bài tập: Cấu trúc",
      description: "Xác định Market Structure — tìm HH, HL, LH, LL trên chart thực tế.",
      instructions: "**Yêu cầu:**\n1. Chọn GBP/USD hoặc USD/JPY khung H1/H4\n2. Đánh dấu ít nhất 5 swing points\n3. Xác định trend\n4. Chụp chart và ghi chú\n\n**Tiêu chí chấm:**\n- Xác định đúng swing points (40%)\n- Phân loại đúng trend (30%)\n- Ghi chú (30%)",
      materials: '[{"name":"Hướng dẫn Market Structure","url":"/files/a-cautruc-guide.pdf","type":"pdf"}]',
    },
    {
      id: "a-pro-ct1", course_id: "c-pro", order_index: 3,
      title: "Bài tập: Công thức 1 (CT1)",
      description: "Áp dụng CT1 — tìm setup giao dịch với Entry, SL, TP.",
      instructions: "**Yêu cầu:**\n1. Tìm setup CT1 trên bất kỳ cặp tiền, khung H1/H4\n2. Đánh dấu Entry, SL, TP\n3. Tính R:R\n4. Ghi chú lý do\n\n**Tiêu chí chấm:**\n- Setup đúng CT1 (40%)\n- Entry/SL/TP hợp lý (30%)\n- R:R >= 1:2 (15%)\n- Ghi chú (15%)",
      materials: '[{"name":"Template CT1","url":"/files/a-ct1-template.jpg","type":"image"},{"name":"Checklist CT1","url":"/files/a-ct1-checklist.pdf","type":"pdf"}]',
    },
    {
      id: "a-pro-ct2", course_id: "c-pro", order_index: 4,
      title: "Bài tập: Công thức 2 (CT2)",
      description: "Áp dụng CT2 — phân tích đa khung thời gian.",
      instructions: "**Yêu cầu:**\n1. Phân tích trend trên D1\n2. Tìm setup CT2 trên H4/H1\n3. Chụp ít nhất 2 chart (khung lớn + nhỏ)\n4. Đánh dấu Entry, SL, TP\n\n**Tiêu chí chấm:**\n- Trend khung lớn (25%)\n- Setup CT2 (35%)\n- Multi-TF confluence (25%)\n- Ghi chú (15%)",
      materials: '[{"name":"Template Multi-TF","url":"/files/a-ct2-template.pdf","type":"pdf"}]',
    },
    {
      id: "a-pro-ct3", course_id: "c-pro", order_index: 5,
      title: "Bài tập: Công thức 3 (CT3)",
      description: "Áp dụng CT3 — Supply/Demand + cấu trúc thị trường.",
      instructions: "**Yêu cầu:**\n1. Xác định vùng S/D trên H4/D1\n2. Chờ giá quay về + xác nhận BOS/ChoCh\n3. Xác định Entry, SL, TP\n4. Chụp chart + ghi chú\n\n**Tiêu chí chấm:**\n- Vùng S/D đúng (25%)\n- BOS/ChoCh (25%)\n- Entry/SL/TP (30%)\n- Trình bày (20%)",
      materials: '[{"name":"Hướng dẫn CT3","url":"/files/a-ct3-guide.pdf","type":"pdf"},{"name":"Ảnh mẫu CT3","url":"/files/a-ct3-sample.jpg","type":"image"}]',
    },
  ]);
  console.log("   ✓ 5 assignments");

  // ─── 6. ENROLLMENTS ───
  console.log("6/8 Enrollments...");
  await sb.from("enrollments").insert([
    { user_id: studentMap["huy@gmail.com"], course_id: "c-pro", status: "active", progress_pct: 58.3 },
    { user_id: studentMap["mai@gmail.com"], course_id: "c-pro", status: "active", progress_pct: 75.0 },
    { user_id: studentMap["duc@gmail.com"], course_id: "c-pro", status: "paused", progress_pct: 25.0 },
    { user_id: studentMap["trang@gmail.com"], course_id: "c-pro", status: "active", progress_pct: 41.7 },
    { user_id: studentMap["long@gmail.com"], course_id: "c-pro", status: "active", progress_pct: 91.7 },
    { user_id: studentMap["anh@gmail.com"], course_id: "c-pro", status: "active", progress_pct: 16.7 },
    { user_id: studentMap["khoa@gmail.com"], course_id: "c-pro", status: "active", progress_pct: 0 },
  ]);
  console.log("   ✓ 7 enrollments");

  // ─── 7. MENTOR REVIEWS ───
  console.log("7/8 Reviews...");
  await sb.from("mentor_reviews").insert([
    { mentor_id: mentor1.id, student_id: studentMap["huy@gmail.com"], rating: 5, feedback: "Anh Thành giải thích rất dễ hiểu, reply nhanh." },
    { mentor_id: mentor1.id, student_id: studentMap["mai@gmail.com"], rating: 4, feedback: "Mentor nhiệt tình, đôi khi reply hơi chậm cuối tuần." },
    { mentor_id: mentor1.id, student_id: studentMap["duc@gmail.com"], rating: 5, feedback: "Giải thích Price Action rõ ràng." },
    { mentor_id: mentor2.id, student_id: studentMap["trang@gmail.com"], rating: 5, feedback: "Chị Linh rất kiên nhẫn, phân tích chi tiết." },
    { mentor_id: mentor2.id, student_id: studentMap["long@gmail.com"], rating: 5, feedback: "Mentoring chiến lược rất hay." },
    { mentor_id: mentor2.id, student_id: studentMap["anh@gmail.com"], rating: 4, feedback: "Hướng dẫn tỉ mỉ, thích cách phân tích chart." },
  ]);
  console.log("   ✓ 6 reviews");

  // ─── 8. BLOG POSTS ───
  console.log("8/8 Blog posts...");
  await sb.from("blog_posts").insert([
    {
      title: "Tâm lý giao dịch: Làm sao để không FOMO?",
      type: "article",
      summary: "FOMO là kẻ thù lớn nhất của trader. 5 cách kiểm soát cảm xúc khi thị trường biến động.",
      content: "FOMO là tâm lý phổ biến...\n\n**1. Luôn có Trading Plan**\n**2. Chấp nhận bỏ lỡ cơ hội**\n**3. Ghi nhật ký giao dịch**\n**4. Giới hạn số lệnh**\n**5. Tập thiền**",
      cover_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop",
      author_id: admin.id, published: true, likes: 24,
    },
    {
      title: "Podcast: Hành trình từ thua lỗ đến lợi nhuận ổn định",
      type: "podcast",
      summary: "Anh Thành chia sẻ 2 năm đầu thua lỗ và cách xây dựng hệ thống có lợi nhuận.",
      content: "Mentor chia sẻ hành trình trading...\n\n- Đừng tìm Holy Grail\n- Risk management > win rate\n- Kiên nhẫn là kỹ năng quan trọng nhất",
      cover_url: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&h=400&fit=crop",
      author_id: admin.id, published: true, likes: 18,
    },
    {
      title: "5 Cuốn sách mọi Trader nên đọc",
      type: "article",
      summary: "5 cuốn sách kinh điển về trading và tâm lý thị trường.",
      content: "**1. Trading in the Zone**\n**2. Market Wizards**\n**3. The Disciplined Trader**\n**4. Reminiscences of a Stock Operator**\n**5. Japanese Candlestick Charting**",
      cover_url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&h=400&fit=crop",
      author_id: admin.id, published: true, likes: 31,
    },
    {
      title: "Kỷ luật là tự do: Xây dựng routine cho Trader",
      type: "article",
      summary: "Routine buổi sáng và tối giúp trader duy trì kỷ luật.",
      content: "**Routine buổi sáng:**\n- Thiền 10 phút\n- Review journal\n- Phân tích chart\n- Viết Trading Plan\n\n**Routine buổi tối:**\n- Đóng positions\n- Ghi nhật ký\n- Đọc sách\n- Nghỉ ngơi",
      cover_url: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&h=400&fit=crop",
      author_id: admin.id, published: true, likes: 15,
    },
  ]);
  console.log("   ✓ 4 blog posts");

  console.log("\n✅ Seed hoàn tất! Database đã sẵn sàng.");
}

seed().catch((e) => console.error("❌ Seed failed:", e));
