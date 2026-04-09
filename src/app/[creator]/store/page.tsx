export const dynamic = "force-dynamic";

import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import {
  getCreatorProfile,
  getProductsByStoreSlug,
} from "@/lib/drupal";
import BuilderGate from "@/components/builder/BuilderGate";
import CreatorPageHeader from "@/components/CreatorPageHeader";
import StoreNav from "@/components/StoreNav";
import ThemedPage from "@/components/ThemedPage";
import { getStoreTheme } from "@/lib/storeTheme";

const RESERVED = new Set([
  "console", "login", "signup", "admin", "api", "stores", "products",
  "builder", "builder-popup", "build", "studio", "playground",
  "onboarding", "maintenance", "eula", "privacy", "terms",
  "sitemap.xml", "robots.txt", "favicon.ico",
]);

function productSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ creator: string }>;
}) {
  const { creator } = await params;
  if (RESERVED.has(creator.toLowerCase())) return {};
  const profile = await getCreatorProfile(creator.toLowerCase());
  if (!profile) return { title: "Store Not Found" };
  return {
    title: `@${profile.x_username} Store | RareImagery`,
    description: `Shop @${profile.x_username}'s store on RareImagery`,
    openGraph: {
      title: `@${profile.x_username} Store | RareImagery`,
      description: `Shop @${profile.x_username}'s store on RareImagery`,
      images: profile.profile_picture_url ? [{ url: profile.profile_picture_url, width: 400, height: 400 }] : [],
    },
    twitter: {
      card: "summary",
      images: profile.profile_picture_url ? [profile.profile_picture_url] : [],
    },
  };
}

export default async function CreatorStorePage({
  params,
}: {
  params: Promise<{ creator: string }>;
}) {
  const { creator } = await params;
  const normalized = creator.toLowerCase();

  if (RESERVED.has(normalized)) {
    notFound();
  }

  const [profile, products, theme] = await Promise.all([
    getCreatorProfile(normalized, { noStore: true }),
    getProductsByStoreSlug(normalized),
    getStoreTheme(normalized),
  ]);

  if (!profile) {
    notFound();
  }

  if (profile.store_status !== "approved") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="max-w-md text-center px-6">
          <h1 className="mb-3 text-2xl font-bold">Store Coming Soon</h1>
          <p className="mb-2 text-zinc-400">
            @{profile.x_username}&apos;s store is being set up.
          </p>
          <Link href={`/${profile.x_username}` as Route} className="text-sm text-indigo-400 hover:text-indigo-300">
            &larr; Back to profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
    <StoreNav creator={normalized} />
    <ThemedPage colorScheme={theme.colorScheme} pageBackground={theme.pageBackground}>
      <div className="pt-14" />
      <CreatorPageHeader profile={profile} activePage="store" basePath={normalized} />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{products.length} {products.length === 1 ? "Product" : "Products"}</h2>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20">
            <svg className="mx-auto h-16 w-16 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="mt-4 text-zinc-500">No products yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${productSlug(product.title)}` as Route}
                className="group rounded-xl border wf-card overflow-hidden transition hover:border-zinc-600"
              >
                {product.image_url ? (
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="aspect-square flex items-center justify-center wf-card">
                    <svg className="h-10 w-10 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-sm font-medium truncate">{product.title}</h3>
                  {product.description && (
                    <p className="mt-1 text-xs wf-muted line-clamp-2">{product.description}</p>
                  )}
                  <p className="mt-2 text-sm font-semibold wf-accent">${parseFloat(product.price).toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BuilderGate storeSlug={normalized} />
    </ThemedPage>
    </>
  );
}
