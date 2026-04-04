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
  tags: string[];
}

interface Tag {
  id: string;
  tid: number;
  name: string;
}

export default function FavoriteCreatorsPage() {
  const { storeSlug, hasStore } = useConsole();
  const [favorites, setFavorites] = useState<FavoriteCreator[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<Omit<FavoriteCreator, "tags"> | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Load favorites and tags
  useEffect(() => {
    if (!hasStore) return;
    Promise.all([
      fetch("/api/favorites").then((r) => r.json()),
      fetch("/api/favorites/tags").then((r) => r.json()),
    ])
      .then(([favData, tagData]) => {
        // Migrate old favorites without tags
        const favs = (favData.favorites ?? []).map((f: any) => ({
          ...f,
          tags: f.tags || [],
        }));
        setFavorites(favs);
        setTags(tagData.tags ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasStore]);

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
      setSelectedTags([]);
    } catch {
      setSearchError("Lookup failed — try again");
    } finally {
      setSearching(false);
    }
  }, [search, favorites]);

  const addFavorite = useCallback(async () => {
    if (!searchResult) return;
    const updated = [...favorites, { ...searchResult, tags: selectedTags }];
    setFavorites(updated);
    setSearchResult(null);
    setSearch("");
    setSelectedTags([]);
    await saveFavorites(updated);
  }, [searchResult, selectedTags, favorites]);

  const removeFavorite = useCallback(async (username: string) => {
    const updated = favorites.filter((f) => f.username !== username);
    setFavorites(updated);
    await saveFavorites(updated);
  }, [favorites]);

  const toggleTag = useCallback((username: string, tag: string) => {
    const updated = favorites.map((f) => {
      if (f.username !== username) return f;
      const newTags = f.tags.includes(tag)
        ? f.tags.filter((t) => t !== tag)
        : [...f.tags, tag];
      return { ...f, tags: newTags };
    });
    setFavorites(updated);
    saveFavorites(updated);
  }, [favorites]);

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
    } catch {} finally { setSaving(false); }
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

  const filteredFavorites = activeFilter
    ? favorites.filter((f) => f.tags.includes(activeFilter))
    : favorites;

  // Count per tag
  const tagCounts: Record<string, number> = {};
  for (const f of favorites) {
    for (const t of f.tags) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Favorite Creators</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Organize your favorite X creators into lists. They show on your public page grouped by category.
          </p>
        </div>
        {savedMessage && <span className="text-sm text-green-400 font-medium">{savedMessage}</span>}
        {saving && <span className="text-sm text-zinc-500">Saving...</span>}
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
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition"
          >
            {searching ? "Looking up..." : "Look up"}
          </button>
        </div>

        {searchError && <p className="mt-2 text-sm text-red-400">{searchError}</p>}

        {/* Preview card with tag selector */}
        {searchResult && (
          <div className="mt-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3 space-y-3">
            <div className="flex items-start gap-3">
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
                {searchResult.bio && <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{searchResult.bio}</p>}
              </div>
            </div>

            {/* Tag selector */}
            <div>
              <p className="text-xs text-zinc-500 mb-2">Add to lists:</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTags((prev) =>
                      prev.includes(tag.name) ? prev.filter((t) => t !== tag.name) : [...prev, tag.name]
                    )}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      selectedTags.includes(tag.name)
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={addFavorite}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
            >
              + Add to Favorites
            </button>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      {favorites.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setActiveFilter(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              !activeFilter ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            All ({favorites.length})
          </button>
          {tags.map((tag) => {
            const count = tagCounts[tag.name] || 0;
            if (count === 0) return null;
            return (
              <button
                key={tag.id}
                onClick={() => setActiveFilter(activeFilter === tag.name ? null : tag.name)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  activeFilter === tag.name ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {tag.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Favorites list */}
      {loading ? (
        <p className="text-sm text-zinc-500 text-center py-8">Loading...</p>
      ) : filteredFavorites.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-500">
            {activeFilter ? `No creators tagged "${activeFilter}" yet.` : "No favorites yet. Search for an X creator above to get started."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFavorites.map((fav) => (
            <div key={fav.username} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 group">
              <div className="flex items-center gap-3">
                {fav.profile_image_url ? (
                  <img src={fav.profile_image_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-bold text-indigo-400 shrink-0">
                    {fav.display_name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
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
                <button
                  onClick={() => removeFavorite(fav.username)}
                  className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 opacity-0 group-hover:opacity-100 hover:border-red-500/50 hover:text-red-400 transition"
                >
                  Remove
                </button>
              </div>

              {/* Tags */}
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(fav.username, tag.name)}
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition ${
                      fav.tags.includes(tag.name)
                        ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30"
                        : "bg-zinc-800/50 text-zinc-600 hover:text-zinc-400 border border-transparent"
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
