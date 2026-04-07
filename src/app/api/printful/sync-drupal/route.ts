import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

/**
 * POST /api/printful/sync-drupal
 * Triggers the Drupal-side Printful sync for a store.
 * This runs on the Drupal server with no timeout issues.
 * Body: { storeId: string }
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storeId } = await req.json();
  if (!storeId) {
    return NextResponse.json({ error: "storeId required" }, { status: 400 });
  }

  if (!DRUPAL_API_URL) {
    return NextResponse.json({ error: "Drupal not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/api/printful-sync/${encodeURIComponent(storeId)}`,
      {
        method: "POST",
        headers: {
          ...drupalAuthHeaders(),
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(120000), // 2 min — Drupal handles the heavy lifting
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Sync failed" }));
      return NextResponse.json(err, { status: res.status });
    }

    return NextResponse.json(await res.json());
  } catch (err: any) {
    console.error("[printful/sync-drupal]", err);
    return NextResponse.json(
      { error: err.message || "Sync request failed" },
      { status: 502 }
    );
  }
}
