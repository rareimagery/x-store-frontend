import Link from "next/link";
import { notFound } from "next/navigation";
import { getCreatorProfile } from "@/lib/drupal";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";
import CreatorPageHeader from "@/components/CreatorPageHeader";

const RESERVED = new Set([
  "console", "login", "signup", "admin", "api", "stores", "products",
  "builder", "builder-popup", "build", "studio", "playground",
  "onboarding", "maintenance", "eula", "privacy", "terms",
  "sitemap.xml", "robots.txt", "favicon.ico",
]);

interface FavoriteCreator {
  username: string;
  display_name: string;
  bio: string;
  profile_image_url: string | null;
  follower_count: number;
  verified: boolean;
  tags?: string[];
}

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
  } catch { return []; }
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

  // Build tag groups
  const tagGroups: Record<string, FavoriteCreator[]> = {};
  const untagged: FavoriteCreator[] = [];

  for (const fav of favorites) {
    if (!fav.tags || fav.tags.length === 0) {
      untagged.push(fav);
    } else {
      for (const tag of fav.tags) {
        if (!tagGroups[tag]) tagGroups[tag] = [];
        tagGroups[tag].push(fav);
      }
    }
  }

  const allTags = Object.keys(tagGroups).sort();
  const hasGroups = allTags.length > 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <CreatorPageHeader profile={profile} activePage="favorites" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <h2 className="text-lg font-semibold mb-6">
          {favorites.length} {favorites.length === 1 ? "Favorite" : "Favorites"}
          {hasGroups && ` in ${allTags.length} ${allTags.length === 1 ? "list" : "lists"}`}
        </h2>

        {favorites.length === 0 ? (
          <p className="text-center text-zinc-500 py-16">No favorites added yet.</p>
        ) : hasGroups ? (
          <div className="space-y-10">
            {allTags.map((tag) => (
              <section key={tag}>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-400">{tag}</h3>
                  <span className="text-xs text-zinc-600">{tagGroups[tag].length}</span>
                  <div className="flex-1 border-t border-zinc-800" />
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {tagGroups[tag].map((fav) => (
                    <a
                      key={fav.username}
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
                  ))}
                </div>
              </section>
            ))}

            {untagged.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Other</h3>
                  <span className="text-xs text-zinc-600">{untagged.length}</span>
                  <div className="flex-1 border-t border-zinc-800" />
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {untagged.map((fav) => (
                    <a
                      key={fav.username}
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
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          /* No tags — flat grid */
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {favorites.map((fav) => (
              <a
                key={fav.username}
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
              </a>
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">
            Powered by RareImagery
          </Link>
        </div>
      </div>
    </div>
  );
}
