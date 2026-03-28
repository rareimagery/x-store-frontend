"use client";

import { useEffect, useState, useCallback } from "react";

interface ConnectStatus {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted?: boolean;
  accountId: string | null;
}

/**
 * StripeConnectPanel
 *
 * Shows the creator's Stripe Connect payout status and provides a CTA to
 * start or resume the Express onboarding flow.
 *
 * Mount it inside the store detail console page.
 */
export default function StripeConnectPanel() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/stripe/connect/status");
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch {
      // Non-critical — panel degrades gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleConnect() {
    setOnboarding(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/connect/onboard", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Failed to start Stripe onboarding");
        setOnboarding(false);
        return;
      }
      // Redirect to Stripe's hosted onboarding UI
      window.location.href = data.url;
    } catch {
      setError("Network error — please try again");
      setOnboarding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-transparent" />
        Checking payout status…
      </div>
    );
  }

  const fullyActive = status?.connected && status.chargesEnabled && status.payoutsEnabled;
  const partialSetup = status?.connected && !fullyActive;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {fullyActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-900/50 px-3 py-1 text-xs font-medium text-green-400 ring-1 ring-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              Payouts Active
            </span>
          ) : partialSetup ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-900/50 px-3 py-1 text-xs font-medium text-yellow-400 ring-1 ring-yellow-700">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
              Setup Incomplete
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-400 ring-1 ring-zinc-700">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
              Not Connected
            </span>
          )}
        </div>

        <button
          onClick={handleConnect}
          disabled={onboarding}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {onboarding ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Redirecting…
            </>
          ) : fullyActive ? (
            "Update Payout Info"
          ) : partialSetup ? (
            "Complete Stripe Setup"
          ) : (
            "Connect Stripe for Payouts"
          )}
        </button>
      </div>

      {fullyActive && (
        <p className="text-xs text-zinc-500">
          Product sale revenue is automatically routed to your Stripe account after each
          purchase, minus the platform fee (2.9% + $0.30 per order).
        </p>
      )}

      {partialSetup && (
        <p className="text-xs text-yellow-500">
          Your Stripe account is connected but identity verification is incomplete.
          Payouts are paused until you finish the Stripe setup.
        </p>
      )}

      {!status?.connected && (
        <p className="text-xs text-zinc-500">
          Connect your Stripe account to receive payouts when customers purchase
          your products. Takes 2–5 minutes.
        </p>
      )}

      {status?.connected && (
        <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-lg bg-zinc-800/60 p-3">
            <dt className="text-zinc-500">Charges</dt>
            <dd className={status.chargesEnabled ? "text-green-400" : "text-red-400"}>
              {status.chargesEnabled ? "Enabled" : "Disabled"}
            </dd>
          </div>
          <div className="rounded-lg bg-zinc-800/60 p-3">
            <dt className="text-zinc-500">Payouts</dt>
            <dd className={status.payoutsEnabled ? "text-green-400" : "text-yellow-400"}>
              {status.payoutsEnabled ? "Enabled" : "Pending"}
            </dd>
          </div>
          <div className="rounded-lg bg-zinc-800/60 p-3">
            <dt className="text-zinc-500">Platform fee</dt>
            <dd className="text-zinc-300">2.9% + $0.30</dd>
          </div>
        </dl>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
