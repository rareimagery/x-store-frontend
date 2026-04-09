"use client";

import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import SubscribeOnXButton from "@/components/SubscribeOnXButton";

const MAIN_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rareimagery.net";

export default function StoreNav({ creator }: { creator: string }) {
  const { data: session, status } = useSession();

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <a
            href={MAIN_URL}
            className="text-sm font-bold text-zinc-400 transition hover:text-white"
          >
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              RareImagery
            </span>
          </a>
          <span className="text-zinc-600">/</span>
          <span className="text-sm font-semibold text-white">@{creator}</span>
        </div>

        <div className="flex items-center gap-3">
          <SubscribeOnXButton creatorHandle={creator} size="sm" />
          {status === "loading" ? (
            <div className="h-8 w-16 animate-pulse rounded-lg bg-zinc-800" />
          ) : session ? (
            <a
              href={`${MAIN_URL}/console`}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Console
            </a>
          ) : (
            <a
              href={`${MAIN_URL}/login`}
              className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-1.5 text-sm font-semibold text-white transition hover:border-zinc-600 hover:bg-zinc-800"
            >
              Sign In
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
