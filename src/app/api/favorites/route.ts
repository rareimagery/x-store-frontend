import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

type FavJWT = { storeSlug?: string; xUsername?: string };

function resolveSlug(token: FavJWT): string | null {
  const raw = token.storeSlug || token.xUsername;
  return raw ? raw.replace(/^@+/, "").trim().toLowerCase() : null;
}

async function resolveStoreUuid(slug: string): Promise<string | null> {
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_my_favorites`,
    { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data?.[0]?.id ?? null;
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
  const uuid = await resolveStoreUuid(slug);
  if (!uuid) return NextResponse.json({ favorites: [] });
  return NextResponse.json({ favorites: await getFavorites(uuid) });
}

// POST — add or update favorites
export async function POST(req: NextRequest) {
  const token = await getToken({ req }) as FavJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slug = resolveSlug(token);
  if (!slug) return NextResponse.json({ error: "No store" }, { status: 404 });
  const uuid = await resolveStoreUuid(slug);
  if (!uuid) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const { favorites } = await req.json();
  if (!Array.isArray(favorites)) {
    return NextResponse.json({ error: "favorites array required" }, { status: 400 });
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
