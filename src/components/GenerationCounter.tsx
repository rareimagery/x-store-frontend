"use client";

import { useEffect, useState } from "react";
import { useConsole } from "./ConsoleContext";

const LIFETIME_LIMIT = 20;

interface GenerationCounterProps {
  compact?: boolean;
  count?: number | null;
  onCountLoaded?: (count: number) => void;
}

export default function GenerationCounter({ compact = false, count: externalCount, onCountLoaded }: GenerationCounterProps) {
  const { storeSlug, hasStore } = useConsole();
  const [totalGens, setTotalGens] = useState<number | null>(externalCount ?? null);

  useEffect(() => {
    if (externalCount != null) {
      setTotalGens(externalCount);
      return;
    }
    if (!hasStore || !storeSlug) return;
    fetch(`/api/stores/gen-count?slug=${encodeURIComponent(storeSlug)}`)
      .then((r) => r.json())
      .then((d) => {
        const total = d.totalGenerations ?? d.count ?? 0;
        setTotalGens(total);
        onCountLoaded?.(total);
      })
      .catch(() => {});
  }, [hasStore, storeSlug, externalCount, onCountLoaded]);

  if (totalGens == null) return null;

  const remaining = Math.max(LIFETIME_LIMIT - totalGens, 0);
  const percentage = Math.min((totalGens / LIFETIME_LIMIT) * 100, 100);
  const isLow = remaining <= 5;
  const isOver = totalGens >= LIFETIME_LIMIT;

  if (compact) {
    return (
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Grok Imagine</span>
          <span className={`text-[10px] font-medium ${isOver ? "text-red-400" : isLow ? "text-amber-400" : "text-zinc-400"}`}>
            {isOver ? "Subscribe to unlock" : `${remaining} free left`}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-violet-500"}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] text-zinc-600">{totalGens} / {LIFETIME_LIMIT} free</span>
          {isOver && (
            <a href="https://x.com/rareimagery/subscribe" target="_blank" rel="noopener noreferrer" className="text-[9px] text-indigo-400 hover:text-indigo-300">
              Subscribe
            </a>
          )}
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
        <span className={`text-[10px] ${isOver ? "text-red-400" : isLow ? "text-amber-400" : "text-zinc-500"}`}>
          {isOver ? (
            <>Used {totalGens} / {LIFETIME_LIMIT} free — subscribe to unlock</>
          ) : (
            <>{remaining} free designs remaining</>
          )}
        </span>
      </div>
    </div>
  );
}
