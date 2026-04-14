"use client";

import { useCallback, useEffect, useState } from "react";

interface AiGateStatus {
  totalGenerations: number;
  limit: number;
  remaining: number;
  limitReached: boolean;
  platformSubscribed: boolean;
  canGenerate: boolean;
  subscribeUrl: string;
}

interface PlatformAiGateProps {
  children: React.ReactNode;
  /** Called when gate status changes — parent can disable generate buttons */
  onGateChange?: (canGenerate: boolean) => void;
}

/**
 * Platform AI Gate — wraps Grok Imagine features (Design Studio, Background Generator).
 * 20 free lifetime generations, then must subscribe to @rareimagery on X.
 */
export default function PlatformAiGate({ children, onGateChange }: PlatformAiGateProps) {
  const [gate, setGate] = useState<AiGateStatus | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/platform/ai-gate-status")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setGate(data);
          onGateChange?.(data.canGenerate);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [onGateChange]);

  const handleClaim = useCallback(async () => {
    setClaiming(true);
    try {
      // Use the same grace-claim system — creator claims subscription to @rareimagery
      const res = await fetch("/api/stores/grace-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store: "rareimagery", claim_method: "self_claim" }),
      });
      if (res.ok) {
        setGate((prev) => prev ? { ...prev, canGenerate: true, platformSubscribed: true, limitReached: true } : prev);
        onGateChange?.(true);
      }
    } catch {
      // silent
    } finally {
      setClaiming(false);
    }
  }, [onGateChange]);

  if (!loaded) return <>{children}</>;

  // Gate not reached or subscribed — show content
  if (!gate || gate.canGenerate) {
    return <>{children}</>;
  }

  // Gate is locked — show subscribe overlay
  return (
    <div className="relative">
      <div className="opacity-30 pointer-events-none select-none blur-[1px]">
        {children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/98 p-8 text-center max-w-md shadow-2xl">
          {/* Grok Imagine logo area */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="text-lg font-bold text-white">Grok Imagine</span>
          </div>

          <p className="text-sm font-semibold text-white mb-1">
            You&apos;ve used all {gate.limit} free AI designs
          </p>
          <p className="text-xs text-zinc-400 mb-1">
            {gate.totalGenerations} designs generated
          </p>
          <p className="text-xs text-zinc-500 mb-5">
            Subscribe to @rareimagery on X to unlock unlimited Grok Imagine generations.
          </p>

          <div className="flex flex-col gap-2">
            <a
              href={gate.subscribeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-zinc-200 transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Subscribe to @rareimagery
            </a>

            <button
              onClick={handleClaim}
              disabled={claiming}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition disabled:opacity-50"
            >
              {claiming ? "Verifying..." : "I Just Subscribed \u2713"}
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800">
            <a
              href="https://x.com/intent/follow?screen_name=rareimagery"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition"
            >
              or follow @rareimagery first
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
