import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

/**
 * GET /api/console/cost-dashboard?from=YYYY-MM&to=YYYY-MM
 * Proxies to Drupal's cost dashboard endpoint. Admin only.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || token.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const from = req.nextUrl.searchParams.get("from") || "";
  const to = req.nextUrl.searchParams.get("to") || "";

  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/api/cost-dashboard?${params}`,
      {
        headers: { ...drupalAuthHeaders(), Accept: "application/json" },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Drupal returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    console.error("[cost-dashboard] Fetch error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/console/cost-dashboard
 * Record a cost entry. Admin only.
 * Body: { category, amount, description?, reference_id?, store_id?, period? }
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || token.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const writeHeaders = await drupalWriteHeaders();

    const res = await fetch(`${DRUPAL_API_URL}/api/cost-dashboard/record`, {
      method: "POST",
      headers: {
        ...writeHeaders,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[cost-dashboard] Record error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
