import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { getCreatorProfile } from "@/lib/drupal";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";
import type { FavoriteCreator } from "@/components/builder/WireframeRenderer";

const RESERVED = new Set([
  "console", "login", "signup", "admin", "api", "stores", "products",
  "builder", "builder-popup", "build", "studio", "playground",
  "onboarding", "maintenance", "eula", "privacy", "terms",
  "sitemap.xml", "robots.txt", "favicon.ico",
]);

async function getFavorites(slug: string): Promise<FavoriteCreator[]> {
  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_my_favorites`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const raw = json.data?.[0]?.attributes?.field_my_favorites;
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ creator: string }> }) {
  const { creator } = await params;
  if (RESERVED.has(creator.toLowerCase())) return {};
  const profile = await getCreatorProfile(creator.toLowerCase());
  if (!profile) return { title: "Not Found" };
  return {
    title: `@${profile.x_username}'s Favorites | RareImagery`,
    description: `People @${profile.x_username} recommends on X`,
  };
}

export default async function FavoritesPage({ params }: { params: Promise<{ creator: string }> }) {
  const { creator } = await params;
  const normalized = creator.toLowerCase();

  if (RESERVED.has(normalized)) notFound();

  const [profile, favorites] = await Promise.all([
    getCreatorProfile(normalized, { noStore: true }),
    getFavorites(normalized),
  ]);

  if (!profile) notFound();

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link href={`/${profile.x_username}/store` as Route} className="text-sm text-indigo-400 hover:text-indigo-300">
          &larr; Back to store
        </Link>

        <div className="mt-6 flex items-center gap-4">
          {profile.profile_picture_url && (
            <img src={profile.profile_picture_url} alt={`@${profile.x_username}`} className="h-12 w-12 rounded-full object-cover" />
          )}
          <div>
            <h1 className="text-2xl font-bold">@{profile.x_username}&apos;s Favorites</h1>
            <p className="text-sm text-zinc-400">{favorites.length} {favorites.length === 1 ? "person" : "people"}</p>
          </div>
        </div>

        {favorites.length === 0 ? (
          <p className="mt-8 text-center text-zinc-500">No favorites added yet.</p>
        ) : (
          <div className="mt-8 space-y-3">
            {favorites.map((fav) => (
              <a
                key={fav.username}
                href={`https://x.com/${fav.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-600"
              >
                {fav.profile_image_url ? (
                  <img src={fav.profile_image_url} alt={`@${fav.username}`} className="h-12 w-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-bold text-indigo-400 shrink-0">
                    {fav.display_name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{fav.display_name}</p>
                    {fav.verified && (
                      <svg className="h-4 w-4 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <span className="text-xs text-zinc-500">
                      {fav.follower_count >= 1000 ? `${(fav.follower_count / 1000).toFixed(1)}K` : fav.follower_count} followers
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500">@{fav.username}</p>
                  {fav.bio && (
                    <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{fav.bio}</p>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">
            Powered by RareImagery
          </Link>
        </div>
      </div>
    </div>
  );
}
