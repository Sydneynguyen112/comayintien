# Hướng dẫn sử dụng — Cỗ Máy Trading

**Phiên bản**: 1.0
**Đối tượng**: Trader cá nhân
**URL**: https://comaytrading.vercel.app

---

## 1. Cỗ Máy Trading là gì?

Đây là **tool quản trị kỷ luật rút tiền** dành cho trader cá nhân.

**Triết lý cốt lõi**: Trader thường thua không phải vì thiếu lệnh thắng, mà vì **không rút tiền có kỷ luật** — để vốn quay vòng đến khi mất hết.

**Cỗ Máy giúp bạn**:
- Chia vốn thành nhiều "cỗ máy" — mỗi máy 1 chiến lược riêng
- Đặt mốc rút tiền có kỷ luật (gọi là **Mốc neo**)
- Ghi nhận từng lệnh, từng lần rút, từng quyết định
- Kết thúc mỗi chu kỳ bằng quyết định: reset / scale / close

Triết lý không phải là tool ghi sổ thông minh — mà là tool **buộc bạn rút tiền** khi vượt mốc, không cho phép vốn quay vòng vô tận.

---

## 2. Đăng ký + đăng nhập lần đầu

### Đăng ký
1. Vào `https://comaytrading.vercel.app/register`
2. Nhập **Họ tên, Email, Số điện thoại, Mật khẩu**
3. Hoặc click **Đăng ký bằng Google**

### Trạng thái sau đăng ký

Tài khoản tạo ra ở trạng thái **"Chờ duyệt"** — bạn không vào dashboard ngay được. Admin sẽ review trong vòng 1-2 ngày làm việc.

Khi vào app trước khi duyệt, bạn sẽ thấy trang **"Đang chờ duyệt"** với thông báo:
> Tài khoản của bạn đã được tạo. Admin sẽ review và mở quyền truy cập Cỗ Máy Trading trong thời gian sớm nhất.

Sau khi admin duyệt → bạn login lại sẽ vào trang Setup ban đầu.

### Đăng nhập sau đó
- Email + mật khẩu, hoặc click **Đăng nhập bằng Google**
- Quên session — không bị buộc đăng xuất

---

## 3. Setup ban đầu (chỉ làm 1 lần)

Lần đầu vào app sau khi duyệt, bạn sẽ vào **Setup Wizard** — bắt buộc hoàn tất trước khi xem dashboard.

### Bước 1: Tổng vốn doanh chủ

Khai báo **tổng số tiền** bạn muốn đưa vào trading (USD).

Ví dụ: $10,000 — đây là vốn "ngân quỹ" của bạn, KHÔNG phải vốn 1 máy.

### Bước 2: Chiến lược phân bổ

Chọn 1 trong 2:

- **Concentrated** (tập trung): 1-2 máy, vốn lớn từng máy → fit người đã có 1 system chính
- **Diversified** (phân tán): 3+ máy, vốn nhỏ từng máy → fit người đang test nhiều phương pháp

### Bước 3: Tạo cỗ máy đầu tiên

- **Tên máy**: tự đặt (vd "Scalping XAUUSD", "Swing EUR/USD")
- **Vốn**: số tiền phân bổ cho máy này
- **Mốc neo hiện tại**: thường = vốn ban đầu (vd $1,000)
- **Phương pháp**: tự khai báo (Smart Money, ICT, Wyckoff, etc.)
- **Risk/trade %**: thường 1-2%
- **Mốc neo M1-M5**: 5 ngưỡng số dư để rút tiền (system tự gợi ý ladder dựa trên vốn)

Sau khi tạo xong máy đầu → vào **Phòng điều hành** (Tổng quan).

---

## 4. Phòng điều hành (Tổng quan)

URL: `/client/co-may/tong-quan`

### Hàng KPI Row 1 (lifetime)

| KPI | Ý nghĩa |
|---|---|
| **Tổng dòng tiền đã rút** | Tiền thật về tài khoản trader, lifetime. Đây là số quan trọng nhất — đo "tool có hiệu quả không" |
| **Vốn đang vận hành** | Tổng vốn đang lăn trong các máy active |
| **PnL hiện tại** | Tổng lãi/lỗ chưa rút của các máy active |
| **Cỗ máy đang hoạt động** | Số máy chưa đóng |

