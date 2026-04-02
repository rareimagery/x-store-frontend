export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Metadata } from "next";
import {
  getCreatorProfile,
  getProductsByStoreSlug,
} from "@/lib/drupal";
import { getPublishedBuilds } from "@/lib/drupalBuilds";
import WireframeRenderer from "@/components/builder/WireframeRenderer";
import type { FavoriteCreator, XArticle, MusicTrack, XCommunity, GrokGalleryItem, SocialFeedAccount } from "@/components/builder/WireframeRenderer";
import type { WireframeLayout } from "@/components/builder/WireframeBuilder";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";
import BuilderGate from "@/components/builder/BuilderGate";
import CreatorPageHeader from "@/components/CreatorPageHeader";

export const metadata: Metadata = {
  title: "xAI Store | RareImagery",
  description: "Official xAI and Grok merch — tees, hoodies, hats, and more. Built to understand the universe.",
};

function productSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default async function XaiStorePage() {
  const [profile, products, publishedBuilds, storeData] = await Promise.all([
    getCreatorProfile("xai", { noStore: true }),
    getProductsByStoreSlug("xai"),
    getPublishedBuilds("xai"),
    (async (): Promise<{ favorites: FavoriteCreator[]; articles: XArticle[]; musicTracks: MusicTrack[]; communities: XCommunity[]; grokGallery: GrokGalleryItem[]; socialFeeds: SocialFeedAccount[] }> => {
      try {
        const res = await fetch(
          `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=xai&fields[commerce_store--online]=field_my_favorites,field_x_articles,field_music_player,field_x_communities,field_grok_gallery,field_social_feeds`,
          { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
        );
        if (!res.ok) return { favorites: [], articles: [], musicTracks: [], communities: [], grokGallery: [], socialFeeds: [] };
        const json = await res.json();
        const attrs = json.data?.[0]?.attributes ?? {};
        let favorites: FavoriteCreator[] = [];
        let articles: XArticle[] = [];
        let musicTracks: MusicTrack[] = [];
        let communities: XCommunity[] = [];
        let grokGallery: GrokGalleryItem[] = [];
        let socialFeeds: SocialFeedAccount[] = [];
        try { favorites = JSON.parse(attrs.field_my_favorites || "[]"); } catch {}
        try { articles = JSON.parse(attrs.field_x_articles || "[]"); } catch {}
        try { musicTracks = JSON.parse(attrs.field_music_player || "[]"); } catch {}
        try { communities = JSON.parse(attrs.field_x_communities || "[]"); } catch {}
        try { grokGallery = JSON.parse(attrs.field_grok_gallery || "[]"); } catch {}
        try { socialFeeds = JSON.parse(attrs.field_social_feeds || "[]"); } catch {}
        return { favorites, articles, musicTracks, communities, grokGallery, socialFeeds };
      } catch { return { favorites: [], articles: [], musicTracks: [], communities: [], grokGallery: [], socialFeeds: [] }; }
    })(),
  ]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold">xAI Store</h1>
          <p className="mt-2 text-zinc-500">Coming soon.</p>
          <Link href="/" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300">Back to RareImagery</Link>
        </div>
      </div>
    );
  }

  // Check for wireframe
  const wireframeBuild = (() => {
    for (const build of publishedBuilds) {
      try {
        const parsed = JSON.parse(build.code);
        if (parsed?.schemaVersion === 1 && parsed?.type === "wireframe" && parsed?.layout) {
          return { layout: parsed.layout as WireframeLayout, colorScheme: parsed.colorScheme as string | undefined };
        }
      } catch {}
    }
    return null;
  })();

  // If wireframe exists, render it
  if (wireframeBuild) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <WireframeRenderer
          layout={wireframeBuild.layout}
          profile={profile}
          products={products}
          favorites={storeData.favorites}
          articles={storeData.articles}
          musicTracks={storeData.musicTracks}
          communities={storeData.communities}
          grokGallery={storeData.grokGallery}
          socialFeeds={storeData.socialFeeds}
          colorScheme={wireframeBuild.colorScheme}
        />
        <BuilderGate storeSlug="xai" />
      </div>
    );
  }

  // Fallback: product grid store
  return (
    <div className="min-h-screen bg-black text-white">
      <CreatorPageHeader profile={profile} activePage="store" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <h2 className="text-lg font-semibold mb-6">{products.length} Products</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${productSlug(product.title)}`}
              className="group rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden transition hover:border-zinc-600"
            >
              {product.image_url ? (
                <div className="aspect-square overflow-hidden">
                  <img src={product.image_url} alt={product.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                </div>
              ) : (
                <div className="aspect-square flex items-center justify-center bg-zinc-800">
                  <svg className="h-10 w-10 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
              )}
              <div className="p-3">
                <h3 className="text-sm font-medium text-white truncate">{product.title}</h3>
                {product.description && <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{product.description}</p>}
                <p className="mt-1 text-sm font-semibold text-indigo-400">${parseFloat(product.price).toFixed(2)}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Official link-back */}
        <div className="mt-16 rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-lg text-zinc-300">Want the exact same drop straight from xAI?</p>
          <a
            href="https://shop.x.com/?utm_source=rareimagery&utm_medium=marketplace"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Shop official xAI &rarr; shop.x.com
          </a>
        </div>
      </div>

      <BuilderGate storeSlug="xai" />
    </div>
  );
}
