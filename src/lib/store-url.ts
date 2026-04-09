// ---------------------------------------------------------------------------
// Centralized store URL builder — single source of truth
// All store URLs should use these helpers, never string-concatenate.
// ---------------------------------------------------------------------------

export const STORE_BASE_DOMAIN = process.env.NEXT_PUBLIC_STORE_BASE_DOMAIN || "rareimagery.net";

/** Canonical store URL: https://username.rareimagery.net */
export function getStoreUrl(slug: string): string {
  return `https://${slug}.${STORE_BASE_DOMAIN}`;
}

/** Store subpage URL: https://username.rareimagery.net/store */
export function getStorePageUrl(slug: string, page: string): string {
  return `https://${slug}.${STORE_BASE_DOMAIN}/${page}`;
}

/** Display-friendly format (no protocol): username.rareimagery.net */
export function getStoreDisplayUrl(slug: string): string {
  return `${slug}.${STORE_BASE_DOMAIN}`;
}
