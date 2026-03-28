"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface PickEntry {
  storeId: string;
  storeName: string;
  storeSlug: string;
  xUsername: string;
  profilePictureUrl: string | null;
}

interface FollowingEntry {
  storeId: string;
  storeName: string;
  storeSlug: string;
  xUsername: string;
  profilePictureUrl: string | null;
  followerCount: number;
  isMutual: boolean;
}

interface MyPicksManagerProps {
  storeId: string;
  className?: string;
}

export default function MyPicksManager({
  storeId,
  className = "",
}: MyPicksManagerProps) {
  const [picks, setPicks] = useState<PickEntry[]>([]);
  const [following, setFollowing] = useState<FollowingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, [storeId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [picksRes, followingRes] = await Promise.all([
        fetch(`/api/social/picks?storeId=${storeId}`),
        fetch(`/api/social/followers?storeId=${storeId}&type=following`),
      ]);

      if (picksRes.ok) {
        const data = await picksRes.json();
        setPicks(data.picks ?? []);
      }
      if (followingRes.ok) {
        const data = await followingRes.json();
        setFollowing(data.data ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch picks data:", err);
    } finally {
      setLoading(false);
    }
  }

  function addPick(creator: FollowingEntry) {
    if (picks.length >= 10) return;
    if (picks.some((p) => p.storeId === creator.storeId)) return;

    setPicks((prev) => [
      ...prev,
      {
        storeId: creator.storeId,
        storeName: creator.storeName,
        storeSlug: creator.storeSlug,
        xUsername: creator.xUsername,
        profilePictureUrl: creator.profilePictureUrl,
      },
    ]);
    setSaved(false);
  }

  function removePick(storeId: string) {
    setPicks((prev) => prev.filter((p) => p.storeId !== storeId));
    setSaved(false);
  }

  function movePick(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= picks.length) return;
    const newPicks = [...picks];
    [newPicks[index], newPicks[newIndex]] = [newPicks[newIndex], newPicks[index]];
    setPicks(newPicks);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/social/picks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picks }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save picks:", err);
    } finally {
      setSaving(false);
    }
  }

  const availableToAdd = following.filter(
    (f) =>
      !picks.some((p) => p.storeId === f.storeId) &&
      (searchQuery === "" ||
        f.xUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.storeName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="animate-spin w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">My Picks</h2>
          <p className="text-sm text-zinc-400">
            Curate up to 10 creators you endorse. Shown on your storefront.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            saved
              ? "bg-green-600/20 text-green-400"
              : "bg-indigo-600 hover:bg-indigo-500 text-white"
          } disabled:opacity-60`}
        >
          {saving ? "Saving..." : saved ? "Saved!" : "Save Picks"}
        </button>
      </div>

      {/* Current picks */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Your Picks ({picks.length}/10)
          </span>
        </div>

        {picks.length === 0 ? (
          <p className="text-sm text-zinc-600 text-center py-6">
            No picks yet. Add creators from your following list below.
          </p>
        ) : (
          <div className="space-y-2">
            {picks.map((pick, index) => (
              <div
                key={pick.storeId}
                className="flex items-center gap-3 rounded-lg bg-zinc-800/50 p-2.5"
              >
                <span className="text-xs text-zinc-600 w-5 text-center font-mono">
                  {index + 1}
                </span>

                <div className="w-9 h-9 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
                  {pick.profilePictureUrl ? (
                    <Image
                      src={pick.profilePictureUrl}
                      alt={pick.xUsername}
                      width={36}
                      height={36}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm font-bold">
                      {pick.xUsername.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">
                    {pick.storeName}
                  </p>
                  <p className="text-xs text-zinc-500">@{pick.xUsername}</p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => movePick(index, -1)}
                    disabled={index === 0}
                    className="p-1 text-zinc-600 hover:text-white transition-colors disabled:opacity-30"
                    title="Move up"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => movePick(index, 1)}
                    disabled={index === picks.length - 1}
                    className="p-1 text-zinc-600 hover:text-white transition-colors disabled:opacity-30"
                    title="Move down"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => removePick(pick.storeId)}
                    className="p-1 text-zinc-600 hover:text-red-400 transition-colors ml-1"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add from following */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-3">
          Add from Following
        </span>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search creators..."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 mb-3"
        />

        {availableToAdd.length === 0 ? (
          <p className="text-sm text-zinc-600 text-center py-4">
            {following.length === 0
              ? "Follow some creators first to add them to your picks."
              : "No more creators to add."}
          </p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {availableToAdd.map((creator) => (
              <button
                key={creator.storeId}
                onClick={() => addPick(creator)}
                disabled={picks.length >= 10}
                className="w-full flex items-center gap-3 rounded-lg p-2.5 text-left hover:bg-zinc-800/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
                  {creator.profilePictureUrl ? (
                    <Image
                      src={creator.profilePictureUrl}
                      alt={creator.xUsername}
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs font-bold">
                      {creator.xUsername.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {creator.storeName}
                  </p>
                  <p className="text-xs text-zinc-500">
                    @{creator.xUsername}
                    {creator.isMutual && (
                      <span className="ml-1 text-indigo-400">· Friend</span>
                    )}
                  </p>
                </div>

                <svg
                  className="w-5 h-5 text-zinc-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
