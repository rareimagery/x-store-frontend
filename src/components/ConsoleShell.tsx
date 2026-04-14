"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import ConsoleSidebar from "@/components/ConsoleSidebar";
import { useConsole } from "@/components/ConsoleContext";

function titleFromPath(pathname: string): string {
  if (pathname.startsWith("/console/admin/subscribers")) return "X Subscribers";
  if (pathname.startsWith("/console/admin/users")) return "Users";
  if (pathname.startsWith("/console/admin")) return "Admin";
  if (pathname.startsWith("/console/orders/")) return "Order Details";
  if (pathname.startsWith("/console/orders")) return "Orders";
  if (pathname.startsWith("/console/categories")) return "Store Categories";
  if (pathname.startsWith("/console/builder")) return "Page Building";
  if (pathname.startsWith("/console/page-building")) return "Page Building";
  if (pathname.startsWith("/console/theme")) return "Page Building";
  if (pathname.startsWith("/console/print-services")) return "Print Services";
  if (pathname.startsWith("/console/setup")) return "Store Setup";
  if (pathname.startsWith("/console/settings")) return "Settings";
  if (pathname.startsWith("/console/social")) return "Social";
  if (pathname.startsWith("/console/accounting")) return "Accounting";
  if (pathname.startsWith("/console/subscriptions")) return "Subscriptions";
  if (pathname.startsWith("/console/support")) return "Support";
  if (pathname.startsWith("/console/stores")) return "Stores";
  return "Console";
}

type QuickAction = {
  href: Route;
  label: string;
  icon: string;
};

export default function ConsoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role, hasStore } = useConsole();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) {
      document.body.style.overflow = "";
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileNavOpen]);

  const quickActions: QuickAction[] = useMemo(() => {
    if (role === "admin") {
      return [
        { href: "/console", label: "Home", icon: "M3 10.5l9-7.5 9 7.5V21a1 1 0 01-1 1h-5.5v-7h-5v7H4a1 1 0 01-1-1V10.5z" },
        { href: "/console/admin", label: "Stores", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" },
        { href: "/console/admin/subscribers", label: "Subs", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674" },
        { href: "/console/orders", label: "Orders", icon: "M3 3h2l.4 2M7 13h10l4-8H5.4" },
      ];
    }

    if (!hasStore) {
      return [
        { href: "/console", label: "Home", icon: "M3 10.5l9-7.5 9 7.5V21a1 1 0 01-1 1h-5.5v-7h-5v7H4a1 1 0 01-1-1V10.5z" },
        { href: "/console/setup", label: "Setup", icon: "M12 4v16m8-8H4" },
        { href: "/console/support", label: "Support", icon: "M8.228 9c.549-1.165 1.919-2 3.522-2" },
      ];
    }

    return [
      { href: "/console", label: "Home", icon: "M3 10.5l9-7.5 9 7.5V21a1 1 0 01-1 1h-5.5v-7h-5v7H4a1 1 0 01-1-1V10.5z" },
      { href: "/console/page-building", label: "Build", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" },
      { href: "/console/products", label: "Products", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
      { href: "/console/orders", label: "Orders", icon: "M3 3h2l.4 2M7 13h10l4-8H5.4" },
    ];
  }, [hasStore, role]);

  const pageTitle = titleFromPath(pathname);

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">
      <div className="hidden lg:flex lg:shrink-0">
        <ConsoleSidebar />
      </div>

      <div
        className={`fixed inset-0 z-40 bg-black/55 backdrop-blur-sm transition-opacity lg:hidden ${
          mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileNavOpen(false)}
      />

      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 lg:hidden ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <ConsoleSidebar className="shadow-xl" onNavigate={() => setMobileNavOpen(false)} />
      </div>

      <main className="relative flex-1 overflow-y-auto">
        <div className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 text-zinc-200 transition hover:border-zinc-500 hover:text-white"
              aria-label="Toggle menu"
              aria-expanded={mobileNavOpen}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-zinc-100">{pageTitle}</p>
            <Link
              href="/console"
              className="inline-flex h-10 items-center rounded-lg border border-zinc-700 px-3 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white"
            >
              Console
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-4 pb-24 sm:px-6 sm:py-6 lg:px-8 lg:py-8 lg:pb-8">
          {children}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-zinc-950/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className={`grid gap-1 ${quickActions.length === 3 ? "grid-cols-3" : "grid-cols-4"}`}>
          {quickActions.map((action) => {
            const active = action.href === "/console" ? pathname === "/console" : pathname.startsWith(action.href);
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`flex flex-col items-center justify-center rounded-lg px-2 py-2 text-[11px] transition ${
                  active
                    ? "bg-indigo-600/20 text-indigo-400"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                <svg className="mb-1 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                </svg>
                {action.label}
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
