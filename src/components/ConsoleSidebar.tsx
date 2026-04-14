"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useConsole } from "./ConsoleContext";
import ConsoleUserMenu from "./ConsoleUserMenu";
import SupporterBadge from "./SupporterBadge";
import GenerationCounter from "./GenerationCounter";
import SidebarGrokBuilder from "./SidebarGrokBuilder";
import { getStoreUrl } from "@/lib/store-url";

const storeLinks: Array<{ href: Route; label: string; icon: string }> = [
  { href: "/console/my-page" as Route, label: "My Page", icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" },
  { href: "/console/page-building" as Route, label: "Page Building", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" },
  { href: "/console/design-studio" as Route, label: "Grok Product Creator", icon: "M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" },
  { href: "/console/products" as Route, label: "Products", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { href: "/console/grok-library" as Route, label: "Grok Library", icon: "M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" },
  { href: "/console/favorite-creators" as Route, label: "My Favorites", icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" },
  { href: "/console/social-feeds" as Route, label: "Social Feeds", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
];

const storeManagementLinks: Array<{ href: Route; label: string; icon: string }> = [
  { href: "/console/orders" as Route, label: "Orders", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { href: "/console/shipping" as Route, label: "Shipping", icon: "M8 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4zm2-4V9a1 1 0 00-1-1h-2l-3-4H8L5 8H3a1 1 0 00-1 1v4m0 0h18" },
  { href: "/console/accounting" as Route, label: "Accounting", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/console/printful" as Route, label: "Printful", icon: "M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" },
  { href: "/console/settings" as Route, label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

const adminLinks: Array<{ href: Route; label: string; icon: string }> = [
  { href: "/console/admin", label: "All Stores", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { href: "/console/admin/users" as Route, label: "Users", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { href: "/console/admin/subscribers", label: "X Subscribers", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
  { href: "/console/cost-dashboard" as Route, label: "Cost Dashboard", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
];

interface ConsoleSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

function SidebarLink({
  href,
  icon,
  label,
  isActive,
  onNavigate,
  indent = false,
}: {
  href: Route;
  icon: string;
  label: string;
  isActive: boolean;
  onNavigate?: () => void;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${indent ? "pl-9" : ""} ${
        isActive
          ? "bg-indigo-600/20 text-indigo-400"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
      }`}
    >
      <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
      {label}
    </Link>
  );
}

function TrialBanner() {
  const [trial, setTrial] = useState<{ status: string; daysRemaining: number; plan: string | null } | null>(null);
  useEffect(() => {
    fetch("/api/subscriptions/trial-status")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setTrial(d); })
      .catch(() => {});
  }, []);

  if (!trial || trial.status === "active" || trial.status === "new") return null;

  const isExpired = trial.status === "expired" || trial.status === "canceled";
  const isLow = trial.daysRemaining <= 2 && trial.daysRemaining > 0;

  return (
    <div className="border-t border-zinc-800 px-4 py-2.5">
      {isExpired ? (
        <Link href={"/console/billing" as Route} className="flex items-center gap-2 rounded-lg bg-red-900/30 border border-red-700/40 px-3 py-2 text-xs text-red-300 hover:bg-red-900/50 transition">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Trial expired — Subscribe $4/mo
        </Link>
      ) : (
        <div className={`flex items-center gap-2 text-[10px] ${isLow ? "text-amber-400" : "text-zinc-500"}`}>
          <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {trial.daysRemaining} day{trial.daysRemaining !== 1 ? "s" : ""} left in free trial
        </div>
      )}
    </div>
  );
}

export default function ConsoleSidebar({ className = "", onNavigate }: ConsoleSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { role, hasStore, xUsername, storeSlug, xSubscriptionTier, stores, activeStoreId } = useConsole();
  const isAdmin = role === "admin";
  const [switchingStore, setSwitchingStore] = useState(false);
  const [storeOpen, setStoreOpen] = useState(() => {
    // Auto-open if currently on a store management page
    return ["/console/orders", "/console/shipping", "/console/accounting", "/console/printful", "/console/settings"].some((p) => pathname.startsWith(p));
  });

  const isActive = (href: Route) => {
    if (href === "/console") return pathname === "/console";
    return pathname.startsWith(href);
  };

  const isStoreManagementActive = storeManagementLinks.some((l) => isActive(l.href));

  const selectableStores = stores.filter((store) => !!store.storeId);

  const handleStoreSwitch = async (nextStoreId: string) => {
    if (!nextStoreId || nextStoreId === activeStoreId) return;
    setSwitchingStore(true);
    try {
      const res = await fetch("/api/console/active-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: nextStoreId }),
      });
      if (!res.ok) {
        throw new Error("Failed to switch store");
      }
      onNavigate?.();
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSwitchingStore(false);
    }
  };

  return (
    <aside className={`flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-900/95 ${className}`}>
      {/* Branding */}
      <div className="border-b border-zinc-800 px-5 py-5">
        <Link href="/console" className="block" onClick={onNavigate}>
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-lg font-bold text-transparent">
            RareImagery
          </span>
          <span className="ml-2 text-xs text-zinc-500">Console</span>
        </Link>
      </div>

      {selectableStores.length > 1 && (
        <div className="border-b border-zinc-800 px-3 py-3">
          <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Active Store
          </p>
          <select
            value={activeStoreId || ""}
            disabled={switchingStore}
            onChange={(e) => handleStoreSwitch(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
          >
            {selectableStores.map((store) => (
              <option key={store.storeId} value={store.storeId || ""}>
                {store.storeName || store.storeSlug}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Store Nav */}
      <nav className="flex-1 overflow-y-auto space-y-1 px-3 py-4">
        {hasStore ? (
          <>
            <p className="mt-1 mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Workspace
            </p>
            {storeLinks.map((link) => (
              <SidebarLink key={link.href} href={link.href} icon={link.icon} label={link.label} isActive={isActive(link.href)} onNavigate={onNavigate} />
            ))}

            {/* Store dropdown */}
            <div className="mt-3">
              <button
                onClick={() => setStoreOpen(!storeOpen)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isStoreManagementActive && !storeOpen
                    ? "bg-indigo-600/20 text-indigo-400"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72" />
                </svg>
                <span className="flex-1 text-left">Store</span>
                <svg className={`h-3.5 w-3.5 transition-transform ${storeOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {storeOpen && (
                <div className="mt-1 space-y-0.5">
                  {storeManagementLinks.map((link) => (
                    <SidebarLink key={link.href} href={link.href} icon={link.icon} label={link.label} isActive={isActive(link.href)} onNavigate={onNavigate} indent />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Get Started
            </p>
            <Link
              href={isAdmin ? "/console/stores/new" : "/console/setup"}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive("/console/setup") || isActive("/console/stores/new")
                  ? "bg-indigo-600/20 text-indigo-400"
                  : "bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create Store
            </Link>
            {isAdmin && storeLinks.map((link) => (
              <SidebarLink key={link.href} href={link.href} icon={link.icon} label={link.label} isActive={isActive(link.href)} onNavigate={onNavigate} />
            ))}
          </>
        )}

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className="my-4 border-t border-zinc-800" />
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Platform Admin
            </p>
            {adminLinks.map((link) => (
              <SidebarLink key={link.href} href={link.href} icon={link.icon} label={link.label} isActive={isActive(link.href)} onNavigate={onNavigate} />
            ))}
          </>
        )}
      </nav>

      {/* Live Store Link */}
      {hasStore && storeSlug && (
        <div className="border-t border-zinc-800 px-3 py-3">
          <a
            href={getStoreUrl(storeSlug)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onNavigate}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            View Live Store
          </a>
        </div>
      )}

      {/* Grok Builder — X DM messenger */}
      <SidebarGrokBuilder storeSlug={storeSlug || null} xUsername={xUsername || null} />

      {/* Trial / Subscription Status */}
      {hasStore && <TrialBanner />}

      {/* Generation Counter */}
      {hasStore && (
        <div className="border-t border-zinc-800">
          <GenerationCounter compact />
        </div>
      )}

      {/* User Menu */}
      <div className="border-t border-zinc-800 px-3 py-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-bold text-indigo-400">
            {(xUsername || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm text-white">
              @{xUsername || "user"}
            </p>
            {xSubscriptionTier && xSubscriptionTier !== "none" && (
              <SupporterBadge tier={xSubscriptionTier as "rare_supporter" | "inner_circle"} size="sm" />
            )}
          </div>
        </div>
        <ConsoleUserMenu onAction={onNavigate} />
      </div>
    </aside>
  );
}