### Hàng KPI Row 2 (theo tháng)

| KPI | Ý nghĩa |
|---|---|
| **Dòng tiền rút tháng này** | Tiền rút trong tháng đang xét |
| **ROI tháng này** | PnL tháng / vốn vận hành |
| **Tăng trưởng vs cùng kỳ** | So sánh tháng này với tháng trước |
| **Ngày có rút / Tổng ngày** | Bao nhiêu ngày trong tháng bạn rút tiền (đo độ "đều") |

### Phân bổ vốn

3 ô dashed border:
- **Tổng vốn doanh chủ**: số bạn khai báo
- **Vốn đã phân bổ**: tổng vốn các máy active
- **Vốn dự trữ**: vốn doanh chủ - đã phân bổ

Click **"Hoạch định lại"** → mở Setup Wizard mode `allocate` để phân bổ thêm máy mới từ vốn dự trữ.

### Section Hiệu suất

- **Dòng tiền rút theo tháng** (bar chart 6 tháng): xu hướng rút tiền
- **Xếp hạng cỗ máy** (top máy theo PnL): biết máy nào đang ăn

### Heatmap dòng tiền rút (cuối trang)

Lưới ngày × tháng, mỗi ô là tổng tiền rút trong ngày. Click ô có data → xem breakdown từng máy.

---

## 5. Cỗ Máy Chi Tiết — quản lý từng máy

URL: `/client/co-may/quan-ly`

### Layout

- **Đang hoạt động**: grid card 3 cột, mỗi máy 1 card
- **Đã đóng**: card report (kết quả chu kỳ cuối)

### Card thông tin trong list

- Tên máy + tag % growth so vốn gốc
- Vốn gốc, PnL, Đã rút, Số dư hiện tại
- Status panel:
  - Xanh: "PnL đang +$X, vượt mốc neo $Y. Rút ngay để giữ kỷ luật"
  - Vàng: "Số dư đang dưới mốc neo. Vào cỗ máy để hạ neo hoặc giữ vốn"
- Số ngày từ khi bắt đầu chu kỳ

### Nút **"Tạo cỗ máy mới"** (góc phải-trên)

Mở dialog tạo máy:
- Tên, vốn (phải ≤ vốn dự trữ), mốc neo M1-M5, phương pháp...
- Reserved pool hiển thị real-time

---

## 6. Trang chi tiết 1 máy

URL: `/client/co-may/quan-ly/[machineId]`

### Header
Tên máy + status + ngày tạo + tag growth.

### Anchor strip — Mốc neo

Hiển thị 5 mốc M1-M5 dạng ladder (M1 cao nhất, M5 thấp nhất). Bao gồm:
- Mốc **hiện tại** (highlight gold)
- Mốc đã chạm (tick xanh)
- Mốc chưa đến (xám)

**Khi số dư > mốc hiện tại** → có nút **NÂNG NEO** (chuyển sang M cao hơn, đồng nghĩa rút phần dư).

**Khi số dư < mốc hiện tại** → có nút **HẠ NEO** (chuyển sang M thấp hơn — chấp nhận giảm kỳ vọng).

### 4 KPI tile

- **Đã rút** (gold/emerald): tiền rút từ máy này
- **Số dư hiện tại**: capital + PnL - withdrawn
- **Vốn gốc**: số tiền khai báo lúc tạo
- **PnL**: tổng lãi/lỗ chưa rút

### Mốc neo card (M1-M5)
5 ô số dư milestone, mỗi ô có nút **CHỈNH** để sửa value.

### Banner alerts
Khi:
- PnL vượt mốc neo → "Rút ngay $X để giữ kỷ luật"
- Số dư dưới mốc → "Hạ neo hoặc giữ vốn"
- Đến lúc đóng chu kỳ → "Đã đến lúc đánh giá lại"

### Đường tăng trưởng (Equity Curve)

Line chart: vốn + lãi tích luỹ qua các trades. Marker dots:
- 💲 vàng = lần rút tiền (hover thấy số tiền)
- Đường vàng = curve

