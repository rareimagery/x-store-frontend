"use client";

import { useEffect, useState } from "react";
import { useConsole } from "./ConsoleContext";

const FREE_LIMIT = 100;

interface GenerationCounterProps {
  /** Compact mode for sidebar (no extra text) */
  compact?: boolean;
  /** Override count from parent (e.g. after a generation just happened) */
  count?: number | null;
  /** Called when count is fetched */
  onCountLoaded?: (count: number) => void;
}

export default function GenerationCounter({ compact = false, count: externalCount, onCountLoaded }: GenerationCounterProps) {
  const { storeSlug, hasStore } = useConsole();
  const [count, setCount] = useState<number | null>(externalCount ?? null);

  useEffect(() => {
    if (externalCount != null) {
      setCount(externalCount);
      return;
    }
    if (!hasStore || !storeSlug) return;
    fetch(`/api/stores/gen-count?slug=${encodeURIComponent(storeSlug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.count != null) {
          setCount(d.count);
          onCountLoaded?.(d.count);
        }
      })
      .catch(() => {});
  }, [hasStore, storeSlug, externalCount, onCountLoaded]);

  if (count == null) return null;

  const remaining = Math.max(FREE_LIMIT - count, 0);
  const percentage = Math.min((count / FREE_LIMIT) * 100, 100);
  const isLow = remaining <= 20;
  const isVeryLow = remaining <= 5;
  const isOver = count >= FREE_LIMIT;

  if (compact) {
    return (
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">AI Generations</span>
          <span className={`text-[10px] font-medium ${isOver ? "text-red-400" : isVeryLow ? "text-amber-400" : "text-zinc-400"}`}>
            {remaining} left
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-violet-500"}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] text-zinc-600">{count} / {FREE_LIMIT} free</span>
          {isOver && <span className="text-[9px] text-amber-400">$0.25/gen</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-violet-500"}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={`text-[10px] ${isOver ? "text-red-400" : isVeryLow ? "text-amber-400" : isLow ? "text-amber-400" : "text-zinc-500"}`}>
          {isOver ? (
            <>{count} / {FREE_LIMIT} — $0.25 per extra</>
          ) : (
            <>{remaining} generations remaining</>
          )}
        </span>
      </div>
    </div>
  );
}
