"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConsole } from "@/components/ConsoleContext";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";

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

const UNCATEGORIZED = "Uncategorized";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ---------------------------------------------------------------------------
// Draggable creator card
// ---------------------------------------------------------------------------
function DraggableCard({
  creator,
  onRemove,
}: {
  creator: FavoriteCreator;
  onRemove: (username: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: creator.username,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 cursor-grab active:cursor-grabbing transition hover:border-zinc-600 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {creator.profile_image_url ? (
        <img
          src={creator.profile_image_url}
          alt=""
          className="h-9 w-9 rounded-full object-cover ring-1 ring-zinc-700 shrink-0"
        />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-bold text-indigo-400 shrink-0">
          {creator.display_name?.[0]?.toUpperCase() || "?"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="text-xs font-medium text-white truncate">
            {creator.display_name}
          </p>
          {creator.verified && (
            <svg
              className="h-3 w-3 text-blue-400 shrink-0"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" />
            </svg>
          )}
        </div>
        <p className="text-[10px] text-zinc-500">
          @{creator.username} · {formatCount(creator.follower_count)}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        <a
          href={`https://x.com/${creator.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-zinc-800 p-1.5 text-zinc-400 hover:text-white transition"
          title="View on X"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(creator.username);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="rounded-full bg-zinc-800 p-1.5 text-zinc-500 hover:bg-red-600/20 hover:text-red-400 transition"
          title="Remove"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overlay card shown while dragging
// ---------------------------------------------------------------------------
function OverlayCard({ creator }: { creator: FavoriteCreator }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-indigo-500/50 bg-zinc-900 px-3 py-2.5 shadow-2xl shadow-indigo-500/10 w-64">
      {creator.profile_image_url ? (
        <img
          src={creator.profile_image_url}
          alt=""
          className="h-9 w-9 rounded-full object-cover ring-2 ring-indigo-500 shrink-0"
        />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-bold text-indigo-400 shrink-0">
          {creator.display_name?.[0]?.toUpperCase() || "?"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-white truncate">
          {creator.display_name}
        </p>
        <p className="text-[10px] text-zinc-400">@{creator.username}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Droppable column (one per category)
// ---------------------------------------------------------------------------
function DroppableColumn({
  tag,
  creators,
  onRemove,
  onDeleteTag,
}: {
  tag: string;
  creators: FavoriteCreator[];
  onRemove: (username: string) => void;
  onDeleteTag?: (tag: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: tag });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border p-4 min-h-[200px] transition-colors ${
        isOver
          ? "border-indigo-500 bg-indigo-500/5"
          : "border-zinc-800 bg-zinc-900/30"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white">{tag}</h3>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">
            {creators.length}
          </span>
        </div>
        {tag !== UNCATEGORIZED && onDeleteTag && (
          <button
            onClick={() => onDeleteTag(tag)}
            className="rounded-full p-1 text-zinc-600 hover:bg-red-600/20 hover:text-red-400 transition"
            title={`Delete "${tag}" category`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-2">
        {creators.map((c) => (
          <DraggableCard key={c.username} creator={c} onRemove={onRemove} />
        ))}
      </div>

      {creators.length === 0 && (
        <div
          className={`flex items-center justify-center rounded-xl border border-dashed py-8 text-xs transition ${
            isOver
              ? "border-indigo-500/50 text-indigo-400"
              : "border-zinc-800 text-zinc-600"
          }`}
        >
          {isOver ? "Drop here" : "Drag creators here"}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Main page
// ===========================================================================
export default function FavoriteCreatorsPage() {
  const { storeSlug, hasStore } = useConsole();
  const [favorites, setFavorites] = useState<FavoriteCreator[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Search
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<Omit<
    FavoriteCreator,
    "tags"
  > | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [autoResult, setAutoResult] = useState<Omit<
    FavoriteCreator,
    "tags"
  > | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // New tag creation
  const [newTagName, setNewTagName] = useState("");
  const [showNewTag, setShowNewTag] = useState(false);

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  // ---- Data loading ----
  useEffect(() => {
    if (!hasStore) return;
    Promise.all([
      fetch("/api/favorites").then((r) => r.json()),
      fetch("/api/favorites/tags").then((r) => r.json()),
    ])
      .then(([favData, tagData]) => {
        setFavorites(
          (favData.favorites ?? []).map((f: FavoriteCreator) => ({
            ...f,
            tags: f.tags || [],
          }))
        );
        setTags(tagData.tags ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasStore]);

  // ---- Derived: columns ----
  const tagNames = useMemo(() => tags.map((t) => t.name), [tags]);

  const columns = useMemo(() => {
    const cols: Record<string, FavoriteCreator[]> = {};
    for (const t of tagNames) cols[t] = [];
    cols[UNCATEGORIZED] = [];

    for (const fav of favorites) {
      if (fav.tags.length === 0) {
        cols[UNCATEGORIZED].push(fav);
      } else {
        for (const t of fav.tags) {
          if (!cols[t]) cols[t] = [];
          cols[t].push(fav);
        }
      }
    }
    return cols;
  }, [favorites, tagNames]);

  // Column order: named tags first, Uncategorized last
  const columnOrder = useMemo(() => {
    const order = tagNames.filter((t) => columns[t]?.length > 0 || true);
    order.push(UNCATEGORIZED);
    return order;
  }, [tagNames, columns]);

  // ---- Persistence ----
  const saveFavorites = useCallback(async (list: FavoriteCreator[]) => {
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorites: list }),
      });
      if (res.ok) {
        setSavedMsg("Saved!");
        setTimeout(() => setSavedMsg(null), 2000);
      }
    } catch {
    } finally {
      setSaving(false);
    }
  }, []);

  // ---- Search ----
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
        const res = await fetch(
          `/api/x-lookup?username=${encodeURIComponent(username)}`
        );
        if (res.ok) setAutoResult(await res.json());
        else setAutoResult(null);
      } catch {
        setAutoResult(null);
      } finally {
        setAutoLoading(false);
      }
    }, 500);
  }, []);

  const selectAutoResult = useCallback(() => {
    if (!autoResult) return;
    if (
      favorites.some(
        (f) => f.username.toLowerCase() === autoResult.username.toLowerCase()
      )
    ) {
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
    if (
      favorites.some((f) => f.username.toLowerCase() === username.toLowerCase())
    ) {
      setSearchError("Already in your favorites");
      return;
    }
    setSearching(true);
    setSearchResult(null);
    setSearchError(null);
    setAutoResult(null);
    try {
      const res = await fetch(
        `/api/x-lookup?username=${encodeURIComponent(username)}`
      );
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
  }, [searchResult, selectedTags, favorites, saveFavorites]);

  const removeFavorite = useCallback(
    async (username: string) => {
      const updated = favorites.filter((f) => f.username !== username);
      setFavorites(updated);
      await saveFavorites(updated);
    },
    [favorites, saveFavorites]
  );

  // ---- Tag management ----
  const addCustomTag = useCallback(() => {
    const name = newTagName.trim();
    if (!name) return;
    if (tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      setNewTagName("");
      setShowNewTag(false);
      return;
    }
    setTags((prev) => [
      ...prev,
      { id: `custom_${Date.now()}`, tid: 0, name },
    ]);
    setNewTagName("");
    setShowNewTag(false);
  }, [newTagName, tags]);

  const deleteTag = useCallback(
    async (tagName: string) => {
      setTags((prev) => prev.filter((t) => t.name !== tagName));
      const updated = favorites.map((f) => ({
        ...f,
        tags: f.tags.filter((t) => t !== tagName),
      }));
      setFavorites(updated);
      await saveFavorites(updated);
    },
    [favorites, saveFavorites]
  );

  // ---- Drag-and-drop ----
  const activeDragCreator = useMemo(
    () => favorites.find((f) => f.username === activeId) || null,
    [favorites, activeId]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const username = active.id as string;
      const targetTag = over.id as string;

      const updated = favorites.map((f) => {
        if (f.username !== username) return f;
        let newTags: string[];
        if (targetTag === UNCATEGORIZED) {
          // Moving to Uncategorized removes all tags
          newTags = [];
        } else {
          // Add the target tag if not already present
          newTags = f.tags.includes(targetTag)
            ? f.tags
            : [...f.tags.filter((t) => t !== UNCATEGORIZED), targetTag];
        }
        return { ...f, tags: newTags };
      });

      setFavorites(updated);
      await saveFavorites(updated);
    },
    [favorites, saveFavorites]
  );

  // ---- Render ----
  if (!hasStore || !storeSlug) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">No Store Found</h2>
          <p className="text-sm text-zinc-500">
            Create a store first to manage favorite creators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Creator Collections
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Drag creators between categories to organize your public favorites
            page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedMsg && (
            <span className="text-xs text-green-400 font-medium">
              {savedMsg}
            </span>
          )}
          {saving && <span className="text-xs text-zinc-500">Saving...</span>}
          <span className="text-xs text-zinc-600">
            {favorites.length} creators
          </span>
        </div>
      </div>

      {/* Category bar + new category */}
      <div className="flex flex-wrap items-center gap-2 mt-4 mb-6">
        {tags.map((tag) => {
          const count = favorites.filter((f) =>
            f.tags.includes(tag.name)
          ).length;
          return (
            <span
              key={tag.id}
              className="flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300"
            >
              {tag.name}
              <span className="text-[10px] text-zinc-600">({count})</span>
            </span>
          );
        })}

        {showNewTag ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addCustomTag();
                if (e.key === "Escape") setShowNewTag(false);
              }}
              placeholder="Category name..."
              autoFocus
              className="w-32 rounded-full border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={addCustomTag}
              className="rounded-full bg-indigo-600 px-2.5 py-1.5 text-xs text-white hover:bg-indigo-500"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowNewTag(false);
                setNewTagName("");
              }}
              className="text-xs text-zinc-500 hover:text-white"
            >
              Cancel
            </button>
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
        <p className="text-sm font-medium text-zinc-300 mb-3">
          Add a creator
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
              @
            </span>
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
                  <div className="px-3 py-2 text-xs text-zinc-500">
                    Searching...
                  </div>
                )}
                {autoResult && (
                  <button
                    onClick={selectAutoResult}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-700"
                  >
                    {autoResult.profile_image_url ? (
                      <img
                        src={autoResult.profile_image_url}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-bold text-indigo-400 shrink-0">
                        {autoResult.display_name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-white truncate">
                          {autoResult.display_name}
                        </p>
                        {autoResult.verified && (
                          <svg
                            className="h-3.5 w-3.5 text-blue-400 shrink-0"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">
                        @{autoResult.username} ·{" "}
                        {formatCount(autoResult.follower_count)} followers
                      </p>
                    </div>
                    <span className="text-[10px] text-indigo-400 shrink-0">
                      Select
                    </span>
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

        {searchError && (
          <p className="mt-2 text-sm text-red-400">{searchError}</p>
        )}

        {searchResult && (
          <div className="mt-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3 space-y-3">
            <div className="flex items-start gap-3">
              {searchResult.profile_image_url ? (
                <img
                  src={searchResult.profile_image_url}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-bold text-indigo-400 shrink-0">
                  {searchResult.display_name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-white truncate">
                    {searchResult.display_name}
                  </p>
                  {searchResult.verified && (
                    <svg
                      className="h-4 w-4 text-blue-400 shrink-0"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <p className="text-xs text-zinc-500">
                  @{searchResult.username} ·{" "}
                  {formatCount(searchResult.follower_count)} followers
                </p>
                {searchResult.bio && (
                  <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
                    {searchResult.bio}
                  </p>
                )}
              </div>
            </div>

            {tags.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 mb-2">
                  Add to categories:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() =>
                        setSelectedTags((prev) =>
                          prev.includes(tag.name)
                            ? prev.filter((t) => t !== tag.name)
                            : [...prev, tag.name]
                        )
                      }
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
              + Add to Collections
            </button>
          </div>
        )}
      </div>

      {/* Collections grid with drag-and-drop */}
      {loading ? (
        <p className="text-sm text-zinc-500 text-center py-8">Loading...</p>
      ) : favorites.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="h-10 w-10 text-zinc-700 mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
            />
          </svg>
          <p className="text-zinc-500 text-sm">
            No creators yet. Search for an X creator above to get started.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {columnOrder.map((tag) => (
              <DroppableColumn
                key={tag}
                tag={tag}
                creators={columns[tag] || []}
                onRemove={removeFavorite}
                onDeleteTag={tag !== UNCATEGORIZED ? deleteTag : undefined}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDragCreator ? (
              <OverlayCard creator={activeDragCreator} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