### Số dư tài khoản box

```
Vốn gốc            $1,000
+ Tổng PnL trade   +$200
− Đã rút           −$50
= Số dư hiện tại   $1,150
```

> Chú thích: "Chỉ có lãi rút mới là lãi thật. Chu kỳ chưa đóng — con số này có thể còn thay đổi."

### 3 Nút Action chính

#### a. Ghi nhận lệnh mới
Mở dialog input lệnh:
- **Hướng**: Long / Short
- **Cặp / Mã**: vd EURUSD, XAUUSD (có autocomplete)
- **Khối lượng**: lot size
- **PnL ($)**: lãi/lỗ thực tế (âm = thua)
- **Lý do vào / Lý do thoát**: text
- **Cảm xúc**: dropdown (confidence / fear / greed / disciplined / random)
- Khi PnL ≥ 0 → tx type = `trade_win`
- Khi PnL < 0 → tx type = `trade_loss`

#### b. Rút tiền (Withdraw)
Mở modal:
- **Số tiền rút** (USD, có thể edit)
- **Ghi chú**

Sau khi rút → tx type = `withdraw`, số tiền cộng vào "Đã rút", trừ vào số dư.

#### c. Đóng chu kỳ và lập báo cáo
Xem section 7.

### Nhật ký giao dịch (tabs ở dưới)

2 tabs:
- **Lịch sử lệnh**: list all trades với PnL, lý do, cảm xúc, ngày
- **Sổ rút**: list all withdrawals với số tiền, ghi chú, ngày

Có nút Export CSV.

---

## 7. Đóng chu kỳ (Close Cycle Wizard)

Khi bạn cảm thấy 1 chu kỳ của máy đã trọn vẹn (chạy đủ X lệnh hoặc đạt mục tiêu) → click **Đóng chu kỳ và lập báo cáo**.

Wizard 4 bước:

### Bước 1: Tổng kết

System tự tính:
- Tổng số lệnh
- Win rate
- Tổng PnL chu kỳ
- Tổng đã rút trong chu kỳ
- Số dư cuối chu kỳ
- Peak PnL, Max drawdown

Bạn xem lại, sẽ không sửa được.

### Bước 2: Scorecard (tự chấm 5 tiêu chí)

5 thang điểm 1-5:
1. **Kỷ luật quy trình**: có theo đúng phương pháp không
2. **Quản lý rủi ro**: có giữ % risk không
3. **Cảm xúc**: có bình tĩnh khi thua liên tiếp không
4. **Rút tiền có kỷ luật**: có rút khi vượt mốc không
5. **Học hỏi**: có note lý do thắng/thua không

### Bước 3: Phản tư (Reflection)

Text input đại trả lời 3 câu hỏi:
1. Điều tốt nhất tôi đã làm trong chu kỳ này?
2. Sai lầm lớn nhất tôi muốn tránh chu kỳ sau?
3. Bài học giá trị nhất rút ra?

### Bước 4: Quyết định

Chọn 1 trong 3:

| Quyết định | Hành động hệ thống |
|---|---|
| **Reset** | Đóng máy này. Tạo máy mới cùng tên + vốn ban đầu. Lịch sử cũ giữ trong báo cáo. |
| **Scale** (mở rộng) | Đóng máy này. Tạo máy mới có vốn lớn hơn (system gợi ý, bạn nhập). Phù hợp khi máy đã chứng minh được. |
| **Close** (đóng hoàn toàn) | Đóng máy. Số dư còn lại trả về vốn doanh chủ. Không tạo máy mới. Phù hợp khi muốn nghỉ hoặc system không hiệu quả. |

Sau khi confirm → system:
- Set machine.status = closed
- Tạo `comay_reports` row với toàn bộ scorecard + reflection
- Nếu reset/scale → tạo machine mới (next_machine_id link với báo cáo)
- Quay về list

---

## 8. Báo cáo chu kỳ

URL: `/client/co-may/bao-cao/[reportId]`

Hiển thị đầy đủ:
- Tên máy + phương pháp
- Khoảng thời gian chu kỳ (start → end)
- Quyết định cuối (reset/scale/close)
- KPI: PnL, withdrawn, peak, drawdown, trade count, win count
- Scorecard 5 tiêu chí (radar chart)
- Phản tư (3 câu trả lời)
- Link sang máy kế tiếp (nếu reset/scale)

