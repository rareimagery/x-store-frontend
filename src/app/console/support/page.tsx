"use client";

import { useState, useEffect } from "react";
import { useConsole } from "@/components/ConsoleContext";
import SubscribeOnXButton from "@/components/SubscribeOnXButton";
import SupporterBadge from "@/components/SupporterBadge";

const TIER_PERKS: Record<string, { name: string; perks: string[] }> = {
  rare_supporter: {
    name: "Rare Supporter — $5/mo",
    perks: [
      "Early access to new themes (MySpace v2, Neon Cyber, and more)",
      "Private monthly X Spaces + live bug-fix demos",
      "3 premium invite codes per month",
      "Store launch fee discount ($50 instead of $100)",
      "Exclusive 'Rare Supporter' badge on your store",
      "Priority Grok profile enhancements + builder credits",
    ],
  },
  inner_circle: {
    name: "Inner Circle Builder — $10/mo",
    perks: [
      "Everything in Rare Supporter, plus:",
      "10 premium invite codes per month",
      "Free store launch ($0 setup fee)",
      "2x AI Page Builder credits",
      "Dedicated support channel + first dibs on new features",
      "Custom theme color/glitter presets",
      "Exclusive 'Inner Circle' badge on your store",
    ],
  },
};

export default function ConsoleSupportPage() {
  const { xUsername, hasStore, xSubscriptionTier } = useConsole();
  const [tier, setTier] = useState(xSubscriptionTier || "none");
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(!xUsername);

  useEffect(() => {
    if (!xUsername) return;

    fetch(`/api/x-subscription?xUsername=${xUsername}`)
      .then((r) => r.json())
      .then((data) => {
        setTier(data.tier || "none");
      })
      .finally(() => setLoaded(true));
  }, [xUsername]);

  async function handleClaim() {
    setClaiming(true);
    setMessage("");
    try {
      const res = await fetch("/api/x-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim" }),
      });
      const data = await res.json();
      if (data.success) {
        setTier(data.tier);
        setMessage(data.message);
      } else {
        setMessage(data.error || "Something went wrong");
      }
    } catch {
      setMessage("Network error — please try again");
    }
    setClaiming(false);
  }

  const isSubscribed = tier !== "none";
  const tierInfo = TIER_PERKS[tier];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">X Supporter Perks</h1>
      <p className="mb-8 text-sm text-zinc-400">
        Subscribe to @RareImagery on X to unlock exclusive platform perks.
      </p>

      {!loaded ? (
        <p className="text-zinc-500">Checking subscription status...</p>
      ) : isSubscribed ? (
        /* Active subscriber view */
        <div>
          <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <SupporterBadge tier={tier as "rare_supporter" | "inner_circle"} size="md" />
              <span className="text-lg font-semibold text-white">
                {tierInfo?.name || tier}
              </span>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              Thank you for supporting RareImagery! Your perks are active.
            </p>
            <div className="space-y-2">
              {tierInfo?.perks.map((perk, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-zinc-300">{perk}</span>
                </div>
              ))}
            </div>
          </div>

          {tier === "rare_supporter" && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h3 className="mb-2 text-sm font-semibold text-white">Upgrade to Inner Circle</h3>
              <p className="mb-4 text-sm text-zinc-400">
                Get 2x builder credits, free store launches, dedicated support, and more.
              </p>
              <SubscribeOnXButton size="sm" />
            </div>
          )}
        </div>
      ) : (
        /* Non-subscriber view */
        <div>
          {/* Tier comparison */}
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            {Object.entries(TIER_PERKS).map(([key, info]) => (
              <div
                key={key}
                className={`rounded-xl border p-6 ${
                  key === "inner_circle"
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-zinc-800 bg-zinc-900/50"
                }`}
              >
                <h3 className="mb-1 text-lg font-semibold text-white">{info.name}</h3>
                {key === "inner_circle" && (
                  <span className="mb-3 inline-block rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                    RECOMMENDED
                  </span>
                )}
                <ul className="mt-3 space-y-2">
                  {info.perks.map((perk, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-zinc-400">{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="mb-2 text-lg font-semibold text-white">How to Subscribe</h3>
            <ol className="mb-5 space-y-3 text-sm text-zinc-400">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-bold text-indigo-400">1</span>
                <span>Click the button below to subscribe to @RareImagery on X</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-bold text-indigo-400">2</span>
                <span>Choose your tier ($5/mo or $10/mo) and complete payment on X</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-bold text-indigo-400">3</span>
                <span>Come back here and click &quot;Claim My Perks&quot; to activate your benefits</span>
              </li>
            </ol>

            <div className="flex flex-wrap items-center gap-3">
              <SubscribeOnXButton size="md" />
              {hasStore && (
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white
                             hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {claiming ? "Claiming..." : "Claim My Perks"}
                </button>
              )}
            </div>

            {message && (
              <p className={`mt-3 text-sm ${message.includes("error") || message.includes("fail") ? "text-red-400" : "text-green-400"}`}>
                {message}
              </p>
            )}

            {!hasStore && (
              <p className="mt-3 text-xs text-zinc-500">
                Create your store first to claim supporter perks.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
