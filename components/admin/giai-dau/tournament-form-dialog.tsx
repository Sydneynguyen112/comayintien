"use client";

// Dialog tạo/sửa giải đấu (admin). Mirror pattern mt5-add-dialog.

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
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
import { createTournament, updateTournament } from "@/lib/co-may/tournament-actions";
import { toDisplay, toUSD } from "@/lib/co-may/currency";
import type { CurrencyUnit, LeaderboardMetric, Tournament, TournamentStatus } from "@/lib/co-may/types";

const STATUS_OPTS: { value: TournamentStatus; label: string }[] = [
  { value: "draft", label: "Nháp (ẩn với khách)" },
  { value: "open", label: "Mở đăng ký" },
  { value: "ongoing", label: "Đang diễn ra" },
  { value: "closed", label: "Đã kết thúc" },
];

const METRIC_OPTS: { value: LeaderboardMetric; label: string }[] = [
  { value: "pnl_pct", label: "% tăng trưởng (PnL %)" },
  { value: "win_rate", label: "Tỷ lệ thắng (Win rate)" },
  { value: "volume", label: "Volume giao dịch" },
];

interface Props {
  createdBy?: string;
  tournament?: Tournament; // có = chế độ sửa
  onSaved?: () => void;
}

function dateInput(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function TournamentFormDialog({ createdBy, tournament, onSaved }: Props) {
  const editing = !!tournament;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initCur = (tournament?.required_currency ?? "") as "" | CurrencyUnit;
  const initCapUnit: CurrencyUnit = initCur === "USC" ? "USC" : "USD";

  const [title, setTitle] = useState(tournament?.title ?? "");
  const [description, setDescription] = useState(tournament?.description ?? "");
  const [status, setStatus] = useState<TournamentStatus>(tournament?.status ?? "draft");
  const [metric, setMetric] = useState<LeaderboardMetric>(tournament?.leaderboard_metric ?? "pnl_pct");
  const [requiredCurrency, setRequiredCurrency] = useState<"" | CurrencyUnit>(initCur);
  const [minCapital, setMinCapital] = useState(
    tournament?.min_capital != null ? String(toDisplay(tournament.min_capital, initCapUnit)) : "",
  );
  const [maxCapital, setMaxCapital] = useState(
    tournament?.max_capital != null ? String(toDisplay(tournament.max_capital, initCapUnit)) : "",
  );
  const [startDate, setStartDate] = useState(dateInput(tournament?.start_date));
  const [endDate, setEndDate] = useState(dateInput(tournament?.end_date));

  const capUnit: CurrencyUnit = requiredCurrency === "USC" ? "USC" : "USD";
  const capSym = capUnit === "USC" ? "¢" : "$";

  function reset() {
    if (editing) return; // sửa: giữ giá trị
    setTitle("");
    setDescription("");
    setStatus("draft");
    setMetric("pnl_pct");
    setRequiredCurrency("");
    setMinCapital("");
    setMaxCapital("");
    setStartDate("");
    setEndDate("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (!title.trim()) return setError("Tên giải đấu không được để trống.");

    const payload = {
      title: title.trim(),
      description: description.trim(),
      status,
      leaderboard_metric: metric,
      required_currency: requiredCurrency || null,
      min_capital: minCapital ? toUSD(Number(minCapital), capUnit) : null,
      max_capital: maxCapital ? toUSD(Number(maxCapital), capUnit) : null,
      start_date: startDate ? new Date(startDate).toISOString() : null,
      end_date: endDate ? new Date(endDate).toISOString() : null,
    };

    setSubmitting(true);
    const res = editing
      ? await updateTournament(tournament!.id, payload)
      : await createTournament({ ...payload, created_by: createdBy });
    setSubmitting(false);

    if (!res.success) return setError(res.error ?? "Không rõ lỗi");
    setOpen(false);
    reset();
    onSaved?.();
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
          editing ? (
            <Button variant="outline" size="sm">
              <Pencil className="h-3.5 w-3.5" />
              Sửa
            </Button>
          ) : (
            <Button variant="default" size="sm">
              <Plus className="h-4 w-4" />
              Tạo giải đấu
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Sửa giải đấu" : "Tạo giải đấu"}</DialogTitle>
          <DialogDescription>
            Đặt thông tin, rules và cách xếp hạng. Khách chỉ thấy giải khi trạng thái khác &ldquo;Nháp&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <Field label="Tên giải đấu *">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Giải kỷ luật tháng 6" autoFocus className="h-11 text-base" />
          </Field>

          <Field label="Mô tả / Rules" hint="Mô tả tự do về thể lệ, phần thưởng...">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Thể lệ, phần thưởng, lưu ý..."
              rows={4}
              className="w-full rounded-lg border border-input bg-background text-foreground px-3 py-2 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none resize-none"
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Trạng thái">
              <Select value={status} onChange={(v) => setStatus(v as TournamentStatus)}>
                {STATUS_OPTS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-background text-foreground">{o.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Xếp hạng theo">
              <Select value={metric} onChange={(v) => setMetric(v as LeaderboardMetric)}>
                {METRIC_OPTS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-background text-foreground">{o.label}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Loại tài khoản" hint="Ràng buộc đơn vị tiền">
              <Select value={requiredCurrency} onChange={(v) => setRequiredCurrency(v as "" | CurrencyUnit)}>
                <option value="" className="bg-background text-foreground">Tùy (không ràng buộc)</option>
                <option value="USD" className="bg-background text-foreground">USD ($)</option>
                <option value="USC" className="bg-background text-foreground">Cent (¢)</option>
              </Select>
            </Field>
            <Field label={`Vốn tối thiểu (${capSym})`}>
              <Input type="number" value={minCapital} onChange={(e) => setMinCapital(e.target.value)} placeholder="—" min={0} className="h-11 text-base" />
            </Field>
            <Field label={`Vốn tối đa (${capSym})`}>
              <Input type="number" value={maxCapital} onChange={(e) => setMaxCapital(e.target.value)} placeholder="—" min={0} className="h-11 text-base" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Ngày bắt đầu">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11 text-base" />
            </Field>
            <Field label="Ngày kết thúc">
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-11 text-base" />
            </Field>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Huỷ
            </Button>
            <Button type="submit" disabled={submitting} className="bg-foreground text-background hover:bg-foreground/90 disabled:opacity-60">
              {submitting ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo giải"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-lg border border-input bg-background text-foreground px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
    >
      {children}
    </select>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-xs italic text-muted-foreground/80">{hint}</p>}
    </div>
  );
}
