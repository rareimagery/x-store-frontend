"use client";

import { useEffect, useState, useCallback } from "react";
import { signIn } from "next-auth/react";

interface GraceStatus {
  status: string;
  gateEnabled: boolean;
  gateMode?: string;
  gateBonus?: string;
  graceDays?: number;
  creatorUsername?: string;
  hours_remaining?: number | null;
  claimed?: boolean;
  message?: string;
}

interface XSubscribeGateProps {
  storeSlug: string;
  creatorUsername: string;
  children: React.ReactNode;
}

/**
 * X Subscribe Gate — wraps storefront content with a grace period system.
 * Visitors get N days of full access, then see a subscribe/follow prompt.
 */
export default function XSubscribeGate({ storeSlug, creatorUsername, children }: XSubscribeGateProps) {
  const [grace, setGrace] = useState<GraceStatus | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/stores/grace-status?store=${encodeURIComponent(storeSlug)}`)
      .then((r) => r.json())
      .then((data) => setGrace(data))
      .catch(() => setGrace({ status: "full_access", gateEnabled: false }))
      .finally(() => setLoaded(true));
  }, [storeSlug]);

  const handleClaim = useCallback(async (method: string) => {
    setClaiming(true);
    try {
      const res = await fetch("/api/stores/grace-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store: storeSlug, claim_method: method }),
      });
      if (res.ok) {
        setGrace((prev) => prev ? { ...prev, status: "claimed", claimed: true } : prev);
      }
    } catch {
      // Fail silently
    } finally {
      setClaiming(false);
    }
  }, [storeSlug]);

  // Not loaded yet — show content (no flash of gate)
  if (!loaded) return <>{children}</>;

  // Gate not enabled, full access, or claimed — pass through
  if (
    !grace ||
    !grace.gateEnabled ||
    grace.status === "full_access" ||
    grace.status === "claimed" ||
    grace.status === "in_grace"
  ) {
    // Show countdown badge if in grace period
    if (grace?.status === "in_grace" && grace.hours_remaining != null) {
      return (
        <div className="relative">
          {children}
          <GraceCountdownBadge hoursRemaining={grace.hours_remaining} creatorUsername={creatorUsername} />
        </div>
      );
    }
    return <>{children}</>;
  }

  // Not logged in
  if (grace.status === "not_logged_in") {
    return (
      <div className="relative">
        <div className="opacity-50 pointer-events-none select-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/95 p-6 text-center max-w-sm shadow-2xl">
            <XLogo className="h-8 w-8 mx-auto mb-3 text-white" />
            <p className="text-sm font-semibold text-white mb-1">Log in to access this store</p>
            <p className="text-xs text-zinc-400 mb-4">
              Sign in with X to get {grace.graceDays || 3} days of full access to @{creatorUsername}&apos;s store.
            </p>
            <button
              onClick={() => signIn("twitter")}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-semibold text-black hover:bg-zinc-200 transition"
            >
              <XLogo className="h-4 w-4" />
              Log in with X
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Expired — show gate
  const isHard = grace.gateMode === "hard";

  return (
    <div className="relative">
      {isHard ? (
        <div className="opacity-30 pointer-events-none select-none blur-[2px]">{children}</div>
      ) : (
        <>{children}</>
      )}

      {/* Gate overlay */}
      <div className={`${isHard ? "absolute inset-0" : "fixed bottom-0 left-0 right-0"} flex ${isHard ? "items-center" : "items-end"} justify-center z-30`}>
        <div className={`rounded-xl border border-zinc-700 bg-zinc-900/98 p-6 text-center shadow-2xl ${isHard ? "max-w-md" : "max-w-lg w-full mx-4 mb-4"}`}>
          <XLogo className="h-8 w-8 mx-auto mb-3 text-white" />
          <p className="text-sm font-semibold text-white mb-1">
            Subscribe to @{creatorUsername} on X
          </p>
          <p className="text-xs text-zinc-400 mb-4">
            Your {grace.graceDays || 3}-day preview has ended. Subscribe to @{creatorUsername} on X to unlock full access to their store.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {/* Subscribe on X */}
            <a
              href={`https://x.com/${creatorUsername}/subscribe`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-semibold text-black hover:bg-zinc-200 transition"
            >
              <XLogo className="h-4 w-4" />
              Subscribe on X
            </a>

            {/* I just subscribed */}
            <button
              onClick={() => handleClaim("self_claim")}
              disabled={claiming}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-zinc-700 transition disabled:opacity-50"
            >
              {claiming ? "Verifying..." : "I Just Subscribed \u2713"}
            </button>
          </div>

          {/* Follow fallback */}
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <a
              href={`https://x.com/intent/follow?screen_name=${creatorUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleClaim("follow_intent")}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition"
            >
              or follow @{creatorUsername} for limited access
            </a>
          </div>

          {/* Bonus mention */}
          {grace.gateBonus && grace.gateBonus !== "none" && (
            <p className="mt-2 text-xs text-purple-400">
              {grace.gateBonus === "credits_50" && "\u2728 Subscribers get 50 bonus AI credits"}
              {grace.gateBonus === "discount_10" && "\u2728 Subscribers get 10% off their first order"}
              {grace.gateBonus === "digital_file" && "\u2728 Subscribers get a free digital bonus"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Small badge shown during grace period */
function GraceCountdownBadge({ hoursRemaining, creatorUsername }: { hoursRemaining: number; creatorUsername: string }) {
  const days = Math.ceil(hoursRemaining / 24);
  const label = days <= 1 ? `${Math.round(hoursRemaining)}h left` : `${days}d left`;

  return (
    <div className="fixed bottom-4 right-4 z-20">
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 px-4 py-2.5 shadow-lg flex items-center gap-3">
        <span className="text-xs text-zinc-400">
          Free preview: <span className="text-amber-400 font-semibold">{label}</span>
        </span>
        <a
          href={`https://x.com/${creatorUsername}/subscribe`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-md border border-zinc-600 transition"
        >
          Subscribe
        </a>
      </div>
    </div>
  );
}

/** X logo SVG */
function XLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
