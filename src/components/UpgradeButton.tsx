"use client";
import { useState } from "react";

export default function UpgradeButton({ xUsername }: { xUsername: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpgrade = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeSlug: xUsername,
          xUsername,
        }),
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to start checkout");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
      >
        {loading ? "Redirecting to Stripe..." : "Create Full Store"}
        {!loading && <span aria-hidden="true">&rarr;</span>}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
