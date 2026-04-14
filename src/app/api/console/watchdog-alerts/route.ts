import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

/**
 * GET /api/console/watchdog-alerts
 * Proxies Drupal watchdog alerts for the admin health dashboard.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || (token.role as string) !== "admin") {
    return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  try {
    const res = await fetch(`${DRUPAL_API_URL}/api/watchdog/alerts`, {
      headers: drupalAuthHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ active: [], recently_resolved: [] });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ active: [], recently_resolved: [] });
  }
}
