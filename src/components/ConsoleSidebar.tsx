"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useConsole } from "./ConsoleContext";
import ConsoleUserMenu from "./ConsoleUserMenu";
import SupporterBadge from "./SupporterBadge";

const storeLinks: Array<{ href: Route; label: string; icon: string }> = [
  { href: "/console/categories", label: "Store Categories", icon: "M3 7.5l9-4.5 9 4.5m-18 0l9 4.5m9-4.5v9L12 21l-9-4.5v-9" },
  { href: "/console/page-building" as Route, label: "Page Building", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" },
  { href: "/console/favorite-creators" as Route, label: "Favorite Creators", icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" },
  { href: "/console/x-articles" as Route, label: "X Articles", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" },
  { href: "/console/design-studio" as Route, label: "Design Studio", icon: "M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" },
  { href: "/console/print-services", label: "Print Services", icon: "M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" },
];

const adminLinks: Array<{ href: Route; label: string; icon: string }> = [
  { href: "/console/admin", label: "All Stores", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { href: "/console/admin/users" as Route, label: "Users", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { href: "/console/admin/subscribers", label: "X Subscribers", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
];

interface ConsoleSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export default function ConsoleSidebar({ className = "", onNavigate }: ConsoleSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { role, hasStore, xUsername, storeSlug, xSubscriptionTier, stores, activeStoreId } = useConsole();
  const isAdmin = role === "admin";
  const [switchingStore, setSwitchingStore] = useState(false);

  const isActive = (href: Route) => {
    if (href === "/console") return pathname === "/console";
    return pathname.startsWith(href);
  };

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
      <nav className="flex-1 space-y-1 px-3 py-4">
        {hasStore ? (
          <>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Workspace
            </p>
            {storeLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive(link.href)
                    ? "bg-indigo-600/20 text-indigo-400"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
                {link.label}
              </Link>
            ))}
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
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive(link.href)
                    ? "bg-indigo-600/20 text-indigo-400"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
                {link.label}
              </Link>
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
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isActive(link.href)
                    ? "bg-indigo-600/20 text-indigo-400"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
                {link.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Live Store Link */}
      {hasStore && storeSlug && (
        <div className="border-t border-zinc-800 px-3 py-3">
          <a
            href={`https://${storeSlug}.rareimagery.net`}
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
