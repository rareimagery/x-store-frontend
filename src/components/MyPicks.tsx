"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface PickEntry {
  storeId: string;
  storeName: string;
  storeSlug: string;
  xUsername: string;
  profilePictureUrl: string | null;
}

interface MyPicksProps {
  storeId: string;
  creatorUsername: string;
  className?: string;
}

export default function MyPicks({
  storeId,
  creatorUsername,
  className = "",
}: MyPicksProps) {
  const [picks, setPicks] = useState<PickEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPicks();
  }, [storeId]);

  async function fetchPicks() {
    try {
      const res = await fetch(`/api/social/picks?storeId=${storeId}`);
      if (res.ok) {
        const data = await res.json();
        setPicks(data.picks ?? []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }

  if (loading || picks.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-zinc-800" />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 px-2">
          @{creatorUsername}&apos;s Picks
        </span>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {picks.map((pick) => (
          <Link
            key={pick.storeId}
            href={`/stores/${pick.storeSlug}`}
            className="group flex flex-col items-center gap-2 rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all"
          >
            <div className="w-14 h-14 rounded-full bg-zinc-800 overflow-hidden ring-2 ring-zinc-800 group-hover:ring-indigo-500/30 transition-all">
              {pick.profilePictureUrl ? (
                <Image
                  src={pick.profilePictureUrl}
                  alt={pick.xUsername}
                  width={56}
                  height={56}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 text-lg font-bold">
                  {pick.xUsername.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="text-center min-w-0 w-full">
              <p className="text-sm text-white font-medium truncate">
                {pick.storeName}
              </p>
              <p className="text-xs text-zinc-500 truncate">@{pick.xUsername}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
