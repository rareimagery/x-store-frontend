"use client";

import { useEffect, useState } from "react";
import type { SubscriptionTier } from "@/lib/payments";

const EMPTY_TIER: Omit<SubscriptionTier, "id"> = {
  name: "",
  price: 0,
  currency: "USD",
  interval: "month",
  description: "",
  perks: [""],
  subscriberCount: 0,
  featured: false,
};

export default function SubscriptionTierManager({
  storeId,
}: {
  storeId: string;
}) {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch(`/api/subscriptions/tiers?storeId=${storeId}`)
      .then((r) => r.json())
      .then((d) => setTiers(d.tiers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storeId]);

  const addTier = () => {
    setTiers([
      ...tiers,
      {
        ...EMPTY_TIER,
        id: `tier_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      },
    ]);
  };

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, updates: Partial<SubscriptionTier>) => {
    setTiers(
      tiers.map((t, i) => (i === index ? { ...t, ...updates } : t))
    );
  };

  const updatePerk = (tierIndex: number, perkIndex: number, value: string) => {
    const tier = tiers[tierIndex];
    const newPerks = [...tier.perks];
    newPerks[perkIndex] = value;
    updateTier(tierIndex, { perks: newPerks });
  };

  const addPerk = (tierIndex: number) => {
    const tier = tiers[tierIndex];
    updateTier(tierIndex, { perks: [...tier.perks, ""] });
  };

  const removePerk = (tierIndex: number, perkIndex: number) => {
    const tier = tiers[tierIndex];
    updateTier(tierIndex, {
      perks: tier.perks.filter((_, i) => i !== perkIndex),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/subscriptions/tiers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, tiers }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      const data = await res.json();
      setTiers(data.tiers);
      setSuccess("Subscription tiers saved!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-zinc-500">
        Loading subscription tiers...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-300">
            Subscription Tiers
          </h2>
          <p className="text-sm text-zinc-500">
            Create subscription tiers for your fans. Subscribers get access to
            exclusive products and content.
          </p>
        </div>
        <button
          onClick={addTier}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          + Add Tier
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-400">
          {success}
        </div>
      )}

      {tiers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center">
          <p className="text-sm text-zinc-500">
            No subscription tiers yet. Create tiers to offer exclusive content
            to your subscribers.
          </p>
          <button
            onClick={addTier}
            className="mt-4 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-700"
          >
            Create Your First Tier
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tiers.map((tier, index) => (
            <div
              key={tier.id}
              className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-5"
            >
              <div className="mb-4 flex items-start justify-between">
                <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                  Tier {index + 1}
                </span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-zinc-500">
                    <input
                      type="checkbox"
                      checked={tier.featured}
                      onChange={(e) =>
                        updateTier(index, { featured: e.target.checked })
                      }
                      className="rounded border-zinc-600"
                    />
                    Featured
                  </label>
                  <button
                    onClick={() => removeTier(index)}
                    className="rounded p-1 text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400"
                    title="Remove tier"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    Tier Name
                  </label>
                  <input
                    type="text"
                    value={tier.name}
                    onChange={(e) =>
                      updateTier(index, { name: e.target.value })
                    }
                    placeholder="e.g., Supporter, VIP, Inner Circle"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm text-zinc-500">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tier.price}
                        onChange={(e) =>
                          updateTier(index, {
                            price: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 pl-7 pr-3 text-sm text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="w-28">
                    <label className="mb-1 block text-xs font-medium text-zinc-400">
                      Interval
                    </label>
                    <select
                      value={tier.interval}
                      onChange={(e) =>
                        updateTier(index, {
                          interval: e.target.value as "month" | "year",
                        })
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="month">/ month</option>
                      <option value="year">/ year</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-zinc-400">
                  Description
                </label>
                <input
                  type="text"
                  value={tier.description}
                  onChange={(e) =>
                    updateTier(index, { description: e.target.value })
                  }
                  placeholder="What subscribers get at this tier"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-zinc-400">
                  Perks
                </label>
                <div className="space-y-2">
                  {tier.perks.map((perk, perkIndex) => (
                    <div key={perkIndex} className="flex gap-2">
                      <input
                        type="text"
                        value={perk}
                        onChange={(e) =>
                          updatePerk(index, perkIndex, e.target.value)
                        }
                        placeholder="e.g., Early access to new drops"
                        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                      />
                      {tier.perks.length > 1 && (
                        <button
                          onClick={() => removePerk(index, perkIndex)}
                          className="text-zinc-600 hover:text-red-400"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => addPerk(index)}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    + Add perk
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Subscription Tiers"}
          </button>
        </div>
      )}
    </div>
  );
}
