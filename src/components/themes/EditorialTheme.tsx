"use client";

import { CreatorProfile, TopPost, TopFollower, Product, DRUPAL_API_URL } from "@/lib/drupal";
import Image from "next/image";
import Link from "next/link";
import FollowButton from "@/components/FollowButton";
import ShoutoutWall from "@/components/ShoutoutWall";
import MyPicks from "@/components/MyPicks";

// ─── HELPERS ────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000)
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

// ─── FONTS ──────────────────────────────────────────────────────────────────

const SERIF = '"Georgia", "Times New Roman", serif';
const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// ─── PROPS ──────────────────────────────────────────────────────────────────

interface EditorialThemeProps {
  products?: Product[];
  profile: CreatorProfile;
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function EditorialTheme({ profile, products = [] }: EditorialThemeProps) {
  const featuredPost = profile.top_posts[0] ?? null;
  const morePosts = profile.top_posts.slice(1);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "#f8f6f1",
        fontFamily: SANS,
        color: "#1a1a1a",
      }}
    >
      {/* ── MASTHEAD ── */}
      <header className="pt-16 pb-6 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-none"
            style={{ fontFamily: SERIF, color: "#111" }}
          >
            {profile.title || profile.x_username}
          </h1>

          <hr className="my-6 border-t border-neutral-300" />

          <div className="flex items-center justify-center gap-4 text-sm text-neutral-500">
            {profile.profile_picture_url ? (
              <Image
                src={profile.profile_picture_url}
                alt={profile.x_username}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover border border-neutral-200"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center border border-neutral-200 text-xl font-semibold"
                style={{ backgroundColor: "#ede9e0", color: "#b45309" }}
              >
                {profile.x_username.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-neutral-600">@{profile.x_username}</span>
            <span className="text-neutral-400" aria-hidden="true">
              &middot;
            </span>
            <span className="text-neutral-600">
              {formatNumber(profile.follower_count)} followers
            </span>
          </div>
          <div className="mt-4 flex justify-center">
            {profile.linked_store_id && (
              <FollowButton
                targetStoreId={profile.linked_store_id}
                targetStoreName={profile.x_username}
                followerCount={profile.follower_count}
                size="md"
                showCount={false}
              />
            )}
          </div>
        </div>
      </header>

      {/* ── BIO ── */}
      {profile.bio && (
        <section className="max-w-3xl mx-auto px-4 py-8">
          <div
            className="text-xl md:text-2xl leading-relaxed italic pl-6"
            style={{
              fontFamily: SERIF,
              borderLeft: "4px solid #b45309",
              color: "#374151",
            }}
            dangerouslySetInnerHTML={{ __html: profile.bio }}
          />
        </section>
      )}

      {/* ── TWO-COLUMN: Shop left, Posts right ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 16px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 40 }}>
          {/* Left — Shop */}
          <div>
            <h2 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 700, marginBottom: 8, color: "#1a1a1a" }}>Shop</h2>
            <div style={{ width: 60, height: 2, background: "#1a1a1a", marginBottom: 24 }} />
            {products.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 24 }}>
                {products.map((product: Product) => (
                  <div key={product.id} style={{ borderBottom: "2px solid #1a1a1a", paddingBottom: 16 }}>
                    {product.image_url ? (
                      <Image src={product.image_url} alt={product.title} width={800} height={200} style={{ width: "100%", height: 200, objectFit: "cover", marginBottom: 12 }} />
                    ) : (
                      <div style={{ width: "100%", height: 200, background: "#efe9dd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, marginBottom: 12 }}>🛍️</div>
                    )}
                    <h3 style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{product.title}</h3>
                    {product.description && (
                      <p style={{ fontSize: 13, color: "#555", marginBottom: 10, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: product.description }} />
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700 }}>${parseFloat(product.price).toFixed(2)}</span>
                      <button style={{ background: "#1a1a1a", color: "#f8f6f1", border: "none", padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: 0.5 }}>Add to Cart</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#999", fontFamily: SERIF, fontStyle: "italic" }}>No products listed yet.</p>
            )}
          </div>

          {/* Right — Posts Feed */}
          <div style={{ position: "sticky", top: 24, alignSelf: "start", maxHeight: "100vh", overflowY: "auto" }}>
            <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: SERIF, color: "#111" }}>Recent Posts</h2>
            {featuredPost && (
              <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid #e5e0d5" }}>
                {featuredPost.image_url && (
                  <Image src={featuredPost.image_url} alt="" width={1200} height={675} style={{ width: "100%", borderRadius: 8, objectFit: "cover", marginBottom: 12, maxHeight: 240, height: "auto" }} />
                )}
                <p style={{ fontFamily: SERIF, fontSize: 16, color: "#1f2937", lineHeight: 1.7, marginBottom: 8 }}>{featuredPost.text}</p>
                <div className="flex gap-3 text-xs tracking-widest uppercase text-neutral-400" style={{ letterSpacing: "0.08em" }}>
                  <span>{formatNumber(featuredPost.likes)} likes</span>
                  <span>{formatNumber(featuredPost.retweets)} RT</span>
                  <span>{formatNumber(featuredPost.views)} views</span>
                </div>
              </div>
            )}
            {morePosts.length > 0 && (
              <div className="divide-y divide-neutral-200">
                {morePosts.map((post: TopPost, i: number) => (
                  <article key={post.id || i} style={{ padding: "16px 0" }}>
                    <p style={{ color: "#374151", fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>{post.text}</p>
                    <div className="flex gap-3 text-xs tracking-widest uppercase text-neutral-400" style={{ letterSpacing: "0.08em" }}>
                      <span>{formatNumber(post.likes)} likes</span>
                      <span>{formatNumber(post.retweets)} RT</span>
                      <span>{formatNumber(post.views)} views</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {profile.top_posts.length === 0 && (
              <p style={{ color: "#999", fontFamily: SERIF, fontStyle: "italic" }}>No posts yet.</p>
            )}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          section > div[style*="grid-template-columns: 1fr 380px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* ── COMMUNITY ── */}
      {profile.top_followers.length > 0 && (
        <section className="max-w-3xl mx-auto px-4 py-10">
          <h2
            className="text-2xl font-bold mb-8"
            style={{ fontFamily: SERIF, color: "#111" }}
          >
            Community
          </h2>

          <div className="divide-y divide-neutral-200">
            {profile.top_followers.map((f: TopFollower, i: number) => (
              <div
                key={f.username || i}
                className="py-4 flex items-center gap-4"
              >
                {f.profile_image_url ? (
                  <Image
                    src={f.profile_image_url}
                    alt={f.display_name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                    style={{ backgroundColor: "#ede9e0", color: "#b45309" }}
                  >
                    {f.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-800 truncate">
                      {f.display_name}
                    </span>
                    {f.verified && (
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="#b45309"
                        aria-label="Verified"
                      >
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-neutral-400">
                    @{f.username}
                  </span>
                </div>
                <span className="text-sm text-neutral-500 whitespace-nowrap">
                  {formatNumber(f.follower_count)} followers
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── INSIGHTS ── */}
      {profile.metrics && (
        <section className="max-w-3xl mx-auto px-4 py-10">
          <h2
            className="text-2xl font-bold mb-8"
            style={{ fontFamily: SERIF, color: "#111" }}
          >
            Insights
          </h2>

          <div
            className="p-8 rounded"
            style={{
              backgroundColor: "#f0ece3",
              border: "1px solid #e5e0d5",
            }}
          >
            {/* Engagement score prominent */}
            <div className="mb-6 text-center">
              <span
                className="text-sm uppercase tracking-widest text-neutral-500"
                style={{ letterSpacing: "0.12em" }}
              >
                Engagement Score
              </span>
              <div
                className="text-5xl font-bold mt-1"
                style={{ fontFamily: SERIF, color: "#b45309" }}
              >
                {profile.metrics.engagement_score}
              </div>
            </div>

            {/* Description list */}
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-sm mb-6">
              <div>
                <dt className="text-neutral-500 uppercase tracking-wider text-xs">
                  Avg Likes
                </dt>
                <dd className="text-neutral-800 font-medium mt-0.5">
                  {formatNumber(profile.metrics.avg_likes)}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500 uppercase tracking-wider text-xs">
                  Avg Retweets
                </dt>
                <dd className="text-neutral-800 font-medium mt-0.5">
                  {formatNumber(profile.metrics.avg_retweets)}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500 uppercase tracking-wider text-xs">
                  Avg Views
                </dt>
                <dd className="text-neutral-800 font-medium mt-0.5">
                  {formatNumber(profile.metrics.avg_views)}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500 uppercase tracking-wider text-xs">
                  Posting Frequency
                </dt>
                <dd className="text-neutral-800 font-medium mt-0.5">
                  {profile.metrics.posting_frequency}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500 uppercase tracking-wider text-xs">
                  Audience Sentiment
                </dt>
                <dd
                  className="font-medium mt-0.5"
                  style={{ fontStyle: "italic", color: "#374151" }}
                >
                  {profile.metrics.audience_sentiment}
                </dd>
              </div>
            </dl>

            {/* Top themes */}
            {profile.metrics.top_themes.length > 0 && (
              <div className="text-sm text-neutral-600">
                <span className="uppercase tracking-wider text-xs text-neutral-500 mr-2">
                  Themes:
                </span>
                {profile.metrics.top_themes.join(" \u00B7 ")}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── MyPicks + ShoutoutWall ── */}
      <div className="max-w-3xl mx-auto px-4 py-10">
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

      {/* ── STORE LINK ── */}
      {profile.linked_store_id && (
        <section className="max-w-3xl mx-auto px-4 py-10 text-center">
          <a
            href={`${DRUPAL_API_URL}${profile.linked_store_path || `/store/${profile.linked_store_id}`}`}
            className="text-xl underline underline-offset-4 hover:opacity-80 transition-opacity"
            style={{ fontFamily: SERIF, color: "#b45309" }}
          >
            Visit the store &rarr;
          </a>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer className="max-w-3xl mx-auto px-4 pt-8 pb-12">
        <hr className="border-t border-neutral-300 mb-6" />
        <p className="text-center text-sm italic text-neutral-400">
          Published on{" "}
          <Link
            href="/"
            className="underline hover:text-neutral-600 transition-colors"
            style={{ color: "#b45309" }}
          >
            RareImagery X Marketplace
          </Link>
        </p>
      </footer>
    </div>
  );
}