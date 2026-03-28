"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import FollowButton from "@/components/FollowButton";
import ShoutoutWall from "@/components/ShoutoutWall";
import MyPicks from "@/components/MyPicks";
// Sidebar is rendered by the parent page — this component is just the main content

// ---------------------------------------------------------------------------
// Types (local — mirrors drupal.ts but keeps theme self-contained)
// ---------------------------------------------------------------------------

interface Product {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  sku: string;
  image_url: string | null;
}

interface TopPost {
  id: string;
  text: string;
  image_url?: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  date: string;
}

interface TopFollower {
  username: string;
  display_name: string;
  profile_image_url?: string;
  follower_count: number;
  verified?: boolean;
}

interface Metrics {
  engagement_score: number;
  avg_likes: number;
  avg_retweets: number;
  avg_views: number;
  top_themes: string[];
  recommended_products: string[];
  posting_frequency: string;
  audience_sentiment: string;
}

interface Profile {
  id: string;
  title?: string;
  x_username: string;
  bio: string;
  follower_count: number;
  profile_picture_url: string | null;
  banner_url: string | null;
  top_posts: TopPost[];
  top_followers: TopFollower[];
  metrics: Metrics | null;
  store_theme: string;
  store_status: string | null;
  linked_store_id: string | null;
}