Có thể vào lại bất kỳ lúc nào — read-only.

---

## 9. Nhật ký hoạt động

URL: `/client/co-may/lich-su`

Bảng tổng hợp **toàn bộ activity** trên mọi máy:

| Ngày | Giờ | Loại | Cỗ máy | Mô tả | Giá trị |
|---|---|---|---|---|---|
| 04/05/2026 | 14:16 | Lệnh thua | Máy thử nghiệm BTC | Stop-loss kỷ luật | −$61 |
| 04/05/2026 | 13:41 | Rút tiền | Máy chính XAUUSD | — | −$261 |
| 04/05/2026 | 10:18 | Đổi neo | Máy chính XAUUSD | — | — |

### Filter
- **Tất cả cỗ máy** / chọn 1 máy cụ thể
- **30 ngày** / 7 ngày / 90 ngày / tất cả
- **Tất cả loại** / Lệnh thắng / Lệnh thua / Rút / Đổi neo / Đóng máy

### Export CSV
Nút phía trên-phải. Xuất file `nhat-ky-DDMMYYYY.csv` với toàn bộ data theo filter hiện tại.

---

## 10. Hồ sơ cá nhân

URL: `/client/profile`

- **Avatar**: click upload mới
- **Họ tên, email, phone, ngày sinh, Discord ID**
- **Mentor**: hiển thị mentor được gán (nếu có)

Click **Cập nhật** → save profile. Avatar sidebar tự refresh.

---

## 11. Gửi feedback — phản hồi cho team

### Floating button (góc phải-dưới mọi trang)

Click icon **bong bóng chat gold** → mở modal:
- **Loại**: Bug / Feature / Khen / Phàn nàn / Khác
- **Tiêu đề** (tóm tắt 1 dòng)
- **Nội dung** (chi tiết)
- Tự đính kèm URL trang bạn đang ở

Sau khi submit → "Cảm ơn feedback của bạn! Team sẽ review trong 1-2 ngày làm việc."

### NPS Survey (tự xuất hiện)

Sau khi bạn dùng tool **≥30 ngày** và **đã log ≥30 lệnh**, hệ thống sẽ hiển thị popup nhỏ góc phải-dưới:

> Khả năng bạn sẽ giới thiệu Cỗ Máy Trading cho bạn bè trader?

Click 0-10 → có thể thêm lý do (optional) → submit.

Sau khi trả lời, popup không hiện lại trong 90 ngày. Click X để dismiss 30 ngày.

---

## 12. Khái niệm cốt lõi cần hiểu

### "Cỗ máy"
1 trading account / 1 chiến lược. Không phải 1 broker account thật — chỉ là **đơn vị quản lý kỷ luật** trong tool. Bạn có thể có 5 máy cùng broker, mỗi máy chạy 1 phương pháp khác.

### "Mốc neo" (Anchor)
**Anchor = ngưỡng số dư để rút tiền có kỷ luật.**

5 mốc M1-M5 là 5 ladder số dư. Ví dụ vốn $1,000:
- M1 = $1,200 (lãi 20% → rút phần dư)
- M2 = $1,500 (lãi 50% → rút phần dư)
- M3 = $2,000 (gấp đôi)
- ...

Khi số dư máy ≥ mốc M hiện tại → bạn **PHẢI rút** phần dư để giữ kỷ luật. App nhắc bằng banner alert + nút "Rút ngay".

### "Hạ neo" vs "Nâng neo"
- **Nâng neo**: số dư đang vượt mốc cao → chuyển M cao hơn (rút phần thừa, anchor mới cao hơn)
- **Hạ neo**: số dư đang dưới mốc → chấp nhận giảm anchor xuống mức M thấp hơn. Mục đích: không tạo áp lực "phải đạt lại mốc cũ" → tránh revenge trade.

Mỗi lần đổi neo được ghi thành tx riêng → tracking trong nhật ký.

