import { notFound } from "next/navigation";
import { getCreatorProfile } from "@/lib/drupal";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";
import CreatorPageHeader from "@/components/CreatorPageHeader";
import FavoritesGrid from "@/components/FavoritesGrid";
import StoreNav from "@/components/StoreNav";
import ThemedPage from "@/components/ThemedPage";
import { getStoreTheme } from "@/lib/storeTheme";

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
  following_count?: number;
  location?: string;
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

  const [profile, favorites, theme] = await Promise.all([
    getCreatorProfile(normalized, { noStore: true }),
    getFavorites(normalized),
    getStoreTheme(normalized),
  ]);

  if (!profile) notFound();

  // Collect all unique tags
  const allTags: string[] = [];
  for (const fav of favorites) {
    for (const tag of fav.tags ?? []) {
      if (!allTags.includes(tag)) allTags.push(tag);
    }
  }

  return (
    <>
    <StoreNav creator={normalized} />
    <ThemedPage colorScheme={theme.colorScheme} pageBackground={theme.pageBackground}>
      <div className="pt-14" />
      <CreatorPageHeader profile={profile} activePage="favorites" basePath={normalized} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {favorites.length === 0 ? (
          <p className="text-center text-zinc-500 py-16">No favorites added yet.</p>
        ) : (
          <FavoritesGrid
            favorites={favorites}
            tags={allTags}
            creatorUsername={profile.x_username}
          />
        )}
      </div>
    </ThemedPage>
    </>
  );
}
