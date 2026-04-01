"use client";

import styles from "./player.module.css";

interface AppleMusicEmbedProps {
  embedUrl: string;
  theme?: "dark" | "light";
}

/** Normalize any Apple Music URL into an embed URL. */
function normalizeAppleMusicUrl(raw: string): string {
  let url = raw.trim();

  // Already an embed URL
  if (url.includes("embed.music.apple.com")) return url;

  // Convert music.apple.com/... → embed.music.apple.com/...
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "music.apple.com") {
      return `https://embed.music.apple.com${parsed.pathname}`;
    }
  } catch {
    // Not a valid URL
  }

  return url;
}

export default function AppleMusicEmbed({ embedUrl, theme = "dark" }: AppleMusicEmbedProps) {
  const src = normalizeAppleMusicUrl(embedUrl);

  return (
    <div className={styles.playerShell}>
      <div className={styles.providerBadge}>
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="#FA2D48">
          <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03c.525-.015 1.05-.04 1.573-.104.755-.092 1.478-.252 2.136-.618.894-.5 1.553-1.203 1.972-2.125.276-.608.424-1.252.5-1.908.06-.495.083-.993.09-1.49.003-.18 0-.358 0-.537V6.085l.004.04zm-6.68 2.88c0 .21-.15.378-.342.41h-.008l-.003.001a.39.39 0 01-.058.005h-.001c-.022 0-.044-.003-.066-.008a.382.382 0 01-.085-.033l-5.748 1.068c-.002 0-.003 0-.005.002l-.003.001h-.002c-.078.023-.16.016-.232-.017a.374.374 0 01-.169-.156l-.003-.006-.002-.003a.38.38 0 01-.047-.186v-7.86a.348.348 0 00-.084-.256c-.06-.064-.142-.103-.23-.107h-.005a.375.375 0 00-.08.013L6.312 2.959c-.08.023-.148.073-.196.14-.048.068-.073.15-.073.233V14.89a3.726 3.726 0 01-1.084 2.63 2.727 2.727 0 01-1.392.733c-.53.13-1.028.06-1.488-.187a2.1 2.1 0 01-1.033-1.168 2.1 2.1 0 01-.107-.63c-.002-.337.08-.67.24-.97.295-.548.744-.932 1.345-1.142.387-.134.79-.2 1.195-.197.34.003.672.056.998.144.15.04.296.09.44.148V6.002c0-.233.112-.435.31-.543.042-.023.087-.04.134-.05l7.038-1.31c.265-.052.535-.095.797-.158a.395.395 0 01.098-.013c.21 0 .38.17.38.38v8.477a3.726 3.726 0 01-1.084 2.63 2.727 2.727 0 01-1.392.733c-.53.13-1.028.06-1.488-.187a2.1 2.1 0 01-1.033-1.168 2.1 2.1 0 01-.107-.63c-.002-.337.08-.67.24-.97.295-.548.744-.932 1.345-1.142.387-.134.79-.2 1.195-.197.34.003.672.056.998.144.15.04.296.09.44.148V9.005z" />
        </svg>
        <span>Apple Music</span>
      </div>
      <div className={styles.scanlines} />
      <iframe
        src={src}
        width="100%"
        height="175"
        allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
        sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
        loading="lazy"
        className={styles.embedFrame}
        title="Apple Music Player"
        style={{ background: theme === "dark" ? "#1a1a1a" : "#fff" }}
      />
    </div>
  );
}
