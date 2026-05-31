"use client";

// Dialog cho admin attach MT5 vào 1 cỗ máy đã tồn tại.
// Khác customer flow (đã revert): admin thao tác trên máy có sẵn → server action
// không bị race với cloudPush.machine fire-and-forget.

import { useEffect, useState } from "react";
import { Activity, Eye, EyeOff, Pencil, Plug, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { linkMt5ToMachine, updateMt5Credentials } from "@/lib/co-may/mt5-actions";

interface Props {
  userId: string;
  machineId: string;
  machineName: string;
  onLinked?: () => void;
  // Update mode: nếu có existingAccountId → form cập nhật credentials cho account đã tồn tại
  // (vd khi khách nhập sai password lần đầu, status='error' → cho phép sửa lại).
  existingAccountId?: string;
  existingLogin?: string;
  existingServer?: string;
  // urgent=true → trigger button màu đỏ (dùng khi status='error' để gây chú ý).
  urgent?: boolean;
}

export function Mt5LinkDialog({
  userId,
  machineId,
  machineName,
  onLinked,
  existingAccountId,
  existingLogin,
  existingServer,
  urgent,
}: Props) {
  const isUpdate = !!existingAccountId;
  const [open, setOpen] = useState(false);
  const [login, setLogin] = useState(existingLogin ?? "");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState(existingServer ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Re-sync local state nếu prop existingLogin/Server thay đổi (vd panel reload).
  useEffect(() => {
    if (isUpdate) {
      setLogin(existingLogin ?? "");
      setServer(existingServer ?? "");
    }
  }, [isUpdate, existingLogin, existingServer]);

  function reset() {
    setLogin(existingLogin ?? "");
    setPassword("");
    setServer(existingServer ?? "");
    setShowPassword(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!login.trim() || !password || !server.trim()) {
      return setError("Điền đủ 3 trường: Login, Password, Server.");
    }
    if (!/^\d+$/.test(login.trim())) {
      return setError("MT5 Login phải là số nguyên (vd: 153152412).");
    }

    setSubmitting(true);
    const res = isUpdate
      ? await updateMt5Credentials({
          mt5AccountId: existingAccountId!,
          userId,
          login: login.trim(),
          password,
          server: server.trim(),
        })
      : await linkMt5ToMachine({
          userId,
          machineId,
          login: login.trim(),
          password,
          server: server.trim(),
        });
    setSubmitting(false);

    if (!res.success) {
      setError(res.error ?? "Không rõ lỗi");
      return;
    }

    reset();
    setOpen(false);
    onLinked?.();
  }

  // Trigger button khác nhau theo mode + urgent
  const triggerBtn = isUpdate ? (
    urgent ? (
      <Button variant="destructive" size="sm">
        <RefreshCw className="h-3.5 w-3.5" />
        Liên kết lại MT5
      </Button>
    ) : (
      <Button variant="outline" size="sm">
        <Pencil className="h-3.5 w-3.5" />
        Cập nhật MT5
      </Button>
    )
  ) : (
    <Button variant="outline" size="sm" className="w-full">
      <Plug className="h-3.5 w-3.5" />
      Liên kết MT5
    </Button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger render={triggerBtn} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isUpdate
              ? `Cập nhật MT5 cho "${machineName}"`
              : `Liên kết MT5 vào "${machineName}"`}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? "Sửa lại login/password/server nếu nhập sai. Sau khi lưu, hệ thống sẽ thử kết nối lại trong vòng 1 phút."
              : "Hệ thống sẽ đọc data MT5 qua INVESTOR password (read-only) và sync vào Supabase mỗi 1 phút để chấm điểm kỷ luật."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <Field label="MT5 Login" hint="Số tài khoản MT5 (số nguyên)">
            <Input
              type="text"
              inputMode="numeric"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="VD: 153152412"
              autoFocus
              className="h-11 text-base"
            />
          </Field>

          <Field
            label="MT5 Investor Password"
            hint="Password CHỈ ĐỌC — KHÔNG phải master password. Click icon mắt để hiện/ẩn."
          >
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="h-11 text-base pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Ẩn password" : "Hiện password"}
                className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <Field label="MT5 Server" hint="Tên server broker chính xác">
            <Input
              type="text"
              value={server}
              onChange={(e) => setServer(e.target.value)}
              placeholder="VD: HFMarketsGlobal-Live11"
              className="h-11 text-base"
            />
          </Field>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-foreground text-background hover:bg-foreground/90 disabled:opacity-60"
            >
              <Activity className="h-3.5 w-3.5" />
              {submitting
                ? isUpdate ? "Đang cập nhật..." : "Đang liên kết..."
                : isUpdate ? "Lưu thay đổi" : "Liên kết"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs italic text-muted-foreground/80">{hint}</p>}
    </div>
  );
}
