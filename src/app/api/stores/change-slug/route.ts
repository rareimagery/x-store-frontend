import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

type SlugJWT = { storeSlug?: string; xUsername?: string | null };

/**
 * POST /api/stores/change-slug
 * Thin proxy to Drupal: POST /api/creator/change-slug/{username}
 */
export async function POST(req: NextRequest) {
  const token = (await getToken({ req })) as SlugJWT | null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const xUsername = (token.xUsername || token.storeSlug || "").replace(/^@+/, "").trim().toLowerCase();
  if (!xUsername) return NextResponse.json({ error: "No user" }, { status: 404 });

  const { newSlug } = await req.json();
  if (!newSlug) return NextResponse.json({ error: "newSlug required" }, { status: 400 });

  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/api/creator/change-slug/${encodeURIComponent(xUsername)}`,
      {
        method: "POST",
        headers: { ...drupalAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ new_slug: newSlug.trim().toLowerCase() }),
        cache: "no-store",
      }
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : (data.error ? 400 : 500) });
  } catch {
    return NextResponse.json({ error: "Change failed" }, { status: 502 });
  }
}
