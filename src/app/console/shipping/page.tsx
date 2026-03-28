"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConsole } from "@/components/ConsoleContext";

type Shipment = {
  id: string;
  drupalId: number;
  state: string;
  trackingCode: string | null;
  amount: string;
  currency: string;
  shippingMethod: string | null;
  shippingAddress: Record<string, string> | null;
  createdAt: string;
  shippedAt: string | null;
  order: {
    id: string;
    orderNumber: string;
    email: string;
    total: string;
    currency: string;
  } | null;
};

const STATE_INFO: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "text-yellow-400 bg-yellow-400/10" },
  ready: { label: "Ready", color: "text-blue-400 bg-blue-400/10" },
  shipped: { label: "Shipped", color: "text-indigo-400 bg-indigo-400/10" },
  delivered: { label: "Delivered", color: "text-green-400 bg-green-400/10" },
  cancelled: { label: "Cancelled", color: "text-red-400 bg-red-400/10" },
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "ready", label: "Ready" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAddress(address: Record<string, string> | null) {
  if (!address) return "No address";
  return [address.locality, address.administrative_area, address.country_code]
    .filter(Boolean)
    .join(", ");
}

export default function ShippingPage() {
  const { hasStore, storeId } = useConsole();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTracking, setEditingTracking] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [saving, setSaving] = useState(false);

  const loadShipments = () => {
    if (!storeId) return;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ storeId, state: filter, page: String(page) });
    fetch(`/api/shipping?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setShipments(data.shipments || []);
        setTotal(data.total || 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadShipments(); }, [storeId, filter, page]);

  const saveTracking = async (shipmentId: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/shipping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipmentId, trackingCode: trackingInput }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEditingTracking(null);
      setTrackingInput("");
      loadShipments();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!hasStore || !storeId) {
    return (
      <div className="py-12 text-center text-zinc-500">
        Create a store first to manage shipping.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Shipping</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage shipments and tracking codes
        </p>
      </div>

      {/* Filter tabs */}
      <div className="overflow-x-auto rounded-lg bg-zinc-900 p-1">
        <div className="flex min-w-max gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(0); }}
              className={`min-h-10 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                filter === f.value
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shipments */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 py-16 text-center text-zinc-500">
            Loading shipments…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 py-16 text-center text-red-400">
            {error}
          </div>
        ) : shipments.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 py-16 text-center text-zinc-500">
            No shipments found.
          </div>
        ) : (
          shipments.map((shipment) => {
            const stateInfo = STATE_INFO[shipment.state] || {
              label: shipment.state,
              color: "text-zinc-400 bg-zinc-800",
            };
            const isEditing = editingTracking === shipment.id;

            return (
              <div
                key={shipment.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Order + method */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${stateInfo.color}`}>
                        {stateInfo.label}
                      </span>
                      {shipment.order && (
                        <Link
                          href={`/console/orders/${shipment.order.id}`}
                          className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
                        >
                          Order #{shipment.order.orderNumber}
                        </Link>
                      )}
                      {shipment.shippingMethod && (
                        <span className="text-sm text-zinc-500">
                          via {shipment.shippingMethod}
                        </span>
                      )}
                    </div>

                    {/* Destination + date */}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <p className="text-xs text-zinc-500 mb-0.5">Destination</p>
                        <p className="text-zinc-300">{formatAddress(shipment.shippingAddress)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-0.5">Created</p>
                        <p className="text-zinc-300">{formatDate(shipment.createdAt)}</p>
                      </div>
                      {shipment.shippedAt && (
                        <div>
                          <p className="text-xs text-zinc-500 mb-0.5">Shipped</p>
                          <p className="text-zinc-300">{formatDate(shipment.shippedAt)}</p>
                        </div>
                      )}
                    </div>

                    {/* Tracking */}
                    <div>
                      {isEditing ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            value={trackingInput}
                            onChange={(e) => setTrackingInput(e.target.value)}
                            placeholder="Enter tracking code…"
                            className="min-w-[220px] flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                          />
                          <button
                            onClick={() => saveTracking(shipment.id)}
                            disabled={saving}
                            className="min-h-10 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                          >
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={() => { setEditingTracking(null); setTrackingInput(""); }}
                            className="text-sm text-zinc-500 hover:text-zinc-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : shipment.trackingCode ? (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-zinc-500">Tracking:</p>
                          <code className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-sm text-indigo-400">
                            {shipment.trackingCode}
                          </code>
                          <button
                            onClick={() => {
                              setEditingTracking(shipment.id);
                              setTrackingInput(shipment.trackingCode || "");
                            }}
                            className="text-xs text-zinc-500 hover:text-zinc-300"
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingTracking(shipment.id); setTrackingInput(""); }}
                          className="text-sm text-indigo-400 hover:text-indigo-300"
                        >
                          + Add tracking code
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <p className="text-xs text-zinc-500 mb-0.5">Shipping cost</p>
                    <p className="font-semibold text-white">
                      {shipment.amount
                        ? new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: shipment.currency || "USD",
                          }).format(parseFloat(shipment.amount))
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">
            Showing {page * 20 + 1}–{Math.min((page + 1) * 20, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="min-h-10 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-800 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * 20 >= total}
              className="min-h-10 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
