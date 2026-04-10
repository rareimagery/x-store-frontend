import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

/**
 * POST /api/stores/sync-x
 * Thin proxy to Drupal: POST /api/creator/sync-x/{username}
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.xUsername) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const xUsername = String(token.xUsername).replace(/^@+/, "").trim().toLowerCase();

  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/api/creator/sync-x/${encodeURIComponent(xUsername)}`,
      { method: "POST", headers: drupalAuthHeaders(), cache: "no-store" }
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : 502 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Sync failed" }, { status: 502 });
  }
}
