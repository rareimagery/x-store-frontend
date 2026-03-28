/**
 * Reserved slugs that cannot be used as creator store slugs.
 * These conflict with system subdomains or internal routes.
 */
export const RESERVED_SLUGS = [
  "console",
  "admin",
  "api",
  "www",
  "app",
  "mail",
  "support",
  "help",
  "blog",
  "shop",
  "store",
  "login",
  "signup",
  "dashboard",
];

/**
 * Validates a store slug.
 * Valid: lowercase letters, numbers, hyphens. 3–30 characters.
 * Must not be a reserved slug.
 */
export function isValidSlug(slug: string): boolean {
  if (RESERVED_SLUGS.includes(slug)) return false;
  return /^[a-z0-9-]{3,30}$/.test(slug);
}
