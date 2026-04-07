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
  const [newTagName, setNewTagName] = useState("");
  const [showNewTag, setShowNewTag] = useState(false);
  const [autoResult, setAutoResult] = useState<Omit<FavoriteCreator, "tags"> | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!hasStore) return;
    Promise.all([
      fetch("/api/favorites").then((r) => r.json()),
      fetch("/api/favorites/tags").then((r) => r.json()),
    ])
      .then(([favData, tagData]) => {
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

  const addCustomTag = useCallback(() => {
    const name = newTagName.trim();
    if (!name) return;
    if (tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      setNewTagName("");
      setShowNewTag(false);
      return;
    }
    setTags((prev) => [...prev, { id: `custom_${Date.now()}`, tid: 0, name }]);
    setNewTagName("");
    setShowNewTag(false);
  }, [newTagName, tags]);

  const removeTag = useCallback((tagName: string) => {
    setTags((prev) => prev.filter((t) => t.name !== tagName));
    // Remove tag from all favorites that have it
    const updated = favorites.map((f) => ({
      ...f,
      tags: f.tags.filter((t) => t !== tagName),
    }));
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

  function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Favorite Creators</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Add creators and organize them into categories for your public favorites page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedMessage && <span className="text-sm text-green-400 font-medium">{savedMessage}</span>}
          {saving && <span className="text-sm text-zinc-500">Saving...</span>}
        </div>
      </div>

      {/* Category bar */}
      <div className="flex flex-wrap items-center gap-2 mt-4 mb-6">
        {tags.map((tag) => {
          const count = favorites.filter((f) => f.tags.includes(tag.name)).length;
          return (
            <div key={tag.id} className="group flex items-center gap-1 rounded-full bg-zinc-800 pl-3 pr-1.5 py-1.5">
              <span className="text-xs font-medium text-zinc-300">{tag.name}</span>
              <span className="text-[10px] text-zinc-600">({count})</span>
              <button
                onClick={() => removeTag(tag.name)}
                className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-zinc-600 hover:bg-red-600/20 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                title={`Delete "${tag.name}" category`}
              >
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          );
        })}

        {showNewTag ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addCustomTag(); if (e.key === "Escape") setShowNewTag(false); }}
              placeholder="Category name..."
              autoFocus
              className="w-32 rounded-full border border-zinc-600 bg-zinc-800 px-3 py-1 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
            <button onClick={addCustomTag} className="rounded-full bg-indigo-600 px-2.5 py-1 text-xs text-white hover:bg-indigo-500">Add</button>
            <button onClick={() => { setShowNewTag(false); setNewTagName(""); }} className="text-xs text-zinc-500 hover:text-white">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewTag(true)}
            className="rounded-full border border-dashed border-zinc-600 px-3 py-1.5 text-xs text-zinc-500 hover:border-indigo-500 hover:text-indigo-400 transition"
          >
            + New Category
          </button>
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
                      <p className="text-xs text-zinc-500">@{autoResult.username} · {formatCount(autoResult.follower_count)} followers</p>
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
                <p className="text-xs text-zinc-500">@{searchResult.username} · {formatCount(searchResult.follower_count)} followers</p>
                {searchResult.bio && <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{searchResult.bio}</p>}
              </div>
            </div>

            {tags.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 mb-2">Add to categories:</p>
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
            )}

            <button
              onClick={addFavorite}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
            >
              + Add to Favorites
            </button>
          </div>
        )}
      </div>

      {/* Favorites grid */}
      {loading ? (
        <p className="text-sm text-zinc-500 text-center py-8">Loading...</p>
      ) : favorites.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-500">No favorites yet. Search for an X creator above to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {favorites.map((fav) => (
            <div
              key={fav.username}
              className="group relative flex flex-col items-center text-center rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-600"
            >
              <a href={`https://x.com/${fav.username}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center">
                {fav.profile_image_url ? (
                  <img src={fav.profile_image_url} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-zinc-700 group-hover:ring-indigo-500 transition" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-bold text-indigo-400 ring-2 ring-zinc-700">
                    {fav.display_name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="flex items-center gap-1 mt-2">
                  <p className="text-[11px] font-medium text-white truncate max-w-[90px]">{fav.display_name}</p>
                  {fav.verified && (
                    <svg className="h-3 w-3 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" />
                    </svg>
                  )}
                </div>
                <p className="text-[10px] text-zinc-600 truncate max-w-[90px]">@{fav.username}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{formatCount(fav.follower_count)} followers</p>
              </a>

              {/* Tags */}
              {fav.tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                  {fav.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-indigo-600/20 px-1.5 py-0.5 text-[8px] font-medium text-indigo-400">{tag}</span>
                  ))}
                </div>
              )}

              {/* Tag edit + remove buttons */}
              <div className="flex items-center gap-1 mt-2">
                <button
                  onClick={() => setEditingTags(editingTags === fav.username ? null : fav.username)}
                  className={`rounded-full px-2 py-0.5 text-[9px] font-medium transition ${
                    editingTags === fav.username
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-white"
                  }`}
                >
                  Tags
                </button>
                <button
                  onClick={() => removeFavorite(fav.username)}
                  className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-zinc-600 hover:bg-red-600/20 hover:text-red-400 transition text-[9px]"
                >
                  Remove
                </button>
              </div>

              {/* Expanded tag editor */}
              {editingTags === fav.username && tags.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-800 w-full">
                  <div className="flex flex-wrap justify-center gap-1">
                    {tags.map((tag) => {
                      const active = fav.tags.includes(tag.name);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(fav.username, tag.name)}
                          className={`rounded-full px-2 py-0.5 text-[9px] font-medium transition ${
                            active
                              ? "bg-indigo-600 text-white"
                              : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-white"
                          }`}
                        >
                          {active ? "✓ " : "+ "}{tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
