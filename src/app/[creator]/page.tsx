export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import {
  getCreatorProfile,
  getAllCreatorProfiles,
  getProductsByStoreSlug,
  DRUPAL_API_URL,
  drupalAuthHeaders,
} from "@/lib/drupal";
import { getPublishedBuilds } from "@/lib/drupalBuilds";
import WireframeRenderer from "@/components/builder/WireframeRenderer";
import type { FavoriteCreator, XArticle, MusicTrack, XCommunity, GrokGalleryItem, SocialFeedAccount } from "@/components/builder/WireframeRenderer";
import type { WireframeLayout } from "@/components/builder/WireframeBuilder";
import BuilderGate from "@/components/builder/BuilderGate";
import StoreNav from "@/components/StoreNav";

const RESERVED = new Set([
  "console", "login", "signup", "admin", "api", "stores", "products",
  "builder", "builder-popup", "build", "studio", "playground",
  "onboarding", "maintenance", "eula", "privacy", "terms",
  "sitemap.xml", "robots.txt", "favicon.ico",
]);

export async function generateStaticParams() {
  try {
    const profiles = await getAllCreatorProfiles();
    return profiles
      .filter((p) => !RESERVED.has(p.x_username))
      .map((p) => ({ creator: p.x_username }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ creator: string }>;
}) {
  const { creator } = await params;
  if (RESERVED.has(creator.toLowerCase())) return {};
  const profile = await getCreatorProfile(creator.toLowerCase());
  if (!profile) return { title: "Creator Not Found" };
  const desc = profile.bio?.replace(/<[^>]*>/g, "").slice(0, 160) || `Check out @${profile.x_username} on RareImagery`;
  return {
    title: `@${profile.x_username} | RareImagery`,
    description: desc,
    openGraph: {
      title: `@${profile.x_username} | RareImagery`,
      description: desc,
      images: profile.profile_picture_url ? [{ url: profile.profile_picture_url, width: 400, height: 400 }] : [],
    },
    twitter: {
      card: "summary",
      title: `@${profile.x_username} | RareImagery`,
      description: desc,
      images: profile.profile_picture_url ? [profile.profile_picture_url] : [],
    },
  };
}

export default async function CreatorLandingPage({
  params,
}: {
  params: Promise<{ creator: string }>;
}) {
  const { creator } = await params;
  const normalized = creator.toLowerCase();

  if (RESERVED.has(normalized)) {
    notFound();
  }

  const [profile, products, publishedBuilds, storeData] = await Promise.all([
    getCreatorProfile(normalized, { noStore: true }),
    getProductsByStoreSlug(normalized),
    getPublishedBuilds(normalized),
    (async (): Promise<{ favorites: FavoriteCreator[]; articles: XArticle[]; musicTracks: MusicTrack[]; communities: XCommunity[]; grokGallery: GrokGalleryItem[]; socialFeeds: SocialFeedAccount[] }> => {
      try {
        const res = await fetch(
          `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(normalized)}&fields[commerce_store--online]=field_my_favorites,field_x_articles,field_music_player,field_x_communities,field_grok_gallery,field_social_feeds`,
          { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
        );
        if (!res.ok) return { favorites: [], articles: [], musicTracks: [], communities: [], grokGallery: [], socialFeeds: [] };
        const json = await res.json();
        const attrs = json.data?.[0]?.attributes ?? {};
        let favorites: FavoriteCreator[] = [];
        let articles: XArticle[] = [];
        let musicTracks: MusicTrack[] = [];
        let communities: XCommunity[] = [];
        try { favorites = JSON.parse(attrs.field_my_favorites || "[]"); } catch {}
        try { articles = JSON.parse(attrs.field_x_articles || "[]"); } catch {}
        try { musicTracks = JSON.parse(attrs.field_music_player || "[]"); } catch {}
        try { communities = JSON.parse(attrs.field_x_communities || "[]"); } catch {}
        let grokGallery: GrokGalleryItem[] = [];
        let socialFeeds: SocialFeedAccount[] = [];
        try { grokGallery = JSON.parse(attrs.field_grok_gallery || "[]"); } catch {}
        try { socialFeeds = JSON.parse(attrs.field_social_feeds || "[]"); } catch {}
        return { favorites, articles, musicTracks, communities, grokGallery, socialFeeds };
      } catch { return { favorites: [], articles: [], musicTracks: [], communities: [], grokGallery: [], socialFeeds: [] }; }
    })(),
  ]);

  if (!profile) {
    notFound();
  }

  // Check for published wireframe layout
  const wireframeBuild = (() => {
    for (const build of publishedBuilds) {
      try {
        const parsed = JSON.parse(build.code);
        if (parsed?.schemaVersion === 1 && parsed?.type === "wireframe" && parsed?.layout) {
          return { layout: parsed.layout as WireframeLayout, colorScheme: parsed.colorScheme as string | undefined, pageBackground: parsed.pageBackground as string | undefined };
        }
      } catch { /* not wireframe JSON */ }
    }
    return null;
  })();
  const wireframeLayout = wireframeBuild?.layout ?? null;

  // If there's a published wireframe, render it as the main page
  if (wireframeLayout) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <StoreNav creator={normalized} />
        <div className="pt-14">
        <WireframeRenderer
          layout={wireframeLayout}
          profile={profile}
          products={products}
          favorites={storeData.favorites}
          articles={storeData.articles}
          musicTracks={storeData.musicTracks}
          communities={storeData.communities}
          grokGallery={storeData.grokGallery}
          socialFeeds={storeData.socialFeeds}
          colorScheme={wireframeBuild?.colorScheme}
          pageBackground={wireframeBuild?.pageBackground}
          basePath={normalized}
        />
        <BuilderGate storeSlug={normalized} />
        </div>
      </div>
    );
  }

  // Fallback: static profile landing page
  const hasStore = profile.store_status === "approved" && products.length > 0;
  const bio = profile.bio?.replace(/<[^>]*>/g, "") || "";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <StoreNav creator={normalized} />
      <div className="pt-14" />
      {/* Banner */}
      <div className="relative h-48 sm:h-64 w-full bg-zinc-900 overflow-hidden">
        {profile.banner_url && (
          <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
      </div>

      {/* Profile */}
      <div className="relative mx-auto max-w-2xl px-4 sm:px-6">
        <div className="-mt-16 sm:-mt-20 flex flex-col items-center text-center">
          <div className="h-28 w-28 sm:h-36 sm:w-36 rounded-full border-4 border-zinc-950 overflow-hidden bg-zinc-800">
            {profile.profile_picture_url ? (
              <img src={profile.profile_picture_url} alt={`@${profile.x_username}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-zinc-500">
                {profile.x_username[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <h1 className="mt-4 text-2xl sm:text-3xl font-bold">
            {profile.title || `@${profile.x_username}`}
          </h1>

          <a href={`https://x.com/${profile.x_username}`} target="_blank" rel="noopener noreferrer"
            className="mt-1 text-sm text-indigo-400 hover:text-indigo-300">
            @{profile.x_username}
          </a>

          {bio && <p className="mt-4 max-w-md text-sm text-zinc-400 leading-relaxed">{bio}</p>}

          {/* Stats */}
          <div className="mt-6 flex gap-8 text-center">
            {profile.follower_count > 0 && (
              <div>
                <p className="text-lg font-semibold">
                  {profile.follower_count >= 1000 ? `${(profile.follower_count / 1000).toFixed(1)}K` : profile.follower_count}
                </p>
                <p className="text-xs text-zinc-500">Followers</p>
              </div>
            )}
            {profile.top_posts.length > 0 && (
              <div>
                <p className="text-lg font-semibold">{profile.top_posts.length}</p>
                <p className="text-xs text-zinc-500">Posts</p>
              </div>
            )}
            {hasStore && (
              <div>
                <p className="text-lg font-semibold">{products.length}</p>
                <p className="text-xs text-zinc-500">Products</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            {hasStore && (
              <Link href={`/${normalized}/store` as Route}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500">
                Shop Now
              </Link>
            )}
            <Link href={`/${normalized}/donate` as Route}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-900">
              Support
            </Link>
            <a href={`https://x.com/${profile.x_username}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-900">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Follow on X
            </a>
          </div>
        </div>

        {/* Recent Posts */}
        {profile.top_posts.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-4 text-lg font-semibold text-zinc-300">Recent Posts</h2>
            <div className="space-y-3">
              {profile.top_posts.slice(0, 5).map((post) => (
                <div key={post.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{post.text}</p>
                  {post.image_url && (
                    <img src={post.image_url} alt="" className="mt-3 rounded-lg max-h-64 object-cover" />
                  )}
                  {post.date && (
                    <p className="mt-2 text-xs text-zinc-600">{new Date(post.date).toLocaleDateString()}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Product Preview */}
        {hasStore && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-300">Shop</h2>
              <Link href={`/${normalized}/store` as Route} className="text-sm text-indigo-400 hover:text-indigo-300">
                View all &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {products.slice(0, 3).map((product) => (
                <Link key={product.id} href={`/${normalized}/store` as Route}
                  className="group rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden transition hover:border-zinc-700">
                  <div className="aspect-square bg-zinc-800 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-600">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-zinc-200 truncate">{product.title}</p>
                    <p className="text-sm text-indigo-400">${parseFloat(product.price).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-16 mb-8 text-center">
          <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">
            Powered by RareImagery
          </Link>
        </div>
      </div>

      <BuilderGate storeSlug={normalized} />
    </div>
  );
}
