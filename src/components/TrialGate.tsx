"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Soft gate for expired trials. Wraps console features with an upgrade prompt.
 * Does NOT block rendering — shows an overlay banner that links to billing.
 * Pass `feature` to customize the message (e.g. "publish changes", "generate designs").
 */
export default function TrialGate({ feature, children }: { feature: string; children: React.ReactNode }) {
  const [expired, setExpired] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/subscriptions/trial-status")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d && (d.status === "expired" || d.status === "canceled")) {
          setExpired(true);
        }
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  if (!checked) return <>{children}</>;

  if (!expired) return <>{children}</>;

  return (
    <div className="relative">
      {/* Content renders but is dimmed */}
      <div className="opacity-40 pointer-events-none select-none">
        {children}
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="rounded-xl border border-amber-700/50 bg-zinc-900/95 p-6 text-center max-w-sm shadow-2xl">
          <svg className="h-8 w-8 text-amber-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <p className="text-sm font-semibold text-white mb-1">Trial Expired</p>
          <p className="text-xs text-zinc-400 mb-4">Subscribe to {feature}. Plans start at $4/month.</p>
          <Link
            href="/console/billing"
            className="inline-block rounded-lg bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-purple-500 transition"
          >
            View Plans
          </Link>
        </div>
      </div>
    </div>
  );
}
