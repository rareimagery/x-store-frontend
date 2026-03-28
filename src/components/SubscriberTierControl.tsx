"use client";

import { useState } from "react";

interface SubscriberTierControlProps {
  xUsername: string;
  currentTier: string;
}

const TIERS = [
  { value: "none", label: "None" },
  { value: "rare_supporter", label: "Rare Supporter" },
  { value: "inner_circle", label: "Inner Circle" },
];

export default function SubscriberTierControl({
  xUsername,
  currentTier,
}: SubscriberTierControlProps) {
  const [tier, setTier] = useState(currentTier || "none");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleChange(newTier: string) {
    setTier(newTier);
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/x-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", xUsername, tier: newTier }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={tier}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white
                   focus:border-indigo-500 focus:outline-none disabled:opacity-50"
      >
        {TIERS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      {saving && <span className="text-xs text-zinc-500">Saving...</span>}
      {saved && <span className="text-xs text-green-400">Saved</span>}
    </div>
  );
}
