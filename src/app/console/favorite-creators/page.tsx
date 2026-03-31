"use client";

import { useCallback, useEffect, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";

interface FavoriteCreator {
  username: string;
  display_name: string;
  bio: string;
  profile_image_url: string | null;
  follower_count: number;
  verified: boolean;
}

export default function FavoriteCreatorsPage() {
  const { storeSlug, hasStore } = useConsole();
  const [favorites, setFavorites] = useState<FavoriteCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<FavoriteCreator | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Load existing favorites
  useEffect(() => {
    if (!hasStore) return;
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((d) => setFavorites(d.favorites ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasStore]);

  // Look up an X user
  const lookupUser = useCallback(async () => {
    const username = search.trim().replace(/^@/, "");
    if (!username) return;

    if (favorites.some((f) => f.username.toLowerCase() === username.toLowerCase())) {
      setSearchError("Already in your favorites");
      return;
    }

    setSearching(true);
    setSearchResult(null);
    setSearchError(null);

    try {
      const res = await fetch(`/api/x-lookup?username=${encodeURIComponent(username)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSearchError(err.error || `User @${username} not found`);
        return;
      }
      setSearchResult(await res.json());
    } catch {
      setSearchError("Lookup failed — try again");
    } finally {
      setSearching(false);
    }
  }, [search, favorites]);

  // Add the looked-up user to favorites
  const addFavorite = useCallback(async () => {
    if (!searchResult) return;

    const updated = [...favorites, searchResult];
    setFavorites(updated);
    setSearchResult(null);
    setSearch("");
    await saveFavorites(updated);
  }, [searchResult, favorites]);

  // Remove a favorite
  const removeFavorite = useCallback(async (username: string) => {
    const updated = favorites.filter((f) => f.username !== username);
    setFavorites(updated);
    await saveFavorites(updated);
  }, [favorites]);

  // Move a favorite up/down
  const moveFavorite = useCallback((index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= favorites.length) return;
    const updated = [...favorites];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setFavorites(updated);
    saveFavorites(updated);
  }, [favorites]);

  // Save to Drupal
  async function saveFavorites(list: FavoriteCreator[]) {
    setSaving(true);
    setSavedMessage(null);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorites: list }),
      });
      if (res.ok) {
        setSavedMessage("Saved!");
        setTimeout(() => setSavedMessage(null), 2000);
      }
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  }

  if (!hasStore || !storeSlug) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">No Store Found</h2>
          <p className="text-sm text-zinc-500">Create a store first to manage favorite creators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Favorite Creators</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Add X creators you recommend. They&apos;ll show on your store&apos;s My Favorites block.
          </p>
        </div>
        {savedMessage && (
          <span className="text-sm text-green-400 font-medium">{savedMessage}</span>
        )}
        {saving && (
          <span className="text-sm text-zinc-500">Saving...</span>
        )}
      </div>

      {/* Search / Add */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-6">
        <p className="text-sm font-medium text-zinc-300 mb-3">Add a creator</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSearchError(null); setSearchResult(null); }}
              onKeyDown={(e) => e.key === "Enter" && lookupUser()}
              placeholder="username"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            onClick={lookupUser}
            disabled={searching || !search.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {searching ? "Looking up..." : "Look up"}
          </button>
        </div>

        {searchError && (
          <p className="mt-2 text-sm text-red-400">{searchError}</p>
        )}

        {/* Preview card */}
        {searchResult && (
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3">
            {searchResult.profile_image_url ? (
              <img src={searchResult.profile_image_url} alt="" className="h-12 w-12 rounded-full object-cover shrink-0" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-bold text-indigo-400 shrink-0">
                {searchResult.display_name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-white truncate">{searchResult.display_name}</p>
                {searchResult.verified && (
                  <svg className="h-4 w-4 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <p className="text-xs text-zinc-500">@{searchResult.username} &middot; {searchResult.follower_count >= 1000 ? `${(searchResult.follower_count / 1000).toFixed(1)}K` : searchResult.follower_count} followers</p>
              {searchResult.bio && (
                <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{searchResult.bio}</p>
              )}
            </div>
            <button
              onClick={addFavorite}
              className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
            >
              + Add
            </button>
          </div>
        )}
      </div>

      {/* Favorites list */}
      {loading ? (
        <p className="text-sm text-zinc-500 text-center py-8">Loading...</p>
      ) : favorites.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          </svg>
          <p className="mt-3 text-zinc-500">No favorites yet. Search for an X creator above to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {favorites.map((fav, i) => (
            <div
              key={fav.username}
              className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 group"
            >
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => moveFavorite(i, -1)}
                  disabled={i === 0}
                  className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition"
                  title="Move up"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => moveFavorite(i, 1)}
                  disabled={i === favorites.length - 1}
                  className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition"
                  title="Move down"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Avatar */}
              {fav.profile_image_url ? (
                <img src={fav.profile_image_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-bold text-indigo-400 shrink-0">
                  {fav.display_name?.[0]?.toUpperCase() || "?"}
                </div>
              )}

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-white truncate">{fav.display_name}</p>
                  {fav.verified && (
                    <svg className="h-3.5 w-3.5 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <p className="text-xs text-zinc-500">@{fav.username}</p>
              </div>

              {/* Remove */}
              <button
                onClick={() => removeFavorite(fav.username)}
                className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 opacity-0 group-hover:opacity-100 hover:border-red-500/50 hover:text-red-400 transition"
              >
                Remove
              </button>
            </div>
          ))}

          <p className="text-xs text-zinc-600 text-center pt-2">
            {favorites.length} favorite{favorites.length !== 1 ? "s" : ""} &middot; Drag to reorder &middot; Shows on your store&apos;s My Favorites block
          </p>
        </div>
      )}
    </div>
  );
}
