import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

type EditJWT = { storeSlug?: string; xUsername?: string | null };

function resolveUsername(token: EditJWT): string | null {
  const raw = token.xUsername || token.storeSlug;
  return raw ? String(raw).replace(/^@+/, "").trim().toLowerCase() : null;
}

/**
 * GET /api/stores/edit — Load profile + store data
 * Thin proxy to Drupal: GET /api/creator/profile/{username}
 */
export async function GET(req: NextRequest) {
  const token = (await getToken({ req })) as EditJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const username = resolveUsername(token);
  if (!username) return NextResponse.json({ error: "No store" }, { status: 404 });

  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/api/creator/profile/${encodeURIComponent(username)}`,
      { headers: drupalAuthHeaders(), cache: "no-store" }
    );
    const data = await res.json();
    if (!res.ok || data.error) return NextResponse.json(data, { status: 404 });

    // Map Drupal field names to frontend field names
    return NextResponse.json({
      storeName: data.store_name || "",
      displayName: data.display_name || "",
      bio: data.bio || "",
      avatarUrl: data.avatar_url || "",
      bannerUrl: data.banner_url || "",
      location: data.location || "",
      website: data.website || "",
      followers: data.followers || 0,
      following: data.following || 0,
      postCount: data.post_count || 0,
      verified: data.verified || false,
      verifiedType: data.verified_type || "none",
      storeSlug: data.store_slug || "",
      storeStatus: data.store_status || "pending",
    });
  } catch {
    return NextResponse.json({ error: "Failed to load profile" }, { status: 502 });
  }
}

/**
 * PATCH /api/stores/edit — Update profile + store fields
 * Thin proxy to Drupal: POST /api/creator/update-profile/{username}
 */
export async function PATCH(req: NextRequest) {
  const token = (await getToken({ req })) as EditJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const username = resolveUsername(token);
  if (!username) return NextResponse.json({ error: "No store" }, { status: 404 });

  const body = await req.json();

  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/api/creator/update-profile/${encodeURIComponent(username)}`,
      {
        method: "POST",
        headers: { ...drupalAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          store_name: body.storeName,
          display_name: body.displayName,
          bio: body.bio,
          location: body.location,
          website: body.website,
        }),
        cache: "no-store",
      }
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : 500 });
  } catch {
    return NextResponse.json({ error: "Save failed" }, { status: 502 });
  }
}
