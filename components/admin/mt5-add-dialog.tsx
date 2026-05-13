"use client";

// Dialog đơn giản: nhập MT5 credentials → tạo mt5_accounts standalone (không link
// user/machine). Dùng cho admin test sync trước khi tích hợp đầy đủ với khách hàng.

import { useState } from "react";
import { Eye, EyeOff, Plus } from "lucide-react";
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
import { createStandaloneMt5Account } from "@/lib/co-may/mt5-actions";

interface Props {
  onCreated?: () => void;
}

export function Mt5AddDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setNickname("");
    setLogin("");
    setPassword("");
    setServer("");
    setShowPassword(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!login.trim() || !password || !server.trim()) {
      return setError("Điền đủ 3 trường bắt buộc: Login, Password, Server.");
    }
    if (!/^\d+$/.test(login.trim())) {
      return setError("MT5 Login phải là số nguyên (vd: 153152412).");
    }

    setSubmitting(true);
    const res = await createStandaloneMt5Account({
      login: login.trim(),
      password,
      server: server.trim(),
      nickname: nickname.trim() || undefined,
    });
    setSubmitting(false);

    if (!res.success) {
      setError(res.error ?? "Không rõ lỗi");
      return;
    }

    reset();
    setOpen(false);
    onCreated?.();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="default" size="sm">
            <Plus className="h-4 w-4" />
            Thêm MT5 account
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm MT5 account</DialogTitle>
          <DialogDescription>
            Lưu credentials MT5 (mã hoá AES-256-GCM). Sau khi thêm, mt5-bridge service
            sẽ sync data từ MT5 terminal mỗi 5 phút.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <Field label="Nickname (tuỳ chọn)" hint="Tên để dễ nhận biết, vd 'HFM John'">
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="VD: Account chính"
              className="h-11 text-base"
            />
          </Field>

          <Field label="MT5 Login *" hint="Số tài khoản MT5 (số nguyên)">
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
            label="MT5 Investor Password *"
            hint="Password CHỈ ĐỌC — KHÔNG phải master password."
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

          <Field label="MT5 Server *" hint="Tên server broker chính xác">
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Huỷ
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-foreground text-background hover:bg-foreground/90 disabled:opacity-60"
            >
              {submitting ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
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
