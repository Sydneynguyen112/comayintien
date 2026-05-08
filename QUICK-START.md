# � Quick Start � Cursor Setup

## � File cần lưu v� o repo LMS

```
lmsrova/
��� .cursorrules                          � Rules c�t lõi (Cursor auto ��c)
��� docs/
    ��� plans/
        ��� co-may-integration.md         � Spec �ầy �ủ (file v5)
```

## � Prompt ngắn g�n �� paste v� o Cursor

### Lần �ầu (bắt �ầu Bư�c 0)

```
��c @.cursorrules v�  @docs/plans/co-may-integration.md.

Sau �ó bắt �ầu Bư�c 0: Setup Design System Aurelian Academy.

Yêu cầu:
1. Trư�c khi code, báo cáo cho mình:
   - Stack hi�n tại của LMS (Next version, Supabase setup)
   - Design tokens hi�n có vs Aurelian
   - Kế hoạch chi tiết
2. Ch� mình duy�t r�i m�i code
```

### Khi chuy�n sang bư�c tiếp theo

```
OK bư�c trư�c duy�t r�i. Chuy�n sang Bư�c [N]: [tên bư�c].

��c lại @docs/plans/co-may-integration.md phần Bư�c [N] v�  thực hi�n.
Báo cáo trư�c khi code.
```

### Khi cần debug hoặc h�i �ặc thù

```
Theo spec � @docs/plans/co-may-integration.md, l� m sao �� [vấn �� cụ th�]?
```

## � Tips dùng Cursor hi�u quả

### 1. Dùng `@` �� reference file/folder
- `@.cursorrules` � auto ��c (�ã setup)
- `@docs/plans/co-may-integration.md` � spec �ầy �ủ
- `@app/co-may` � folder
- `@components/ui/button.tsx` � file cụ th�

### 2. Composer vs Chat
- **Composer (Cmd/Ctrl + I)**: Cho task l�n, edit nhi�u file
- **Chat (Cmd/Ctrl + L)**: Cho h�i �áp nhanh, debug

### 3. Pin context
Trong Composer, **pin** các file quan tr�ng �� Cursor luôn có context:
- `.cursorrules`
- `docs/plans/co-may-integration.md`
- `tailwind.config.ts`

### 4. Model selection
- **Claude Opus 4.7**: cho task phức tạp, quyết ��nh kiến trúc
- **Claude Sonnet 4.6**: cho code �ơn giản, edit nhanh

## � Checklist setup ban �ầu

- [ ] Copy `.cursorrules` v� o root project LMS
- [ ] Copy `co-may-integration.md` v� o `docs/plans/`
- [ ] M� repo LMS trong Cursor
- [ ] Ki�m tra Cursor �ã nhận `.cursorrules` (có icon � status bar)
- [ ] M� Composer, paste prompt "Lần �ầu" � trên
- [ ] Ch� Cursor báo cáo � duy�t � cho l� m tiếp

## � Video flow �� xuất

1. **Setup** (5 phút)
   - Tạo 2 file � v� trí trên
   - Verify Cursor ��c �ược

2. **Bư�c 0 � Design System** (~30 phút)
   - Cursor báo cáo + screenshot demo page
   - Bạn check tokens �úng không

3. **Bư�c 1 � Supabase Client** (~15 phút)
   - C� i deps, tạo client files

4. **Bư�c 2 � Database Migration** (~30 phút)
   - Run migration, verify schema

5. **Các bư�c tiếp theo** � l� m dần, m�i bư�c có checkpoint

## � Khi gặp l�i

Copy l�i + context v� o chat v�i mình (Claude n� y), gửi:
- L�i �ầy �ủ
- File liên quan
- Bư�c �ang l� m

Mình sẽ giúp debug � �
