"use client";

import type { MachineTransaction } from "@/lib/co-may/types";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

interface Props {
  tx: MachineTransaction[];
}

export function WithdrawJournal({ tx }: Props) {
  const withdraws = tx
    .filter((t) => t.type === "withdraw")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <header className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <h3 className="text-lg md:text-xl font-bold text-foreground">Nhật ký rút tiền</h3>
        <span className="text-xs uppercase tracking-widest text-muted-foreground tabular-nums">
          {withdraws.length} lần · {usd.format(withdraws.reduce((s, w) => s + -w.amount, 0))}
        </span>
      </header>

      <ul className="divide-y divide-border/60">
        {withdraws.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm italic text-muted-foreground">
            Chưa có lần rút nào — rút tiền từ bảng Mốc neo phía trên khi đã vượt mốc.
          </li>
        ) : (
          withdraws.map((w) => (
            <li
              key={w.id}
              className="px-5 py-3.5 grid grid-cols-[1fr_auto] items-baseline gap-3"
            >
              <div className="min-w-0">
                <div className="font-bold text-foreground tabular-nums text-base">
                  {usd.format(-w.amount)}
                </div>
                {w.note && (
                  <div className="text-sm italic text-muted-foreground/80 mt-0.5 truncate">
                    {w.note}
                  </div>
                )}
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground tabular-nums whitespace-nowrap">
                {formatHM(w.created_at)} {formatDmy(w.created_at)}
              </span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function formatHM(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatDmy(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function pad(n: number) {
  return n.toString().padStart(2, "0");
}
