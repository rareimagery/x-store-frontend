"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CreatorProfile, TopPost, TopFollower, Product } from "@/lib/drupal";
import FollowButton from "@/components/FollowButton";
import ShoutoutWall from "@/components/ShoutoutWall";
import MyPicks from "@/components/MyPicks";

// ─── THEME CONFIG ────────────────────────────────────────────────────────────

const FONT_MAP: Record<string, string> = {
  comic: '"Comic Sans MS", "Comic Sans", cursive',
  impact: 'Impact, "Arial Narrow", sans-serif',
  cursive: '"Brush Script MT", "Segoe Script", cursive',
  times: '"Times New Roman", Times, serif',
};

const TILE_PATTERNS: Record<string, string> = {
  stars: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30'%3E%3Ctext y='20' font-size='16'%3E⭐%3C/text%3E%3C/svg%3E")`,
  hearts: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30'%3E%3Ctext y='20' font-size='16'%3E💗%3C/text%3E%3C/svg%3E")`,
  skulls: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30'%3E%3Ctext y='20' font-size='16'%3E💀%3C/text%3E%3C/svg%3E")`,
};

function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export interface ThemeConfig {
  bgColor: string;
  bgTile: string;
  bgTileCustomUrl?: string;
  accentColor: string;
  secondColor: string;
  textColor: string;
  tableBorderColor: string;
  tableBgColor: string;
  font: string;
  glitterText?: boolean;
  cursorTrail: boolean;
  marqueeText: string;
  songUrl?: string;
  songTitle: string;
  songArtist: string;
  profileMood: string;
  onlineNow: boolean;
  visitorCount: number;
}

const DEFAULT_THEME: ThemeConfig = {
  bgColor: "#000033",
  bgTile: "stars",
  accentColor: "#ff00ff",
  secondColor: "#00ffff",
  textColor: "#ffffff",
  tableBorderColor: "#ff00ff",
  tableBgColor: "#000066",
  font: "comic",
  cursorTrail: true,
  marqueeText:
    "✨ Welcome to my store! ✨ Thanks for visiting! ✨ Leave a comment! ✨",
  songTitle: "My Song",
  songArtist: "Unknown Artist",
  profileMood: "🎵 Feeling creative",
  onlineNow: true,
  visitorCount: 2847,
};

// ─── PROPS ───────────────────────────────────────────────────────────────────

interface MySpaceThemeProps {
  profile: CreatorProfile;
  products?: Product[];
  backgroundUrl?: string;
  musicUrl?: string;
  glitterColor?: string;
  accentColor?: string;
  themeConfig?: Partial<ThemeConfig>;
}

// ─── CURSOR TRAIL HOOK ──────────────────────────────────────────────────────

function useCursorTrail(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const sparkles: HTMLDivElement[] = [];
    const emojis = ["✨", "⭐", "💫", "🌟", "✦"];
    const onMove = (e: MouseEvent) => {
      const el = document.createElement("div");
      el.style.cssText = `
        position:fixed;left:${e.clientX - 8}px;top:${e.clientY - 8}px;
        width:16px;height:16px;pointer-events:none;z-index:99999;
        font-size:14px;line-height:16px;text-align:center;
        animation:sparkle-fade 0.7s forwards;
      `;
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      document.body.appendChild(el);
      sparkles.push(el);
      setTimeout(() => {
        el.remove();
        sparkles.splice(sparkles.indexOf(el), 1);
      }, 700);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [enabled]);
}

// ─── GLITTER TEXT ────────────────────────────────────────────────────────────

