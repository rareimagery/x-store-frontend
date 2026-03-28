"use client";

import { useSession, signIn } from "next-auth/react";
import Link from "next/link";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="h-9 w-20 animate-pulse rounded-lg bg-zinc-800" />
    );
  }

  if (session) {
    return (
      <Link
        href="/console"
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
      >
        Console
      </Link>
    );
  }

  return (
    <button
      onClick={() => signIn(undefined, { callbackUrl: "/console" })}
      className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm font-semibold text-white transition hover:border-zinc-600 hover:bg-zinc-800"
    >
      Sign In
    </button>
  );
}
