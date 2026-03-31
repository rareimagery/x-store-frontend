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

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col gap-2 items-end">
      <Link
        href="/console/page-building"
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-slate-950/90 px-4 py-3 text-sm font-medium text-indigo-200 shadow-[0_18px_48px_rgba(2,6,23,0.45)] backdrop-blur transition hover:border-indigo-300/50 hover:text-white"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
        Edit Page
      </Link>
    </div>
  );
}
