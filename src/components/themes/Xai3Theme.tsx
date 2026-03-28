"use client";
// Xai3 Theme — RareImagery Subscriber Store
// X-feed style 600px center column, rich design tokens, cart, tabs, suggested stores

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import FollowButton from "@/components/FollowButton";
import ShoutoutWall from "@/components/ShoutoutWall";
import MyPicks from "@/components/MyPicks";
import SupporterBadge from "@/components/SupporterBadge";

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
  x_subscription_tier?: string | null;
}

interface Xai3ThemeProps {
  profile: Profile;
  products: Product[];
}

// ─── Sub-components ────────────────────────────────────────────────────────

function VerifiedBadge() {
  return (
    <svg
      viewBox="0 0 24 24"
      style={{
        width: 20,
        height: 20,
        display: "inline",
        verticalAlign: "middle",
      }}
    >
      <circle cx="12" cy="12" r="12" fill="#1D9BF0" />
      <path
        d="M9.5 16.5l-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4z"
        fill="white"
      />
    </svg>
  );
}

function Xai3ProductCard({
  product,
  onAddToCart,
}: {
  product: Product;
  onAddToCart: (p: Product) => void;
}) {
  const [added, setAdded] = useState(false);
  const handleAdd = () => {
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };
  return (
    <div className="xai3-product-card">
      <div className="xai3-product-img-wrap">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.title}
            fill
            className="xai3-product-img"
          />
        ) : (
          <div className="xai3-product-img-placeholder">🛍️</div>
        )}
      </div>
      <div className="xai3-product-info">
        <div className="xai3-product-title">{product.title}</div>
        <div className="xai3-product-price">
          ${parseFloat(product.price).toFixed(2)}
        </div>
        <button
          className={`xai3-add-btn ${added ? "xai3-add-btn--added" : ""}`}
          onClick={handleAdd}
        >
          {added ? "✓ Added" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}

function Xai3PostCard({ post }: { post: TopPost }) {
  const ago = (dateStr: string) => {
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };
  return (
    <div className="xai3-post-card">
      <div className="xai3-post-text">{post.text}</div>
      <div className="xai3-post-stats">
        <span>💬 {post.replies?.toLocaleString()}</span>
        <span>🔁 {post.retweets?.toLocaleString()}</span>
        <span>❤️ {post.likes?.toLocaleString()}</span>
        <span className="xai3-post-age">{ago(post.date)}</span>
      </div>
    </div>
  );
}

