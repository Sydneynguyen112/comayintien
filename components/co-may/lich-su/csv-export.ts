// CSV download utility — client-side blob, UTF-8 BOM cho Excel hiểu Vietnamese.

const BOM = "﻿";

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Excel/Sheets formula injection: prefix with single quote when value starts with =,+,-,@,\t,\r
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  headerMap?: Partial<Record<keyof T, string>>,
): void {
  if (typeof window === "undefined" || rows.length === 0) return;
  const keys = Object.keys(rows[0]) as (keyof T)[];
  const headerLine = keys.map((k) => escapeCsv(headerMap?.[k] ?? String(k))).join(",");
  const dataLines = rows.map((r) => keys.map((k) => escapeCsv(r[k])).join(","));
  const csv = BOM + [headerLine, ...dataLines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
