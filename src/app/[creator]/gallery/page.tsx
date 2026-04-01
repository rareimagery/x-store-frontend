import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { getCreatorProfile, DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

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
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link href={`/${profile.x_username}` as Route} className="text-sm text-indigo-400 hover:text-indigo-300">
          &larr; Back to profile
        </Link>

        <div className="mt-6 flex items-center gap-4">
          {profile.profile_picture_url && (
            <img src={profile.profile_picture_url} alt="" className="h-12 w-12 rounded-full object-cover" />
          )}
          <div>
            <h1 className="text-2xl font-bold">@{profile.x_username}&apos;s Gallery</h1>
            <p className="text-sm text-zinc-400">{gallery.length} AI-generated {gallery.length === 1 ? "creation" : "creations"}</p>
          </div>
        </div>

        {gallery.length === 0 ? (
          <p className="mt-12 text-center text-zinc-500">No creations yet.</p>
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
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-600">
                    <span>{item.type === "video" ? "Video" : "Image"}</span>
                    {item.product_type && <span>&middot; {item.product_type}</span>}
                    {item.created_at && <span>&middot; {new Date(item.created_at).toLocaleDateString()}</span>}
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
