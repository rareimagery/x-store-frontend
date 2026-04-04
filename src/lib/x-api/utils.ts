// ---------------------------------------------------------------------------
// Shared X API utilities
// ---------------------------------------------------------------------------

/**
 * Upgrade X profile image URL to higher resolution.
 * X returns _normal (48x48) by default; this converts to _400x400.
 */
export function upgradeProfileImageUrl(url: string): string {
  return url.replace("_normal", "_400x400");
}
