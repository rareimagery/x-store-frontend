"use client";

import { useEffect, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";

interface TopPost {
  id: string;
  text: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  date: string;
  image_url?: string;
}

interface TopFollower {
  username: string;
  display_name: string;
  profile_image_url?: string;
  follower_count: number;
  verified: boolean;
}

interface Metrics {
  engagement_score: number;
  avg_likes: number;
  avg_retweets: number;
  avg_views: number;
  top_themes: string[];
  recommended_products: string[];
  posting_frequency: string;
  audience_sentiment: string;
}

interface ProfileData {
  xUsername: string;
  followerCount: number;
  bio: string;
  profilePictureUrl: string | null;
  bannerUrl: string | null;
  metrics: Metrics | null;
  topPosts: TopPost[];
  topFollowers: TopFollower[];
  storeTheme: string;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function MyPage() {
  const { hasStore, storeSlug } = useConsole();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/console/insights")
      .then((r) => r.ok ? r.json() : Promise.reject("Failed to load"))
      .then((d) => setData(d))
      .catch(() => setError("Could not load your X profile data"))
      .finally(() => setLoading(false));
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/stores/import-x-data", { method: "POST" });
      const r = await fetch("/api/console/insights");
      if (r.ok) setData(await r.json());
    } catch {} finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-red-400 mb-4">{error || "No profile data found"}</p>
        <button onClick={handleSync} className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-500">
          Sync from X
        </button>
      </div>
    );
  }

  const bio = (data.bio || "").replace(/<[^>]*>/g, "");

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">My Page</h1>
          <p className="text-xs text-zinc-500">Data imported from your X profile</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-300 hover:border-purple-500 hover:text-white transition flex items-center gap-2 disabled:opacity-50"
        >
          {syncing ? (
            <><span className="h-3 w-3 animate-spin rounded-full border border-zinc-500 border-t-white" /> Syncing...</>
          ) : (
            <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg> Refresh from X</>
          )}
        </button>
      </div>

      {/* Banner + Profile */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900">
        {/* Banner */}
        <div className="h-40 bg-zinc-800 relative">
          {data.bannerUrl ? (
            <img src={data.bannerUrl} alt="X banner" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-purple-900/40 to-indigo-900/40" />
          )}
          <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] text-zinc-300">X Banner</span>
        </div>

        {/* Profile info */}
        <div className="px-6 pb-5 -mt-10 relative">
          <div className="flex items-end gap-4 mb-4">
            {/* PFP */}
            <div className="rounded-full border-4 border-zinc-900 overflow-hidden h-20 w-20 bg-zinc-800 shrink-0">
              {data.profilePictureUrl ? (
                <img src={data.profilePictureUrl} alt={data.xUsername} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-purple-400">
                  {data.xUsername[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="pb-1">
              <h2 className="text-lg font-bold text-white">@{data.xUsername}</h2>
              <p className="text-xs text-zinc-500">{formatNumber(data.followerCount)} followers</p>
            </div>
          </div>

          {/* Bio */}
          {bio && (
            <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-3 mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Bio from X</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{bio}</p>
            </div>
          )}

          {/* Store info */}
          <div className="flex gap-3 flex-wrap">
            {storeSlug && (
              <span className="rounded-full bg-purple-900/30 border border-purple-700/40 px-3 py-1 text-xs text-purple-300">
                Store: {storeSlug}.rareimagery.net
              </span>
            )}
            <span className="rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
              Theme: {data.storeTheme || "default"}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics */}
      {data.metrics && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            X Metrics
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Engagement Score", value: `${(data.metrics.engagement_score * 100).toFixed(1)}%` },
              { label: "Avg Likes", value: formatNumber(data.metrics.avg_likes) },
              { label: "Avg Retweets", value: formatNumber(data.metrics.avg_retweets) },
              { label: "Avg Views", value: formatNumber(data.metrics.avg_views) },
            ].map((m) => (
              <div key={m.label} className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-3 text-center">
                <p className="text-lg font-bold text-white">{m.value}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{m.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Posting Frequency</p>
              <p className="text-sm text-zinc-200">{data.metrics.posting_frequency}</p>
            </div>
            <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Audience Sentiment</p>
              <p className="text-sm text-zinc-200">{data.metrics.audience_sentiment}</p>
            </div>
            <div className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Top Themes</p>
              <div className="flex flex-wrap gap-1">
                {data.metrics.top_themes.slice(0, 6).map((t) => (
                  <span key={t} className="rounded-full bg-purple-900/30 border border-purple-700/40 px-2 py-0.5 text-[10px] text-purple-300">{t}</span>
                ))}
                {data.metrics.top_themes.length === 0 && <span className="text-xs text-zinc-600">No themes detected yet</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Posts */}
      {data.topPosts.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            Recent Posts from X
            <span className="text-[10px] text-zinc-600 font-normal ml-1">({data.topPosts.length} imported)</span>
          </h3>

          <div className="space-y-3">
            {data.topPosts.slice(0, 10).map((post) => (
              <div key={post.id} className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-3">
                <p className="text-sm text-zinc-300 leading-relaxed mb-2">{post.text}</p>
                <div className="flex items-center gap-4 text-[10px] text-zinc-500">
                  <span>{"\u2764\uFE0F"} {formatNumber(post.likes)}</span>
                  <span>{"\uD83D\uDD01"} {formatNumber(post.retweets)}</span>
                  <span>{"\uD83D\uDCAC"} {formatNumber(post.replies)}</span>
                  <span>{"\uD83D\uDC41"} {formatNumber(post.views)}</span>
                  {post.date && <span className="ml-auto">{new Date(post.date).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Followers */}
      {data.topFollowers.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            Top Followers
            <span className="text-[10px] text-zinc-600 font-normal ml-1">(by follower count)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {data.topFollowers.slice(0, 8).map((f) => (
              <a
                key={f.username}
                href={`https://x.com/${f.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 p-3 hover:border-purple-500/50 transition flex items-center gap-3"
              >
                <div className="h-9 w-9 rounded-full bg-zinc-700 overflow-hidden shrink-0">
                  {f.profile_image_url ? (
                    <img src={f.profile_image_url} alt={f.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">{f.username[0]?.toUpperCase()}</div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-200 truncate">
                    {f.display_name}
                    {f.verified && <span className="ml-1 text-blue-400">{"\u2713"}</span>}
                  </p>
                  <p className="text-[10px] text-zinc-500">@{f.username} &middot; {formatNumber(f.follower_count)}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
