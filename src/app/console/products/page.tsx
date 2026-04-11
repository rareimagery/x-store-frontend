"use client";

import { useState, useEffect } from "react";
import { useConsole } from "@/components/ConsoleContext";
import ProductManager from "@/components/ProductManager";

interface PrintfulProduct {
  id: string;
  name: string;
  thumbnail_url: string;
  variants: number;
  retail_price: string;
  base_cost: string;
  technique: string;
  synced: boolean;
}

export default function ProductsPage() {
  const { hasStore, storeId, storeDrupalId, storeSlug } = useConsole();
  const [tab, setTab] = useState<"all" | "printful" | "custom">("all");
  const [printfulProducts, setPrintfulProducts] = useState<PrintfulProduct[]>([]);
  const [printfulLoading, setPrintfulLoading] = useState(false);
  const [printfulConnected, setPrintfulConnected] = useState(false);

  useEffect(() => {
    if (!storeDrupalId) return;
    // Check Printful connection
    fetch(`/api/printful/status?slug=${storeSlug ?? ""}`)
      .then((r) => r.json())
      .then((d) => setPrintfulConnected(d.connected))
      .catch(() => {});
  }, [storeDrupalId, storeSlug]);

  useEffect(() => {
    if (tab !== "printful" || !storeDrupalId) return;
    setPrintfulLoading(true);
    fetch(`/api/printful/products?storeId=${storeDrupalId}`)
      .then((r) => r.json())
      .then((d) => setPrintfulProducts(d.products ?? []))
      .catch(() => setPrintfulProducts([]))
      .finally(() => setPrintfulLoading(false));
  }, [tab, storeDrupalId]);

  if (!hasStore || !storeId || !storeDrupalId) {
    return (
      <div className="py-12 text-center text-zinc-500">
        Create a store first to manage products.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
        {(
          [
            { key: "all", label: "All Products" },
            { key: "printful", label: "Printful" },
            { key: "custom", label: "My Uploads" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "printful" ? (
        <PrintfulTab
          products={printfulProducts}
          loading={printfulLoading}
          connected={printfulConnected}
        />
      ) : (
        <ProductManager
          storeId={storeId}
          storeDrupalId={storeDrupalId}
        />
      )}
    </div>
  );
}

function PrintfulTab({
  products,
  loading,
  connected,
}: {
  products: PrintfulProduct[];
  loading: boolean;
  connected: boolean;
}) {
  if (!connected) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 py-12 text-center">
        <svg className="mx-auto h-12 w-12 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        <p className="mt-3 text-sm text-zinc-400">Printful is not connected yet.</p>
        <a
          href="/console/printful"
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          Connect Printful
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-800" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 py-12 text-center">
        <svg className="mx-auto h-12 w-12 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p className="mt-3 text-sm text-zinc-400">No Printful products synced yet.</p>
        <p className="mt-1 text-xs text-zinc-600">
          Create products in the Grok Creator Studio or sync from your Printful dashboard.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-zinc-500">
        {products.length} product{products.length !== 1 ? "s" : ""} synced from Printful
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <div
            key={p.id}
            className="group rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden transition hover:border-zinc-600"
          >
            {p.thumbnail_url ? (
              <div className="aspect-square overflow-hidden bg-zinc-800">
                <img
                  src={p.thumbnail_url}
                  alt={p.name}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              </div>
            ) : (
              <div className="flex aspect-square items-center justify-center bg-zinc-800 text-3xl text-zinc-600">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            )}
            <div className="p-3">
              <h3 className="truncate text-sm font-medium text-white">{p.name}</h3>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-indigo-400">
                  ${parseFloat(p.retail_price).toFixed(2)}
                </span>
                <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] text-emerald-400">
                  {p.variants} variant{p.variants !== 1 ? "s" : ""}
                </span>
              </div>
              {parseFloat(p.base_cost) > 0 && (
                <p className="mt-1 text-[10px] text-zinc-500">
                  Base cost: ${parseFloat(p.base_cost).toFixed(2)} | Profit: $
                  {(parseFloat(p.retail_price) - parseFloat(p.base_cost)).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
