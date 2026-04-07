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

interface XArticle {
  id: string;
  title: string;
  intro: string;
  x_url: string;
  image_url: string | null;
  date: string;
  likes: number;
  retweets: number;
  views: number;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

async function getArticles(slug: string): Promise<XArticle[]> {
  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_x_articles`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const raw = json.data?.[0]?.attributes?.field_x_articles;
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
    title: `@${profile.x_username}'s Articles | RareImagery`,
    description: `Long-form articles by @${profile.x_username}`,
  };
}

export default async function ArticlesPage({ params }: { params: Promise<{ creator: string }> }) {
  const { creator } = await params;
  const normalized = creator.toLowerCase();
  if (RESERVED.has(normalized)) notFound();

  const [profile, articles] = await Promise.all([
    getCreatorProfile(normalized, { noStore: true }),
    getArticles(normalized),
  ]);

  if (!profile) notFound();

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <CreatorPageHeader profile={profile} activePage="articles" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <h2 className="text-lg font-semibold mb-6">Articles by @{profile.x_username}</h2>

        {articles.length === 0 ? (
          <p className="text-center text-zinc-500 py-16">No articles yet.</p>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <a
                key={article.id}
                href={article.x_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden transition hover:border-zinc-600"
              >
                {article.image_url && (
                  <div className="w-48 shrink-0">
                    <img src={article.image_url} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex-1 p-4">
                  <h3 className="text-base font-semibold text-white mb-1 line-clamp-2">{article.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3 mb-3">{article.intro}</p>
                  <div className="flex items-center gap-4 text-xs text-zinc-600">
                    {article.date && (
                      <span>{new Date(article.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    )}
                    {article.likes > 0 && (
                      <span className="flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        {formatCount(article.likes)}
                      </span>
                    )}
                    {article.retweets > 0 && (
                      <span className="flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        {formatCount(article.retweets)}
                      </span>
                    )}
                    {article.views > 0 && (
                      <span>{formatCount(article.views)} views</span>
                    )}
                    <span className="text-indigo-400 ml-auto">Read on X &rarr;</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