interface XMimicThemeProps {
  profile: Profile;
  products: Product[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// SVG Icons (X/Twitter style)
// ---------------------------------------------------------------------------

const Icons = {
  home: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <path d="M21.591 7.146L12.52 1.157a1 1 0 00-1.04 0l-9.071 5.989A1.002 1.002 0 002 8.003V21a1 1 0 001 1h7v-6h4v6h7a1 1 0 001-1V8.003a1.002 1.002 0 00-.409-.857z" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <path d="M10.25 3.75a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm-8.5 6.5a8.5 8.5 0 1117 0 8.5 8.5 0 01-17 0z" />
      <path d="M15.44 15.44l4.81 4.81a1 1 0 001.42-1.41l-4.82-4.82-1.41 1.42z" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <path d="M19.993 9.042C19.48 5.017 16.054 2 11.996 2s-7.49 3.021-7.999 7.051L2.866 18H7.1a5.002 5.002 0 009.8 0h4.236l-1.143-8.958zM12 20a3.001 3.001 0 01-2.829-2h5.658A3.001 3.001 0 0112 20zm-6.869-4l.874-6.854A5.998 5.998 0 0112 4a5.998 5.998 0 015.995 5.146L18.869 16H5.131z" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <path d="M1.998 5.5a2.5 2.5 0 012.5-2.5h15a2.5 2.5 0 012.5 2.5v13a2.5 2.5 0 01-2.5 2.5h-15a2.5 2.5 0 01-2.5-2.5v-13zm2.5-.5a.5.5 0 00-.5.5v.511l8 5.333 8-5.333V5.5a.5.5 0 00-.5-.5h-15zm15.5 2.845l-7.614 5.076a.75.75 0 01-.772 0L3.998 7.845V18.5a.5.5 0 00.5.5h15a.5.5 0 00.5-.5V7.845z" />
    </svg>
  ),
  store: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <path d="M3.5 5.5A1.5 1.5 0 015 4h14a1.5 1.5 0 011.5 1.5V8a3 3 0 01-1.5 2.6V20a1 1 0 01-1 1H6a1 1 0 01-1-1v-9.4A3 3 0 013.5 8V5.5zM5 8a1 1 0 001 1 1 1 0 001-1V6H5v2zm4-2v2a1 1 0 001 1 1 1 0 001-1V6H9zm4 0v2a1 1 0 001 1 1 1 0 001-1V6h-2zm4 0v2a1 1 0 001 1 1 1 0 001-1V6h-2zM7 19h10v-7.83a3.01 3.01 0 01-1-.17 3 3 0 01-2 .17 3 3 0 01-2-.17 3 3 0 01-2 .17A3.01 3.01 0 017 11.17V19z" />
    </svg>
  ),
  bookmark: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <path d="M4 4.5A2.5 2.5 0 016.5 2h11A2.5 2.5 0 0120 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4a.5.5 0 00-.5.5v14.56l6-4.29 6 4.29V4.5a.5.5 0 00-.5-.5h-11z" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <path d="M5.651 19h12.698c-.337-1.8-1.023-3.21-1.945-4.19C15.318 13.65 13.838 13 12 13s-3.317.65-4.404 1.81c-.922.98-1.608 2.39-1.945 4.19zm.486-5.56C7.627 11.85 9.648 11 12 11s4.373.85 5.863 2.44c1.477 1.58 2.366 3.8 2.632 6.46l.11 1.1H3.395l.11-1.1c.266-2.66 1.155-4.88 2.632-6.46zM12 4a3 3 0 100 6 3 3 0 000-6zm-5 3a5 5 0 1110 0A5 5 0 017 7z" />
    </svg>
  ),
  verified: (
    <svg viewBox="0 0 22 22" width="18" height="18">
      <path
        d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.141.27.587.7 1.086 1.24 1.44.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.223 1.26.27 1.894.14.634-.132 1.22-.438 1.69-.884.445-.47.75-1.055.88-1.69.13-.634.08-1.29-.14-1.898.585-.273 1.084-.704 1.438-1.246.355-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
        fill="#1d9bf0"
      />
    </svg>
  ),
  reply: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6a5.998 5.998 0 00-5.999 6c0 3.31 2.69 6 5.999 6h2.067v2.31l5.054-2.8c1.89-1.04 3.054-3.01 3.054-5.14 0-3.38-2.74-6.13-6.129-6.13H9.756z" />
    </svg>
  ),
  repost: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.56-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z" />
    </svg>
  ),
  views: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M8.75 21V3h2v18h-2zM18.75 21V8.5h2V21h-2zM13.75 21v-9h2v9h-2zM3.75 21v-4h2v4h-2z" />
    </svg>
  ),
  share: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z" />
    </svg>
  ),
  xLogo: (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
      <circle cx="12" cy="12" r="1.5" /><circle cx="5" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Tab type
// ---------------------------------------------------------------------------

type TabId = "posts" | "replies" | "highlights" | "media" | "store";

const TABS: { id: TabId; label: string }[] = [
  { id: "posts", label: "Posts" },
  { id: "replies", label: "Replies" },
  { id: "highlights", label: "Highlights" },
  { id: "media", label: "Media" },
  { id: "store", label: "Store" },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PostItem({
  post,
  profile,
}: {
  post: TopPost;
  profile: Profile;
}) {
  return (
    <article className="xm-post">
      <div className="xm-post-pfp-col">
        {profile.profile_picture_url ? (
          <Image
            src={profile.profile_picture_url}
            alt={profile.x_username}
            width={40}
            height={40}
            className="xm-post-pfp"
          />
        ) : (
          <div className="xm-post-pfp xm-post-pfp--placeholder">
            {profile.x_username.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="xm-post-body">
        <div className="xm-post-header">
          <span className="xm-post-displayname">
            {profile.title || profile.x_username}
          </span>
          {Icons.verified}
          <span className="xm-post-handle">@{profile.x_username}</span>
          <span className="xm-post-dot">&middot;</span>
          <span className="xm-post-time">{timeAgo(post.date)}</span>
        </div>
        <div className="xm-post-text">{post.text}</div>
        {post.image_url && (
          <div className="xm-post-media">
            <Image src={post.image_url} alt="" width={1200} height={675} className="xm-post-media-img" />
          </div>
        )}
        <div className="xm-post-actions">
          <button className="xm-action xm-action--reply">
            {Icons.reply}
            <span>{post.replies ? formatCount(post.replies) : ""}</span>
          </button>
          <button className="xm-action xm-action--repost">
            {Icons.repost}
            <span>{post.retweets ? formatCount(post.retweets) : ""}</span>
          </button>
          <button className="xm-action xm-action--like">
            {Icons.heart}
            <span>{post.likes ? formatCount(post.likes) : ""}</span>
          </button>
          <button className="xm-action xm-action--views">
            {Icons.views}
            <span>{post.views ? formatCount(post.views) : ""}</span>
          </button>
          <button className="xm-action">{Icons.share}</button>
        </div>
      </div>
    </article>
  );
}

function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (p: Product) => void;
}) {
  const [added, setAdded] = useState(false);
  const handleAdd = () => {
    onAdd(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="xm-product-card">
      <div className="xm-product-img-wrap">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.title}
            width={600}
            height={600}
            className="xm-product-img"
          />
        ) : (
          <div className="xm-product-img-placeholder">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="#71767b">
              <path d="M3.5 5.5A1.5 1.5 0 015 4h14a1.5 1.5 0 011.5 1.5V8a3 3 0 01-1.5 2.6V20a1 1 0 01-1 1H6a1 1 0 01-1-1v-9.4A3 3 0 013.5 8V5.5z" />
            </svg>
          </div>
        )}
      </div>
      <div className="xm-product-info">
        <h3 className="xm-product-title">{product.title}</h3>
        {product.description && (
          <p
            className="xm-product-desc"
            dangerouslySetInnerHTML={{
              __html: product.description.replace(/<[^>]*>/g, "").slice(0, 80),
            }}
          />
        )}
        <div className="xm-product-row">
          <span className="xm-product-price">
            ${parseFloat(product.price).toFixed(2)}
          </span>
          <button
            className={`xm-product-btn ${added ? "xm-product-btn--added" : ""}`}
            onClick={handleAdd}
          >
            {added ? "Added" : "Add to cart"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WhoToFollow({ followers }: { followers: TopFollower[] }) {
  if (followers.length === 0) return null;
  return (
    <div className="xm-sidebar-card">
      <h2 className="xm-sidebar-card-title">Who to follow</h2>
      {followers.slice(0, 5).map((f, i) => (
        <div key={f.username || i} className="xm-whotf-row">
          <div className="xm-whotf-pfp-wrap">
            {f.profile_image_url ? (
              <Image
                src={f.profile_image_url}
                alt={f.display_name}
                width={40}
                height={40}
                className="xm-whotf-pfp"
              />
            ) : (
              <div className="xm-whotf-pfp xm-whotf-pfp--placeholder">
                {f.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="xm-whotf-info">
            <div className="xm-whotf-name">
              {f.display_name}
              {f.verified && Icons.verified}
            </div>
            <div className="xm-whotf-handle">@{f.username}</div>
          </div>
          <button className="xm-follow-btn">Follow</button>
        </div>
      ))}
      <div className="xm-sidebar-card-more">Show more</div>
    </div>
  );
}

function TrendingMetrics({ metrics }: { metrics: Metrics }) {
  return (
    <div className="xm-sidebar-card">
      <h2 className="xm-sidebar-card-title">Creator insights</h2>
      <div className="xm-trend-item">
        <div className="xm-trend-category">Engagement</div>
        <div className="xm-trend-topic">Score: {metrics.engagement_score}/100</div>
        <div className="xm-trend-stat">{metrics.posting_frequency}</div>
      </div>
      <div className="xm-trend-item">
        <div className="xm-trend-category">Avg per post</div>
        <div className="xm-trend-topic">
          {formatCount(metrics.avg_likes)} likes &middot;{" "}
          {formatCount(metrics.avg_retweets)} reposts
        </div>
        <div className="xm-trend-stat">
          {formatCount(metrics.avg_views)} views
        </div>
      </div>
      {metrics.top_themes.length > 0 && (
        <div className="xm-trend-item">
          <div className="xm-trend-category">Top themes</div>
          <div className="xm-trend-topic">
            {metrics.top_themes.slice(0, 3).join(", ")}
          </div>
          <div className="xm-trend-stat">{metrics.audience_sentiment}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function XMimicTheme({ profile, products }: XMimicThemeProps) {
  const [activeTab, setActiveTab] = useState<TabId>("posts");
  const [cart, setCart] = useState<(Product & { qty: number })[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const addToCart = (product: Product) => {
    setCart((c) => {
      const existing = c.find((i) => i.id === product.id);
      if (existing)
        return c.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      return [...c, { ...product, qty: 1 }];
    });
  };

  const cartTotal = cart.reduce(
    (sum, i) => sum + parseFloat(i.price) * i.qty,
    0
  );
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const handleCheckout = async () => {
    if (cart.length === 0 || checkoutLoading) return;

    setCheckoutLoading(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const body = {
        items: cart.map((item) => ({
          productId: item.id,
          variationId: item.sku || item.id,
          title: item.title,
          price: parseFloat(item.price),
          currency: item.currency || "USD",
          quantity: item.qty,
        })),
        storeId: profile.linked_store_id || profile.id,
        sellerXId: profile.x_username,
        sellerHandle: profile.x_username,
        provider: "stripe" as const,
        attribution: {
          utmSource: params.get("utm_source") || undefined,
          utmMedium: params.get("utm_medium") || undefined,
          utmCampaign: params.get("utm_campaign") || undefined,
          landingPath: `${window.location.pathname}${window.location.search}`,
        },
      };

      const res = await fetch("/api/checkout/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        const message = data?.error || "Unable to start checkout";
        if (res.status === 401) {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
          return;
        }
        throw new Error(message);
      }

      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      throw new Error("Missing checkout URL");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Checkout failed";
      alert(message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <>
      <style>{XMIMIC_STYLES}</style>

      <div className="xm-root">
        {/* ═══════════════ CENTER COLUMN ═══════════════ */}
        <main className="xm-center">
          {/* Banner */}
          <div className="xm-banner">
            {profile.banner_url ? (
              <Image
                src={profile.banner_url}
                alt="banner"
                fill
                className="xm-banner-img"
              />
            ) : (
              <div className="xm-banner-placeholder" />
            )}
          </div>

          {/* Profile header */}
          <div className="xm-profile-header">
            <div className="xm-profile-top-row">
              <div className="xm-pfp-container">
                {profile.profile_picture_url ? (
                  <Image
                    src={profile.profile_picture_url}
                    alt={profile.x_username}
                    width={134}
                    height={134}
                    className="xm-pfp"
                  />
                ) : (
                  <div className="xm-pfp xm-pfp--placeholder">
                    {profile.x_username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="xm-profile-actions">
                <button className="xm-edit-profile-btn">
                  Edit profile
                </button>
              </div>
            </div>

            <h1 className="xm-profile-name">
              {profile.title || profile.x_username}
              <span className="xm-profile-verified">{Icons.verified}</span>
            </h1>
            <div className="xm-profile-handle">@{profile.x_username}</div>

            {profile.bio && (
              <div
                className="xm-profile-bio"
                dangerouslySetInnerHTML={{
                  __html: profile.bio.replace(/<[^>]*>/g, ""),
                }}
              />
            )}

            <div className="xm-profile-meta">
              <span className="xm-profile-meta-item">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#71767b">
                  <path d="M7 4V3h2v1h6V3h2v1h1.5C19.89 4 21 5.12 21 6.5v12c0 1.38-1.11 2.5-2.5 2.5h-13C4.12 21 3 19.88 3 18.5v-12C3 5.12 4.12 4 5.5 4H7zm0 2H5.5c-.27 0-.5.22-.5.5v12c0 .28.23.5.5.5h13c.28 0 .5-.22.5-.5v-12c0-.28-.22-.5-.5-.5H17v1h-2V6H9v1H7V6z" />
                </svg>
                Joined March 2026
              </span>
            </div>

            <div className="xm-profile-follows">
              <span>
                <strong>{formatCount(profile.follower_count)}</strong>{" "}
                Followers
              </span>
              <span>
                <strong>{products.length}</strong> Products
              </span>
            </div>

            {profile.linked_store_id && (
              <div style={{ marginTop: 16 }}>
                <FollowButton
                  targetStoreId={profile.linked_store_id}
                  targetStoreName={profile.x_username}
                  followerCount={profile.follower_count}
                  size="md"
                  showCount={false}
                />
              </div>
            )}
          </div>

          {/* Tab bar */}
          <div className="xm-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`xm-tab ${activeTab === tab.id ? "xm-tab--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.id === "store" && products.length > 0 && (
                  <span className="xm-tab-badge">{products.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="xm-feed">
            {activeTab === "posts" && (
              <>
                {profile.top_posts.length > 0 ? (
                  profile.top_posts.map((post, i) => (
                    <PostItem
                      key={post.id || i}
                      post={post}
                      profile={profile}
                    />
                  ))
                ) : (
                  <div className="xm-empty">
                    <h3>No posts yet</h3>
                    <p>When @{profile.x_username} posts, they&apos;ll show up here.</p>
                  </div>
                )}
              </>
            )}

            {activeTab === "replies" && (
              <div className="xm-empty">
                <h3>Replies</h3>
                <p>Replies from @{profile.x_username} will appear here.</p>
              </div>
            )}

            {activeTab === "highlights" && (
              <div className="xm-empty">
                <h3>Highlights</h3>
                <p>
                  @{profile.x_username} hasn&apos;t added any highlights yet.
                </p>
              </div>
            )}

            {activeTab === "media" && (
              <>
                {profile.top_posts.some((p) => p.image_url) ? (
                  <div className="xm-media-grid">
                    {profile.top_posts
                      .filter((p) => p.image_url)
                      .map((p, i) => (
                        <div key={p.id || i} className="xm-media-item">
                          <Image
                            src={p.image_url!}
                            alt=""
                            width={900}
                            height={900}
                            className="xm-media-img"
                          />
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="xm-empty">
                    <h3>Media</h3>
                    <p>Photos and videos will appear here.</p>
                  </div>
                )}
              </>
            )}

            {activeTab === "store" && (
              <>
                {products.length > 0 ? (
                  <div className="xm-store-grid">
                    {products.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        onAdd={addToCart}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="xm-empty">
                    <h3>Store coming soon</h3>
                    <p>
                      @{profile.x_username} hasn&apos;t listed any products
                      yet.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* MyPicks + ShoutoutWall */}
          <div style={{ borderTop: "1px solid var(--xm-border)", padding: "24px 16px" }}>
            {profile.linked_store_id && (
              <MyPicks
                storeId={profile.linked_store_id}
                creatorUsername={profile.x_username}
              />
            )}

            {profile.linked_store_id && (
              <ShoutoutWall
                storeId={profile.linked_store_id}
                storeName={profile.x_username}
              />
            )}
          </div>
        </main>

        {/* ═══════════════ RIGHT SIDEBAR ═══════════════ */}
        <aside className="xm-right-sidebar">
          <div className="xm-right-inner">
            {/* Search bar */}
            <div className="xm-search-bar">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#71767b">
                <path d="M10.25 3.75a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm-8.5 6.5a8.5 8.5 0 1117 0 8.5 8.5 0 01-17 0z" />
                <path d="M15.44 15.44l4.81 4.81a1 1 0 001.42-1.41l-4.82-4.82-1.41 1.42z" />
              </svg>
              <input
                type="text"
                placeholder="Search"
                className="xm-search-input"
                readOnly
              />
            </div>

            {/* Who to follow */}
            <WhoToFollow followers={profile.top_followers} />

            {/* Creator insights */}
            {profile.metrics && (
              <TrendingMetrics metrics={profile.metrics} />
            )}

            {/* Store highlight */}
            {products.length > 0 && (
              <div className="xm-sidebar-card">
                <h2 className="xm-sidebar-card-title">
                  Featured from the store
                </h2>
                {products.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    className="xm-sidebar-product"
                    onClick={() => setActiveTab("store")}
                  >
                    <div className="xm-sidebar-product-img-wrap">
                      {p.image_url ? (
                        <Image
                          src={p.image_url}
                          alt={p.title}
                          width={120}
                          height={120}
                          className="xm-sidebar-product-img"
                        />
                      ) : (
                        <div className="xm-sidebar-product-img xm-sidebar-product-img--placeholder">
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="#71767b">
                            <path d="M3.5 5.5A1.5 1.5 0 015 4h14a1.5 1.5 0 011.5 1.5V8a3 3 0 01-1.5 2.6V20a1 1 0 01-1 1H6a1 1 0 01-1-1v-9.4A3 3 0 013.5 8V5.5z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="xm-sidebar-product-info">
                      <div className="xm-sidebar-product-name">{p.title}</div>
                      <div className="xm-sidebar-product-price">
                        ${parseFloat(p.price).toFixed(2)}
                      </div>
                    </div>
                  </button>
                ))}
                <button
                  className="xm-sidebar-card-more"
                  onClick={() => setActiveTab("store")}
                >
                  Show all products
                </button>
              </div>
            )}

            {/* Footer links */}
            <div className="xm-right-footer">
              <Link href="/">RareImagery</Link>
              <span>&middot;</span>
              <Link href="/">Terms</Link>
              <span>&middot;</span>
              <Link href="/">Privacy</Link>
              <span>&middot;</span>
              <span>&copy; 2026</span>
            </div>
          </div>
        </aside>
      </div>

      {/* ═══════════════ CART DRAWER ═══════════════ */}
      {cartOpen && (
        <>
          <div
            className="xm-cart-overlay"
            onClick={() => setCartOpen(false)}
          />
          <div className="xm-cart-drawer">
            <div className="xm-cart-header">
              <h2>Your Cart</h2>
              <button onClick={() => setCartOpen(false)}>&times;</button>
            </div>
            {cart.length === 0 ? (
              <p className="xm-cart-empty">Your cart is empty</p>
            ) : (
              <>
                {cart.map((item) => (
                  <div key={item.id} className="xm-cart-item">
                    <span>
                      {item.title} &times; {item.qty}
                    </span>
                    <span className="xm-cart-item-price">
                      ${(parseFloat(item.price) * item.qty).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="xm-cart-total">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <button className="xm-checkout-btn" onClick={handleCheckout} disabled={checkoutLoading}>
                  {checkoutLoading ? "Redirecting..." : "Proceed to Checkout"}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Mobile cart FAB */}
      {cartCount > 0 && !cartOpen && (
        <button className="xm-cart-fab" onClick={() => setCartOpen(true)}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.16 6.26l-.02.02L5.18 4H2v2h2l3.6 7.59-1.35 2.45A2 2 0 008 18.5h11v-2H8l1.1-2h6.83a2 2 0 001.75-1.03l3.58-6.49A1 1 0 0020.4 5.5H6.21l-.95-2.24H2v2h1.88l2.28 5z" />
          </svg>
          <span className="xm-cart-fab-count">{cartCount}</span>
        </button>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles — pixel-accurate X/Twitter mimic
// ---------------------------------------------------------------------------

const XMIMIC_STYLES = `
  /* ── Reset & Tokens ── */
  .xm-root {
    --xm-bg: #000000;
    --xm-bg-elevated: #16181c;
    --xm-bg-hover: rgba(231,233,234,0.04);
    --xm-border: #2f3336;
    --xm-text: #e7e9ea;
    --xm-text-secondary: #71767b;
    --xm-accent: #1d9bf0;
    --xm-accent-hover: #1a8cd8;
    --xm-green: #00ba7c;
    --xm-pink: #f91880;
    --xm-gold: #ffd700;
    --xm-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

    display: flex;
    min-height: 100vh;
    width: 100%;
    background: var(--xm-bg);
    color: var(--xm-text);
    font-family: var(--xm-font);
    font-size: 15px;
    line-height: 1.35;
    -webkit-font-smoothing: antialiased;
  }
  .xm-root *, .xm-root *::before, .xm-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .xm-root a { color: inherit; text-decoration: none; }
  .xm-root button { cursor: pointer; border: none; background: none; font-family: var(--xm-font); color: var(--xm-text); }

  /* ── CENTER COLUMN ── */
  .xm-center {
    flex: 1;
    max-width: 600px;
    border-left: 1px solid var(--xm-border);
    border-right: 1px solid var(--xm-border);
    min-height: 100vh;
  }

  /* Banner */
  .xm-banner {
    width: 100%;
    height: 200px;
    position: relative;
    overflow: hidden;
    background: #333639;
  }
  .xm-banner-img { object-fit: cover; }
  .xm-banner-placeholder {
    width: 100%; height: 100%;
    background: linear-gradient(135deg, #1d9bf0 0%, #16181c 100%);
  }

  /* Profile header */
  .xm-profile-header { padding: 12px 16px 0; }
  .xm-profile-top-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
  }
  .xm-pfp-container { margin-top: -68px; }
  .xm-pfp {
    width: 134px; height: 134px;
    border-radius: 50%;
    border: 4px solid var(--xm-bg);
    object-fit: cover;
    background: var(--xm-bg-elevated);
  }
  .xm-pfp--placeholder {
    display: flex; align-items: center; justify-content: center;
    font-size: 48px; font-weight: 700; color: var(--xm-text-secondary);
  }
  .xm-profile-actions { display: flex; gap: 8px; margin-top: 12px; }
  .xm-edit-profile-btn {
    padding: 0 16px;
    height: 36px;
    border: 1px solid var(--xm-border) !important;
    border-radius: 9999px;
    font-size: 15px;
    font-weight: 700;
    color: var(--xm-text) !important;
    background: transparent !important;
    transition: background 0.2s;
  }
  .xm-edit-profile-btn:hover { background: var(--xm-bg-hover) !important; }

  .xm-profile-name {
    font-size: 20px;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
  }
  .xm-profile-verified { display: flex; }
  .xm-profile-handle {
    font-size: 15px;
    color: var(--xm-text-secondary);
    margin-bottom: 12px;
  }
  .xm-profile-bio {
    font-size: 15px;
    line-height: 1.5;
    margin-bottom: 12px;
    white-space: pre-wrap;
  }
  .xm-profile-meta {
    display: flex; gap: 12px; flex-wrap: wrap;
    font-size: 15px; color: var(--xm-text-secondary);
    margin-bottom: 12px;
  }
  .xm-profile-meta-item {
    display: flex; align-items: center; gap: 4px;
  }
  .xm-profile-follows {
    display: flex; gap: 20px;
    font-size: 14px; color: var(--xm-text-secondary);
    margin-bottom: 16px;
  }
  .xm-profile-follows strong { color: var(--xm-text); }

  /* Tabs */
  .xm-tabs {
    display: flex;
    border-bottom: 1px solid var(--xm-border);
    position: sticky;
    top: 0;
    background: rgba(0,0,0,0.65);
    backdrop-filter: blur(12px);
    z-index: 10;
  }
  .xm-tab {
    flex: 1;
    padding: 16px 0;
    font-size: 15px;
    font-weight: 500;
    color: var(--xm-text-secondary) !important;
    text-align: center;
    position: relative;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .xm-tab:hover { background: var(--xm-bg-hover); }
  .xm-tab--active {
    font-weight: 700;
    color: var(--xm-text) !important;
  }
  .xm-tab--active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 56px;
    height: 4px;
    background: var(--xm-accent);
    border-radius: 2px;
  }
  .xm-tab-badge {
    background: var(--xm-accent);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 9999px;
    min-width: 18px;
    text-align: center;
  }

  /* Feed / Posts */
  .xm-feed { }
  .xm-post {
    display: flex;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--xm-border);
    transition: background 0.2s;
  }
  .xm-post:hover { background: var(--xm-bg-hover); }
  .xm-post-pfp-col { flex-shrink: 0; }
  .xm-post-pfp {
    width: 40px; height: 40px;
    border-radius: 50%;
    object-fit: cover;
  }
  .xm-post-pfp--placeholder {
    background: var(--xm-bg-elevated);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 700; color: var(--xm-text-secondary);
  }
  .xm-post-body { flex: 1; min-width: 0; }
  .xm-post-header {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 2px;
    flex-wrap: wrap;
  }
  .xm-post-displayname { font-weight: 700; font-size: 15px; }
  .xm-post-handle { color: var(--xm-text-secondary); font-size: 15px; }
  .xm-post-dot { color: var(--xm-text-secondary); }
  .xm-post-time { color: var(--xm-text-secondary); font-size: 15px; }
  .xm-post-text {
    font-size: 15px;
    line-height: 1.5;
    margin-bottom: 12px;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .xm-post-media {
    border-radius: 16px;
    overflow: hidden;
    margin-bottom: 12px;
    border: 1px solid var(--xm-border);
  }
  .xm-post-media-img {
    width: 100%;
    display: block;
    max-height: 510px;
    object-fit: cover;
  }
  .xm-post-actions {
    display: flex;
    justify-content: space-between;
    max-width: 425px;
  }
  .xm-action {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: var(--xm-text-secondary) !important;
    padding: 2px;
    border-radius: 9999px;
    transition: color 0.2s;
  }
  .xm-action svg { transition: color 0.2s; }
  .xm-action--reply:hover { color: var(--xm-accent) !important; }
  .xm-action--reply:hover svg { color: var(--xm-accent); }
  .xm-action--repost:hover { color: var(--xm-green) !important; }
  .xm-action--repost:hover svg { color: var(--xm-green); }
  .xm-action--like:hover { color: var(--xm-pink) !important; }
  .xm-action--like:hover svg { color: var(--xm-pink); }
  .xm-action--views:hover { color: var(--xm-accent) !important; }
  .xm-action--views:hover svg { color: var(--xm-accent); }

  /* Media grid tab */
  .xm-media-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
  }
  .xm-media-item { aspect-ratio: 1; overflow: hidden; }
  .xm-media-img {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform 0.2s;
  }
  .xm-media-item:hover .xm-media-img { transform: scale(1.02); }

  /* Store grid tab */
  .xm-store-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1px;
    background: var(--xm-border);
  }
  .xm-product-card {
    background: var(--xm-bg);
    transition: background 0.2s;
  }
  .xm-product-card:hover { background: var(--xm-bg-hover); }
  .xm-product-img-wrap {
    aspect-ratio: 1;
    overflow: hidden;
    background: var(--xm-bg-elevated);
  }
  .xm-product-img {
    width: 100%; height: 100%; object-fit: cover;
    display: block;
    transition: transform 0.3s;
  }
  .xm-product-card:hover .xm-product-img { transform: scale(1.02); }
  .xm-product-img-placeholder {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    color: var(--xm-text-secondary);
  }
  .xm-product-info { padding: 12px; }
  .xm-product-title {
    font-size: 15px; font-weight: 700;
    margin-bottom: 4px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .xm-product-desc {
    font-size: 13px; color: var(--xm-text-secondary);
    margin-bottom: 8px;
    line-height: 1.4;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .xm-product-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .xm-product-price {
    font-size: 16px; font-weight: 700;
    color: var(--xm-gold);
  }
  .xm-product-btn {
    padding: 6px 16px;
    background: var(--xm-accent) !important;
    color: #fff !important;
    font-size: 13px;
    font-weight: 700;
    border-radius: 9999px;
    transition: background 0.2s;
  }
  .xm-product-btn:hover { background: var(--xm-accent-hover) !important; }
  .xm-product-btn--added { background: var(--xm-green) !important; }

  .xm-empty {
    padding: 48px 32px;
    text-align: center;
  }
  .xm-empty h3 {
    font-size: 31px;
    font-weight: 800;
    margin-bottom: 8px;
  }
  .xm-empty p {
    font-size: 15px;
    color: var(--xm-text-secondary);
    max-width: 340px;
    margin: 0 auto;
    line-height: 1.5;
  }

  /* ── RIGHT SIDEBAR ── */
  .xm-right-sidebar {
    width: 350px;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }
  .xm-right-inner {
    padding: 12px 24px 20px;
  }

  /* Search */
  .xm-search-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--xm-bg-elevated);
    border-radius: 9999px;
    padding: 0 16px;
    height: 42px;
    margin-bottom: 16px;
    border: 1px solid transparent;
    transition: border-color 0.2s;
  }
  .xm-search-bar:focus-within { border-color: var(--xm-accent); background: transparent; }
  .xm-search-input {
    background: transparent;
    border: none;
    outline: none;
    color: var(--xm-text);
    font-size: 15px;
    width: 100%;
    font-family: var(--xm-font);
  }
  .xm-search-input::placeholder { color: var(--xm-text-secondary); }

  /* Sidebar cards */
  .xm-sidebar-card {
    background: var(--xm-bg-elevated);
    border-radius: 16px;
    margin-bottom: 16px;
    overflow: hidden;
  }
  .xm-sidebar-card-title {
    font-size: 20px;
    font-weight: 800;
    padding: 12px 16px;
  }
  .xm-sidebar-card-more {
    display: block;
    width: 100%;
    text-align: left;
    padding: 16px;
    font-size: 15px;
    color: var(--xm-accent) !important;
    transition: background 0.2s;
  }
  .xm-sidebar-card-more:hover { background: var(--xm-bg-hover); }

  /* Who to follow */
  .xm-whotf-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    transition: background 0.2s;
  }
  .xm-whotf-row:hover { background: var(--xm-bg-hover); }
  .xm-whotf-pfp-wrap { flex-shrink: 0; }
  .xm-whotf-pfp {
    width: 40px; height: 40px;
    border-radius: 50%;
    object-fit: cover;
  }
  .xm-whotf-pfp--placeholder {
    background: #2f3336;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 700; color: var(--xm-text-secondary);
  }
  .xm-whotf-info { flex: 1; min-width: 0; }
  .xm-whotf-name {
    font-size: 15px; font-weight: 700;
    display: flex; align-items: center; gap: 4px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .xm-whotf-handle {
    font-size: 13px; color: var(--xm-text-secondary);
  }
  .xm-follow-btn {
    background: var(--xm-text) !important;
    color: var(--xm-bg) !important;
    font-size: 14px;
    font-weight: 700;
    padding: 6px 16px;
    border-radius: 9999px;
    flex-shrink: 0;
    transition: opacity 0.2s;
  }
  .xm-follow-btn:hover { opacity: 0.9; }

  /* Trending / metrics */
  .xm-trend-item {
    padding: 12px 16px;
    transition: background 0.2s;
  }
  .xm-trend-item:hover { background: var(--xm-bg-hover); }
  .xm-trend-category {
    font-size: 13px; color: var(--xm-text-secondary);
  }
  .xm-trend-topic {
    font-size: 15px; font-weight: 700;
    margin: 2px 0;
  }
  .xm-trend-stat {
    font-size: 13px; color: var(--xm-text-secondary);
  }

  /* Sidebar products */
  .xm-sidebar-product {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    width: 100%;
    text-align: left;
    transition: background 0.2s;
  }
  .xm-sidebar-product:hover { background: var(--xm-bg-hover); }
  .xm-sidebar-product-img-wrap {
    width: 48px; height: 48px;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
    background: var(--xm-bg);
  }
  .xm-sidebar-product-img {
    width: 100%; height: 100%; object-fit: cover; display: block;
  }
  .xm-sidebar-product-img--placeholder {
    display: flex; align-items: center; justify-content: center;
  }
  .xm-sidebar-product-info { flex: 1; min-width: 0; }
  .xm-sidebar-product-name {
    font-size: 15px; font-weight: 700;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .xm-sidebar-product-price {
    font-size: 13px; color: var(--xm-gold); font-weight: 600;
  }

  /* Right footer */
  .xm-right-footer {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 8px;
    padding: 16px 0;
    font-size: 13px;
    color: var(--xm-text-secondary);
  }
  .xm-right-footer a:hover { text-decoration: underline; }

  /* ── CART ── */
  .xm-cart-overlay {
    position: fixed; inset: 0;
    background: rgba(91,112,131,0.4);
    z-index: 200;
  }
  .xm-cart-drawer {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 480px;
    max-width: 95vw;
    max-height: 80vh;
    overflow-y: auto;
    background: var(--xm-bg);
    border: 1px solid var(--xm-border);
    border-radius: 16px;
    padding: 20px;
    z-index: 201;
  }
  .xm-cart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .xm-cart-header h2 { font-size: 20px; font-weight: 800; }
  .xm-cart-header button {
    font-size: 24px;
    color: var(--xm-text-secondary) !important;
    width: 36px; height: 36px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.2s;
  }
  .xm-cart-header button:hover { background: var(--xm-bg-hover); }
  .xm-cart-empty {
    text-align: center;
    color: var(--xm-text-secondary);
    padding: 32px;
  }
  .xm-cart-item {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid var(--xm-border);
    font-size: 15px;
  }
  .xm-cart-item-price { color: var(--xm-gold); font-weight: 700; }
  .xm-cart-total {
    display: flex;
    justify-content: space-between;
    padding: 16px 0 8px;
    font-size: 17px;
    font-weight: 800;
  }
  .xm-checkout-btn {
    width: 100%;
    padding: 14px;
    margin-top: 8px;
    background: var(--xm-accent) !important;
    color: #fff !important;
    font-size: 15px;
    font-weight: 700;
    border-radius: 9999px;
    transition: background 0.2s;
  }
  .xm-checkout-btn:hover { background: var(--xm-accent-hover) !important; }

  .xm-cart-fab {
    position: fixed;
    bottom: 24px; right: 24px;
    width: 56px; height: 56px;
    border-radius: 50%;
    background: var(--xm-accent) !important;
    color: #fff !important;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(29,155,240,0.5);
    z-index: 100;
    transition: transform 0.2s;
  }
  .xm-cart-fab:hover { transform: scale(1.05); }
  .xm-cart-fab-count {
    position: absolute;
    top: -2px; right: -2px;
    background: var(--xm-pink);
    color: #fff;
    font-size: 11px; font-weight: 700;
    width: 20px; height: 20px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid var(--xm-bg);
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 1020px) {
    .xm-right-sidebar { display: none; }
    .xm-center { max-width: none; }
  }
  @media (max-width: 680px) {
    .xm-tabs { overflow-x: auto; }
    .xm-store-grid { grid-template-columns: 1fr; }
    .xm-pfp { width: 90px; height: 90px; }
    .xm-pfp-container { margin-top: -46px; }
  }
`;