function Xai3FollowerCard({ follower }: { follower: TopFollower }) {
  return (
    <div className="xai3-suggested-card">
      {follower.profile_image_url ? (
        <Image
          src={follower.profile_image_url}
          alt={follower.display_name}
          width={40}
          height={40}
          className="xai3-suggested-pfp"
        />
      ) : (
        <div
          className="xai3-suggested-pfp"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--xai3-bg-card)",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--xai3-text-primary)",
          }}
        >
          {follower.display_name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="xai3-suggested-info">
        <div className="xai3-suggested-name">
          {follower.display_name}
          {follower.verified && (
            <span style={{ marginLeft: 4, color: "#1d9bf0" }}>✓</span>
          )}
        </div>
        <div className="xai3-suggested-handle">
          @{follower.username} · {formatCount(follower.follower_count)} followers
        </div>
      </div>
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ─── Main Xai3 Theme ──────────────────────────────────────────────────────

export default function Xai3Theme({ profile, products }: Xai3ThemeProps) {
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
      <style>{XAI3_STYLES}</style>

      <div className="xai3-layout">
        <div className="xai3-center">
          {/* Banner */}
          <div className="xai3-banner">
            {profile.banner_url && (
              <Image
                src={profile.banner_url}
                alt="banner"
                fill
                className="xai3-banner-img"
              />
            )}
            <div className="xai3-banner-overlay" />
          </div>

          {/* Profile */}
          <div className="xai3-profile-section">
            <div className="xai3-avatar-row">
              {profile.profile_picture_url ? (
                <Image
                  src={profile.profile_picture_url}
                  alt={profile.x_username}
                  width={80}
                  height={80}
                  className="xai3-avatar"
                />
              ) : (
                <div
                  className="xai3-avatar"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    fontWeight: 700,
                    color: "var(--xai3-text-primary)",
                  }}
                >
                  {profile.x_username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="xai3-rare-badge">
                <span>✦</span> Be Rare
              </div>
            </div>

            <div className="xai3-display-name">
              {profile.x_username}
              <VerifiedBadge />
              {profile.x_subscription_tier && profile.x_subscription_tier !== "none" && (
                <SupporterBadge tier={profile.x_subscription_tier as "rare_supporter" | "inner_circle"} size="sm" />
              )}
            </div>
            <div className="xai3-handle">@{profile.x_username}</div>
            {profile.bio && (
              <div
                className="xai3-bio"
                dangerouslySetInnerHTML={{
                  __html: profile.bio.replace(/<[^>]*>/g, ""),
                }}
              />
            )}

            <div className="xai3-meta">
              <div className="xai3-meta-item">
                🛍️ Powered by{" "}
                <strong
                  style={{ color: "var(--xai3-accent-purple)", marginLeft: 4 }}
                >
                  RareImagery
                </strong>
              </div>
            </div>

            {profile.linked_store_id && (
              <div style={{ margin: "12px 0" }}>
                <FollowButton
                  targetStoreId={profile.linked_store_id}
                  targetStoreName={profile.x_username}
                  followerCount={profile.follower_count}
                  size="md"
                  showCount={false}
                />
              </div>
            )}

            <div className="xai3-stats">
              <div className="xai3-stat">
                <strong>{formatCount(profile.follower_count)}</strong>
                <span>Followers</span>
              </div>
              <div className="xai3-stat">
                <strong>{products.length}</strong>
                <span>Products</span>
              </div>
              {profile.metrics && (
                <div className="xai3-stat">
                  <strong>{profile.metrics.engagement_score}</strong>
                  <span>Engagement</span>
                </div>
              )}
            </div>
          </div>

          {/* Two-column layout: Products left, Posts right */}
          <div className="xai3-two-col">
            {/* Left column — Products */}
            <div className="xai3-col-left">
              <div className="xai3-store-header">
                <div className="xai3-store-title">
                  🛍️ Store
                </div>
                {products.length > 0 && (
                  <div className="xai3-store-stats">
                    <span>
                      <strong>{products.length}</strong> items
                    </span>
                  </div>
                )}
              </div>

              {products.length > 0 ? (
                <div className="xai3-products-grid">
                  {products.map((p) => (
                    <Xai3ProductCard
                      key={p.id}
                      product={p}
                      onAddToCart={addToCart}
                    />
                  ))}
                </div>
              ) : (
                <div className="xai3-empty-store">
                  No products listed yet. Check back soon.
                </div>
              )}
            </div>

            {/* Right column — Recent Posts */}
            <div className="xai3-col-right">
              <div className="xai3-posts">
                <div className="xai3-posts-header">Recent Posts</div>
                {profile.top_posts.length > 0 ? (
                  profile.top_posts.map((post, i) => (
                    <Xai3PostCard key={post.id || i} post={post} />
                  ))
                ) : (
                  <div
                    style={{
                      padding: "32px 16px",
                      textAlign: "center",
                      color: "var(--xai3-text-secondary)",
                    }}
                  >
                    No cached posts yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Followers as Suggested */}
          {profile.top_followers.length > 0 && (
            <div className="xai3-suggested-section">
              <div className="xai3-suggested-title">Top Followers</div>
              <div className="xai3-suggested-subtitle">
                Notable community members
              </div>
              {profile.top_followers.slice(0, 4).map((f, i) => (
                <Xai3FollowerCard key={f.username || i} follower={f} />
              ))}
            </div>
          )}

          {/* Metrics panel */}
          {profile.metrics && (
            <div className="xai3-metrics-section">
              <div className="xai3-suggested-title">Creator Analytics</div>
              <div className="xai3-metrics-grid">
                <div className="xai3-metric-card">
                  <div className="xai3-metric-value">
                    {profile.metrics.engagement_score}
                  </div>
                  <div className="xai3-metric-label">Engagement</div>
                </div>
                <div className="xai3-metric-card">
                  <div className="xai3-metric-value">
                    {formatCount(profile.metrics.avg_likes)}
                  </div>
                  <div className="xai3-metric-label">Avg Likes</div>
                </div>
                <div className="xai3-metric-card">
                  <div className="xai3-metric-value">
                    {formatCount(profile.metrics.avg_retweets)}
                  </div>
                  <div className="xai3-metric-label">Avg RTs</div>
                </div>
                <div className="xai3-metric-card">
                  <div className="xai3-metric-value">
                    {formatCount(profile.metrics.avg_views)}
                  </div>
                  <div className="xai3-metric-label">Avg Views</div>
                </div>
              </div>
              {profile.metrics.top_themes.length > 0 && (
                <div className="xai3-themes-row">
                  {profile.metrics.top_themes.map((theme) => (
                    <span key={theme} className="xai3-theme-tag">
                      {theme}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* My Picks */}
          {profile.linked_store_id && (
            <div style={{ padding: "0 16px", marginBottom: 24 }}>
              <MyPicks
                storeId={profile.linked_store_id}
                creatorUsername={profile.x_username}
              />
            </div>
          )}

          {/* Shoutout Wall */}
          {profile.linked_store_id && (
            <div style={{ padding: "0 16px", marginBottom: 24 }}>
              <ShoutoutWall
                storeId={profile.linked_store_id}
                storeName={profile.x_username}
              />
            </div>
          )}

          {/* Footer */}
          <div className="xai3-rare-footer">
            <Link href="/">
              Powered by <span>RareImagery</span> · Be Rare
            </Link>
          </div>
        </div>
      </div>

      {/* Cart FAB */}
      {cartCount > 0 && (
        <button className="xai3-cart-fab" onClick={() => setCartOpen(true)}>
          🛒
          <span className="xai3-cart-count">{cartCount}</span>
        </button>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <>
          <div
            className="xai3-cart-overlay"
            onClick={() => setCartOpen(false)}
          />
          <div className="xai3-cart-drawer">
            <div className="xai3-cart-title">Your Cart</div>
            {cart.map((item) => (
              <div key={item.id} className="xai3-cart-item">
                <span className="xai3-cart-item-title">
                  {item.title} × {item.qty}
                </span>
                <span className="xai3-cart-item-price">
                  ${(parseFloat(item.price) * item.qty).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="xai3-cart-total">
              <span>Total</span>
              <span
                style={{
                  color: "var(--xai3-accent-gold)",
                  fontFamily: "var(--xai3-font-mono)",
                }}
              >
                ${cartTotal.toFixed(2)}
              </span>
            </div>
            <button className="xai3-checkout-btn" onClick={handleCheckout} disabled={checkoutLoading}>
              {checkoutLoading ? "Redirecting..." : "Proceed to Checkout →"}
            </button>
          </div>
        </>
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const XAI3_STYLES = `
  /* ── Xai3 Design Tokens (scoped with prefix) ── */
  :root {
    --xai3-bg:            #000000;
    --xai3-bg-elevated:   #0f0f0f;
    --xai3-bg-card:       #16181c;
    --xai3-bg-hover:      #1d1f23;
    --xai3-border:        #2f3336;
    --xai3-border-subtle: #1f2123;
    --xai3-text-primary:  #e7e9ea;
    --xai3-text-secondary:#71767b;
    --xai3-text-link:     #1d9bf0;
    --xai3-accent-blue:   #1d9bf0;
    --xai3-accent-blue-hover: #1a8cd8;
    --xai3-accent-green:  #00ba7c;
    --xai3-accent-gold:   #D4AF37;
    --xai3-accent-purple: #7B2D8E;
    --xai3-font-display:  var(--font-sora), 'Sora', sans-serif;
    --xai3-font-body:     var(--font-dm-sans), 'DM Sans', sans-serif;
    --xai3-font-mono:     var(--font-jetbrains-mono), 'JetBrains Mono', monospace;
    --xai3-radius-sm:     4px;
    --xai3-radius-md:     12px;
    --xai3-radius-full:   9999px;
    --xai3-col-width:     1100px;
    --xai3-transition:    0.15s ease;
  }

  @keyframes xai3-fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ── Layout ── */
  .xai3-layout {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    background: var(--xai3-bg);
    color: var(--xai3-text-primary);
    font-family: var(--xai3-font-body);
    font-size: 15px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  .xai3-layout *, .xai3-layout *::before, .xai3-layout *::after {
    box-sizing: border-box;
  }
  .xai3-layout a { color: inherit; text-decoration: none; }
  .xai3-layout button { cursor: pointer; border: none; background: none; font-family: var(--xai3-font-body); }

  .xai3-center {
    width: 100%;
    max-width: var(--xai3-col-width);
    border-left: 1px solid var(--xai3-border-subtle);
    border-right: 1px solid var(--xai3-border-subtle);
    animation: xai3-fadeUp 0.3s ease both;
  }

  /* ── Banner ── */
  .xai3-banner {
    width: 100%;
    height: 200px;
    background: linear-gradient(135deg, var(--xai3-accent-purple) 0%, #1a0a22 60%, #0d0d0d 100%);
    position: relative;
    overflow: hidden;
  }
  .xai3-banner-img {
    object-fit: cover;
  }
  .xai3-banner-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.4) 100%);
  }

  /* ── Profile section ── */
  .xai3-profile-section {
    padding: 0 16px 16px;
    border-bottom: 1px solid var(--xai3-border);
  }
  .xai3-avatar-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: -40px;
    margin-bottom: 12px;
  }
  .xai3-avatar {
    width: 80px; height: 80px;
    border-radius: 50%;
    border: 4px solid var(--xai3-bg);
    object-fit: cover;
    background: var(--xai3-bg-card);
  }
  .xai3-rare-badge {
    display: flex; align-items: center; gap: 6px;
    background: var(--xai3-accent-purple);
    color: #fff;
    font-family: var(--xai3-font-display);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 6px 14px;
    border-radius: var(--xai3-radius-full);
  }
  .xai3-display-name {
    font-family: var(--xai3-font-display);
    font-size: 20px;
    font-weight: 700;
    color: var(--xai3-text-primary);
    display: flex; align-items: center; gap: 6px;
    margin-bottom: 2px;
  }
  .xai3-handle {
    font-size: 14px;
    color: var(--xai3-text-secondary);
    margin-bottom: 10px;
  }
  .xai3-bio {
    font-size: 15px;
    color: var(--xai3-text-primary);
    margin-bottom: 12px;
    line-height: 1.6;
  }
  .xai3-meta {
    display: flex; gap: 16px; flex-wrap: wrap;
    font-size: 13px; color: var(--xai3-text-secondary);
    margin-bottom: 12px;
  }
  .xai3-meta-item {
    display: flex; align-items: center; gap: 4px;
  }
  .xai3-stats {
    display: flex; gap: 20px;
    font-size: 14px;
  }
  .xai3-stat strong {
    color: var(--xai3-text-primary);
    font-family: var(--xai3-font-display);
    font-weight: 600;
  }
  .xai3-stat span {
    color: var(--xai3-text-secondary);
    margin-left: 4px;
  }

  /* ── Two-column layout ── */
  .xai3-two-col {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 1px;
    background: var(--xai3-border-subtle);
    border-top: 1px solid var(--xai3-border);
  }
  .xai3-col-left {
    background: var(--xai3-bg);
    min-height: 400px;
  }
  .xai3-col-right {
    background: var(--xai3-bg);
    border-left: 1px solid var(--xai3-border-subtle);
    position: sticky;
    top: 0;
    height: fit-content;
    max-height: 100vh;
    overflow-y: auto;
  }
  @media (max-width: 768px) {
    .xai3-two-col {
      grid-template-columns: 1fr;
    }
    .xai3-col-right {
      position: static;
      max-height: none;
      border-left: none;
      border-top: 1px solid var(--xai3-border);
    }
  }

  /* ── Store panel ── */
  .xai3-store-header {
    padding: 16px 16px 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .xai3-store-title {
    font-family: var(--xai3-font-display);
    font-size: 16px;
    font-weight: 700;
    color: var(--xai3-text-primary);
  }
  .xai3-store-stats {
    display: flex; gap: 16px;
    font-size: 12px; color: var(--xai3-text-secondary);
  }
  .xai3-store-stats strong {
    color: var(--xai3-accent-gold);
    font-family: var(--xai3-font-mono);
  }
  .xai3-products-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1px;
    background: var(--xai3-border-subtle);
  }
  @media (max-width: 480px) {
    .xai3-products-grid { grid-template-columns: 1fr; }
  }
  .xai3-product-card {
    background: var(--xai3-bg);
    transition: background var(--xai3-transition);
  }
  .xai3-product-card:hover { background: var(--xai3-bg-hover); }
  .xai3-product-img-wrap {
    aspect-ratio: 1;
    overflow: hidden;
    background: var(--xai3-bg-card);
    position: relative;
  }
  .xai3-product-img {
    object-fit: cover;
    transition: transform 0.3s ease;
  }
  .xai3-product-card:hover .xai3-product-img { transform: scale(1.03); }
  .xai3-product-img-placeholder {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    font-size: 40px; color: var(--xai3-text-secondary);
  }
  .xai3-product-info {
    padding: 12px;
  }
  .xai3-product-title {
    font-family: var(--xai3-font-display);
    font-size: 14px; font-weight: 600;
    color: var(--xai3-text-primary);
    margin-bottom: 4px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .xai3-product-price {
    font-family: var(--xai3-font-mono);
    font-size: 15px;
    color: var(--xai3-accent-gold);
    font-weight: 500;
    margin-bottom: 10px;
  }
  .xai3-add-btn {
    width: 100%;
    padding: 8px;
    border-radius: var(--xai3-radius-full);
    background: var(--xai3-accent-blue) !important;
    color: #fff !important;
    font-size: 13px;
    font-weight: 600;
    transition: background var(--xai3-transition), transform var(--xai3-transition);
  }
  .xai3-add-btn:hover { background: var(--xai3-accent-blue-hover) !important; transform: scale(0.98); }
  .xai3-add-btn--added { background: var(--xai3-accent-green) !important; }
  .xai3-empty-store {
    padding: 48px 16px;
    text-align: center;
    color: var(--xai3-text-secondary);
    font-size: 15px;
  }

  /* ── Posts panel ── */
  .xai3-posts {
    border-top: 1px solid var(--xai3-border-subtle);
  }
  .xai3-posts-header {
    padding: 16px;
    font-family: var(--xai3-font-display);
    font-size: 14px;
    font-weight: 600;
    color: var(--xai3-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .xai3-post-card {
    display: block;
    padding: 14px 16px;
    border-bottom: 1px solid var(--xai3-border-subtle);
    transition: background var(--xai3-transition);
  }
  .xai3-post-card:hover { background: var(--xai3-bg-hover); }
  .xai3-post-text {
    font-size: 15px;
    color: var(--xai3-text-primary);
    line-height: 1.6;
    margin-bottom: 10px;
    white-space: pre-wrap;
  }
  .xai3-post-stats {
    display: flex; gap: 16px;
    font-size: 13px; color: var(--xai3-text-secondary);
  }
  .xai3-post-age { margin-left: auto; }

  /* ── Suggested / Followers section ── */
  .xai3-suggested-section {
    border-top: 1px solid var(--xai3-border);
    padding: 16px;
  }
  .xai3-suggested-title {
    font-family: var(--xai3-font-display);
    font-size: 16px; font-weight: 700;
    color: var(--xai3-text-primary);
    margin-bottom: 4px;
  }
  .xai3-suggested-subtitle {
    font-size: 13px; color: var(--xai3-text-secondary);
    margin-bottom: 16px;
  }
  .xai3-suggested-card {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid var(--xai3-border-subtle);
    transition: background var(--xai3-transition);
  }
  .xai3-suggested-card:last-child { border-bottom: none; }
  .xai3-suggested-card:hover { opacity: 0.85; }
  .xai3-suggested-pfp {
    width: 40px; height: 40px;
    border-radius: 50%; object-fit: cover;
    background: var(--xai3-bg-card); flex-shrink: 0;
  }
  .xai3-suggested-info { flex: 1; min-width: 0; }
  .xai3-suggested-name {
    font-weight: 600; font-size: 14px;
    color: var(--xai3-text-primary);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .xai3-suggested-handle {
    font-size: 13px; color: var(--xai3-text-secondary);
  }

  /* ── Metrics section ── */
  .xai3-metrics-section {
    border-top: 1px solid var(--xai3-border);
    padding: 16px;
  }
  .xai3-metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: 12px;
  }
  @media (max-width: 480px) {
    .xai3-metrics-grid { grid-template-columns: repeat(2, 1fr); }
  }
  .xai3-metric-card {
    background: var(--xai3-bg-card);
    border-radius: var(--xai3-radius-md);
    padding: 12px;
    text-align: center;
  }
  .xai3-metric-value {
    font-family: var(--xai3-font-mono);
    font-size: 18px;
    font-weight: 700;
    color: var(--xai3-accent-gold);
  }
  .xai3-metric-label {
    font-size: 11px;
    color: var(--xai3-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 4px;
  }
  .xai3-themes-row {
    display: flex; flex-wrap: wrap; gap: 6px;
    margin-top: 12px;
  }
  .xai3-theme-tag {
    background: var(--xai3-accent-purple);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: var(--xai3-radius-full);
  }

  /* ── Cart FAB ── */
  .xai3-cart-fab {
    position: fixed;
    bottom: 24px; right: 24px;
    width: 56px; height: 56px;
    border-radius: 50%;
    background: var(--xai3-accent-blue);
    color: #fff;
    font-size: 22px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 20px rgba(29,155,240,0.35);
    z-index: 100;
    transition: transform var(--xai3-transition), background var(--xai3-transition);
    border: none; cursor: pointer;
  }
  .xai3-cart-fab:hover { transform: scale(1.05); background: var(--xai3-accent-blue-hover); }
  .xai3-cart-count {
    position: absolute;
    top: -4px; right: -4px;
    background: var(--xai3-accent-purple);
    color: #fff;
    font-family: var(--xai3-font-mono);
    font-size: 11px; font-weight: 700;
    width: 20px; height: 20px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }

  /* ── Cart drawer ── */
  .xai3-cart-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.6);
    z-index: 200;
    backdrop-filter: blur(4px);
  }
  .xai3-cart-drawer {
    position: fixed;
    bottom: 0; left: 50%; transform: translateX(-50%);
    width: 100%; max-width: var(--xai3-col-width);
    background: var(--xai3-bg-elevated);
    border-radius: var(--xai3-radius-md) var(--xai3-radius-md) 0 0;
    border: 1px solid var(--xai3-border);
    border-bottom: none;
    padding: 20px;
    z-index: 201;
    max-height: 70vh;
    overflow-y: auto;
  }
  .xai3-cart-title {
    font-family: var(--xai3-font-display);
    font-size: 18px; font-weight: 700;
    margin-bottom: 16px;
    color: var(--xai3-text-primary);
  }
  .xai3-cart-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid var(--xai3-border-subtle);
    font-size: 14px;
    color: var(--xai3-text-primary);
  }
  .xai3-cart-item-title { font-weight: 500; }
  .xai3-cart-item-price {
    font-family: var(--xai3-font-mono);
    color: var(--xai3-accent-gold);
  }
  .xai3-cart-total {
    display: flex; justify-content: space-between;
    padding: 14px 0 4px;
    font-family: var(--xai3-font-display);
    font-weight: 700; font-size: 16px;
    color: var(--xai3-text-primary);
  }
  .xai3-checkout-btn {
    width: 100%;
    padding: 14px;
    background: var(--xai3-accent-blue) !important;
    color: #fff !important;
    border-radius: var(--xai3-radius-full);
    font-size: 15px; font-weight: 700;
    margin-top: 12px;
    transition: background var(--xai3-transition);
    border: none; cursor: pointer;
  }
  .xai3-checkout-btn:hover { background: var(--xai3-accent-blue-hover) !important; }

  /* ── Footer ── */
  .xai3-rare-footer {
    padding: 24px 16px;
    text-align: center;
    border-top: 1px solid var(--xai3-border-subtle);
  }
  .xai3-rare-footer a {
    font-family: var(--xai3-font-display);
    font-size: 13px;
    color: var(--xai3-text-secondary);
    transition: color var(--xai3-transition);
  }
  .xai3-rare-footer a:hover { color: var(--xai3-accent-gold); }
  .xai3-rare-footer span {
    color: var(--xai3-accent-purple);
    font-weight: 700;
  }
`;
