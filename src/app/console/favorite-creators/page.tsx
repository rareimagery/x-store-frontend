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

      {/* Tagged grids */}
      {loading ? (
        <p className="text-sm text-zinc-500 text-center py-8">Loading...</p>
      ) : favorites.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-500">No favorites yet. Search for an X creator above to get started.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {tags.map((tag) => {
            const members = favorites.filter((f) => f.tags.includes(tag.name));
            return (
              <section key={tag.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-400">{tag.name}</h3>
                  <span className="text-xs text-zinc-600">{members.length}</span>
                  <div className="flex-1 border-t border-zinc-800" />
                </div>
                {members.length === 0 ? (
                  <p className="text-xs text-zinc-600 py-2">No creators in this list yet.</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                    {members.map((fav) => (
                      <div key={fav.username} className="group relative flex flex-col items-center text-center">
                        {fav.profile_image_url ? (
                          <img src={fav.profile_image_url} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-zinc-700 group-hover:ring-indigo-500 transition" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-bold text-indigo-400 ring-2 ring-zinc-700">
                            {fav.display_name?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                        <p className="mt-1 text-[10px] font-medium text-white truncate max-w-[70px]">{fav.display_name}</p>
                        <p className="text-[9px] text-zinc-600 truncate max-w-[70px]">@{fav.username}</p>
                        {/* Remove from this tag */}
                        <button
                          onClick={() => toggleTag(fav.username, tag.name)}
                          className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[8px] text-white opacity-0 group-hover:opacity-100 transition"
                          title={`Remove from ${tag.name}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}

          {/* Untagged */}
          {(() => {
            const untagged = favorites.filter((f) => f.tags.length === 0);
            if (untagged.length === 0) return null;
            return (
              <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Uncategorized</h3>
                  <span className="text-xs text-zinc-600">{untagged.length}</span>
                  <div className="flex-1 border-t border-zinc-800" />
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  {untagged.map((fav) => (
                    <div key={fav.username} className="group relative flex flex-col items-center text-center">
                      {fav.profile_image_url ? (
                        <img src={fav.profile_image_url} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-zinc-700 group-hover:ring-indigo-500 transition" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-bold text-indigo-400 ring-2 ring-zinc-700">
                          {fav.display_name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <p className="mt-1 text-[10px] font-medium text-white truncate max-w-[70px]">{fav.display_name}</p>
                      <p className="text-[9px] text-zinc-600 truncate max-w-[70px]">@{fav.username}</p>
                      {/* Quick tag buttons */}
                      <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                        {tags.slice(0, 3).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => toggleTag(fav.username, t.name)}
                            className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[7px] text-zinc-500 hover:bg-indigo-600/30 hover:text-indigo-300 transition"
                          >
                            +{t.name}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => removeFavorite(fav.username)}
                        className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[8px] text-white opacity-0 group-hover:opacity-100 transition"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}
        </div>
      )}
    </div>
  );
}
