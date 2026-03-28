"use client";

import { CreatorProfile, TopPost, TopFollower, Product, DRUPAL_API_URL } from "@/lib/drupal";
import Image from "next/image";
import Link from "next/link";
import FollowButton from "@/components/FollowButton";
import ShoutoutWall from "@/components/ShoutoutWall";
import MyPicks from "@/components/MyPicks";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MinimalThemeProps {
  profile: CreatorProfile;
  products?: Product[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}


const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function MinimalTheme({ profile, products = [] }: MinimalThemeProps) {
  const metrics = profile.metrics;

  return (
    <>
      <style>{`
        .minimal-card {
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          background: #ffffff;
          transition: box-shadow 0.2s ease;
        }
        .minimal-card:hover {
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
        }
        .minimal-pill {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 9999px;
          background: #f0f0f0;
          color: #555;
          font-size: 13px;
          line-height: 1.4;
        }
        .minimal-stat-card {
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          background: #ffffff;
          padding: 20px;
          text-align: center;
        }
        .minimal-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 12px 32px;
          border-radius: 8px;
          background: #111;
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.15s ease;
          border: none;
          cursor: pointer;
        }
        .minimal-btn:hover {
          background: #333;
        }
        .minimal-follower-scroll {
          display: flex;
          gap: 24px;
          overflow-x: auto;
          padding-bottom: 8px;
        }
        .minimal-follower-scroll::-webkit-scrollbar {
          height: 4px;
        }
        .minimal-follower-scroll::-webkit-scrollbar-thumb {
          background: #ddd;
          border-radius: 2px;
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#fafafa",
          fontFamily: FONT_STACK,
          color: "#111",
          lineHeight: 1.6,
        }}
      >
        {/* Hero */}
        <section
          style={{
            maxWidth: 896,
            margin: "0 auto",
            padding: "64px 24px 0",
            textAlign: "center",
          }}
        >
          {profile.profile_picture_url ? (
            <Image
              src={profile.profile_picture_url}
              alt={profile.x_username}
              width={120}
              height={120}
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid #e5e5e5",
                display: "block",
                margin: "0 auto 24px",
              }}
            />
          ) : (
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                backgroundColor: "#e5e5e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
                fontSize: 48,
                fontWeight: 700,
                color: "#999",
              }}
            >
              {profile.x_username.charAt(0).toUpperCase()}
            </div>
          )}

          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              margin: "0 0 4px",
              letterSpacing: "-0.02em",
            }}
          >
            {profile.title || profile.x_username}
          </h1>

          <p style={{ fontSize: 15, color: "#888", margin: "0 0 8px" }}>
            @{profile.x_username}
          </p>

          <p style={{ fontSize: 14, color: "#666", margin: "0 0 16px" }}>
            {formatNumber(profile.follower_count)} followers
          </p>

          {profile.bio && (
            <p
              style={{
                fontSize: 15,
                color: "#444",
                maxWidth: 560,
                margin: "0 auto",
                lineHeight: 1.7,
              }}
              dangerouslySetInnerHTML={{ __html: profile.bio }}
            />
          )}

          <div style={{ marginTop: 16 }}>
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

          <hr
            style={{
              border: "none",
              borderTop: "1px solid #e5e5e5",
              margin: "48px 0 0",
            }}
          />
        </section>

        {/* Two-column: Products left, Posts right */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 32 }}>
            {/* Left — Products */}
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: "#111", marginBottom: 24 }}>Shop</h2>
              {products.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
                  {products.map((product: Product) => (
                    <div
                      key={product.id}
                      style={{
                        border: "1px solid #e5e5e5",
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "#fff",
                        transition: "box-shadow 0.2s",
                      }}
                      className="hover:shadow-md"
                    >
                      {product.image_url ? (
                        <Image src={product.image_url} alt={product.title} width={800} height={200} style={{ width: "100%", height: 200, objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: 200, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>🛍️</div>
                      )}
                      <div style={{ padding: 16 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 600, color: "#111", marginBottom: 4 }}>{product.title}</h3>
                        {product.description && (
                          <p style={{ fontSize: 13, color: "#666", marginBottom: 12, lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: product.description }} />
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 18, fontWeight: 700, color: "#111" }}>${parseFloat(product.price).toFixed(2)}</span>
                          <button style={{ background: "#111", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add to Cart</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "#999", fontSize: 15 }}>No products listed yet.</p>
              )}
            </div>

            {/* Right — Recent Posts */}
            <div style={{ position: "sticky", top: 24, alignSelf: "start", maxHeight: "100vh", overflowY: "auto" }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 24px", letterSpacing: "-0.01em" }}>Recent Posts</h2>
              {profile.top_posts.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {profile.top_posts.map((post: TopPost, i: number) => (
                    <div key={post.id || i} className="minimal-card" style={{ overflow: "hidden" }}>
                      {post.image_url && (
                        <Image src={post.image_url} alt="" width={1200} height={675} style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block", borderBottom: "1px solid #e5e5e5", height: "auto" }} />
                      )}
                      <div style={{ padding: 16 }}>
                        <p style={{ fontSize: 14, color: "#333", margin: "0 0 10px", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.text}</p>
                        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#999" }}>
                          <span>{formatNumber(post.likes)} likes</span>
                          <span>{formatNumber(post.retweets)} RTs</span>
                          <span>{formatNumber(post.views)} views</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "#999", fontSize: 14 }}>No posts yet.</p>
              )}
            </div>
          </div>
        </section>

        {/* Responsive: stack on mobile */}
        <style>{`
          @media (max-width: 768px) {
            section > div[style*="grid-template-columns: 1fr 380px"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>

        {/* Notable Followers */}
        {profile.top_followers.length > 0 && (
          <section
            style={{
              maxWidth: 896,
              margin: "0 auto",
              padding: "48px 24px 0",
            }}
          >
            <h2
              style={{
                fontSize: 20,
                fontWeight: 600,
                margin: "0 0 24px",
                letterSpacing: "-0.01em",
              }}
            >
              Notable Followers
            </h2>

            <div className="minimal-follower-scroll">
              {profile.top_followers.map((f: TopFollower, i: number) => (
                <div
                  key={f.username || i}
                  style={{
                    flexShrink: 0,
                    textAlign: "center",
                    width: 100,
                  }}
                >
                  {f.profile_image_url ? (
                    <Image
                      src={f.profile_image_url}
                      alt={f.display_name}
                      width={48}
                      height={48}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid #e5e5e5",
                        display: "block",
                        margin: "0 auto 8px",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        backgroundColor: "#e5e5e5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 8px",
                        fontSize: 18,
                        fontWeight: 600,
                        color: "#999",
                      }}
                    >
                      {f.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      margin: "0 0 2px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {f.display_name}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#888",
                      margin: "0 0 2px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    @{f.username}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#aaa",
                      margin: 0,
                    }}
                  >
                    {formatNumber(f.follower_count)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Analytics */}
        {metrics && (
          <section
            style={{
              maxWidth: 896,
              margin: "0 auto",
              padding: "48px 24px 0",
            }}
          >
            <h2
              style={{
                fontSize: 20,
                fontWeight: 600,
                margin: "0 0 24px",
                letterSpacing: "-0.01em",
              }}
            >
              Analytics
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
              }}
            >
              <div className="minimal-stat-card">
                <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px" }}>
                  Engagement
                </p>
                <p style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
                  {metrics.engagement_score}
                </p>
              </div>
              <div className="minimal-stat-card">
                <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px" }}>
                  Avg Likes
                </p>
                <p style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
                  {formatNumber(metrics.avg_likes)}
                </p>
              </div>
              <div className="minimal-stat-card">
                <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px" }}>
                  Avg Retweets
                </p>
                <p style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
                  {formatNumber(metrics.avg_retweets)}
                </p>
              </div>
              <div className="minimal-stat-card">
                <p style={{ fontSize: 12, color: "#888", margin: "0 0 4px" }}>
                  Avg Views
                </p>
                <p style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
                  {formatNumber(metrics.avg_views)}
                </p>
              </div>
            </div>

            {metrics.top_themes.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <p style={{ fontSize: 13, color: "#888", margin: "0 0 10px" }}>
                  Top Themes
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {metrics.top_themes.map((theme) => (
                    <span key={theme} className="minimal-pill">
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {metrics.audience_sentiment && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 13, color: "#888", margin: "0 0 4px" }}>
                  Audience Sentiment
                </p>
                <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>
                  {metrics.audience_sentiment}
                </p>
              </div>
            )}
          </section>
        )}

        {/* MyPicks + ShoutoutWall */}
        <div style={{ maxWidth: 896, margin: "0 auto", padding: "48px 24px 0" }}>
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

        {/* Store Link */}
        {profile.linked_store_id && (
          <section
            style={{
              maxWidth: 896,
              margin: "0 auto",
              padding: "48px 24px 0",
              textAlign: "center",
            }}
          >
            <a
              href={`${DRUPAL_API_URL}/store/${profile.linked_store_id}`}
              className="minimal-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit Store
              <span aria-hidden="true">&rarr;</span>
            </a>
          </section>
        )}

        {/* Footer */}
        <footer
          style={{
            maxWidth: 896,
            margin: "0 auto",
            padding: "64px 24px 32px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 13, color: "#bbb", margin: 0 }}>
            Powered by{" "}
            <Link
              href="/"
              style={{
                color: "#999",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              RareImagery
            </Link>
          </p>
        </footer>
      </div>
    </>
  );
}
