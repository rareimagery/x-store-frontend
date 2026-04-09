import Link from "next/link";
import { notFound } from "next/navigation";
import { getCreatorProfile, DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";
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

interface GalleryItem {
  id: string;
  url: string;
  prompt: string;
  type: "image" | "video";
  created_at: string;
  product_type?: string;
}

async function getGallery(slug: string): Promise<GalleryItem[]> {
  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_grok_gallery`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const raw = json.data?.[0]?.attributes?.field_grok_gallery;
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
    title: `@${profile.x_username}'s Grok Library | RareImagery`,
    description: `AI-generated images and videos by @${profile.x_username}`,
  };
}

export default async function GalleryPage({ params }: { params: Promise<{ creator: string }> }) {
  const { creator } = await params;
  const normalized = creator.toLowerCase();
  if (RESERVED.has(normalized)) notFound();

  const [profile, gallery, theme] = await Promise.all([
    getCreatorProfile(normalized, { noStore: true }),
    getGallery(normalized),
    getStoreTheme(normalized),
  ]);

  if (!profile) notFound();

  const images = gallery.filter((g) => g.type === "image");
  const videos = gallery.filter((g) => g.type === "video");

  return (
    <>
    <StoreNav creator={normalized} />
    <ThemedPage colorScheme={theme.colorScheme} pageBackground={theme.pageBackground}>
      <div className="pt-14" />
      <CreatorPageHeader profile={profile} activePage="gallery" basePath={normalized} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Grok Library</h2>
            <p className="text-sm text-zinc-500 mt-1">
              {gallery.length} AI-generated {gallery.length === 1 ? "creation" : "creations"}
              {images.length > 0 && videos.length > 0 && ` — ${images.length} images, ${videos.length} videos`}
            </p>
          </div>
        </div>

        {gallery.length === 0 ? (
          <p className="text-center text-zinc-500 py-16">No creations yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {gallery.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden transition hover:border-zinc-600"
              >
                {/* Media */}
                {item.type === "video" ? (
                  <div className="relative aspect-square">
                    <video
                      src={item.url}
                      className="h-full w-full object-cover"
                      muted
                      loop
                      playsInline
                      preload="metadata"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[9px] text-white font-medium">
                      <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      Video
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square">
                    <img src={item.url} alt={item.prompt} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                  {item.prompt && (
                    <p className="text-[11px] text-white leading-relaxed line-clamp-3 mb-2">{item.prompt}</p>
                  )}
                  <div className="flex items-center gap-1.5">
                    <a
                      href={item.url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-white/20 backdrop-blur-sm px-2 py-1 text-[9px] text-white hover:bg-white/30 transition"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="h-2.5 w-2.5 inline mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                      Save
                    </a>
                    <a
                      href={`https://x.com/intent/tweet?${new URLSearchParams({
                        text: `Check out this AI creation by @${profile.x_username} on RareImagery`,
                        url: item.url,
                      }).toString()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-white/20 backdrop-blur-sm px-2 py-1 text-[9px] text-white hover:bg-white/30 transition"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 inline mr-0.5" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                      Share
                    </a>
                    {item.created_at && (
                      <span className="text-[9px] text-white/60 ml-auto">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400">
            Powered by RareImagery
          </Link>
        </div>
      </div>
    </ThemedPage>
    </>
  );
}
