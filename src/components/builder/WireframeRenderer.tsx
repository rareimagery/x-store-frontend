import type { PlacedBlock, WireframeLayout } from "./WireframeBuilder";
import type { CreatorProfile, Product } from "@/lib/drupal";
import DonationCampaignCard from "@/components/DonationCampaign";
import type { DonationCampaign } from "@/app/api/donations/route";
import StorePlayer from "@/components/StorePlayer";
import MobileColumnLayout from "./MobileColumnLayout";

export interface FavoriteCreator {
  username: string;
  display_name: string;
  bio: string;
  profile_image_url: string | null;
  follower_count: number;
  verified: boolean;
  tags?: string[];
}

export interface SocialFeedAccount {
  id: string;
  platform: "tiktok" | "instagram" | "youtube";
  username: string;
  url: string;
  embed_url?: string;
}

export interface GrokGalleryItem {
  id: string;
  url: string;
  prompt: string;
  type: "image" | "video";
  created_at: string;
  product_type?: string;
}

export interface XCommunity {
  id: string;
  name: string;
  description: string;
  member_count: number;
  url: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  provider: "spotify" | "apple_music";
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
  musicTracks?: MusicTrack[];
  communities?: XCommunity[];
  grokGallery?: GrokGalleryItem[];
  socialFeeds?: SocialFeedAccount[];
  colorScheme?: string;
}

/* ------------------------------------------------------------------ */
/*  Block Renderers                                                    */
/* ------------------------------------------------------------------ */

function HeroBanner({ block, profile }: { block: PlacedBlock; profile: CreatorProfile }) {
  const { heading, subheading, cta_text, cta_url } = block.props;
  const bgUrl = (block.props.background_image_url as string) || profile.banner_url;
  return (
    <div
      className="relative rounded-xl overflow-hidden wf-card p-8 sm:p-12 text-center"
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed wf-border wf-card p-6 text-center">
      <svg className="h-6 w-6 wf-muted mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.22-3.58a1.5 1.5 0 010-2.47l5.22-3.58a1.5 1.5 0 012.16 1.24v7.17a1.5 1.5 0 01-2.16 1.24zM20.25 12a.75.75 0 01-.75.75H16.5a.75.75 0 010-1.5h3a.75.75 0 01.75.75z" />
      </svg>
      <p className="text-xs font-medium wf-muted">{label}</p>
      <p className="text-[10px] wf-muted mt-1">Still building</p>
    </div>
  );
}

