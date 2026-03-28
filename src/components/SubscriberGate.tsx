"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

/**
 * Wraps content that should only be visible to subscribers of a store.
 * Non-subscribers see a blurred preview with a subscribe CTA.
 */
export default function SubscriberGate({
  storeId,
  storeSlug,
  minTier,
  children,
  fallback,
}: {
  storeId: string;
  storeSlug: string;
  minTier?: string | null;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) return;

    fetch(`/api/subscriptions/status?storeId=${storeId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.subscribed) {
          // If minTier is specified, check tier level
          // For now, any active subscription grants access
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      })
      .catch(() => setHasAccess(false));
  }, [session, storeId]);

  if (!session) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="relative overflow-hidden rounded-xl border border-zinc-700">
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm">
          <div className="max-w-sm text-center">
            <h3 className="text-lg font-bold text-white">Subscriber-Only Content</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Sign in to subscribe and unlock this content.
            </p>
            <Link
              href={`/login?callbackUrl=/stores/${storeSlug}`}
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Sign In to Subscribe
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (hasAccess === null) {
    return (
      <div className="animate-pulse rounded-xl bg-zinc-800/50 p-8">
        <div className="h-4 w-32 rounded bg-zinc-700" />
      </div>
    );
  }

  // Has access — show content
  if (hasAccess) return <>{children}</>;

  // No access — show gate
  if (fallback) return <>{fallback}</>;

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-700">
      {/* Blurred preview */}
      <div className="pointer-events-none select-none blur-md">
        <div className="p-6">
          <div className="h-4 w-3/4 rounded bg-zinc-700" />
          <div className="mt-2 h-4 w-1/2 rounded bg-zinc-700" />
          <div className="mt-4 h-32 rounded bg-zinc-800" />
        </div>
      </div>

      {/* Overlay CTA */}
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20">
            <svg
              className="h-6 w-6 text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white">
            Subscriber-Only Content
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            {minTier
              ? `This content requires a "${minTier}" subscription or higher.`
              : "Subscribe to this creator to unlock exclusive content."}
          </p>
          <Link
            href={`/stores/${storeSlug}#subscribe`}
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            View Subscription Plans
          </Link>
        </div>
      </div>
    </div>
  );
}
