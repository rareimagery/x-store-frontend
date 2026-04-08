import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { fetchWithRetry } from "@/lib/x-api/fetch-with-retry";

/**
 * GET /api/x-spaces
 * Fetches scheduled + live X Spaces for the authenticated user.
 * Uses X API v2 GET /2/spaces/by/creator_ids
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req }) as any;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const xId = token.xId;
  if (!xId) return NextResponse.json({ spaces: [] });

  const bearerToken = process.env.X_API_BEARER_TOKEN;
  if (!bearerToken) return NextResponse.json({ error: "X API not configured" }, { status: 500 });

  try {
    const params = new URLSearchParams({
      user_ids: xId,
      "space.fields": "id,title,state,scheduled_start,started_at,ended_at,host_ids,participant_count,is_ticketed,lang",
      expansions: "host_ids",
      "user.fields": "name,username,profile_image_url",
    });

    const res = await fetchWithRetry(
      `https://api.x.com/2/spaces/by/creator_ids?${params}`,
      { headers: { Authorization: `Bearer ${bearerToken}` } }
    );

    if (!res.ok) {
      // Spaces API may return 403 if not available on the plan
      if (res.status === 403) {
        return NextResponse.json({ spaces: [], note: "Spaces API requires elevated access" });
      }
      return NextResponse.json({ spaces: [] });
    }

    const data = await res.json();
    const spaces = (data.data || [])
      .filter((s: any) => s.state === "scheduled" || s.state === "live")
      .map((s: any) => ({
        id: s.id,
        title: s.title || "Untitled Space",
        state: s.state,
        scheduled_start: s.scheduled_start || null,
        started_at: s.started_at || null,
        participant_count: s.participant_count || 0,
        is_ticketed: s.is_ticketed || false,
        url: `https://x.com/i/spaces/${s.id}`,
      }));

    return NextResponse.json({ spaces }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err: any) {
    console.error("[x-spaces]", err.message);
    return NextResponse.json({ spaces: [] });
  }
}
