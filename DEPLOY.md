# Deploy ROVA LMS lên Cloudflare Pages

Project đã được cấu hình để **static export** (`output: 'export'` trong `next.config.ts`) — build ra folder `out/` chứa HTML/CSS/JS thuần, chạy được trên bất kỳ static host nào (Cloudflare Pages, Netlify, Vercel, GitHub Pages, S3, Nginx...).

## Tổng quan

- **57 static pages** được pre-render tại build time
- Không có server code, không cần Node.js runtime
- Auth dùng localStorage (client-side)
- Mock data import trực tiếp, không gọi API

## Các điểm quan trọng về static export

Vì dùng `output: 'export'`, các feature sau **không hoạt động**:
- Server Actions, API routes, middleware
- Image Optimization (đã disable — `images.unoptimized: true`)
- `cookies()`, `headers()`, `draftMode()`
- Rewrites, redirects, headers trong `next.config.ts`
- ISR (Incremental Static Regeneration)

Các dynamic route phải có `generateStaticParams()` để biết pre-render những path nào. Đã setup cho:
- `/student/courses/[courseId]` → c-pro, c-coaching
- `/student/courses/[courseId]/[lessonId]` → 27 lessons
- `/mentor/students/[studentId]` → 7 students

Khi thêm course/lesson/student mới trong `lib/mock-data.ts`, build sẽ tự pre-render thêm các path mới (không cần sửa code).

---

## Phương án 1: Deploy qua Cloudflare Dashboard (khuyên dùng — không cần CLI)

### Bước 1: Tạo project trên Cloudflare Pages

1. Vào https://dash.cloudflare.com → **Workers & Pages** → **Create** → Tab **Pages** → **Connect to Git**
2. Authorize Cloudflare truy cập GitHub của bạn
3. Chọn repo **`Sydneynguyen112/lmsrova`** → **Begin setup**

### Bước 2: Build configuration

Điền đúng các field sau:

| Field | Value |
|---|---|
| **Project name** | `rova-lms` (hoặc tên bạn muốn) |
| **Production branch** | `main` |
| **Framework preset** | `Next.js (Static HTML Export)` |
| **Build command** | `npx next build` |
| **Build output directory** | `out` |
| **Root directory (advanced)** | (để trống — code ở root repo) |
| **Node version** | `20` hoặc `22` |

Nếu framework preset không tự detect đúng, chọn **None** và điền thủ công.

### Bước 3: Environment variables (không cần cho project này)

Project dùng mock-data hardcode, không cần env vars. Có thể bỏ qua.

### Bước 4: Save and Deploy

Click **Save and Deploy**. Cloudflare sẽ:
1. Clone repo
2. Chạy `npm install`
3. Chạy `npx next build` → tạo folder `out/`
4. Upload lên CDN
5. Cấp URL dạng `https://rova-lms.pages.dev`

Build đầu tiên mất ~2-3 phút. Các lần push sau chỉ ~1 phút.

### Bước 5: Custom domain (tuỳ chọn)

Trong project Pages → **Custom domains** → **Set up a custom domain** → nhập domain → làm theo hướng dẫn DNS.

---

## Phương án 2: Deploy qua Wrangler CLI (nhanh cho test)

Cần cài Wrangler trước:

```bash
npm install -g wrangler
wrangler login
```

Sau đó trong thư mục project:

```bash
cd c:/Users/Administrator/LMS_ROVA/rova-lms
npx next build
wrangler pages deploy out --project-name=rova-lms
```

Lần deploy đầu tiên sẽ tự tạo project. URL preview sẽ hiện ra sau ~30 giây.

---

## Phương án 3: Deploy thủ công qua Dashboard (drag & drop)

1. Chạy local: `npx next build` → tạo folder `out/`
2. Nén `out/` thành file ZIP
3. Vào Cloudflare Pages → **Create project** → **Upload assets**
4. Upload file ZIP
5. Hoàn tất

Cách này không tự động redeploy khi bạn push code. Chỉ dùng cho test nhanh.

---

## Build local để test trước khi deploy

```bash
cd c:/Users/Administrator/LMS_ROVA/rova-lms
npx next build
npx serve out
```

Mở http://localhost:3000 để kiểm tra — giao diện phải y hệt production.

---

## Các lưu ý khi deploy

### 1. Line endings trên Windows
Khi commit trên Windows, git có thể cảnh báo `LF → CRLF`. Đây chỉ là warning, không ảnh hưởng build.

### 2. Routing trên Cloudflare Pages
Cloudflare Pages tự xử lý routing cho static export với `trailingSlash: true`:
- `/courses` → `/courses/index.html`
- `/student/courses/c-pro` → `/student/courses/c-pro/index.html`
- Không cần thêm `_redirects` file.

### 3. 404 page
Next.js tự tạo `out/404.html` — Cloudflare Pages sẽ tự dùng file này.

### 4. Khi sửa mock-data và redeploy
Cứ push lên `main` branch → Cloudflare auto-build lại. Các path mới trong mock-data sẽ được pre-render tự động.

### 5. Build size
Tổng output `out/` hiện tại ~6 MB (bao gồm fonts, JS bundles, pre-rendered HTML). Nằm thoải mái trong free tier Cloudflare Pages (25 MB/file, không giới hạn tổng dung lượng).

### 6. Free tier limits
- **500 builds/month** (thoải mái cho dev)
- **Unlimited requests** + bandwidth
- **Unlimited custom domains**
- Project public hoặc private đều được (không giới hạn)

---

## Troubleshooting

### Build fail: "Dynamic segment must have generateStaticParams"
Nếu bạn thêm dynamic route mới (ví dụ `/admin/users/[userId]`), nhớ thêm `generateStaticParams()` vào page.tsx tương ứng.

### Localhost hoạt động nhưng Pages không
- Check browser console xem có lỗi 404 assets không
- Verify `trailingSlash: true` trong `next.config.ts`
- Thử `npx serve out` local để reproduce

### Auth không hoạt động sau deploy
Auth dùng localStorage → cần HTTPS để localStorage hoạt động đúng trên một số browser. Cloudflare Pages tự cấp HTTPS nên OK.

### Link/router không hoạt động sau reload
Đã bật `trailingSlash: true` — Next.js tạo `index.html` trong từng folder, routing hoạt động chuẩn trên static host.

---

## Cấu trúc deploy hiện tại

```
rova-lms/ (repo root)
├── out/                       ← Build output (gitignored)
│   ├── index.html            ← Homepage
│   ├── courses/index.html
│   ├── mentor/students/
│   │   ├── u-student-001/index.html
│   │   ├── u-student-002/index.html
│   │   └── ...
│   ├── student/courses/c-pro/
│   │   ├── index.html
│   │   ├── l-pro-01/index.html
│   │   └── ...
│   ├── _next/                ← JS/CSS bundles
│   └── 404.html
│
├── next.config.ts             ← output: 'export' + trailingSlash
├── package.json
└── ... (source code)
```

---

## Tự động hoá trong tương lai

Sau khi connect GitHub:
- Push lên `main` → Auto deploy production
- Push lên branch khác → Auto deploy preview (URL dạng `https://abc123.rova-lms.pages.dev`)
- Mở PR → Cloudflare comment link preview vào PR

Không cần chạy `wrangler deploy` thủ công sau này.
