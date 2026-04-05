import Link from "next/link";
import { notFound } from "next/navigation";
import { getCreatorProfile } from "@/lib/drupal";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";
import CreatorPageHeader from "@/components/CreatorPageHeader";
import FavoritesTagFilter from "@/components/FavoritesTagFilter";

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

  // Collect all unique tags
  const tagSet = new Set<string>();
  for (const fav of favorites) {
    if (fav.tags) fav.tags.forEach((t) => tagSet.add(t));
  }
  const allTags = [...tagSet].sort();

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <CreatorPageHeader profile={profile} activePage="favorites" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {favorites.length === 0 ? (
          <p className="text-center text-zinc-500 py-16">No favorites added yet.</p>
        ) : (
          <FavoritesTagFilter favorites={favorites} tags={allTags} />
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
