"use client";

import SpotifyEmbed from "./SpotifyEmbed";
import AppleMusicEmbed from "./AppleMusicEmbed";

export type MusicProvider = "spotify" | "apple_music" | "unknown";

export interface StorePlayerProps {
  url: string;
  theme?: "dark" | "light";
}

export function detectProvider(url: string): MusicProvider {
  const lower = url.toLowerCase();
  if (lower.includes("spotify.com") || lower.startsWith("spotify:")) return "spotify";
  if (lower.includes("music.apple.com") || lower.includes("embed.music.apple.com")) return "apple_music";
  return "unknown";
}

export default function StorePlayer({ url, theme = "dark" }: StorePlayerProps) {
  if (!url) return null;

  const provider = detectProvider(url);

  switch (provider) {
    case "spotify":
      return <SpotifyEmbed embedUrl={url} theme={theme} />;
    case "apple_music":
      return <AppleMusicEmbed embedUrl={url} theme={theme} />;
    default:
      return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
          <p className="text-xs text-zinc-500">Unsupported music link. Use Spotify or Apple Music URLs.</p>
        </div>
      );
  }
}
