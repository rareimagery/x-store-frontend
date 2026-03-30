import type { JWT } from "next-auth/jwt";
import { drupalAuthHeaders } from "@/lib/drupal";

const DRUPAL_API = process.env.DRUPAL_API_URL;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validate that a string is a valid UUID v4 format. */
export function isValidUUID(s: string): boolean {
  return UUID_REGEX.test(s);
}

/** Allowed hostnames for image URL fetching (SSRF protection). */
const ALLOWED_IMAGE_HOSTS = [
  "pbs.twimg.com",
  "72.62.80.155",
  "rareimagery.net",
  "api.printful.com",
  "files.cdn.printful.com",
];

/** Check if an image URL is safe to fetch (not an internal/localhost address). */
export function isSafeImageUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const hostname = url.hostname.toLowerCase();
    // Block private/internal IPs
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("169.254.") ||
      hostname === "[::1]"
    ) {
      return false;
    }
    // Allow known hosts or subdomains of allowed hosts
    return ALLOWED_IMAGE_HOSTS.some(
      (h) => hostname === h || hostname.endsWith(`.${h}`)
    );
  } catch {
    return false;
  }
}

/**
 * Verify that the authenticated user owns the given store.
 * Admins bypass the check. Returns false if store not found or user doesn't own it.
 */
export async function verifyStoreOwnership(
  token: JWT,
  storeId: string
): Promise<boolean> {
  // Admins can access any store
  if (token.role === "admin") return true;

  if (!isValidUUID(storeId)) return false;

  try {
    // Fetch the store and its linked profile
    const res = await fetch(
      `${DRUPAL_API}/jsonapi/commerce_store/online/${storeId}?include=field_linked_profile`,
      {
        headers: { ...drupalAuthHeaders() },
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) return false;

    const json = await res.json();
    const store = json.data;
    if (!store) return false;

    // Check store slug matches user's xUsername
    const storeSlug = store.attributes?.field_store_slug;
    const xUsername = (token.xUsername as string)?.toLowerCase();
    const storeSlugLower = storeSlug?.toLowerCase();

    if (xUsername && storeSlugLower && xUsername === storeSlugLower) {
      return true;
    }

    // Check store's storeSlug matches user's storeSlug (credentials auth)
    const tokenStoreSlug = (token.storeSlug as string)?.toLowerCase();
    if (tokenStoreSlug && storeSlugLower && tokenStoreSlug === storeSlugLower) {
      return true;
    }

    return false;
  } catch (err) {
    console.error("[ownership] Verification failed:", err);
    return false;
  }
}

/**
 * Verify that the authenticated user owns the given creator profile node.
 * Admins bypass the check.
 */
export async function verifyProfileOwnership(
  token: JWT,
  profileNodeId: string
): Promise<boolean> {
  if (token.role === "admin") return true;

  if (!isValidUUID(profileNodeId)) return false;

  try {
    const res = await fetch(
      `${DRUPAL_API}/jsonapi/node/x_user_profile/${profileNodeId}`,
      {
        headers: { ...drupalAuthHeaders() },
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) return false;

    const json = await res.json();
    const profileUsername = json.data?.attributes?.field_x_username;
    const xUsername = (token.xUsername as string)?.toLowerCase();

    return !!(
      xUsername &&
      profileUsername &&
      xUsername === profileUsername.toLowerCase()
    );
  } catch {
    return false;
  }
}
