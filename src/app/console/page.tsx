"use client";

import Link from "next/link";
import { useConsole } from "@/components/ConsoleContext";
import CostTracker from "@/components/CostTracker";
import { resolveTemplateId } from "@/templates/catalog";
import { getTemplateDefinition } from "@/templates/registry";

export default function ConsoleDashboard() {
  const {
    role,
    hasStore,
    storeName,
    storeSlug,
    storeStatus,
    currentTheme,
    xUsername,
  } = useConsole();

  const isAdmin = role === "admin";
  const activeTemplateId = resolveTemplateId(currentTheme || null);
  const activeTemplate = getTemplateDefinition(activeTemplateId);

  if (!hasStore) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/20">
          <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold">Welcome to RareImagery</h1>
        <p className="mb-8 max-w-md text-center text-zinc-400">
          Create your storefront powered by your X profile. AI-enhanced setup takes just a few minutes.
        </p>
        <Link
          href="/console/setup"
          className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500"
        >
          Create Your Store
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    approved: "bg-emerald-500/20 text-emerald-400",
    pending: "bg-amber-500/20 text-amber-400",
    rejected: "bg-red-500/20 text-red-400",
    suspended: "bg-red-500/20 text-red-400",
    payment_warning: "bg-orange-500/20 text-orange-400",
  };

  return (
    <div className="space-y-6">
      {storeStatus === "payment_warning" && (
        <div className="rounded-xl border border-orange-700/50 bg-orange-950/40 p-4 text-sm text-orange-300">
          <strong className="font-semibold">Payment failed.</strong> Your last subscription payment
          didn&apos;t go through. Update your billing info in Stripe before your store is suspended.{" "}
          <a
            href="https://billing.stripe.com/p/login/test_00g00000000"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white"
          >
            Manage billing →
          </a>
        </div>
      )}

      {storeStatus === "suspended" && (
        <div className="rounded-xl border border-red-700/50 bg-red-950/40 p-4 text-sm text-red-300">
          <strong className="font-semibold">Store suspended.</strong> Your subscription has lapsed.
          Renew to re-activate your storefront.{" "}
          <a
            href="https://billing.stripe.com/p/login/test_00g00000000"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white"
          >
            Renew subscription →
          </a>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Store Workspace</h1>
        <a
          href={`https://${storeSlug}.rareimagery.net`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-600"
        >
          Visit Live Store
        </a>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-white">{storeName || "Your Store"}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-zinc-400">Status</span>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[storeStatus || "pending"] || "bg-zinc-700/40 text-zinc-300"}`}
          >
            {(storeStatus || "pending").replace("_", " ")}
          </span>
          <span className="text-zinc-500">slug: {storeSlug}</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/console/products"
          className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-700"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20">
            <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 1.036-1.007 1.875-2.25 1.875s-2.25-.84-2.25-1.875 1.007-1.875 2.25-1.875 2.25.84 2.25 1.875zM12.75 6.375c0 1.036-1.007 1.875-2.25 1.875s-2.25-.84-2.25-1.875 1.007-1.875 2.25-1.875 2.25.84 2.25 1.875zM5.25 6.375c0 1.036-1.007 1.875-2.25 1.875S.75 7.41.75 6.375 1.757 4.5 3 4.5s2.25.84 2.25 1.875zM3 10.5h18M5.25 15.75h13.5" />
            </svg>
          </div>
          <h3 className="font-medium text-white group-hover:text-indigo-400">Products</h3>
          <p className="mt-1 text-xs text-zinc-500">Create and manage products in your catalog</p>
        </Link>

        <Link
          href="/console/music"
          className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-700"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20">
            <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h3 className="font-medium text-white group-hover:text-blue-400">Music</h3>
          <p className="mt-1 text-xs text-zinc-500">Add Spotify or Apple Music to your store</p>
        </Link>

        <Link
          href="/console/page-building"
          className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-700"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20">
            <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </div>
          <h3 className="font-medium text-white group-hover:text-purple-400">Page Building</h3>
          <p className="mt-1 text-xs text-zinc-500">Build and publish your wireframe storefront layout</p>
        </Link>

        <Link
          href="/console/design-studio"
          className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-700"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/20">
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
            </svg>
          </div>
          <h3 className="font-medium text-white group-hover:text-emerald-400">Design Studio</h3>
          <p className="mt-1 text-xs text-zinc-500">AI-generate merch designs with Grok Imagine</p>
        </Link>
      </div>

      {xUsername && activeTemplate && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Active Template</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{activeTemplate.name}</h3>
              <p className="mt-1 max-w-xl text-sm text-zinc-400">{activeTemplate.description}</p>
            </div>
            <Link
              href="/console/builder"
              className="inline-flex min-h-11 items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              Open Builder
            </Link>
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            Template changes, AI generation, and publishing now happen in the builder workspace.
          </p>
        </div>
      )}

      {xUsername && (
        <CostTracker sellerHandle={xUsername} />
      )}

      {isAdmin && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-medium text-white">Platform Admin</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Manage all creator stores and approvals
              </p>
            </div>
            <Link
              href="/console/admin"
              className="inline-flex min-h-11 items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
            >
              View All Stores
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
