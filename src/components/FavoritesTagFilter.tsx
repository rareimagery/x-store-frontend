"use client";

import { useState } from "react";

interface FavoriteCreator {
  username: string;
  display_name: string;
  bio: string;
  profile_image_url: string | null;
  follower_count: number;
  verified: boolean;
  tags?: string[];
}

interface Props {
  favorites: FavoriteCreator[];
  tags: string[];
}

export default function FavoritesTagFilter({ favorites, tags }: Props) {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set(tags));

  const allSelected = selectedTags.size === tags.length;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const selectAll = () => setSelectedTags(new Set(tags));
  const clearAll = () => setSelectedTags(new Set());

  // Filter favorites: show if any of their tags match selected tags, or if untagged and "Other" isn't filtered
  const filtered = favorites.filter((fav) => {
    if (selectedTags.size === 0) return false;
    if (!fav.tags || fav.tags.length === 0) {
      return selectedTags.has("__other__");
    }
    return fav.tags.some((t) => selectedTags.has(t));
  });

  // Group filtered by tag
  const tagGroups: Record<string, FavoriteCreator[]> = {};
  const untagged: FavoriteCreator[] = [];

  for (const fav of filtered) {
    if (!fav.tags || fav.tags.length === 0) {
      untagged.push(fav);
    } else {
      for (const tag of fav.tags) {
        if (selectedTags.has(tag)) {
          if (!tagGroups[tag]) tagGroups[tag] = [];
          tagGroups[tag].push(fav);
        }
      }
    }
  }

  const visibleTags = Object.keys(tagGroups).sort();
  const hasUntagged = favorites.some((f) => !f.tags || f.tags.length === 0);

  // Include __other__ in the tag list if there are untagged favorites
  const allTags = hasUntagged ? [...tags, "__other__"] : tags;
  const allTagsSelected = selectedTags.size === allTags.length;

  return (
    <>
      {/* Tag filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <button
          onClick={allTagsSelected ? clearAll : selectAll}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            allTagsSelected
              ? "bg-indigo-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          }`}
        >
          All ({favorites.length})
        </button>
        {tags.map((tag) => {
          const count = favorites.filter((f) => f.tags?.includes(tag)).length;
          const active = selectedTags.has(tag);
          return (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-indigo-600/80 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              }`}
            >
              {tag} ({count})
            </button>
          );
        })}
        {hasUntagged && (
          <button
            onClick={() => toggleTag("__other__")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              selectedTags.has("__other__")
                ? "bg-indigo-600/80 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
            }`}
          >
            Other ({favorites.filter((f) => !f.tags || f.tags.length === 0).length})
          </button>
        )}
        <span className="ml-auto text-xs text-zinc-600">
          {filtered.length} of {favorites.length} shown
        </span>
      </div>

      {/* Filtered results */}
      {filtered.length === 0 ? (
        <p className="text-center text-zinc-500 py-12">No favorites match the selected tags.</p>
      ) : (
        <div className="space-y-10">
          {visibleTags.map((tag) => (
            <section key={tag}>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-400">{tag}</h3>
                <span className="text-xs text-zinc-600">{tagGroups[tag].length}</span>
                <div className="flex-1 border-t border-zinc-800" />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {tagGroups[tag].map((fav) => (
                  <FavCard key={`${tag}-${fav.username}`} fav={fav} />
                ))}
              </div>
            </section>
          ))}

          {untagged.length > 0 && selectedTags.has("__other__") && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Other</h3>
                <span className="text-xs text-zinc-600">{untagged.length}</span>
                <div className="flex-1 border-t border-zinc-800" />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {untagged.map((fav) => (
                  <FavCard key={`other-${fav.username}`} fav={fav} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

function FavCard({ fav }: { fav: FavoriteCreator }) {
  return (
    <a
      href={`https://x.com/${fav.username}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center text-center transition"
    >
      {fav.profile_image_url ? (
        <img
          src={fav.profile_image_url}
          alt={`@${fav.username}`}
          className="h-16 w-16 rounded-full object-cover ring-2 ring-zinc-800 transition group-hover:ring-indigo-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600/20 text-lg font-bold text-indigo-400 ring-2 ring-zinc-800 group-hover:ring-indigo-500">
          {fav.display_name?.[0]?.toUpperCase() || "?"}
        </div>
      )}
      <p className="mt-2 text-xs font-medium text-white truncate max-w-[80px] group-hover:text-indigo-400 transition">
        {fav.display_name}
      </p>
      <p className="text-[10px] text-zinc-600 truncate max-w-[80px]">@{fav.username}</p>
      {fav.verified && (
        <svg className="mt-0.5 h-3 w-3 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
    </a>
  );
}
