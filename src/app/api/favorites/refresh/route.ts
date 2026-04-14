import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";
import { createRateLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { fetchWithRetry } from "@/lib/x-api/fetch-with-retry";
import { upgradeProfileImageUrl } from "@/lib/x-api/utils";

const refreshLimit = createRateLimiter({ limit: 1, windowMs: 60 * 60 * 1000 });

type FavJWT = { storeSlug?: string; xUsername?: string | null };

async function resolveStoreUuid(slug: string): Promise<string | null> {
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_my_favorites`,
    { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data?.[0]?.id || null;
}

async function getFavorites(uuid: string): Promise<any[]> {
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_store/online/${uuid}?fields[commerce_store--online]=field_my_favorites`,
    { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
  );
  if (!res.ok) return [];
  const json = await res.json();
  const raw = json.data?.attributes?.field_my_favorites;
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

async function lookupProfile(username: string): Promise<any | null> {
  const bearer = process.env.X_API_BEARER_TOKEN;
  if (!bearer) return null;

  try {
    const res = await fetchWithRetry(
      `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=id,name,username,description,profile_image_url,public_metrics,verified_type`,
      { headers: { Authorization: `Bearer ${bearer}` }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const user = json.data;
    if (!user) return null;

    const pm = user.public_metrics ?? {};
    let avatarUrl = user.profile_image_url ?? null;
    if (avatarUrl) avatarUrl = upgradeProfileImageUrl(avatarUrl);

    return {
      username: user.username,
      display_name: user.name,
      bio: user.description ?? "",
      profile_image_url: avatarUrl,
      follower_count: pm.followers_count ?? 0,
      verified: (user.verified_type ?? "none") !== "none",
    };
  } catch {
    return null;
  }
}

/**
 * POST /api/favorites/refresh
 * Re-fetch all favorite profiles from X API and update the cache.
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req }) as FavJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slug = (token.storeSlug || token.xUsername || "").replace(/^@+/, "").trim();
  if (!slug) return NextResponse.json({ error: "No store" }, { status: 404 });

  const userId = slug;
  const rl = refreshLimit(userId);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const uuid = await resolveStoreUuid(slug);
  if (!uuid) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const favorites = await getFavorites(uuid);
  if (favorites.length === 0) {
    return NextResponse.json({ refreshed: 0, errors: 0, message: "No favorites to refresh" });
  }

  const now = new Date().toISOString();
  let refreshed = 0;
  let errors = 0;

  const updated = await Promise.all(
    favorites.map(async (fav: any) => {
      const profile = await lookupProfile(fav.username);
      if (profile) {
        refreshed++;
        return {
          ...fav,
          display_name: profile.display_name,
          bio: profile.bio,
          profile_image_url: profile.profile_image_url,
          follower_count: profile.follower_count,
          verified: profile.verified,
          cached_at: now,
        };
      }
      errors++;
      return fav; // Keep existing data if lookup fails
    })
  );

  // Save back to Drupal
  const writeHeaders = await drupalWriteHeaders();
  const saveRes = await fetch(`${DRUPAL_API_URL}/jsonapi/commerce_store/online/${uuid}`, {
    method: "PATCH",
    headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
    body: JSON.stringify({
      data: {
        type: "commerce_store--online",
        id: uuid,
        attributes: { field_my_favorites: JSON.stringify(updated) },
      },
    }),
  });

  if (!saveRes.ok) {
    return NextResponse.json({ error: "Save failed" }, { status: 502 });
  }

  return NextResponse.json({ refreshed, errors, total: favorites.length, cached_at: now });
}
