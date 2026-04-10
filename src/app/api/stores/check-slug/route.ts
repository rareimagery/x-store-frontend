import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

/**
 * GET /api/stores/check-slug?slug=value
 * Thin proxy to Drupal: GET /api/creator/check-slug?slug=value
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = req.nextUrl.searchParams.get("slug")?.trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ error: "slug param required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/api/creator/check-slug?slug=${encodeURIComponent(slug)}`,
      { headers: drupalAuthHeaders(), cache: "no-store" }
    );

    const data = await res.json();
    return NextResponse.json({
      available: data.available ?? false,
      reason: data.available ? undefined : "Not available",
    });
  } catch {
    // Fallback: assume available if Drupal is unreachable
    return NextResponse.json({ available: true });
  }
}
