"use client";

import { useCallback, useEffect, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";

interface SocialFeed {
  id: string;
  platform: "tiktok" | "instagram" | "youtube";
  username: string;
  url: string;
  embed_url?: string;
}

const PLATFORMS = [
  { id: "tiktok" as const, label: "TikTok", color: "#00f2ea", icon: "M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.87a8.28 8.28 0 004.77 1.52V6.94a4.85 4.85 0 01-1.01-.25z", placeholder: "@username" },
  { id: "instagram" as const, label: "Instagram", color: "#E4405F", icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z", placeholder: "@username" },
  { id: "youtube" as const, label: "YouTube", color: "#FF0000", icon: "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z", placeholder: "Channel URL or @handle" },
];

function buildUrl(platform: string, username: string): string {
  const clean = username.replace(/^@/, "").trim();
  switch (platform) {
    case "tiktok": return `https://www.tiktok.com/@${clean}`;
    case "instagram": return `https://www.instagram.com/${clean}`;
    case "youtube": return clean.startsWith("http") ? clean : `https://www.youtube.com/@${clean}`;
    default: return "";
  }
}

function buildEmbedUrl(platform: string, username: string): string {
  const clean = username.replace(/^@/, "").trim();
  switch (platform) {
    case "tiktok": return `https://www.tiktok.com/embed/@${clean}`;
    case "instagram": return `https://www.instagram.com/${clean}/embed`;
    case "youtube": {
      if (clean.includes("youtube.com/channel/")) return `https://www.youtube.com/embed?listType=user_uploads&list=${clean.split("/").pop()}`;
      return `https://www.youtube.com/@${clean}`;
    }
    default: return "";
  }
}

export default function SocialFeedsPage() {
  const { storeSlug, hasStore } = useConsole();
  const [feeds, setFeeds] = useState<SocialFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [platform, setPlatform] = useState<"tiktok" | "instagram" | "youtube">("tiktok");
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (!hasStore) return;
    fetch("/api/social-feeds")
      .then((r) => r.json())
      .then((d) => setFeeds(d.feeds ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasStore]);

  const addFeed = useCallback(async () => {
    if (!username.trim()) return;
    if (feeds.some((f) => f.platform === platform && f.username.toLowerCase() === username.trim().toLowerCase())) return;

    const feed: SocialFeed = {
      id: `${platform}_${Date.now()}`,
      platform,
      username: username.trim().replace(/^@/, ""),
      url: buildUrl(platform, username),
      embed_url: buildEmbedUrl(platform, username),
    };

    const updated = [...feeds, feed];
    setFeeds(updated);
    setUsername("");
    await save(updated);
  }, [username, platform, feeds]);

  const removeFeed = useCallback(async (id: string) => {
    const updated = feeds.filter((f) => f.id !== id);
    setFeeds(updated);
    await save(updated);
  }, [feeds]);

  async function save(list: SocialFeed[]) {
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch("/api/social-feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feeds: list }),
      });
      if (res.ok) { setSavedMsg("Saved!"); setTimeout(() => setSavedMsg(null), 2000); }
    } catch {} finally { setSaving(false); }
  }

  if (!hasStore || !storeSlug) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">No Store Found</h2>
          <p className="text-sm text-zinc-500">Create a store first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Social Feeds</h1>
          <p className="text-sm text-zinc-400 mt-1">Add your TikTok, Instagram, and YouTube. They show in the wireframe Social Feeds block.</p>
        </div>
        {savedMsg && <span className="text-sm text-green-400">{savedMsg}</span>}
        {saving && <span className="text-sm text-zinc-500">Saving...</span>}
      </div>

      {/* Add feed */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-6 space-y-3">
        <p className="text-sm font-medium text-zinc-300">Add an account</p>

        {/* Platform picker */}
        <div className="flex gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                platform === p.id
                  ? "border-indigo-500 bg-indigo-950/40 text-white"
                  : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill={platform === p.id ? p.color : "currentColor"}>
                <path d={p.icon} />
              </svg>
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addFeed()}
            placeholder={PLATFORMS.find((p) => p.id === platform)?.placeholder}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={addFeed}
            disabled={!username.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition"
          >
            Add
          </button>
        </div>
      </div>

      {/* Feeds list */}
      {loading ? (
        <p className="text-sm text-zinc-500 text-center py-8">Loading...</p>
      ) : feeds.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-500">No social accounts added yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {feeds.map((feed) => {
            const platformDef = PLATFORMS.find((p) => p.id === feed.platform);
            return (
              <div key={feed.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 group">
                <div className="shrink-0">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill={platformDef?.color || "#fff"}>
                    <path d={platformDef?.icon || ""} />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <a href={feed.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white hover:text-indigo-400 transition">
                    @{feed.username}
                  </a>
                  <p className="text-[11px] text-zinc-500">{platformDef?.label}</p>
                </div>
                <button
                  onClick={() => removeFeed(feed.id)}
                  className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 opacity-0 group-hover:opacity-100 hover:border-red-500/50 hover:text-red-400 transition"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
