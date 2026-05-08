"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { filterSymbols, type TradingSymbol } from "@/lib/co-may/trading-symbols";

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const GROUP_LABEL: Record<TradingSymbol["group"], string> = {
  Major: "Major",
  Minor: "Cross",
  Exotic: "Exotic",
  Metals: "Metals",
  Crypto: "Crypto",
};

const GROUP_ORDER: TradingSymbol["group"][] = [
  "Major",
  "Minor",
  "Metals",
  "Crypto",
  "Exotic",
];

export function SymbolCombobox({
  value,
  onChange,
  placeholder = "EURUSD, BTC...",
  className,
  required,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => filterSymbols(value, 60), [value]);

  // Group matches for display
  const grouped = useMemo(() => {
    const map = new Map<TradingSymbol["group"], TradingSymbol[]>();
    for (const s of matches) {
      const arr = map.get(s.group) ?? [];
      arr.push(s);
      map.set(s.group, arr);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
      group: g,
      items: map.get(g)!,
    }));
  }, [matches]);

  // Click outside → close
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function commit(symbol: string) {
    onChange(symbol);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(matches.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      if (open && matches[highlight]) {
        e.preventDefault();
        commit(matches[highlight].code);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className={cn(
          "h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base font-mono uppercase tracking-wider focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
          className,
        )}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-50 mt-1 left-0 right-0 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {grouped.map(({ group, items }) => (
            <div key={group}>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/40 sticky top-0">
                {GROUP_LABEL[group]}
              </div>
              {items.map((s) => {
                const idx = matches.indexOf(s);
                const isHighlight = idx === highlight;
                return (
                  <button
                    key={s.code}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commit(s.code);
                    }}
                    onMouseEnter={() => setHighlight(idx)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm font-mono tracking-wider transition-colors",
                      isHighlight
                        ? "bg-primary/15 text-foreground"
                        : "text-foreground hover:bg-muted/50",
                    )}
                  >
                    {s.code}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {open && matches.length === 0 && value.trim() !== "" && (
        <div className="absolute z-50 mt-1 left-0 right-0 rounded-lg border border-border bg-popover px-3 py-2 text-xs italic text-muted-foreground">
          Không có cặp khớp · gõ Enter để dùng &ldquo;{value}&rdquo;
        </div>
      )}
    </div>
  );
}
