"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useConsole } from "@/components/ConsoleContext";

type ChartPoint = { date: string; revenue: number };

type AccountingData = {
  period: number;
  currency: string;
  grossRevenue: number;
  platformFees: number;
  netRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  pendingOrderCount: number;
  pendingValue: number;
  chartData: ChartPoint[];
  recentOrders: {
    id: string;
    orderNumber: string;
    email: string;
    total: string;
    placedAt: string;
  }[];
  conversion: {
    storeStatus: string;
    activated: boolean;
    hasFirstSale: boolean;
    storeCreatedAt: string | null;
    firstSaleAt: string | null;
    timeToFirstSaleHours: number | null;
  };
  attribution: {
    source: string;
    orders: number;
    revenue: number;
  }[];
};

const PERIODS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function MiniBarChart({ data }: { data: ChartPoint[] }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="flex items-end gap-0.5 h-16">
      {data.map((point, i) => {
        const height = Math.max((point.revenue / max) * 100, point.revenue > 0 ? 4 : 0);
        return (
          <div
            key={i}
            title={`${formatDate(point.date)}: ${formatCurrency(point.revenue)}`}
            className="flex-1 rounded-sm transition-all"
            style={{
              height: `${height}%`,
              backgroundColor: point.revenue > 0 ? "rgb(99 102 241)" : "rgb(39 39 42)",
              minHeight: "2px",
            }}
          />
        );
      })}
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
};

function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? "border-indigo-500/30 bg-indigo-600/10" : "border-zinc-800 bg-zinc-900"}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent ? "text-indigo-400" : "text-white"}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-sm text-zinc-500">{sub}</p>}
    </div>
  );
}

export default function AccountingPage() {
  const { hasStore, storeId } = useConsole();
  const [data, setData] = useState<AccountingData | null>(null);
  const [period, setPeriod] = useState("30");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;

    const params = new URLSearchParams({ storeId, period });
    fetch(`/api/accounting?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message));
  }, [storeId, period]);

  if (!hasStore || !storeId) {
    return (
      <div className="py-12 text-center text-zinc-500">
        Create a store first to view accounting.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Accounting</h1>
          <p className="mt-1 text-sm text-zinc-500">Revenue and earnings overview</p>
        </div>
        <div className="overflow-x-auto rounded-lg bg-zinc-900 p-1">
          <div className="flex min-w-max gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  setError(null);
                  setPeriod(p.value);
                }}
                className={`min-h-10 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                  period === p.value
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <a
          href={`/api/accounting?storeId=${encodeURIComponent(storeId)}&period=${period}&format=csv`}
          className="inline-flex min-h-10 items-center rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
        >
          Export CSV
        </a>
      </div>

      {!data && !error ? (
        <div className="py-16 text-center text-zinc-500">Loading accounting data…</div>
      ) : error ? (
        <div className="py-16 text-center text-red-400">{error}</div>
      ) : data ? (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Net Revenue"
              value={formatCurrency(data.netRevenue, data.currency)}
              sub={`After ${formatCurrency(data.platformFees)} platform fees`}
              accent
            />
            <StatCard
              label="Gross Revenue"
              value={formatCurrency(data.grossRevenue, data.currency)}
              sub={`Last ${data.period} days`}
            />
            <StatCard
              label="Orders"
              value={String(data.orderCount)}
              sub={`Avg ${formatCurrency(data.avgOrderValue)} each`}
            />
            <StatCard
              label="Pending"
              value={formatCurrency(data.pendingValue, data.currency)}
              sub={`${data.pendingOrderCount} open order${data.pendingOrderCount !== 1 ? "s" : ""}`}
            />
          </div>

          {/* Revenue chart */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Daily Revenue</h2>
              <p className="text-sm text-zinc-500">Last {data.period} days</p>
            </div>
            <MiniBarChart data={data.chartData} />
            <div className="mt-2 flex justify-between text-xs text-zinc-600">
              <span>{data.chartData[0] ? formatDate(data.chartData[0].date) : ""}</span>
              <span>
                {data.chartData[data.chartData.length - 1]
                  ? formatDate(data.chartData[data.chartData.length - 1].date)
                  : ""}
              </span>
            </div>
          </div>

          {/* Fee breakdown */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="mb-4 font-semibold">Fee Breakdown</h2>
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-zinc-400">Gross Revenue</span>
                <span className="font-medium text-white">
                  {formatCurrency(data.grossRevenue, data.currency)}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-zinc-400">Platform Fees (2.9% + $0.30/order)</span>
                <span className="font-medium text-red-400">
                  − {formatCurrency(data.platformFees, data.currency)}
                </span>
              </div>
              <div className="my-2 border-t border-zinc-800" />
              <div className="flex flex-wrap justify-between gap-2 font-semibold">
                <span className="text-white">Net Revenue</span>
                <span className="text-indigo-400">
                  {formatCurrency(data.netRevenue, data.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Conversion analytics */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="mb-4 font-semibold">Conversion Metrics</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label="Store Activated"
                value={data.conversion.activated ? "Yes" : "No"}
                sub={`Current status: ${data.conversion.storeStatus}`}
              />
              <StatCard
                label="First Sale"
                value={data.conversion.hasFirstSale ? "Completed" : "No sales yet"}
                sub={
                  data.conversion.firstSaleAt
                    ? formatDateTime(data.conversion.firstSaleAt)
                    : "Waiting for first order"
                }
              />
              <StatCard
                label="Time To First Sale"
                value={
                  data.conversion.timeToFirstSaleHours == null
                    ? "N/A"
                    : `${data.conversion.timeToFirstSaleHours}h`
                }
                sub={
                  data.conversion.storeCreatedAt
                    ? `Store created ${formatDateTime(data.conversion.storeCreatedAt)}`
                    : "Store creation timestamp unavailable"
                }
              />
            </div>
          </div>

          {/* Attribution */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="mb-4 font-semibold">Purchase Attribution</h2>
            {data.attribution.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No attribution data yet for this period. New checkouts now record source metadata.
              </p>
            ) : (
              <div className="space-y-3">
                {data.attribution.map((row) => (
                  <div
                    key={row.source}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2 last:border-0"
                  >
                    <span className="text-sm text-zinc-300">{row.source}</span>
                    <span className="text-sm text-zinc-500">{row.orders} orders</span>
                    <span className="text-sm font-medium text-white">
                      {formatCurrency(row.revenue, data.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent transactions */}
          {data.recentOrders.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-5 py-4">
                <h2 className="font-semibold">Recent Transactions</h2>
                <Link href="/console/orders" className="text-sm text-indigo-400 hover:text-indigo-300">
                  View all →
                </Link>
              </div>
              <div className="divide-y divide-zinc-800">
                {data.recentOrders.map((order) => (
                  <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <div>
                      <p className="font-mono text-sm text-zinc-300">
                        #{order.orderNumber}
                      </p>
                      <p className="text-xs text-zinc-500">{order.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">
                        {formatCurrency(parseFloat(order.total || "0"))}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(order.placedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