### "Chu kỳ" (Cycle)
1 vòng đời 1 máy — từ lúc tạo → đến khi đóng (reset / scale / close). Thường:
- Chu kỳ ngắn: 2-4 tuần
- Chu kỳ dài: 1-3 tháng

Mỗi chu kỳ kết thúc bằng **báo cáo** + quyết định. Đây là chỗ trader rút bài học và adjust hệ thống.

### "Vốn vận hành" vs "Vốn dự trữ"
- **Vận hành**: vốn đã phân bổ vào các máy active
- **Dự trữ**: vốn doanh chủ chưa phân bổ → có thể dùng để tạo máy mới hoặc bù khi máy đóng lỗ

---

## 13. Câu hỏi thường gặp (FAQ)

### Tôi mới đăng ký, sao không vào app được?
Tài khoản đang ở trạng thái "Chờ duyệt". Admin sẽ review trong 1-2 ngày. Bạn sẽ nhận thông báo qua email khi duyệt xong.

### Có thể có nhiều máy cùng phương pháp không?
Có. Vd 3 máy đều dùng "Smart Money Concepts" nhưng cho 3 cặp khác nhau. Quản lý kỷ luật riêng từng cặp dễ hơn.

### Hạ neo có phải là thất bại không?
Không. Hạ neo là **chấp nhận thực tế** rằng kỳ vọng ban đầu quá cao. Tốt hơn là cố "gồng" tới mốc cũ và mất kỷ luật.

### Khi nào nên đóng chu kỳ?
Khi bạn cảm thấy chu kỳ đủ "trọn vẹn" để rút bài học. Có 3 dấu hiệu:
1. Đã đạt mục tiêu profit
2. Đã chạy đủ N lệnh để có statistical significance (thường 50+)
3. Cảm thấy phương pháp cần adjust nhưng chưa rõ adjust gì

### Đóng máy (Close) vs Reset khác nhau gì?
- **Reset**: tin vào phương pháp, làm lại với vốn ban đầu
- **Close**: phương pháp không hiệu quả hoặc muốn nghỉ → trả vốn về doanh chủ
- **Scale**: phương pháp đã work → mở máy mới vốn lớn hơn

### Tôi muốn xoá 1 lệnh nhập sai?
Hiện app không có nút xoá tx — vì triết lý "ghi nhận đúng thực tế". Nếu lệnh nhập sai → nhập 1 lệnh "phản" với PnL ngược để cân bằng.

### Có gì khác giữa "Phòng điều hành" và "Cỗ Máy Chi Tiết"?
- **Phòng điều hành**: bird's-eye view toàn portfolio
- **Cỗ Máy Chi Tiết**: zoom vào từng máy, có action ghi lệnh/rút tiền

---

## 14. Tips sử dụng hiệu quả

### Hàng ngày (5 phút)
1. Mở **Phòng điều hành** xem hôm nay máy nào cần rút
2. Vào máy có nút rút → rút ngay theo mốc neo
3. Sau khi trade xong → **ghi nhận lệnh mới** (đừng để cuối ngày mới ghi)

### Hàng tuần
1. Vào **Nhật ký hoạt động** → review tuần
2. Đếm: bao nhiêu lệnh / bao nhiêu rút / có tuần nào không trade không
3. Note vào reflection nháp (sau này dùng cho đóng chu kỳ)

### Hàng tháng
1. Check **Tăng trưởng vs cùng kỳ** → so với tháng trước
2. Check **Heatmap** → ngày nào trong tuần rút nhiều nhất
3. Nếu có máy nào sắp đến cycle → bắt đầu chuẩn bị reflection

### Cuối chu kỳ
1. Đóng chu kỳ ngay khi cảm thấy "đủ" — đừng kéo dài
2. Trả lời reflection thật lòng — không qua loa
3. Quyết định Reset/Scale/Close dựa trên scorecard, không dựa cảm xúc

---

## 15. Hỗ trợ

- **Bug / Feature request**: dùng floating Feedback button góc phải-dưới
- **Hỏi đáp**: liên hệ Mentor (nếu được gán) qua Discord/email
- **Tài khoản bị khoá**: bị admin lock → liên hệ admin

Chúc bạn rút tiền đều đặn và kỷ luật! 🎯
