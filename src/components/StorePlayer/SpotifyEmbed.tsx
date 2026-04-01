"use client";

import styles from "./player.module.css";

interface SpotifyEmbedProps {
  embedUrl: string;
  theme?: "dark" | "light";
}

/** Normalize any Spotify URL/URI into an embed URL. */
function normalizeSpotifyUrl(raw: string): string {
  let url = raw.trim();

  // spotify:playlist:ABC → https://open.spotify.com/playlist/ABC
  if (url.startsWith("spotify:")) {
    const parts = url.split(":");
    if (parts.length >= 3) {
      url = `https://open.spotify.com/${parts[1]}/${parts[2]}`;
    }
  }

  // Already an embed URL
  if (url.includes("/embed/")) return url;

  // Convert open.spotify.com/playlist/... → open.spotify.com/embed/playlist/...
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("spotify.com")) {
      return `https://open.spotify.com/embed${parsed.pathname}`;
    }
  } catch {
    // Not a valid URL — return as-is
  }

  return url;
}

export default function SpotifyEmbed({ embedUrl, theme = "dark" }: SpotifyEmbedProps) {
  const src = `${normalizeSpotifyUrl(embedUrl)}?theme=${theme === "light" ? 0 : 1}`;

  return (
    <div className={styles.playerShell}>
      <div className={styles.providerBadge}>
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="#1DB954">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
        <span>Spotify</span>
      </div>
      <div className={styles.scanlines} />
      <iframe
        src={src}
        width="100%"
        height="152"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className={styles.embedFrame}
        title="Spotify Player"
      />
    </div>
  );
}
