"use client";

import { CreatorProfile, TopPost, TopFollower, Metrics, Product, DRUPAL_API_URL } from "@/lib/drupal";
import FollowButton from "@/components/FollowButton";
import ShoutoutWall from "@/components/ShoutoutWall";
import MyPicks from "@/components/MyPicks";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}


// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
};

const glassCardHoverable = "neon-glass-card";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NeonThemeProps {
  products?: Product[];
  profile: CreatorProfile;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NeonTheme({ profile, products = [] }: NeonThemeProps) {
  const { metrics } = profile;

  return (
    <>
      {/* GLOBAL STYLES */}
      <style>{`
        .neon-page {
          font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
        }
        .neon-glass-card {
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .neon-glass-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 0 24px rgba(168,85,247,0.35), 0 8px 32px rgba(0,0,0,0.4);
          border-color: rgba(168,85,247,0.4);
        }
        .neon-cta {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .neon-cta:hover {
          transform: scale(1.04);
          box-shadow: 0 0 40px rgba(168,85,247,0.5), 0 0 80px rgba(6,182,212,0.3);
        }
        .neon-stat-value {
          text-shadow: 0 0 12px rgba(168,85,247,0.6), 0 0 24px rgba(168,85,247,0.3);
        }
        .neon-follower-glow:hover {
          box-shadow: 0 0 20px rgba(6,182,212,0.4);
        }
        .neon-pill {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .neon-pill:hover {
          transform: scale(1.06);
          box-shadow: 0 0 16px rgba(168,85,247,0.4);
        }
      `}</style>

      <div
        className="neon-page"
        style={{
          minHeight: "100vh",
          backgroundColor: "#0a0a0f",
          color: "#ffffff",
        }}
      >
        {/* 1. BANNER + PROFILE */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: "100%",
              height: 260,
              background: profile.banner_url
                ? `url(${profile.banner_url}) center/cover no-repeat`
                : "linear-gradient(135deg, #a855f7 0%, #6d28d9 40%, #06b6d4 100%)",
            }}
          />

          <div style={{ maxWidth: 1024, margin: "0 auto", padding: "0 24px", position: "relative" }}>
            <div style={{ marginTop: -64, display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
              <div
                style={{
                  width: 128, height: 128, borderRadius: "50%", overflow: "hidden",
                  border: "4px solid #0a0a0f",
                  boxShadow: "0 0 0 3px #a855f7, 0 0 30px rgba(168,85,247,0.5)",
                  flexShrink: 0, backgroundColor: "#1a1a2e",
                }}
              >
                {profile.profile_picture_url ? (
                  <img src={profile.profile_picture_url} alt={profile.title || profile.x_username}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 48, fontWeight: 700, color: "#a855f7",
                    background: "linear-gradient(135deg, #1a1a2e, #0a0a0f)" }}>
                    {(profile.title || profile.x_username).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div style={{ paddingBottom: 8 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: "-0.02em", color: "#ffffff" }}>
                  {profile.title || profile.x_username}
                </h1>
                <div style={{ fontSize: 15, color: "#06b6d4", marginTop: 2, fontWeight: 500 }}>
                  @{profile.x_username}
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 4, textShadow: "0 0 8px rgba(168,85,247,0.3)" }}>
                  {formatNumber(profile.follower_count)} followers
                </div>
                <div style={{ marginTop: 12 }}>
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
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div style={{ maxWidth: 1024, margin: "0 auto", padding: "32px 24px 64px" }}>
          {/* 2. BIO */}
          {profile.bio && (
            <div style={{ ...glassCard, padding: "24px 28px", marginBottom: 32, fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}
              dangerouslySetInnerHTML={{ __html: profile.bio }} />
          )}

          {/* 3. STATS BAR */}
          {metrics && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 40 }}>
              {[
                { label: "Engagement", value: metrics.engagement_score },
                { label: "Avg Likes", value: metrics.avg_likes },
                { label: "Avg Retweets", value: metrics.avg_retweets },
                { label: "Avg Views", value: metrics.avg_views },
              ].map((stat) => (
                <div key={stat.label} className={glassCardHoverable}
                  style={{ ...glassCard, padding: "20px 16px", textAlign: "center" }}>
                  <div className="neon-stat-value"
                    style={{ fontSize: 28, fontWeight: 800, color: "#a855f7", letterSpacing: "-0.02em" }}>
                    {formatNumber(stat.value)}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4, fontWeight: 600 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Two-column: Products left, Posts right */}
          <section style={{ marginBottom: 40 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>
              {/* Left — Shop */}
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#ffffff" }}>Shop</h2>
                <div style={{ width: 80, height: 3, background: "linear-gradient(90deg, #a855f7, #06b6d4)", borderRadius: 2, marginBottom: 20 }} />
                {products.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                    {products.map((product: Product) => (
                      <div key={product.id} style={{
                        background: "rgba(255,255,255,0.05)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(168,85,247,0.25)",
                        borderRadius: 16,
                        overflow: "hidden",
                        transition: "border-color 0.3s, box-shadow 0.3s",
                      }} className="hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.title} style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
                        ) : (
                          <div style={{ width: "100%", height: 180, background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(6,182,212,0.2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>🛍️</div>
                        )}
                        <div style={{ padding: 16 }}>
                          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 6 }}>{product.title}</h3>
                          {product.description && (
                            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 12, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} dangerouslySetInnerHTML={{ __html: product.description }} />
                          )}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 18, fontWeight: 700, background: "linear-gradient(90deg, #a855f7, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>${parseFloat(product.price).toFixed(2)}</span>
                            <button style={{ background: "linear-gradient(90deg, #a855f7, #06b6d4)", border: "none", borderRadius: 10, color: "#fff", padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Add to Cart</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>No products listed yet.</p>
                )}
              </div>

              {/* Right — Posts Feed */}
              <div style={{ position: "sticky", top: 32, alignSelf: "start", maxHeight: "100vh", overflowY: "auto" }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#ffffff" }}>Recent Posts</h2>
                <div style={{ width: 80, height: 3, background: "linear-gradient(90deg, #a855f7, #06b6d4)", borderRadius: 2, marginBottom: 20 }} />
                {profile.top_posts.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {profile.top_posts.map((post: TopPost, i: number) => (
                      <div key={post.id || i} className={glassCardHoverable} style={{ ...glassCard, overflow: "hidden" }}>
                        {post.image_url && (
                          <img src={post.image_url} alt="" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                        )}
                        <div style={{ padding: "14px 16px" }}>
                          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {post.text}
                          </p>
                          <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                            <span style={{ color: "#a855f7" }}>{formatNumber(post.likes)} likes</span>
                            <span>{formatNumber(post.retweets)} RTs</span>
                            <span>{formatNumber(post.views)} views</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>No posts yet.</p>
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

          {/* 5. TOP FOLLOWERS */}
          {profile.top_followers.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: "#ffffff" }}>Top Followers</h2>
              <div style={{ width: 80, height: 3, background: "linear-gradient(90deg, #a855f7, #06b6d4)", borderRadius: 2, marginBottom: 20 }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                {profile.top_followers.map((f: TopFollower, i: number) => (
                  <div key={f.username || i} className={`${glassCardHoverable} neon-follower-glow`}
                    style={{ ...glassCard, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", flexShrink: 0, boxShadow: "0 0 0 2px #a855f7, 0 0 12px rgba(168,85,247,0.3)", backgroundColor: "#1a1a2e" }}>
                      {f.profile_image_url ? (
                        <img src={f.profile_image_url} alt={f.display_name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#06b6d4" }}>
                          {f.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div style={{ overflow: "hidden" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {f.display_name}
                        {f.verified && (<span style={{ color: "#06b6d4", marginLeft: 4, fontSize: 12 }} title="Verified">&#10003;</span>)}
                      </div>
                      <div style={{ fontSize: 12, color: "#06b6d4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{f.username}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{formatNumber(f.follower_count)} followers</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 6. THEMES & RECOMMENDATIONS */}
          {metrics &&
            (metrics.top_themes.length > 0 || metrics.recommended_products.length > 0) && (
              <section style={{ marginBottom: 40 }}>
                {metrics.top_themes.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Themes</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {metrics.top_themes.map((t) => (
                        <span key={t} className="neon-pill" style={{ background: "linear-gradient(135deg, #a855f7, #06b6d4)", color: "#ffffff", padding: "6px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, display: "inline-block" }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                {metrics.recommended_products.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Recommended Products</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {metrics.recommended_products.map((product) => (
                        <span key={product} className="neon-pill" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(168,85,247,0.3)", color: "rgba(255,255,255,0.8)", padding: "6px 16px", borderRadius: 999, fontSize: 13, fontWeight: 500, display: "inline-block" }}>{product}</span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

          {/* MyPicks + ShoutoutWall */}
          <div style={{ marginBottom: 40 }}>
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

          {/* 7. STORE CTA */}
          {profile.linked_store_id && (
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <a href={`${DRUPAL_API_URL}/store/${profile.linked_store_id}`} className="neon-cta"
                style={{ display: "inline-block", background: "linear-gradient(135deg, #a855f7, #7c3aed, #06b6d4)", color: "#ffffff", fontSize: 18, fontWeight: 700, padding: "16px 48px", borderRadius: 14, textDecoration: "none", letterSpacing: "0.02em", boxShadow: "0 0 30px rgba(168,85,247,0.4), 0 0 60px rgba(6,182,212,0.15)" }}>
                Visit Store &rarr;
              </a>
            </div>
          )}

          {/* 8. FOOTER */}
          <footer style={{ textAlign: "center", paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", letterSpacing: "0.04em" }}>
              Powered by RareImagery X Marketplace
            </span>
          </footer>
        </div>
      </div>
    </>
  );
}
