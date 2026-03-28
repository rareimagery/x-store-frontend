"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConsole } from "@/components/ConsoleContext";

type Order = {
  id: string;
  drupalId: number;
  orderNumber: string;
  state: string;
  email: string;
  placedAt: string;
  total: string;
  currency: string;
  customerName: string;
  itemCount: number;
};

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "text-zinc-400 bg-zinc-800" },
  pending: { label: "Pending", color: "text-yellow-400 bg-yellow-400/10" },
  fulfillment: { label: "Processing", color: "text-blue-400 bg-blue-400/10" },
  completed: { label: "Completed", color: "text-green-400 bg-green-400/10" },
  cancelled: { label: "Cancelled", color: "text-red-400 bg-red-400/10" },
};

const FILTERS = [
  { value: "all", label: "All Orders" },
  { value: "pending", label: "Pending" },
  { value: "fulfillment", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: string | null, currency = "USD") {
  if (!amount) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(parseFloat(amount));
}

export default function OrdersPage() {
  const { hasStore, storeId } = useConsole();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("all");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;

    const params = new URLSearchParams({
      storeId,
      status: filter,
      page: String(page),
    });

    fetch(`/api/orders?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setOrders(data.orders || []);
        setTotal(data.total || 0);
        setLoaded(true);
      })
      .catch((e) => {
        setError(e.message);
        setLoaded(true);
      });
  }, [storeId, filter, page]);

  if (!hasStore || !storeId) {
    return (
      <div className="py-12 text-center text-zinc-500">
        Create a store first to view orders.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} order{total !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="overflow-x-auto rounded-lg bg-zinc-900 p-1">
        <div className="flex min-w-max gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setError(null);
                setFilter(f.value);
                setPage(0);
              }}
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

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
        {!loaded && !error ? (
          <div className="py-16 text-center text-zinc-500">Loading orders…</div>
        ) : error ? (
          <div className="py-16 text-center text-red-400">{error}</div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Order
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Customer
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Date
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Items
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Total
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Status
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {orders.map((order) => {
                const stateInfo = STATE_LABELS[order.state] || {
                  label: order.state,
                  color: "text-zinc-400 bg-zinc-800",
                };
                return (
                  <tr key={order.id} className="hover:bg-zinc-800/50 transition">
                    <td className="px-5 py-4 font-mono text-zinc-300">
                      #{order.orderNumber || order.drupalId}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-white">{order.customerName}</p>
                      <p className="text-xs text-zinc-500">{order.email}</p>
                    </td>
                    <td className="px-5 py-4 text-zinc-400">
                      {formatDate(order.placedAt)}
                    </td>
                    <td className="px-5 py-4 text-zinc-400">
                      {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                    </td>
                    <td className="px-5 py-4 font-medium text-white">
                      {formatCurrency(order.total, order.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${stateInfo.color}`}>
                        {stateInfo.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/console/orders/${order.id}`}
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
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
              onClick={() => {
                setError(null);
                setPage((p) => Math.max(0, p - 1));
              }}
              disabled={page === 0}
              className="min-h-10 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-800 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => {
                setError(null);
                setPage((p) => p + 1);
              }}
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
