import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";
import { notifyCreator } from "@/lib/notifications";

const FREE_FAVORITES_LIMIT = 50;

type FavJWT = { storeSlug?: string; xUsername?: string | null };

function resolveSlug(token: FavJWT): string | null {
  const raw = token.storeSlug || token.xUsername;
  return raw ? raw.replace(/^@+/, "").trim() : null;
}

async function resolveStoreUuid(slug: string, xUsername?: string): Promise<string | null> {
  // Try by store slug first
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_my_favorites`,
    { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
  );
  if (res.ok) {
    const json = await res.json();
    const uuid = json.data?.[0]?.id;
    if (uuid) return uuid;
  }

  // Fallback: find store via X profile → linked store
  const lookupUsername = xUsername || slug;
  if (lookupUsername) {
    const profileRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?filter[field_x_username]=${encodeURIComponent(lookupUsername)}&include=field_linked_store&fields[commerce_store--online]=field_my_favorites`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );
    if (profileRes.ok) {
      const pJson = await profileRes.json();
      const storeRef = pJson.data?.[0]?.relationships?.field_linked_store?.data;
      if (storeRef?.id) return storeRef.id;
    }
  }

  return null;
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

// GET — load favorites for the current user's store
export async function GET(req: NextRequest) {
  const token = await getToken({ req }) as FavJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slug = resolveSlug(token);
  if (!slug) return NextResponse.json({ error: "No store" }, { status: 404 });
  const xUsername = token.xUsername ? String(token.xUsername).replace(/^@+/, "").trim() : undefined;
  const uuid = await resolveStoreUuid(slug, xUsername);
  if (!uuid) return NextResponse.json({ favorites: [] });
  return NextResponse.json({ favorites: await getFavorites(uuid) }, {
    headers: { "Cache-Control": "no-store" },
  });
}

// POST — add or update favorites
export async function POST(req: NextRequest) {
  const token = await getToken({ req }) as FavJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slug = resolveSlug(token);
  if (!slug) return NextResponse.json({ error: "No store" }, { status: 404 });
  const xUsername = token.xUsername ? String(token.xUsername).replace(/^@+/, "").trim() : undefined;
  const uuid = await resolveStoreUuid(slug, xUsername);
  if (!uuid) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const { favorites } = await req.json();
  if (!Array.isArray(favorites)) {
    return NextResponse.json({ error: "favorites array required" }, { status: 400 });
  }

  // Check 50-favorite limit (unless subscribed to @rareimagery or admin)
  if (favorites.length > FREE_FAVORITES_LIMIT) {
    const xUsername = token.xUsername ? String(token.xUsername).replace(/^@+/, "").trim() : "";
    const adminUsernames = (process.env.ADMIN_X_USERNAMES || "rareimagery").split(",").map((u) => u.trim().toLowerCase());
    const isAdmin = adminUsernames.includes(xUsername.toLowerCase());

    if (!isAdmin) {
      // Check if subscribed to @rareimagery via grace-claim
      let platformSubscribed = false;
      try {
        const graceRes = await fetch(
          `${DRUPAL_API_URL}/api/grace-status/rareimagery/${encodeURIComponent(xUsername)}`,
          { headers: drupalAuthHeaders(), cache: "no-store" }
        );
        if (graceRes.ok) {
          const graceData = await graceRes.json();
          platformSubscribed = graceData.status === "claimed";
        }
      } catch {}

      if (!platformSubscribed) {
        // Send gate DM on first hit (fire-and-forget)
        notifyCreator({
          type: "gate_favorites",
          xUsername,
          storeSlug: slug || "",
        }).catch(() => {});

        return NextResponse.json({
          error: "favorites_gate_locked",
          message: `You've reached the ${FREE_FAVORITES_LIMIT} free favorites limit. Subscribe to @rareimagery on X for unlimited favorites.`,
          count: favorites.length,
          limit: FREE_FAVORITES_LIMIT,
          subscribeUrl: "https://x.com/rareimagery/subscribe",
        }, { status: 403 });
      }
    }
  }

  const writeHeaders = await drupalWriteHeaders();
  const res = await fetch(`${DRUPAL_API_URL}/jsonapi/commerce_store/online/${uuid}`, {
    method: "PATCH",
    headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
    body: JSON.stringify({
      data: {
        type: "commerce_store--online",
        id: uuid,
        attributes: { field_my_favorites: JSON.stringify(favorites) },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Save failed: ${text}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: favorites.length });
}