function TextBlock({ block }: { block: PlacedBlock }) {
  const { heading, body_text } = block.props;
  if (!heading && !body_text) return <StillBuilding label="Text Block" />;
  return (
    <div className="rounded-xl border wf-card p-5">
      {heading && <h3 className="text-lg font-semibold text-white mb-2">{String(heading)}</h3>}
      {body_text && (
        <div className="text-sm wf-muted leading-relaxed whitespace-pre-wrap">{String(body_text)}</div>
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
    <div className="rounded-xl overflow-hidden border wf-border">
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
    <div className="rounded-xl border wf-card p-5">
      {quote_text && (
        <blockquote className="text-sm text-zinc-300 italic leading-relaxed mb-3">
          &ldquo;{String(quote_text)}&rdquo;
        </blockquote>
      )}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-xs font-bold wf-accent">
          {String(author_name || "?")[0]?.toUpperCase()}
        </div>
        <div>
          {author_name && <p className="text-xs font-medium text-white">{String(author_name)}</p>}
          {author_handle && <p className="text-[10px] wf-muted">@{String(author_handle)}</p>}
        </div>
      </div>
    </div>
  );
}

function productSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
          <a
            key={p.id}
            href={`/products/${productSlug(p.title)}`}
            className="group rounded-xl border wf-card overflow-hidden transition hover:border-zinc-600"
          >
            {p.image_url ? (
              <div className="aspect-square wf-card overflow-hidden">
                <img src={p.image_url} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-105" />
              </div>
            ) : (
              <div className="aspect-square wf-card flex items-center justify-center">
                <svg className="h-10 w-10 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            )}
            <div className="p-3">
              <p className="text-sm font-medium text-zinc-200 truncate">{p.title}</p>
              {p.description && (
                <p className="mt-1 text-xs wf-muted line-clamp-2">{p.description}</p>
              )}
              <p className="mt-1 text-sm font-semibold wf-accent">${parseFloat(p.price).toFixed(2)}</p>
            </div>
          </a>
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
      <div className="space-y-3">
        {posts.map((post) => (
          <a
            key={post.id}
            href={`https://x.com/${profile.x_username}/status/${post.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border wf-card overflow-hidden transition hover:border-zinc-600"
          >
            {post.image_url && (
              <div className="relative">
                <img src={post.image_url} alt="" className="w-full h-48 object-cover" />
                {/* Video play indicator — most posts with amplify_video_thumb are videos */}
                {post.image_url.includes("amplify_video") && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
                      <svg className="h-5 w-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                {profile.profile_picture_url && (
                  <img src={profile.profile_picture_url} alt="" className="h-5 w-5 rounded-full" />
                )}
                <span className="text-[11px] font-medium wf-muted">@{profile.x_username}</span>
                {post.date && (
                  <span className="text-[10px] wf-muted">{new Date(post.date).toLocaleDateString()}</span>
                )}
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{post.text}</p>
              <div className="mt-2 flex items-center gap-4 text-[10px] wf-muted">
                {post.likes > 0 && (
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    {post.likes}
                  </span>
                )}
                {post.retweets > 0 && (
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    {post.retweets}
                  </span>
                )}
                {post.views > 0 && (
                  <span>{post.views >= 1000 ? `${(post.views / 1000).toFixed(1)}K` : post.views} views</span>
                )}
              </div>
            </div>
          </a>
        ))}
        {posts.length === 0 && (
          <p className="text-xs wf-muted">No posts yet</p>
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
    <div className="rounded-xl border wf-card p-5 text-center">
      {heading && <h3 className="text-lg font-semibold text-white mb-1">{String(heading)}</h3>}
      {body_text && <p className="text-xs wf-muted mb-3">{String(body_text)}</p>}
      <div className="flex gap-2 max-w-xs mx-auto">
        <input
          type="email"
          placeholder="you@email.com"
          className="flex-1 rounded-lg border border-zinc-700 wf-card px-3 py-2 text-xs text-white placeholder-zinc-500"
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
    <div className="rounded-xl border wf-card p-5">
      {heading && <h3 className="text-lg font-semibold text-white mb-3">{String(heading)}</h3>}
      <div className="flex items-center justify-center h-32 text-xs wf-muted">
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

function PinnedPostBlock({ block, profile }: { block: PlacedBlock; profile: CreatorProfile }) {
  const heading = block.props.heading;
  const post = profile.pinned_post;

  if (!post) return <StillBuilding label="Pinned Post" />;

  return (
    <div>
      {heading && <h3 className="text-lg font-semibold text-white mb-3">{String(heading)}</h3>}
      <a
        href={`https://x.com/${profile.x_username}/status/${post.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl border border-indigo-500/30 bg-indigo-950/10 overflow-hidden transition hover:border-indigo-400/50"
      >
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <svg className="h-3.5 w-3.5 wf-accent" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-wider wf-accent">Pinned</span>
        </div>

        {post.image_url && (
          <img src={post.image_url} alt="" className="w-full max-h-48 object-cover" />
        )}

        <div className="p-4">
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap line-clamp-4">{post.text}</p>
          <div className="mt-3 flex items-center gap-4 text-[11px] wf-muted">
            {post.likes > 0 && <span>{post.likes >= 1000 ? `${(post.likes / 1000).toFixed(1)}K` : post.likes} likes</span>}
            {post.retweets > 0 && <span>{post.retweets} reposts</span>}
            {post.views > 0 && <span>{post.views >= 1000 ? `${(post.views / 1000).toFixed(1)}K` : post.views} views</span>}
            {post.date && <span>{new Date(post.date).toLocaleDateString()}</span>}
          </div>
        </div>
      </a>
    </div>
  );
}

function MusicPlayerBlock({ block, musicTracks }: { block: PlacedBlock; musicTracks: MusicTrack[] }) {
  // Use inspector URL if set, otherwise use first saved track from console
  const url = String(block.props.music_url || "") || musicTracks[0]?.url || "";
  const heading = block.props.heading;

  if (!url) return <StillBuilding label="Music Player" />;

  return (
    <div>
      {heading && <h3 className="text-lg font-semibold text-white mb-3">{String(heading)}</h3>}
      <StorePlayer url={url} theme="dark" />
      {musicTracks.length > 1 && (
        <div className="mt-2 space-y-1">
          {musicTracks.slice(1, 4).map((track) => (
            <a
              key={track.id}
              href={track.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border wf-border wf-card px-3 py-2 text-xs transition hover:border-zinc-600"
            >
              {track.provider === "spotify" ? (
                <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02z" /></svg>
              ) : (
                <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="#FA2D48"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" /></svg>
              )}
              <span className="wf-muted truncate">{track.title}</span>
              {track.artist && <span className="wf-muted truncate">{track.artist}</span>}
            </a>
          ))}
          {musicTracks.length > 4 && (
            <p className="text-center text-[10px] wf-muted">+{musicTracks.length - 4} more tracks</p>
          )}
        </div>
      )}
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
            className="block rounded-xl border wf-card overflow-hidden transition hover:border-zinc-600"
          >
            {article.image_url && (
              <img src={article.image_url} alt="" className="w-full h-32 object-cover" />
            )}
            <div className="p-3">
              <h4 className="text-sm font-semibold text-white line-clamp-2">{article.title}</h4>
              <p className="mt-1 text-xs wf-muted line-clamp-2">{article.intro}</p>
              <div className="mt-2 flex items-center gap-3 text-[10px] wf-muted">
                {article.date && <span>{new Date(article.date).toLocaleDateString()}</span>}
                {article.likes > 0 && <span>{article.likes} likes</span>}
                <span className="wf-accent">Read on X &rarr;</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function SocialPlatformBlock({ block, socialFeeds, platformId, platformLabel, platformColor, platformIcon }: {
  block: PlacedBlock; socialFeeds: SocialFeedAccount[]; platformId: string; platformLabel: string; platformColor: string; platformIcon: string;
}) {
  const heading = block.props.heading;
  const account = socialFeeds.find((f) => f.platform === platformId);

  if (!account) return <StillBuilding label={platformLabel} />;

  return (
    <div>
      {heading && <h3 className="text-lg font-semibold text-white mb-3">{String(heading)}</h3>}
      <a
        href={account.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl border wf-card overflow-hidden transition hover:border-zinc-600"
      >
        <div className="flex items-center gap-3 p-4">
          <svg className="h-8 w-8 shrink-0" viewBox="0 0 24 24" fill={platformColor}>
            <path d={platformIcon} />
          </svg>
          <div>
            <p className="text-sm font-semibold text-white">@{account.username}</p>
            <p className="text-xs wf-muted">Follow on {platformLabel}</p>
          </div>
        </div>
        {account.embed_url && (
          <iframe
            src={account.embed_url}
            className="w-full h-80 border-0 border-t wf-border"
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media"
            title={`${platformLabel} embed`}
          />
        )}
      </a>
    </div>
  );
}

function GrokGalleryBlock({ block, gallery, creatorUsername }: { block: PlacedBlock; gallery: GrokGalleryItem[]; creatorUsername: string }) {
  const maxItems = Math.min(Number(block.props.max_items) || 5, 5);
  const heading = block.props.heading;
  const shown = gallery.slice(0, maxItems);

  if (shown.length === 0) return <StillBuilding label="Grok Gallery" />;

  return (
    <div>
      {heading && <h3 className="text-lg font-semibold text-white mb-3">{String(heading)}</h3>}
      <div className="grid grid-cols-2 gap-2">
        {shown.map((item, i) => (
          <div
            key={item.id}
            className={`relative rounded-xl border wf-card overflow-hidden ${i === 0 && shown.length > 2 ? "col-span-2" : ""}`}
          >
            {item.type === "video" ? (
              <video src={item.url} className={`w-full object-cover ${i === 0 && shown.length > 2 ? "h-48" : "aspect-square"}`} muted playsInline preload="metadata" />
            ) : (
              <img src={item.url} alt={item.prompt} className={`w-full object-cover ${i === 0 && shown.length > 2 ? "h-48" : "aspect-square"}`} loading="lazy" />
            )}
            {item.type === "video" && (
              <div className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] text-white">Video</div>
            )}
          </div>
        ))}
      </div>
      {gallery.length > maxItems && (
        <a
          href={`/${creatorUsername}/gallery`}
          className="mt-3 block text-center text-xs wf-accent hover:text-indigo-300"
        >
          View all {gallery.length} creations &rarr;
        </a>
      )}
    </div>
  );
}

function XCommunitiesBlock({ block, communities }: { block: PlacedBlock; communities: XCommunity[] }) {
  const heading = block.props.heading;

  if (communities.length === 0) return <StillBuilding label="X Communities" />;

  return (
    <div>
      {heading && <h3 className="text-lg font-semibold text-white mb-3">{String(heading)}</h3>}
      <div className="space-y-2">
        {communities.map((c) => (
          <a
            key={c.id}
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border wf-card p-3 transition hover:border-zinc-600"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/20 wf-accent shrink-0">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584m12-1.697a5.971 5.971 0 00-.941-3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{c.name}</p>
              {c.description && <p className="text-[11px] wf-muted truncate">{c.description}</p>}
            </div>
            <span className="text-[10px] wf-accent shrink-0">Join</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function FavoriteCard({ fav }: { fav: FavoriteCreator }) {
  return (
    <a
      href={`https://x.com/${fav.username}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 rounded-xl border wf-card p-3 transition hover:border-zinc-600"
    >
      {fav.profile_image_url ? (
        <img src={fav.profile_image_url} alt={`@${fav.username}`} className="h-10 w-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-bold wf-accent shrink-0">
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
        <p className="text-[11px] wf-muted">@{fav.username}</p>
        {fav.tags && fav.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {fav.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-indigo-600/20 px-2 py-0.5 text-[9px] font-medium wf-accent">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}

function MyFavorites({ block, favorites, creatorUsername }: { block: PlacedBlock; favorites: FavoriteCreator[]; creatorUsername: string }) {
  const maxItems = Math.min(Number(block.props.max_items) || 10, 10);
  const heading = block.props.heading;

  if (favorites.length === 0) {
    return (
      <div className="rounded-xl border border-dashed wf-border wf-card p-6 text-center">
        <p className="text-xs wf-muted mb-2">My Favorites</p>
        <a href="/console/favorite-creators" className="text-xs wf-accent hover:underline">+ Add creators to your lists</a>
      </div>
    );
  }

  // Group by tags
  const tagGroups: Record<string, FavoriteCreator[]> = {};
  const untagged: FavoriteCreator[] = [];
  for (const fav of favorites) {
    if (!fav.tags || fav.tags.length === 0) {
      untagged.push(fav);
    } else {
      for (const tag of fav.tags) {
        if (!tagGroups[tag]) tagGroups[tag] = [];
        tagGroups[tag].push(fav);
      }
    }
  }

  const hasGroups = Object.keys(tagGroups).length > 0;

  return (
    <div>
      {heading && <h3 className="text-lg font-semibold text-white mb-3">{String(heading)}</h3>}

      {hasGroups ? (
        <div className="space-y-4">
          {Object.entries(tagGroups).map(([tag, members]) => (
            <div key={tag}>
              <p className="text-[10px] font-semibold uppercase tracking-wider wf-accent mb-2">{tag}</p>
              <div className="space-y-1.5">
                {members.slice(0, maxItems).map((fav) => (
                  <FavoriteCard key={fav.username} fav={fav} />
                ))}
              </div>
            </div>
          ))}
          {untagged.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider wf-muted mb-2">Other</p>
              <div className="space-y-1.5">
                {untagged.slice(0, maxItems).map((fav) => (
                  <FavoriteCard key={fav.username} fav={fav} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {favorites.slice(0, maxItems).map((fav) => (
            <FavoriteCard key={fav.username} fav={fav} />
          ))}
        </div>
      )}

      {favorites.length > maxItems && (
        <a
          href={`/${creatorUsername}/favorites`}
          className="mt-3 block text-center text-xs wf-accent hover:text-indigo-300"
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
  musicTracks,
  communities,
  grokGallery,
  socialFeeds,
}: {
  block: PlacedBlock;
  profile: CreatorProfile;
  products: Product[];
  favorites: FavoriteCreator[];
  articles: XArticle[];
  musicTracks: MusicTrack[];
  communities: XCommunity[];
  grokGallery: GrokGalleryItem[];
  socialFeeds: SocialFeedAccount[];
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
    case "pinned_post": return <PinnedPostBlock block={block} profile={profile} />;
    case "music_player": return <MusicPlayerBlock block={block} musicTracks={musicTracks} />;
    case "x_articles": return <XArticlesBlock block={block} articles={articles} />;
    case "tiktok_feed": return <SocialPlatformBlock block={block} socialFeeds={socialFeeds} platformId="tiktok" platformLabel="TikTok" platformColor="#00f2ea" platformIcon="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.87a8.28 8.28 0 004.77 1.52V6.94a4.85 4.85 0 01-1.01-.25z" />;
    case "instagram_feed": return <SocialPlatformBlock block={block} socialFeeds={socialFeeds} platformId="instagram" platformLabel="Instagram" platformColor="#E4405F" platformIcon="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z" />;
    case "youtube_feed": return <SocialPlatformBlock block={block} socialFeeds={socialFeeds} platformId="youtube" platformLabel="YouTube" platformColor="#FF0000" platformIcon="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />;
    case "grok_gallery": return <GrokGalleryBlock block={block} gallery={grokGallery} creatorUsername={profile.x_username} />;
    case "x_communities": return <XCommunitiesBlock block={block} communities={communities} />;
    case "my_favorites": return <MyFavorites block={block} favorites={favorites} creatorUsername={profile.x_username} />;
    default:
      return (
        <div className="rounded-xl border wf-card p-4 text-xs wf-muted">
          Unknown block: {block.type}
        </div>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Layout Renderer                                                    */
/* ------------------------------------------------------------------ */

const COLOR_SCHEMES: Record<string, { bg: string; surface: string; border: string; accent: string; text: string; textMuted: string }> = {
  midnight: { bg: "#09090b", surface: "rgba(24,24,27,0.5)", border: "#27272a", accent: "#6366f1", text: "#ffffff", textMuted: "#a1a1aa" },
  ocean:    { bg: "#0c1222", surface: "rgba(26,35,50,0.5)", border: "#1e3a5f", accent: "#38bdf8", text: "#e0f2fe", textMuted: "#7dd3fc" },
  forest:   { bg: "#0a0f0a", surface: "rgba(26,46,26,0.5)", border: "#1a3a1a", accent: "#4ade80", text: "#dcfce7", textMuted: "#86efac" },
  sunset:   { bg: "#1a0a0a", surface: "rgba(46,26,26,0.5)", border: "#3a1a1a", accent: "#fb923c", text: "#fff7ed", textMuted: "#fdba74" },
  royal:    { bg: "#0f0a1a", surface: "rgba(30,21,46,0.5)", border: "#2e1a4a", accent: "#a78bfa", text: "#ede9fe", textMuted: "#c4b5fd" },
};

export default function WireframeRenderer({ layout, profile, products, favorites = [], articles = [], musicTracks = [], communities = [], grokGallery = [], socialFeeds = [], colorScheme }: WireframeRendererProps) {
  const colors = COLOR_SCHEMES[colorScheme || "midnight"] || COLOR_SCHEMES.midnight;
  const hasLeft = layout.left.length > 0;
  const hasRight = layout.right.length > 0;
  const bio = profile.bio?.replace(/<[^>]*>/g, "") || "";

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        "--wf-bg": colors.bg,
        "--wf-surface": colors.surface,
        "--wf-border": colors.border,
        "--wf-accent": colors.accent,
        "--wf-text": colors.text,
        "--wf-text-muted": colors.textMuted,
      } as React.CSSProperties}
    >
      <style>{`
        .wf-card { background: var(--wf-surface) !important; border-color: var(--wf-border) !important; }
        .wf-card:hover { border-color: var(--wf-accent) !important; }
        .wf-accent { color: var(--wf-accent) !important; }
        .wf-muted { color: var(--wf-text-muted) !important; }
        .wf-border { border-color: var(--wf-border) !important; }
        .wf-text { color: var(--wf-text) !important; }
        [style*="--wf-bg"] .text-white { color: var(--wf-text) !important; }
        [style*="--wf-bg"] .text-zinc-300 { color: var(--wf-text) !important; }
        [style*="--wf-bg"] .text-zinc-200 { color: var(--wf-text) !important; }
        [style*="--wf-bg"] .bg-zinc-800,
        [style*="--wf-bg"] .bg-zinc-900\\/50 { background: var(--wf-surface) !important; }
        [style*="--wf-bg"] .border-zinc-800 { border-color: var(--wf-border) !important; }
        [style*="--wf-bg"] .hover\\:border-zinc-600:hover { border-color: var(--wf-accent) !important; }
        [style*="--wf-bg"] .bg-indigo-600\\/20 { background: color-mix(in srgb, var(--wf-accent) 20%, transparent) !important; }
        [style*="--wf-bg"] .text-indigo-400 { color: var(--wf-accent) !important; }
        [style*="--wf-bg"] .bg-black\\/60 { background: color-mix(in srgb, var(--wf-bg) 80%, transparent) !important; }
      `}</style>
      {/* ── X-style profile header ── */}
      <div className="relative h-48 sm:h-64 w-full overflow-hidden" style={{ backgroundColor: colors.surface }}>
        {profile.banner_url && (
          <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="-mt-16 sm:-mt-20 flex items-end gap-4">
          <div className="h-28 w-28 sm:h-36 sm:w-36 shrink-0 rounded-full border-4 border-zinc-950 overflow-hidden wf-card">
            {profile.profile_picture_url ? (
              <img src={profile.profile_picture_url} alt={`@${profile.x_username}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold wf-muted">
                {profile.x_username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="pb-1">
            <h1 className="text-2xl sm:text-3xl font-bold">{(profile.title || profile.x_username).replace(/\s*X\s*Profile\s*/i, "")}</h1>
            <a
              href={`https://x.com/${profile.x_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:opacity-80"
              style={{ color: colors.accent }}
            >
              @{profile.x_username}
            </a>
          </div>
        </div>

        {bio && (
          <p className="mt-4 max-w-xl text-sm leading-relaxed" style={{ color: colors.textMuted }}>{bio}</p>
        )}

        {/* ── Navigation menu ── */}
        <nav className="mt-6 flex items-center gap-1 rounded-xl border p-1.5 overflow-x-auto" style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
          {[
            { href: `/${profile.x_username}`, label: "Home", active: true },
            { href: `/${profile.x_username}/store`, label: "Store" },
            { href: `/${profile.x_username}/favorites`, label: "Favorites" },
            { href: `/${profile.x_username}/gallery`, label: "Gallery" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition"
              style={link.active
                ? { backgroundColor: colors.accent, color: "#fff" }
                : { color: colors.textMuted }
              }
            >
              {link.label}
            </a>
          ))}
          <a
            href={`https://x.com/${profile.x_username}/articles`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition"
            style={{ color: colors.textMuted }}
          >
            Articles
          </a>

          {/* Share on X */}
          <a
            href={`https://x.com/intent/tweet?${new URLSearchParams({
              text: `Check out @${profile.x_username}'s page on RareImagery`,
              url: `https://www.rareimagery.net/${profile.x_username}`,
            }).toString()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 ml-auto flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition hover:opacity-80"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Share
          </a>
        </nav>

        {/* ── 3-column wireframe blocks with mobile support ── */}
        <MobileColumnLayout
          layout={layout}
          hasLeft={hasLeft}
          hasRight={hasRight}
          profile={profile}
          products={products}
          favorites={favorites}
          articles={articles}
          musicTracks={musicTracks}
          communities={communities}
          grokGallery={grokGallery}
          socialFeeds={socialFeeds}
          colors={colors}
        >
          <div className="mt-6 pb-12 flex gap-6 wf-columns">
            {hasLeft && (
              <div className="w-1/4 space-y-4 wf-col-left">
                {layout.left.map((block) => (
                  <RenderBlock key={block.instanceId} block={block} profile={profile} products={products} favorites={favorites} articles={articles} musicTracks={musicTracks} communities={communities} grokGallery={grokGallery} socialFeeds={socialFeeds} />
                ))}
              </div>
            )}

            <div className={`space-y-4 wf-col-center ${hasLeft && hasRight ? "w-1/2" : hasLeft || hasRight ? "w-3/4" : "w-full"}`}>
              {layout.center.map((block) => (
                <RenderBlock key={block.instanceId} block={block} profile={profile} products={products} favorites={favorites} articles={articles} musicTracks={musicTracks} communities={communities} grokGallery={grokGallery} socialFeeds={socialFeeds} />
              ))}
            </div>

            {hasRight && (
              <div className="w-1/4 space-y-4 wf-col-right">
                {layout.right.map((block) => (
                  <RenderBlock key={block.instanceId} block={block} profile={profile} products={products} favorites={favorites} articles={articles} musicTracks={musicTracks} communities={communities} grokGallery={grokGallery} socialFeeds={socialFeeds} />
                ))}
              </div>
            )}
          </div>
        </MobileColumnLayout>
      </div>
    </div>
  );
}
