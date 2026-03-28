"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function UpgradeSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="mx-auto max-w-xl space-y-6 py-16 text-center">
      <div className="text-5xl">&#10003;</div>
      <h1 className="text-3xl font-bold">Store Created Successfully!</h1>
      <p className="text-zinc-400">
        Your RareImagery Creator Store is being set up. Your $1/month
        subscription is now active.
      </p>
      {sessionId && (
        <p className="text-xs text-zinc-600">Session: {sessionId}</p>
      )}
      <div className="flex justify-center gap-4 pt-4">
        <Link
          href="/console"
          className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Go to Console
        </Link>
        <Link
          href="/console/stores"
          className="rounded-lg border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500"
        >
          Manage Stores
        </Link>
      </div>
    </div>
  );
}

export default function UpgradeSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-zinc-400">Loading...</div>
      }
    >
      <UpgradeSuccessContent />
    </Suspense>
  );
}
