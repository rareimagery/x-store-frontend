"use client";

import { useEffect, useMemo, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";
import SubscriberTierControl from "@/components/SubscriberTierControl";

interface Subscriber {
  id: string;
  username: string;
  display_name: string;
  profile_image_url: string | null;
  follower_count: number;
  verified: boolean;
  tier: string;
  subscriber_since: string | null;
}

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  rare_supporter: { label: "Rare Supporter", color: "bg-purple-600/20 text-purple-400" },
  inner_circle: { label: "Inner Circle", color: "bg-amber-600/20 text-amber-400" },
  helper_free: { label: "Free Access", color: "bg-zinc-600/20 text-zinc-400" },
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export default function SubscribersPage() {
  const { hasStore } = useConsole();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!hasStore) return;
    fetch("/api/subscribers")
      .then((r) => r.json())
      .then((d) => setSubscribers(d.subscribers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasStore]);

  const filtered = useMemo(() => {
    if (!search.trim()) return subscribers;
    const q = search.toLowerCase();
    return subscribers.filter(
      (s) =>
        s.username.toLowerCase().includes(q) ||
        s.display_name.toLowerCase().includes(q)
    );
  }, [subscribers, search]);

  // Stats
  const total = subscribers.length;
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of subscribers) {
      counts[s.tier] = (counts[s.tier] || 0) + 1;
    }
    return counts;
  }, [subscribers]);

  const newThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return subscribers.filter(
      (s) => s.subscriber_since && new Date(s.subscriber_since).getTime() > weekAgo
    ).length;
  }, [subscribers]);

  if (!hasStore) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">No Store Found</h2>
          <p className="text-sm text-zinc-500">Create a store first to manage subscribers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">My Subscribers</h1>
        <p className="text-sm text-zinc-400 mt-1">
          X Creator Subscribers who have signed in to RareImagery.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <p className="text-2xl font-bold text-white">{total}</p>
          <p className="text-xs text-zinc-500 mt-1">Total Subscribers</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <p className="text-2xl font-bold text-green-400">+{newThisWeek}</p>
          <p className="text-xs text-zinc-500 mt-1">New This Week</p>
        </div>
        {Object.entries(tierCounts).map(([tier, count]) => {
          const info = TIER_LABELS[tier] || { label: tier, color: "bg-zinc-700 text-zinc-300" };
          return (
            <div key={tier} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
              <p className="text-2xl font-bold text-white">{count}</p>
              <p className="text-xs text-zinc-500 mt-1">{info.label}</p>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subscribers..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-10 pr-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Subscriber list */}
      {loading ? (
        <p className="text-sm text-zinc-500 text-center py-12">Loading subscribers...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-dashed border-zinc-800">
          <svg className="h-10 w-10 text-zinc-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          <p className="text-zinc-500 text-sm">
            {search ? "No subscribers match your search" : "No subscribers yet"}
          </p>
          <p className="text-zinc-600 text-xs mt-1">
            When your X subscribers sign in to RareImagery, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((sub) => {
            const tierInfo = TIER_LABELS[sub.tier] || { label: sub.tier, color: "bg-zinc-700 text-zinc-300" };
            return (
              <div
                key={sub.id}
                className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 transition hover:border-zinc-700"
              >
                {/* Avatar */}
                <a
                  href={`https://x.com/${sub.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  {sub.profile_image_url ? (
                    <img
                      src={sub.profile_image_url}
                      alt={`@${sub.username}`}
                      className="h-10 w-10 rounded-full object-cover ring-1 ring-zinc-700 hover:ring-indigo-500 transition"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-bold text-indigo-400">
                      {sub.display_name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </a>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://x.com/${sub.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-white truncate hover:text-indigo-400 transition"
                    >
                      {sub.display_name || sub.username}
                    </a>
                    {sub.verified && (
                      <svg className="h-3.5 w-3.5 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" />
                      </svg>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tierInfo.color}`}>
                      {tierInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-zinc-500">@{sub.username}</span>
                    <span className="text-xs text-zinc-600">{formatCount(sub.follower_count)} followers</span>
                    {sub.subscriber_since && (
                      <span className="text-xs text-zinc-600">Subscribed {timeAgo(sub.subscriber_since)}</span>
                    )}
                  </div>
                </div>

                {/* Tier control */}
                <div className="shrink-0">
                  <SubscriberTierControl
                    xUsername={sub.username}
                    currentTier={sub.tier}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
