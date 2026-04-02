"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface BuilderGateProps {
  storeSlug: string;
  theme?: string;
}

type BuilderSession = {
  role?: "admin" | "store_owner" | "creator" | string;
  storeSlug?: string;
  xUsername?: string;
};

function normalizeHandle(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/^@+/, "").trim().toLowerCase();
  return normalized || null;
}

export default function BuilderGate({ storeSlug }: BuilderGateProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  if (!session) return null;

  const builderSession = session as BuilderSession;
  const role = builderSession.role;
  const userSlug = normalizeHandle(builderSession.storeSlug || builderSession.xUsername || null);
  const normalizedStoreSlug = normalizeHandle(storeSlug);

  const isAdmin = role === "admin";
  const isOwner = isAdmin ||
    ((role === "store_owner" || role === "creator") && userSlug === normalizedStoreSlug);

  if (!isOwner) return null;

  // If admin is on a different store's page, switch to that store first
  const needsSwitch = isAdmin && userSlug !== normalizedStoreSlug;

  const handleEditPage = async () => {
    if (needsSwitch && normalizedStoreSlug) {
      setSwitching(true);
      try {
        await fetch("/api/console/active-store", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeSlug: normalizedStoreSlug }),
        });
      } catch {}
      setSwitching(false);
    }
    router.push("/console/page-building");
  };

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col gap-2 items-end">
      {/* Edit Page */}
      <button
        onClick={handleEditPage}
        disabled={switching}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-slate-950/90 px-4 py-3 text-sm font-medium text-indigo-200 shadow-[0_18px_48px_rgba(2,6,23,0.45)] backdrop-blur transition hover:border-indigo-300/50 hover:text-white disabled:opacity-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
        {switching ? "Switching..." : "Edit Page"}
      </button>

      {/* Admin: quick links */}
      {isAdmin && (
        <>
          <Link
            href="/console/products"
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-zinc-700/50 bg-slate-950/90 px-3 py-2 text-xs font-medium text-zinc-400 shadow-lg backdrop-blur transition hover:border-zinc-500 hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Products
          </Link>
          <Link
            href="/console"
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-zinc-700/50 bg-slate-950/90 px-3 py-2 text-xs font-medium text-zinc-400 shadow-lg backdrop-blur transition hover:border-zinc-500 hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Console
          </Link>
        </>
      )}
    </div>
  );
}
