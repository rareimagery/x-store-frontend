import Link from "next/link";
import { notFound } from "next/navigation";
import { getCreatorProfile, DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";
import CreatorPageHeader from "@/components/CreatorPageHeader";

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
    title: `@${profile.x_username}'s Gallery | RareImagery`,
    description: `AI-generated art by @${profile.x_username}`,
  };
}

export default async function GalleryPage({ params }: { params: Promise<{ creator: string }> }) {
  const { creator } = await params;
  const normalized = creator.toLowerCase();
  if (RESERVED.has(normalized)) notFound();

  const [profile, gallery] = await Promise.all([
    getCreatorProfile(normalized, { noStore: true }),
    getGallery(normalized),
  ]);

  if (!profile) notFound();

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <CreatorPageHeader profile={profile} activePage="gallery" />

      <div className="mx-auto max-w-4xl px-4 py-8">
        <h2 className="text-lg font-semibold mb-4">{gallery.length} AI-generated {gallery.length === 1 ? "creation" : "creations"}</h2>

        {gallery.length === 0 ? (
          <p className="text-center text-zinc-500 py-12">No creations yet.</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {gallery.map((item) => (
              <div key={item.id} className="group relative rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                {item.type === "video" ? (
                  <video
                    src={item.url}
                    className="aspect-square w-full object-cover"
                    controls
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img src={item.url} alt={item.prompt} className="aspect-square w-full object-cover" loading="lazy" />
                )}
                <div className="p-3">
                  <p className="text-xs text-zinc-300 line-clamp-2">{item.prompt}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <a
                      href={`https://x.com/intent/tweet?${new URLSearchParams({
                        text: `Check out this AI creation by @${profile.x_username} on RareImagery`,
                        url: item.url,
                      }).toString()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-1 text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-700 transition"
                    >
                      <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                      Share
                    </a>
                    <span className="text-[10px] text-zinc-600">
                      {item.type === "video" ? "Video" : "Image"}
                      {item.created_at ? ` · ${new Date(item.created_at).toLocaleDateString()}` : ""}
                    </span>
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
    </div>
  );
}
