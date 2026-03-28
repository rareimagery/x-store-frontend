"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import type { SubscriptionTier } from "@/lib/payments";

export default function SubscriptionTiers({
  tiers,
  storeId,
  storeSlug,
  sellerXId,
  currentTierId,
}: {
  tiers: SubscriptionTier[];
  storeId: string;
  storeSlug: string;
  sellerXId: string;
  currentTierId?: string | null;
}) {
  const { data: session } = useSession();
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (tiers.length === 0) return null;

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!session) {
      window.location.href = `/login?callbackUrl=/stores/${storeSlug}`;
      return;
    }

    if (tier.price === 0) {
      // Free tier — just record the subscription
      setSubscribing(tier.id);
      try {
        const res = await fetch("/api/subscriptions/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tierId: tier.id,
            tierName: tier.name,
            amount: 0,
            currency: tier.currency,
            interval: tier.interval,
            storeId,
            sellerXId,
            storeSlug,
          }),
        });
        if (res.ok) {
          window.location.reload();
        } else {
          const data = await res.json();
          setError(data.error || "Subscription failed");
        }
      } catch {
        setError("Subscription failed");
      } finally {
        setSubscribing(null);
      }
      return;
    }

    setSubscribing(tier.id);
    setError("");

    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierId: tier.id,
          tierName: tier.name,
          amount: tier.price,
          currency: tier.currency,
          interval: tier.interval,
          storeId,
          sellerXId,
          storeSlug,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start subscription");
      }

      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-white">Subscribe</h3>
      {error && (
        <div className="mb-3 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}
      <div
        className={`grid gap-4 ${
          tiers.length === 1
            ? "grid-cols-1"
            : tiers.length === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {tiers.map((tier) => {
          const isCurrentTier = currentTierId === tier.id;

          return (
            <div
              key={tier.id}
              className={`relative rounded-xl border p-5 transition ${
                tier.featured
                  ? "border-indigo-500/50 bg-indigo-500/5"
                  : "border-zinc-700 bg-zinc-800/50"
              }`}
            >
              {tier.featured && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  Popular
                </span>
              )}

              <h4 className="text-base font-bold text-white">{tier.name}</h4>
              <div className="mt-2 flex items-baseline gap-1">
                {tier.price === 0 ? (
                  <span className="text-2xl font-bold text-white">Free</span>
                ) : (
                  <>
                    <span className="text-2xl font-bold text-white">
                      ${tier.price.toFixed(2)}
                    </span>
                    <span className="text-sm text-zinc-500">
                      /{tier.interval}
                    </span>
                  </>
                )}
              </div>

              {tier.description && (
                <p className="mt-2 text-sm text-zinc-400">
                  {tier.description}
                </p>
              )}

              {tier.perks.filter(Boolean).length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {tier.perks.filter(Boolean).map((perk, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-zinc-300"
                    >
                      <svg
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {perk}
                    </li>
                  ))}
                </ul>
              )}

              <button
                onClick={() => handleSubscribe(tier)}
                disabled={isCurrentTier || subscribing === tier.id}
                className={`mt-4 w-full rounded-lg py-2.5 text-sm font-semibold transition ${
                  isCurrentTier
                    ? "bg-green-500/20 text-green-400 cursor-default"
                    : tier.featured
                    ? "bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
                    : "bg-zinc-700 text-white hover:bg-zinc-600 disabled:opacity-50"
                }`}
              >
                {isCurrentTier
                  ? "Current Plan"
                  : subscribing === tier.id
                  ? "Processing..."
                  : tier.price === 0
                  ? "Join Free"
                  : "Subscribe"}
              </button>

              {tier.subscriberCount > 0 && (
                <p className="mt-2 text-center text-xs text-zinc-600">
                  {tier.subscriberCount} subscriber
                  {tier.subscriberCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