function GlitterText({
  children,
  size = "1em",
}: {
  children: React.ReactNode;
  size?: string;
}) {
  const colors = [
    "#ff00ff",
    "#00ffff",
    "#ffff00",
    "#ff6600",
    "#00ff00",
    "#ff0066",
    "#6600ff",
  ];
  return (
    <span style={{ display: "inline-block", fontSize: size }}>
      {String(children)
        .split("")
        .map((char, i) => (
          <span
            key={i}
            style={{
              color: colors[i % colors.length],
              animation: `glitter ${0.3 + (i % 7) * 0.1}s infinite alternate`,
              display: "inline-block",
              textShadow: `0 0 8px ${colors[(i + 2) % colors.length]}, 0 0 16px ${colors[(i + 4) % colors.length]}`,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
    </span>
  );
}

// ─── BLINK BADGE ─────────────────────────────────────────────────────────────

function BlinkBadge({
  children,
  color = "#ff0000",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span
      style={{
        background: color,
        color: "#fff",
        padding: "2px 6px",
        fontSize: "0.7em",
        fontWeight: "bold",
        border: "1px solid #fff",
        animation: "blink 0.8s step-start infinite",
        display: "inline-block",
        verticalAlign: "middle",
      }}
    >
      {children}
    </span>
  );
}

// ─── PANEL ───────────────────────────────────────────────────────────────────

function Panel({
  title,
  theme,
  children,
  extra,
}: {
  title: string;
  theme: ThemeConfig;
  children: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: `3px solid ${theme.tableBorderColor}`,
        marginBottom: 12,
        boxShadow: `0 0 12px ${theme.tableBorderColor}, inset 0 0 8px rgba(0,0,0,0.5)`,
      }}
    >
      <div
        style={{
          background: `linear-gradient(90deg, ${theme.tableBorderColor}, ${theme.secondColor}, ${theme.tableBorderColor})`,
          padding: "4px 8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <b
          style={{
            fontFamily: FONT_MAP[theme.font],
            color: "#fff",
            textShadow: "1px 1px 0 #000",
            fontSize: "0.9em",
          }}
        >
          {title}
        </b>
        {extra}
      </div>
      <div style={{ background: theme.tableBgColor, padding: 10 }}>
        {children}
      </div>
    </div>
  );
}

// ─── MUSIC PLAYER ────────────────────────────────────────────────────────────

function MusicPlayer({
  theme,
  pfpUrl,
  songUrl,
  songTitle,
  songArtist,
}: {
  theme: ThemeConfig;
  pfpUrl: string | null;
  songUrl?: string;
  songTitle: string;
  songArtist: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [vol, setVol] = useState(80);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  return (
    <Panel title="🎵 Now Playing" theme={theme}>
      {songUrl && (
        <audio ref={audioRef} src={songUrl} loop preload="none" />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {pfpUrl && (
          <Image
            src={pfpUrl}
            alt=""
            width={40}
            height={40}
            style={{
              width: 40,
              height: 40,
              border: `2px solid ${theme.accentColor}`,
            }}
          />
        )}
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: theme.accentColor,
              fontWeight: "bold",
              fontSize: "0.85em",
            }}
          >
            {songTitle}
          </div>
          <div style={{ color: theme.secondColor, fontSize: "0.75em" }}>
            {songArtist}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 6,
          marginTop: 8,
          alignItems: "center",
        }}
      >
        <button
          onClick={toggle}
          style={{
            background: theme.accentColor,
            border: "none",
            color: "#fff",
            padding: "4px 12px",
            fontFamily: FONT_MAP[theme.font],
            cursor: "pointer",
            fontSize: "0.8em",
            fontWeight: "bold",
            boxShadow: `0 0 8px ${theme.accentColor}`,
          }}
        >
          {playing ? "⏸ PAUSE" : "▶ PLAY"}
        </button>
        <span style={{ color: theme.textColor, fontSize: "0.75em" }}>
          VOL:
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={vol}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVol(v);
            if (audioRef.current) audioRef.current.volume = v / 100;
          }}
          style={{ width: 70, accentColor: theme.accentColor }}
        />
      </div>
      {!songUrl && (
        <div
          style={{
            color: "#888",
            fontSize: "0.75em",
            marginTop: 6,
            fontStyle: "italic",
          }}
        >
          No song set — store owner can add one in the console
        </div>
      )}
    </Panel>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function MySpaceTheme({
  profile,
  products = [],
  backgroundUrl,
  musicUrl,
  glitterColor = "#ff00ff",
  accentColor = "#00ffff",
  themeConfig,
}: MySpaceThemeProps) {
  // Merge: defaults ← prop colors ← full JSON config from Drupal
  const theme: ThemeConfig = {
    ...DEFAULT_THEME,
    accentColor: glitterColor,
    secondColor: accentColor,
    tableBorderColor: glitterColor,
    ...themeConfig,
  };

  // themeConfig.songUrl overrides the musicUrl prop
  const effectiveMusicUrl = theme.songUrl || musicUrl;

  const [visitorCount] = useState(() => {
    const seed = profile.x_username || "rareimagery";
    return theme.visitorCount + (stableHash(seed) % 50);
  });

  useCursorTrail(theme.cursorTrail);

  const bgStyle: React.CSSProperties = backgroundUrl
    ? { backgroundImage: `url(${backgroundUrl})`, backgroundRepeat: "repeat" }
    : theme.bgTile === "custom" && theme.bgTileCustomUrl
      ? { backgroundImage: `url(${theme.bgTileCustomUrl})`, backgroundRepeat: "repeat" }
      : {
          backgroundImage: TILE_PATTERNS[theme.bgTile] || TILE_PATTERNS.stars,
          backgroundRepeat: "repeat",
          backgroundColor: theme.bgColor,
        };

  return (
    <>
      {/* ── GLOBAL STYLES ── */}
      <style>{`
        @keyframes glitter {
          0%   { transform: scale(1) rotate(0deg); filter: brightness(1); }
          100% { transform: scale(1.2) rotate(5deg); filter: brightness(1.8); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes sparkle-fade {
          0%   { opacity: 1; transform: scale(1) translateY(0); }
          100% { opacity: 0; transform: scale(0.3) translateY(-20px); }
        }
        @keyframes rainbow {
          0%   { color: #ff0000; text-shadow: 0 0 10px #ff0000; }
          14%  { color: #ff8800; text-shadow: 0 0 10px #ff8800; }
          28%  { color: #ffff00; text-shadow: 0 0 10px #ffff00; }
          42%  { color: #00ff00; text-shadow: 0 0 10px #00ff00; }
          57%  { color: #0088ff; text-shadow: 0 0 10px #0088ff; }
          71%  { color: #8800ff; text-shadow: 0 0 10px #8800ff; }
          85%  { color: #ff00ff; text-shadow: 0 0 10px #ff00ff; }
          100% { color: #ff0000; text-shadow: 0 0 10px #ff0000; }
        }
        @keyframes marquee {
          from { transform: translateX(100%); }
          to   { transform: translateX(-100%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes pulse-border {
          0%, 100% { border-color: ${glitterColor}; box-shadow: 0 0 10px ${glitterColor}; }
          50%       { border-color: ${accentColor}; box-shadow: 0 0 20px ${accentColor}; }
        }
        .ms-product-card:hover {
          transform: scale(1.04) rotate(-1deg) !important;
          z-index: 10 !important;
        }
        .ms-add-btn:hover {
          filter: brightness(1.3);
          transform: scale(1.05);
        }
        ::-webkit-scrollbar { width: 8px; background: #000; }
        ::-webkit-scrollbar-thumb { background: ${glitterColor}; border: 1px solid ${accentColor}; }
      `}</style>

      {/* ── PAGE WRAPPER ── */}
      <div
        style={{
          ...bgStyle,
          minHeight: "100vh",
          fontFamily: FONT_MAP[theme.font],
          color: theme.textColor,
          fontSize: 13,
        }}
      >
        {/* Scanline overlay */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
            zIndex: 1,
            backgroundImage:
              "linear-gradient(transparent 50%, rgba(0,0,0,0.15) 50%)",
            backgroundSize: "100% 4px",
          }}
        />

        {/* ── MARQUEE ── */}
        <div
          style={{
            background: `linear-gradient(90deg, #000, ${theme.accentColor}, #000)`,
            padding: "4px 0",
            overflow: "hidden",
            position: "sticky",
            top: 0,
            zIndex: 100,
            borderBottom: `2px solid ${theme.secondColor}`,
          }}
        >
          <div
            style={{
              animation: "marquee 18s linear infinite",
              whiteSpace: "nowrap",
              display: "inline-block",
            }}
          >
            {[...Array(3)].map((_, i) => (
              <span
                key={i}
                style={{
                  marginRight: 80,
                  fontSize: "0.85em",
                  fontWeight: "bold",
                  textShadow: `0 0 8px ${theme.secondColor}`,
                }}
              >
                {theme.marqueeText}
              </span>
            ))}
          </div>
        </div>

        {/* ── MAIN LAYOUT ── */}
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "12px 8px",
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* ── STORE HEADER ── */}
          <div
            style={{
              background: `linear-gradient(135deg, ${theme.bgColor}, #000 40%, ${theme.tableBgColor})`,
              border: `3px solid ${theme.accentColor}`,
              boxShadow: `0 0 30px ${theme.accentColor}, inset 0 0 20px rgba(0,0,0,0.7)`,
              padding: 16,
              marginBottom: 12,
              animation: "pulse-border 2s infinite",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              {/* PFP */}
              <div
                style={{
                  textAlign: "center",
                  animation: "float 3s ease-in-out infinite",
                }}
              >
                {profile.profile_picture_url ? (
                  <Image
                    src={profile.profile_picture_url}
                    alt={profile.x_username}
                    width={100}
                    height={100}
                    style={{
                      width: 100,
                      height: 100,
                      border: `4px solid ${theme.accentColor}`,
                      boxShadow: `0 0 20px ${theme.accentColor}`,
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 100,
                      height: 100,
                      border: `4px solid ${theme.accentColor}`,
                      boxShadow: `0 0 20px ${theme.accentColor}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#000",
                      color: theme.accentColor,
                      fontSize: "2.5em",
                      fontWeight: "bold",
                    }}
                  >
                    {profile.x_username.charAt(0).toUpperCase()}
                  </div>
                )}
                {theme.onlineNow && (
                  <div style={{ marginTop: 4 }}>
                    <BlinkBadge color="#00aa00">● ONLINE</BlinkBadge>
                  </div>
                )}
              </div>

              {/* Name + Bio */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <GlitterText size="1.8em">
                  {profile.title || profile.x_username}
                </GlitterText>
                <div
                  style={{
                    color: theme.secondColor,
                    fontSize: "0.8em",
                    marginBottom: 6,
                    marginTop: 4,
                  }}
                >
                  @{profile.x_username} ·{" "}
                  <span
                    style={{
                      animation: "rainbow 2s linear infinite",
                      display: "inline-block",
                    }}
                  >
                    {profile.follower_count.toLocaleString()} followers
                  </span>
                </div>
                {profile.bio && (
                  <div
                    style={{
                      fontSize: "0.85em",
                      lineHeight: 1.5,
                      color: theme.textColor,
                      background: "rgba(0,0,0,0.4)",
                      padding: "6px 8px",
                      border: `1px solid ${theme.tableBorderColor}`,
                    }}
                    dangerouslySetInnerHTML={{ __html: profile.bio }}
                  />
                )}
                <div
                  style={{
                    marginTop: 6,
                    fontSize: "0.78em",
                    color: theme.accentColor,
                  }}
                >
                  Mood: {theme.profileMood}
                </div>
                {profile.linked_store_id && (
                  <div style={{ marginTop: 8 }}>
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

              {/* Stats */}
              <div
                style={{ fontSize: "0.75em", textAlign: "center", minWidth: 90 }}
              >
                <div
                  style={{
                    border: `1px solid ${theme.tableBorderColor}`,
                    padding: "4px 8px",
                    marginBottom: 4,
                    background: "rgba(0,0,0,0.5)",
                  }}
                >
                  <div style={{ color: theme.secondColor }}>VISITORS</div>
                  <div
                    style={{
                      color: theme.accentColor,
                      fontSize: "1.3em",
                      fontWeight: "bold",
                      animation: "glitter 1s alternate infinite",
                    }}
                  >
                    {visitorCount.toLocaleString()}
                  </div>
                </div>
                <div
                  style={{
                    border: `1px solid ${theme.tableBorderColor}`,
                    padding: "4px 8px",
                    background: "rgba(0,0,0,0.5)",
                  }}
                >
                  <div style={{ color: theme.secondColor }}>POSTS</div>
                  <div
                    style={{
                      color: theme.accentColor,
                      fontSize: "1.3em",
                      fontWeight: "bold",
                    }}
                  >
                    {profile.top_posts.length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── TWO COLUMN LAYOUT ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "200px 1fr",
              gap: 12,
            }}
          >
            {/* LEFT COLUMN */}
            <div>
              <MusicPlayer
                theme={theme}
                pfpUrl={profile.profile_picture_url}
                songUrl={effectiveMusicUrl}
                songTitle={theme.songTitle}
                songArtist={theme.songArtist}
              />

              {/* About */}
              <Panel title="💀 About Me" theme={theme}>
                <div style={{ fontSize: "0.8em", lineHeight: 1.6 }}>
                  <div>
                    <span style={{ color: theme.secondColor }}>Status:</span>{" "}
                    {theme.onlineNow ? "🟢 Online" : "🔴 Away"}
                  </div>
                  <div>
                    <span style={{ color: theme.secondColor }}>Followers:</span>{" "}
                    {profile.follower_count.toLocaleString()}
                  </div>
                  <div>
                    <span style={{ color: theme.secondColor }}>X:</span>{" "}
                    <span style={{ color: theme.accentColor }}>
                      @{profile.x_username}
                    </span>
                  </div>
                </div>
              </Panel>

              {/* Top 8 Followers */}
              {profile.top_followers.length > 0 && (
                <Panel title="✨ Top 8 Friends" theme={theme}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 6,
                    }}
                  >
                    {profile.top_followers
                      .slice(0, 8)
                      .map((f: TopFollower, i: number) => (
                        <div
                          key={f.username || i}
                          style={{ textAlign: "center", fontSize: "0.7em" }}
                        >
                          {f.profile_image_url ? (
                            <Image
                              src={f.profile_image_url}
                              alt={f.username}
                              width={44}
                              height={44}
                              style={{
                                width: 44,
                                height: 44,
                                border: `2px solid ${theme.accentColor}`,
                                display: "block",
                                margin: "0 auto 2px",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                border: `2px solid ${theme.accentColor}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 2px",
                                backgroundColor: "#111",
                                color: theme.accentColor,
                                fontWeight: "bold",
                              }}
                            >
                              {f.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div
                            style={{
                              color: theme.secondColor,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 72,
                            }}
                          >
                            @{f.username}
                          </div>
                        </div>
                      ))}
                  </div>
                </Panel>
              )}

              {/* Blinkies */}
              <Panel title="🌟 My Blinkies" theme={theme}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {[
                    "SCENE QUEEN",
                    "EMO 4 LIFE",
                    "RARE",
                    "XO XO",
                    "2000s BABY",
                  ].map((txt) => (
                    (() => {
                      const blinkRate = 0.5 + (stableHash(txt) % 80) / 100;
                      return (
                    <span
                      key={txt}
                      style={{
                        background: `linear-gradient(90deg, ${theme.accentColor}, ${theme.secondColor})`,
                        color: "#fff",
                        padding: "2px 6px",
                        fontSize: "0.65em",
                        fontWeight: "bold",
                        animation: `blink ${blinkRate}s step-start infinite`,
                        border: "1px solid #fff",
                      }}
                    >
                      {txt}
                    </span>
                      );
                    })()
                  ))}
                </div>
              </Panel>
            </div>

            {/* RIGHT COLUMN — Side-by-side: Shop left, Posts right */}
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* Shop */}
                <div>
                  {products.length > 0 && (
                    <Panel
                      title="🛍️ MY SHOP"
                      theme={theme}
                      extra={<BlinkBadge color="#00ff00">BUY NOW</BlinkBadge>}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, 1fr)",
                          gap: 8,
                        }}
                      >
                        {products.map((product: Product) => (
                          <div
                            key={product.id}
                            className="ms-product-card"
                            style={{
                              border: `2px solid ${theme.tableBorderColor}`,
                              background: "rgba(0,0,0,0.6)",
                              textAlign: "center",
                              padding: 8,
                              cursor: "pointer",
                              transition: "transform 0.15s",
                            }}
                          >
                            {product.image_url ? (
                              <Image
                                src={product.image_url}
                                alt={product.title}
                                width={600}
                                height={600}
                                style={{
                                  width: "100%",
                                  aspectRatio: "1",
                                  objectFit: "cover",
                                  display: "block",
                                  border: `1px solid ${theme.tableBorderColor}`,
                                  marginBottom: 6,
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  aspectRatio: "1",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: `linear-gradient(135deg, ${theme.tableBgColor}, #000)`,
                                  border: `1px solid ${theme.tableBorderColor}`,
                                  marginBottom: 6,
                                  fontSize: "2em",
                                }}
                              >
                                🛍️
                              </div>
                            )}
                            <div
                              style={{
                                fontSize: "0.72em",
                                color: theme.textColor,
                                fontWeight: "bold",
                                marginBottom: 3,
                                lineHeight: 1.3,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {product.title}
                            </div>
                            <div
                              style={{
                                color: theme.accentColor,
                                fontWeight: "bold",
                                fontSize: "0.85em",
                                animation: "glitter 1.5s alternate infinite",
                                display: "inline-block",
                              }}
                            >
                              ${parseFloat(product.price).toFixed(2)}
                            </div>
                            <div style={{ marginTop: 4 }}>
                              <button
                                style={{
                                  background: `linear-gradient(90deg, ${theme.accentColor}, ${theme.secondColor})`,
                                  border: "none",
                                  color: "#fff",
                                  fontFamily: FONT_MAP[theme.font],
                                  fontWeight: "bold",
                                  padding: "3px 12px",
                                  cursor: "pointer",
                                  fontSize: "0.7em",
                                  boxShadow: `0 0 6px ${theme.accentColor}`,
                                }}
                              >
                                ADD 2 CART ✨
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Panel>
                  )}
                </div>

                {/* Posts Feed */}
                <div>
                  {profile.top_posts.length > 0 && (
                    <Panel
                      title="📝 RECENT POSTS"
                      theme={theme}
                      extra={<BlinkBadge color="#ff6600">HOT</BlinkBadge>}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {profile.top_posts
                          .slice(0, 8)
                          .map((post: TopPost, i: number) => (
                            <div
                              key={post.id || i}
                              style={{
                                border: `1px solid ${theme.tableBorderColor}`,
                                background: "rgba(0,0,0,0.6)",
                                padding: 8,
                              }}
                            >
                              {post.image_url && (
                                <Image
                                  src={post.image_url}
                                  alt=""
                                  width={800}
                                  height={100}
                                  style={{
                                    width: "100%",
                                    height: 100,
                                    objectFit: "cover",
                                    display: "block",
                                    border: `1px solid ${theme.tableBorderColor}`,
                                    marginBottom: 4,
                                  }}
                                />
                              )}
                              <div
                                style={{
                                  fontSize: "0.75em",
                                  color: theme.textColor,
                                  marginBottom: 4,
                                  lineHeight: 1.4,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {post.text}
                              </div>
                              <div
                                style={{
                                  color: theme.accentColor,
                                  fontWeight: "bold",
                                  fontSize: "0.65em",
                                }}
                              >
                                {post.likes.toLocaleString()} likes ·{" "}
                                {post.retweets.toLocaleString()} RTs
                              </div>
                            </div>
                          ))}
                      </div>
                    </Panel>
                  )}
                </div>
              </div>

              {/* Grok Analytics */}
              {profile.metrics && (
                <Panel title="🤖 Grok AI Analytics" theme={theme}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      fontSize: "0.8em",
                    }}
                  >
                    <div>
                      <span style={{ color: theme.secondColor }}>
                        Engagement:
                      </span>{" "}
                      <span
                        style={{
                          color: theme.accentColor,
                          fontWeight: "bold",
                          animation: "glitter 1.5s alternate infinite",
                          display: "inline-block",
                        }}
                      >
                        {profile.metrics.engagement_score}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: theme.secondColor }}>
                        Avg Likes:
                      </span>{" "}
                      {profile.metrics.avg_likes.toLocaleString()}
                    </div>
                    <div>
                      <span style={{ color: theme.secondColor }}>Avg RTs:</span>{" "}
                      {profile.metrics.avg_retweets.toLocaleString()}
                    </div>
                    <div>
                      <span style={{ color: theme.secondColor }}>
                        Sentiment:
                      </span>{" "}
                      {profile.metrics.audience_sentiment}
                    </div>
                  </div>
                  {profile.metrics.top_themes.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div
                        style={{
                          color: theme.secondColor,
                          fontSize: "0.75em",
                          marginBottom: 4,
                        }}
                      >
                        TOP THEMES:
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {profile.metrics.top_themes.map((t) => (
                          <span
                            key={t}
                            style={{
                              background: `linear-gradient(90deg, ${theme.accentColor}, ${theme.secondColor})`,
                              color: "#fff",
                              padding: "2px 6px",
                              fontSize: "0.7em",
                              fontWeight: "bold",
                              border: "1px solid #fff",
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </Panel>
              )}

              {/* Comments section */}
              <Panel
                title="💬 Comments"
                theme={theme}
                extra={
                  <span
                    style={{ fontSize: "0.75em", color: theme.secondColor }}
                  >
                    Leave one!
                  </span>
                }
              >
                <div
                  style={{
                    color: "#888",
                    fontSize: "0.8em",
                    fontStyle: "italic",
                    marginBottom: 8,
                  }}
                >
                  Be the first to leave a comment!
                </div>
                <div>
                  <b
                    style={{ color: theme.secondColor, fontSize: "0.8em" }}
                  >
                    Leave a Comment:
                  </b>
                  <textarea
                    placeholder="Type ur comment here!! xD"
                    rows={2}
                    style={{
                      width: "100%",
                      background: "#000",
                      color: theme.textColor,
                      border: `1px solid ${theme.tableBorderColor}`,
                      fontFamily: FONT_MAP[theme.font],
                      fontSize: "0.8em",
                      padding: 6,
                      marginTop: 4,
                      resize: "none",
                    }}
                  />
                  <button
                    style={{
                      background: theme.accentColor,
                      border: "none",
                      color: "#fff",
                      marginTop: 4,
                      fontFamily: FONT_MAP[theme.font],
                      fontWeight: "bold",
                      padding: "4px 16px",
                      cursor: "pointer",
                      fontSize: "0.8em",
                      boxShadow: `0 0 8px ${theme.accentColor}`,
                    }}
                  >
                    POST COMMENT ✨
                  </button>
                </div>
              </Panel>
            </div>
          </div>

          {/* MyPicks + ShoutoutWall */}
          <div style={{ marginTop: 12 }}>
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

          {/* ── GROK MARQUEE ── */}
          <div
            style={{
              overflow: "hidden",
              background: "#000",
              padding: "8px 0",
              marginTop: 12,
              borderTop: `2px solid ${theme.tableBorderColor}`,
              borderBottom: `2px solid ${theme.tableBorderColor}`,
            }}
          >
            <div
              style={{
                animation: "marquee 15s linear infinite",
                whiteSpace: "nowrap",
                display: "inline-block",
                color: theme.secondColor,
                fontSize: "1.1em",
                fontWeight: "bold",
              }}
            >
              GROK SAYS: This creator is FIRE -- Follow @{profile.x_username}{" "}
              and check out their store at {profile.x_username}.rareimagery.net
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div
            style={{
              textAlign: "center",
              padding: "16px 0",
              borderTop: `2px solid ${theme.tableBorderColor}`,
              marginTop: 16,
              fontSize: "0.75em",
            }}
          >
            <GlitterText>
              {profile.title || profile.x_username} &copy;{" "}
              {new Date().getFullYear()}
            </GlitterText>
            <div style={{ color: "#555", marginTop: 4 }}>
              Powered by{" "}
              <span style={{ color: theme.accentColor }}>
                RareImagery X Marketplace
              </span>{" "}
              · Best viewed in 800x600
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
