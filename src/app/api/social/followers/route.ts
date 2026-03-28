import { NextRequest, NextResponse } from "next/server";
import { getFollowers, getFollowing, getStoreByXUsername } from "@/lib/social";

/**
 * GET /api/social/followers?storeId=xxx&type=followers|following
 * Get followers or following list for a store.
 */
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("storeId");
  const type = req.nextUrl.searchParams.get("type") || "followers";

  if (!storeId) {
    // If no storeId, try to look up by xUsername
    const xUsername = req.nextUrl.searchParams.get("xUsername");
    if (!xUsername) {
      return NextResponse.json(
        { error: "storeId or xUsername is required" },
        { status: 400 }
      );
    }

    const store = await getStoreByXUsername(xUsername);
    if (!store) {
      return NextResponse.json({ data: [], count: 0 });
    }

    const list =
      type === "following"
        ? await getFollowing(store.storeId)
        : await getFollowers(store.storeId);

    return NextResponse.json({ data: list, count: list.length });
  }

  try {
    const list =
      type === "following"
        ? await getFollowing(storeId)
        : await getFollowers(storeId);

    return NextResponse.json({ data: list, count: list.length });
  } catch (err: any) {
    console.error("Followers fetch error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to fetch followers" },
      { status: 500 }
    );
  }
}
