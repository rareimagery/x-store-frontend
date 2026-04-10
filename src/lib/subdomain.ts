import { headers } from "next/headers";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net";

/**
 * Detect if the current request is on a creator subdomain.
 * Returns "" for subdomain (links are root-relative like /store)
 * or the slug for main domain (links are /slug/store).
 */
export async function resolveBasePath(slug: string): Promise<string> {
  const headersList = await headers();
  const host = (headersList.get("host") || "").split(":")[0];
  const isSubdomain =
    host !== `www.${BASE_DOMAIN}` &&
    host !== BASE_DOMAIN &&
    host.endsWith(`.${BASE_DOMAIN}`);
  return isSubdomain ? "" : slug;
}
