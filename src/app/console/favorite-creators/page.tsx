"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [autoResult, setAutoResult] = useState<Omit<FavoriteCreator, "tags"> | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

  // Auto-lookup as user types (debounced)
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setSearchError(null);
    setSearchResult(null);
    setAutoResult(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const username = value.trim().replace(/^@/, "");
    if (username.length < 2) {
      setAutoLoading(false);
      return;
    }

    setAutoLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/x-lookup?username=${encodeURIComponent(username)}`);
        if (res.ok) {
          setAutoResult(await res.json());
        } else {
          setAutoResult(null);
        }
      } catch {
        setAutoResult(null);
      } finally {
        setAutoLoading(false);
      }
    }, 500);
  }, []);

  // Select the auto-result
  const selectAutoResult = useCallback(() => {
    if (!autoResult) return;
    if (favorites.some((f) => f.username.toLowerCase() === autoResult.username.toLowerCase())) {
      setSearchError("Already in your favorites");
      return;
    }
    setSearchResult(autoResult);
    setAutoResult(null);
    setSelectedTags([]);
  }, [autoResult, favorites]);

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
    setAutoResult(null);
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
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (autoResult) selectAutoResult();
                  else lookupUser();
                }
              }}
              placeholder="Start typing a username..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 pl-7 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />

            {/* Auto-result dropdown */}
            {(autoResult || autoLoading) && !searchResult && (
              <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl overflow-hidden">
                {autoLoading && !autoResult && (
                  <div className="px-3 py-2 text-xs text-zinc-500">Searching...</div>
                )}
                {autoResult && (
                  <button
                    onClick={selectAutoResult}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-700"
                  >
                    {autoResult.profile_image_url ? (
                      <img src={autoResult.profile_image_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-bold text-indigo-400 shrink-0">
                        {autoResult.display_name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-white truncate">{autoResult.display_name}</p>
                        {autoResult.verified && (
                          <svg className="h-3.5 w-3.5 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">@{autoResult.username} &middot; {autoResult.follower_count >= 1000 ? `${(autoResult.follower_count / 1000).toFixed(1)}K` : autoResult.follower_count} followers</p>
                    </div>
                    <span className="text-[10px] text-indigo-400 shrink-0">Select</span>
                  </button>
                )}
              </div>
            )}
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
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {members.map((fav) => (
                      <div key={fav.username} className="group relative flex flex-col items-center text-center rounded-xl border border-zinc-800 bg-zinc-800/30 p-3 hover:border-zinc-600 transition">
                        {fav.profile_image_url ? (
                          <img src={fav.profile_image_url} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-zinc-700 group-hover:ring-indigo-500 transition" />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-bold text-indigo-400 ring-2 ring-zinc-700">
                            {fav.display_name?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                        <p className="mt-2 text-[11px] font-medium text-white truncate max-w-full">{fav.display_name}</p>
                        <p className="text-[10px] text-zinc-600 truncate max-w-full">@{fav.username}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <a href={`https://x.com/${fav.username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-full bg-zinc-700/50 px-2 py-0.5 text-[9px] text-zinc-400 hover:text-white hover:bg-zinc-600 transition" title="View on X">
                            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                            X
                          </a>
                          <a href={`https://www.rareimagery.net/${fav.username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-full bg-indigo-600/20 px-2 py-0.5 text-[9px] text-indigo-400 hover:text-white hover:bg-indigo-600/40 transition" title="View on RareImagery">
                            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                            Rare
                          </a>
                        </div>
                        <button
                          onClick={() => toggleTag(fav.username, tag.name)}
                          className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[9px] text-white opacity-0 group-hover:opacity-100 transition"
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
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {untagged.map((fav) => (
                    <div key={fav.username} className="group relative flex flex-col items-center text-center rounded-xl border border-zinc-800 bg-zinc-800/30 p-3 hover:border-zinc-600 transition">
                      {fav.profile_image_url ? (
                        <img src={fav.profile_image_url} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-zinc-700 group-hover:ring-indigo-500 transition" />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-bold text-indigo-400 ring-2 ring-zinc-700">
                          {fav.display_name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <p className="mt-2 text-[11px] font-medium text-white truncate max-w-full">{fav.display_name}</p>
                      <p className="text-[10px] text-zinc-600 truncate max-w-full">@{fav.username}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <a href={`https://x.com/${fav.username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-full bg-zinc-700/50 px-2 py-0.5 text-[9px] text-zinc-400 hover:text-white hover:bg-zinc-600 transition">
                          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                          X
                        </a>
                        <a href={`https://www.rareimagery.net/${fav.username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-full bg-indigo-600/20 px-2 py-0.5 text-[9px] text-indigo-400 hover:text-white hover:bg-indigo-600/40 transition">
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                          Rare
                        </a>
                      </div>
                      {/* Quick tag buttons */}
                      <div className="mt-2 flex flex-wrap justify-center gap-0.5">
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
                        className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[9px] text-white opacity-0 group-hover:opacity-100 transition"
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
