"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

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
  const normalized = value.replace(/^@+/, "").trim();
  return normalized || null;
}

export default function BuilderGate({ storeSlug, theme }: BuilderGateProps) {
  const { data: session } = useSession();
  if (!session) return null;

  const builderSession = session as BuilderSession;

  const role = builderSession.role;
  const userSlug = normalizeHandle(builderSession.storeSlug || builderSession.xUsername || null);
  const normalizedStoreSlug = normalizeHandle(storeSlug);

  // Only show to the store owner viewing their own store, or admins
  const isOwner =
    role === "admin" ||
    ((role === "store_owner" || role === "creator") && userSlug === normalizedStoreSlug);

  if (!isOwner) return null;

  const handle = normalizedStoreSlug || storeSlug;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-40">
      <Link
        href={{ pathname: "/console/builder", query: { handle } }}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-slate-950/90 px-4 py-3 text-sm font-medium text-sky-200 shadow-[0_18px_48px_rgba(2,6,23,0.45)] backdrop-blur transition hover:border-sky-300/50 hover:text-white"
      >
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-400" />
        Open Builder
        {theme ? <span className="text-xs text-sky-300/70">{theme}</span> : null}
      </Link>
    </div>
  );
}
