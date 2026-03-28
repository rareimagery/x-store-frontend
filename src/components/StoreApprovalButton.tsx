"use client";

import { useState } from "react";

interface StoreApprovalButtonProps {
  storeId: string;
  currentStatus: string | null;
}

export default function StoreApprovalButton({
  storeId,
  currentStatus,
}: StoreApprovalButtonProps) {
  const [status, setStatus] = useState(currentStatus || "pending");
  const [loading, setLoading] = useState(false);

  async function updateStatus(newStatus: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/stores/approve", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }

  const badge =
    status === "approved"
      ? "bg-green-500/20 text-green-400"
      : status === "rejected"
      ? "bg-red-500/20 text-red-400"
      : "bg-amber-500/20 text-amber-400";

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}
      >
        {status}
      </span>
      {status !== "approved" && (
        <button
          onClick={() => updateStatus("approved")}
          disabled={loading}
          className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-green-500 disabled:opacity-50"
        >
          Approve
        </button>
      )}
      {status !== "rejected" && (
        <button
          onClick={() => updateStatus("rejected")}
          disabled={loading}
          className="rounded bg-red-600/80 px-2 py-1 text-xs font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
        >
          Reject
        </button>
      )}
      {status !== "pending" && (
        <button
          onClick={() => updateStatus("pending")}
          disabled={loading}
          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 transition hover:bg-zinc-800 disabled:opacity-50"
        >
          Reset
        </button>
      )}
    </div>
  );
}
