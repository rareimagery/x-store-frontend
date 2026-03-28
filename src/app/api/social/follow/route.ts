import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  getStoreByXUsername,
  checkFollowStatus,
  createFollow,
  removeFollow,
} from "@/lib/social";

/**
 * POST /api/social/follow
 * Toggle follow/unfollow on a store.
 * Body: { targetStoreId: string, targetStoreInternalId?: string }
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.xUsername) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { targetStoreId, targetStoreInternalId } = await req.json();
    if (!targetStoreId) {
      return NextResponse.json(
        { error: "targetStoreId is required" },
        { status: 400 }
      );
    }

    // Get the current user's store
    const myStore = await getStoreByXUsername(token.xUsername as string);
    if (!myStore) {
      return NextResponse.json(
        { error: "You need a store to follow creators" },
        { status: 403 }
      );
    }

    // Can't follow yourself
    if (myStore.storeId === targetStoreId) {
      return NextResponse.json(
        { error: "You cannot follow your own store" },
        { status: 400 }
      );
    }

    // Check current follow status
    const status = await checkFollowStatus(myStore.storeId, targetStoreId);

    if (status.isFollowing && status.flaggingId) {
      // Unfollow
      await removeFollow(status.flaggingId, myStore.storeId, targetStoreId);
      return NextResponse.json({
        action: "unfollowed",
        isFollowing: false,
      });
    } else {
      // Follow
      const result = await createFollow(
        myStore.storeId,
        targetStoreId,
        targetStoreInternalId || "",
      );
      return NextResponse.json({
        action: "followed",
        isFollowing: true,
        flaggingId: result.flaggingId,
      });
    }
  } catch (err: any) {
    console.error("Follow error:", err.message);
    return NextResponse.json(
      { error: err.message || "Follow action failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/social/follow?targetStoreId=xxx
 * Check if the current user follows a store.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.xUsername) {
    return NextResponse.json({ isFollowing: false, isLoggedIn: false });
  }

  const targetStoreId = req.nextUrl.searchParams.get("targetStoreId");
  if (!targetStoreId) {
    return NextResponse.json(
      { error: "targetStoreId is required" },
      { status: 400 }
    );
  }

  try {
    const myStore = await getStoreByXUsername(token.xUsername as string);
    if (!myStore) {
      return NextResponse.json({ isFollowing: false, isLoggedIn: true, hasStore: false });
    }

    const status = await checkFollowStatus(myStore.storeId, targetStoreId);

    return NextResponse.json({
      isFollowing: status.isFollowing,
      isLoggedIn: true,
      hasStore: true,
    });
  } catch (err: any) {
    console.error("Follow status check error:", err.message);
    return NextResponse.json({ isFollowing: false, isLoggedIn: true });
  }
}
