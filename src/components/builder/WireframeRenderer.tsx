import type { PlacedBlock, WireframeLayout } from "./WireframeBuilder";
import type { CreatorProfile, Product } from "@/lib/drupal";
import DonationCampaignCard from "@/components/DonationCampaign";
import type { DonationCampaign } from "@/app/api/donations/route";
import StorePlayer from "@/components/StorePlayer";

export interface FavoriteCreator {
  username: string;
  display_name: string;
  bio: string;
  profile_image_url: string | null;
  follower_count: number;
  verified: boolean;
}

export interface XArticle {
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

interface WireframeRendererProps {
  layout: WireframeLayout;
  profile: CreatorProfile;
  products: Product[];
  favorites?: FavoriteCreator[];
  articles?: XArticle[];
}

/* ------------------------------------------------------------------ */
/*  Block Renderers                                                    */
/* ------------------------------------------------------------------ */

function HeroBanner({ block, profile }: { block: PlacedBlock; profile: CreatorProfile }) {
  const { heading, subheading, cta_text, cta_url } = block.props;
  const bgUrl = (block.props.background_image_url as string) || profile.banner_url;
  return (
    <div
      className="relative rounded-xl overflow-hidden bg-zinc-800 p-8 sm:p-12 text-center"
      style={
        bgUrl
          ? { backgroundImage: `url(${bgUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
          : undefined
      }
    >
      {bgUrl && <div className="absolute inset-0 bg-black/50" />}
      <div className="relative z-10">
        {heading && <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{String(heading)}</h2>}
        {subheading && <p className="text-sm sm:text-base text-zinc-300 mb-6">{String(subheading)}</p>}
        {cta_text && cta_url && (
          <a
            href={String(cta_url)}
            className="inline-block rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition"
          >
            {String(cta_text)}
          </a>
        )}
      </div>
    </div>
  );
}

function StillBuilding({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 p-6 text-center">
      <svg className="h-6 w-6 text-zinc-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.22-3.58a1.5 1.5 0 010-2.47l5.22-3.58a1.5 1.5 0 012.16 1.24v7.17a1.5 1.5 0 01-2.16 1.24zM20.25 12a.75.75 0 01-.75.75H16.5a.75.75 0 010-1.5h3a.75.75 0 01.75.75z" />
      </svg>
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="text-[10px] text-zinc-600 mt-1">Still building</p>
    </div>
  );
}

function TextBlock({ block }: { block: PlacedBlock }) {
  const { heading, body_text } = block.props;
  if (!heading && !body_text) return <StillBuilding label="Text Block" />;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      {heading && <h3 className="text-lg font-semibold text-white mb-2">{String(heading)}</h3>}
      {body_text && (
        <div className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{String(body_text)}</div>
      )}
    </div>
  );
}

function CtaSection({ block }: { block: PlacedBlock }) {
  const { heading, body_text, cta_text, cta_url, background_color } = block.props;
  if (!heading && !cta_text) return <StillBuilding label="Call to Action" />;
  return (
    <div
      className="rounded-xl p-6 text-center"
      style={{ backgroundColor: (background_color as string) || "#1e1b4b" }}
    >
      {heading && <h3 className="text-lg font-bold text-white mb-2">{String(heading)}</h3>}
      {body_text && <p className="text-sm text-zinc-300 mb-4">{String(body_text)}</p>}
      {cta_text && (
        <a
          href={String(cta_url || "#")}
          className="inline-block rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 transition"
        >
          {String(cta_text)}
        </a>
      )}
    </div>
  );
}

function VideoEmbed({ block }: { block: PlacedBlock }) {
  const { video_url, heading } = block.props;
  let embedUrl = String(video_url || "");
  const ytMatch = embedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;

  if (!embedUrl) return <StillBuilding label="Video Embed" />;

  return (
    <div className="rounded-xl overflow-hidden border border-zinc-800">
      {heading && <p className="px-4 pt-3 text-sm font-medium text-zinc-300">{String(heading)}</p>}
      <div className="aspect-video">
        <iframe
          src={embedUrl}
          className="h-full w-full"
          allowFullScreen
          title={String(heading || "Video")}
        />
      </div>
    </div>
  );
}

function Testimonial({ block }: { block: PlacedBlock }) {
  const { quote_text, author_name, author_handle } = block.props;
  if (!quote_text && !author_name) return <StillBuilding label="Testimonial" />;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      {quote_text && (
        <blockquote className="text-sm text-zinc-300 italic leading-relaxed mb-3">
          &ldquo;{String(quote_text)}&rdquo;
        </blockquote>
      )}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-xs font-bold text-indigo-400">
          {String(author_name || "?")[0]?.toUpperCase()}
        </div>
        <div>
          {author_name && <p className="text-xs font-medium text-white">{String(author_name)}</p>}
          {author_handle && <p className="text-[10px] text-zinc-500">@{String(author_handle)}</p>}
        </div>
      </div>
    </div>
  );
}

function ProductGrid({ block, products }: { block: PlacedBlock; products: Product[] }) {
  const maxItems = Number(block.props.max_items) || 6;
  const cols = Number(block.props.gallery_columns) || 2;
  const heading = block.props.heading;
  const shown = products.slice(0, maxItems);

  return (
    <div>
      {heading && <h3 className="text-lg font-semibold text-white mb-3">{String(heading)}</h3>}
      <div className={`grid gap-3 ${cols === 3 ? "grid-cols-3" : cols === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {shown.map((p) => (
          <div key={p.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            {p.image_url && (
              <div className="aspect-square bg-zinc-800">
                <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="p-3">
              <p className="text-xs font-medium text-zinc-200 truncate">{p.title}</p>
              <p className="text-xs text-indigo-400">${parseFloat(p.price).toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SocialFeed({ block, profile }: { block: PlacedBlock; profile: CreatorProfile }) {
  const maxItems = Number(block.props.max_items) || 5;
  const heading = block.props.heading;
  const posts = (profile.top_posts || []).slice(0, maxItems);

  return (
    <div>
      {heading && <h3 className="text-lg font-semibold text-white mb-3">{String(heading)}</h3>}
      <div className="space-y-2">
        {posts.map((post) => (
          <div key={post.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{post.text}</p>
          </div>
        ))}
        {posts.length === 0 && (
          <p className="text-xs text-zinc-600">No posts yet</p>
        )}
      </div>
    </div>
  );
}

function Spacer({ block }: { block: PlacedBlock }) {
  const height = Number(block.props.spacer_height) || 40;
  return <div style={{ height }} />;
}

function Newsletter({ block }: { block: PlacedBlock }) {
  const { heading, body_text, cta_text } = block.props;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-center">
      {heading && <h3 className="text-lg font-semibold text-white mb-1">{String(heading)}</h3>}
      {body_text && <p className="text-xs text-zinc-400 mb-3">{String(body_text)}</p>}
      <div className="flex gap-2 max-w-xs mx-auto">
        <input
          type="email"
          placeholder="you@email.com"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500"
          readOnly
        />
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">
          {String(cta_text || "Subscribe")}
        </button>
      </div>
    </div>
  );
}

function ImageGallery({ block }: { block: PlacedBlock }) {
  const { heading } = block.props;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      {heading && <h3 className="text-lg font-semibold text-white mb-3">{String(heading)}</h3>}
      <div className="flex items-center justify-center h-32 text-xs text-zinc-600">
        Image gallery — upload images in Drupal
      </div>
    </div>
  );
}

function DonationBlock({ block }: { block: PlacedBlock }) {
  const suggestedRaw = String(block.props.suggested_amounts || "5,10,25,50,100");
  const suggestedAmounts = suggestedRaw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => n > 0);

  const campaign: DonationCampaign = {
    id: block.instanceId,
    drupalId: 0,
    title: String(block.props.heading || "Support This Campaign"),
    description: String(block.props.body_text || ""),
    goalAmount: Number(block.props.goal_amount) || 1000,
    raisedAmount: 0,
    donorCount: 0,
    imageUrl: (block.props.campaign_image_url as string) || null,
    category: null,
    endDate: null,
    minDonation: 1,
    suggestedAmounts,
    donorWallEnabled: true,
    allowAnonymous: true,
    thankYouMessage: null,
    storeSlug: "",
    creatorUsername: "",
  };

  return <DonationCampaignCard campaign={campaign} />;
}

function MusicPlayerBlock({ block }: { block: PlacedBlock }) {
  const url = String(block.props.music_url || "");
  const heading = block.props.heading;

  if (!url) return <StillBuilding label="Music Player" />;

  return (
    <div>
      {heading && <h3 className="text-lg font-semibold text-white mb-3">{String(heading)}</h3>}
      <StorePlayer url={url} theme="dark" />
    </div>
  );
}

function XArticlesBlock({ block, articles }: { block: PlacedBlock; articles: XArticle[] }) {
  const maxItems = Number(block.props.max_items) || 5;
  const heading = block.props.heading;
  const shown = articles.slice(0, maxItems);

  if (shown.length === 0) return <StillBuilding label="X Articles" />;

  return (
    <div>
      {heading && <h3 className="text-lg font-semibold text-white mb-3">{String(heading)}</h3>}
      <div className="space-y-3">
        {shown.map((article) => (
          <a
            key={article.id}
            href={article.x_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden transition hover:border-zinc-600"
          >
            {article.image_url && (
              <img src={article.image_url} alt="" className="w-full h-32 object-cover" />
            )}
            <div className="p-3">
              <h4 className="text-sm font-semibold text-white line-clamp-2">{article.title}</h4>
              <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{article.intro}</p>
              <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-500">
                {article.date && <span>{new Date(article.date).toLocaleDateString()}</span>}
                {article.likes > 0 && <span>{article.likes} likes</span>}
                <span className="text-indigo-400">Read on X &rarr;</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function MyFavorites({ block, favorites, creatorUsername }: { block: PlacedBlock; favorites: FavoriteCreator[]; creatorUsername: string }) {
  const maxItems = Math.min(Number(block.props.max_items) || 10, 10);
  const heading = block.props.heading;
  const shown = favorites.slice(0, maxItems);

  if (shown.length === 0) return <StillBuilding label="My Favorites" />;

  return (
    <div>
      {heading && <h3 className="text-lg font-semibold text-white mb-3">{String(heading)}</h3>}
      <div className="space-y-2">
        {shown.map((fav) => (
          <a
            key={fav.username}
            href={`https://x.com/${fav.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-zinc-600"
          >
            {fav.profile_image_url ? (
              <img src={fav.profile_image_url} alt={`@${fav.username}`} className="h-10 w-10 rounded-full object-cover shrink-0" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-bold text-indigo-400 shrink-0">
                {fav.display_name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-white truncate">{fav.display_name}</p>
                {fav.verified && (
                  <svg className="h-3.5 w-3.5 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <p className="text-[11px] text-zinc-500">@{fav.username}</p>
              {fav.bio && (
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed line-clamp-2">{fav.bio}</p>
              )}
            </div>
          </a>
        ))}
      </div>
      {favorites.length > maxItems && (
        <a
          href={`/${creatorUsername}/favorites`}
          className="mt-3 block text-center text-xs text-indigo-400 hover:text-indigo-300"
        >
          View all {favorites.length} favorites &rarr;
        </a>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Block Router                                                       */
/* ------------------------------------------------------------------ */

function RenderBlock({
  block,
  profile,
  products,
  favorites,
  articles,
}: {
  block: PlacedBlock;
  profile: CreatorProfile;
  products: Product[];
  favorites: FavoriteCreator[];
  articles: XArticle[];
}) {
  switch (block.type) {
    case "hero_banner": return <HeroBanner block={block} profile={profile} />;
    case "text_block": return <TextBlock block={block} />;
    case "cta_section": return <CtaSection block={block} />;
    case "video_embed": return <VideoEmbed block={block} />;
    case "testimonial": return <Testimonial block={block} />;
    case "product_grid": return <ProductGrid block={block} products={products} />;
    case "social_feed": return <SocialFeed block={block} profile={profile} />;
    case "spacer": return <Spacer block={block} />;
    case "newsletter": return <Newsletter block={block} />;
    case "image_gallery": return <ImageGallery block={block} />;
    case "donation": return <DonationBlock block={block} />;
    case "music_player": return <MusicPlayerBlock block={block} />;
    case "x_articles": return <XArticlesBlock block={block} articles={articles} />;
    case "my_favorites": return <MyFavorites block={block} favorites={favorites} creatorUsername={profile.x_username} />;
    default:
      return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-xs text-zinc-500">
          Unknown block: {block.type}
        </div>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Layout Renderer                                                    */
/* ------------------------------------------------------------------ */

export default function WireframeRenderer({ layout, profile, products, favorites = [], articles = [] }: WireframeRendererProps) {
  const hasLeft = layout.left.length > 0;
  const hasRight = layout.right.length > 0;
  const bio = profile.bio?.replace(/<[^>]*>/g, "") || "";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ── X-style profile header ── */}
      <div className="relative h-48 sm:h-64 w-full bg-zinc-900 overflow-hidden">
        {profile.banner_url && (
          <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="-mt-16 sm:-mt-20 flex items-end gap-4">
          <div className="h-28 w-28 sm:h-36 sm:w-36 shrink-0 rounded-full border-4 border-zinc-950 overflow-hidden bg-zinc-800">
            {profile.profile_picture_url ? (
              <img src={profile.profile_picture_url} alt={`@${profile.x_username}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-zinc-500">
                {profile.x_username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="pb-1">
            <h1 className="text-2xl sm:text-3xl font-bold">{profile.title || `@${profile.x_username}`}</h1>
            <a
              href={`https://x.com/${profile.x_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              @{profile.x_username}
            </a>
          </div>
        </div>

        {bio && (
          <p className="mt-4 max-w-xl text-sm text-zinc-400 leading-relaxed">{bio}</p>
        )}

        {profile.follower_count > 0 && (
          <div className="mt-3 flex gap-6 text-sm text-zinc-500">
            <span><strong className="text-white">{profile.follower_count >= 1000 ? `${(profile.follower_count / 1000).toFixed(1)}K` : profile.follower_count}</strong> Followers</span>
            {profile.top_posts.length > 0 && (
              <span><strong className="text-white">{profile.top_posts.length}</strong> Posts</span>
            )}
          </div>
        )}

        {/* ── 3-column wireframe blocks ── */}
        <div className="mt-8 pb-12 flex gap-6">
          {hasLeft && (
            <div className="w-1/4 space-y-4">
              {layout.left.map((block) => (
                <RenderBlock key={block.instanceId} block={block} profile={profile} products={products} favorites={favorites} articles={articles} />
              ))}
            </div>
          )}

          <div className={`space-y-4 ${hasLeft && hasRight ? "w-1/2" : hasLeft || hasRight ? "w-3/4" : "w-full"}`}>
            {layout.center.map((block) => (
              <RenderBlock key={block.instanceId} block={block} profile={profile} products={products} favorites={favorites} articles={articles} />
            ))}
          </div>

          {hasRight && (
            <div className="w-1/4 space-y-4">
              {layout.right.map((block) => (
                <RenderBlock key={block.instanceId} block={block} profile={profile} products={products} favorites={favorites} articles={articles} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
