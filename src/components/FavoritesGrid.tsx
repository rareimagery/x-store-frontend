"use client";

import { useEffect, useState } from "react";

interface FavoriteCreator {
  username: string;
  display_name: string;
  bio: string;
  profile_image_url: string | null;
  follower_count: number;
  following_count?: number;
  location?: string;
  verified: boolean;
  tags?: string[];
}

interface EnrichedPost {
  id: string;
  text: string;
  date?: string;
  image_url?: string | null;
  likes: number;
  retweets: number;
  views: number;
}

interface EnrichedProfile {
  username: string;
  display_name: string;
  bio: string;
  profile_image_url: string | null;
  location: string;
  follower_count: number;
  following_count: number;
  verified: boolean;
  pinned_tweet: EnrichedPost | null;
  recent_posts: EnrichedPost[];
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function PostCard({ post, username }: { post: EnrichedPost; username: string }) {
  return (
    <a
      href={`https://x.com/${username}/status/${post.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-zinc-800 bg-zinc-900/50 p-2.5 transition hover:border-zinc-600 hover:bg-zinc-900"
    >
      {post.image_url && (
        <img src={post.image_url} alt="" className="w-full h-24 object-cover rounded-md mb-2" />
      )}
      <p className="text-[11px] text-zinc-300 leading-relaxed line-clamp-3">{post.text}</p>
      <div className="mt-1.5 flex items-center gap-3 text-[9px] text-zinc-600">
        {post.likes > 0 && (
          <span className="flex items-center gap-0.5">
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            {formatCount(post.likes)}
          </span>
        )}
        {post.retweets > 0 && <span>{formatCount(post.retweets)} RT</span>}
        {post.views > 0 && <span>{formatCount(post.views)} views</span>}
      </div>
    </a>
  );
}

export default function FavoritesGrid({
  favorites,
  tags,
  creatorUsername,
}: {
  favorites: FavoriteCreator[];
  tags: string[];
  creatorUsername: string;
}) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [enriched, setEnriched] = useState<Record<string, EnrichedProfile>>({});
  const [loading, setLoading] = useState(true);

  // Enrich favorites with X API data (pinned + recent posts)
  useEffect(() => {
    const usernames = favorites.map((f) => f.username);
    fetch("/api/favorites/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames }),
    })
      .then((r) => r.json())
      .then((d) => setEnriched(d.profiles || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [favorites]);

  const filtered = activeTag
    ? favorites.filter((f) => f.tags?.includes(activeTag))
    : favorites;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">{creatorUsername}&apos;s Favorites</h2>
        {loading && <span className="text-xs text-zinc-600 animate-pulse">Loading posts...</span>}
      </div>

      {/* Tag filter bar */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTag(null)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              activeTag === null
                ? "bg-indigo-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
            }`}
          >
            All ({favorites.length})
          </button>
          {tags.map((tag) => {
            const count = favorites.filter((f) => f.tags?.includes(tag)).length;
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  activeTag === tag
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                {tag} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* 6-across grid */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {filtered.map((fav) => {
          const profile = enriched[fav.username.toLowerCase()];
          const displayBio = profile?.bio || fav.bio;
          const displayLocation = profile?.location || fav.location || "";
          const displayFollowers = profile?.follower_count ?? fav.follower_count;
          const displayFollowing = profile?.following_count ?? fav.following_count ?? 0;
          const displayAvatar = profile?.profile_image_url || fav.profile_image_url;
          const displayVerified = profile?.verified ?? fav.verified;

          return (
            <div
              key={fav.username}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden transition hover:border-zinc-600"
            >
              {/* Profile header */}
              <a
                href={`https://x.com/${fav.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  {displayAvatar ? (
                    <img src={displayAvatar} alt={`@${fav.username}`} className="h-10 w-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-bold text-indigo-400 shrink-0">
                      {fav.display_name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-white truncate">{fav.display_name}</span>
                      {displayVerified && (
                        <svg className="h-3.5 w-3.5 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate">@{fav.username}</p>
                  </div>
                </div>

                {displayBio && (
                  <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2 mb-2">{displayBio}</p>
                )}

                <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-[10px] text-zinc-500">
                  {displayLocation && (
                    <span className="flex items-center gap-0.5">
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                      {displayLocation}
                    </span>
                  )}
                  {displayFollowing > 0 && (
                    <span><strong className="text-zinc-300">{formatCount(displayFollowing)}</strong> Following</span>
                  )}
                  <span><strong className="text-zinc-300">{formatCount(displayFollowers)}</strong> Followers</span>
                </div>
              </a>

              {/* Posts section */}
              {profile && (profile.pinned_tweet || profile.recent_posts.length > 0) && (
                <div className="border-t border-zinc-800 p-2.5 space-y-2">
                  {profile.pinned_tweet && (
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-zinc-600 font-semibold mb-1 flex items-center gap-1">
                        <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                        Pinned
                      </p>
                      <PostCard post={profile.pinned_tweet} username={fav.username} />
                    </div>
                  )}
                  {profile.recent_posts.length > 0 && (
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-zinc-600 font-semibold mb-1">Recent</p>
                      <div className="space-y-1.5">
                        {profile.recent_posts.map((post) => (
                          <PostCard key={post.id} post={post} username={fav.username} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Loading skeleton for posts */}
              {loading && (
                <div className="border-t border-zinc-800 p-2.5">
                  <div className="h-3 w-12 bg-zinc-800 rounded animate-pulse mb-2" />
                  <div className="space-y-1.5">
                    <div className="h-16 bg-zinc-800/50 rounded-lg animate-pulse" />
                    <div className="h-16 bg-zinc-800/50 rounded-lg animate-pulse" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
