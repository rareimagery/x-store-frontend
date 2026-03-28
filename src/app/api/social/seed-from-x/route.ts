import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { seedFromX, getStoreByXUsername, createFollow } from "@/lib/social";

/**
 * GET /api/social/seed-from-x
 * Cross-reference the user's X following list with existing RareImagery stores.
 * Returns matched creators that the user can batch-follow.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.xUsername || !token?.xAccessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch the user's X following list using X API v2
    const xFollowing = await fetchXFollowing(
      token.xId as string,
      token.xAccessToken as string
    );

    if (!xFollowing.length) {
      return NextResponse.json({
        matched: [],
        total: 0,
        message: "No X following data available",
      });
    }

    // Cross-reference with existing RareImagery stores
    const result = await seedFromX(xFollowing);

    // Filter out the user's own store
    const myStore = await getStoreByXUsername(token.xUsername as string);
    const filtered = myStore
      ? result.matched.filter((m) => m.storeId !== myStore.storeId)
      : result.matched;

    return NextResponse.json({
      matched: filtered,
      total: result.total,
      message:
        filtered.length > 0
          ? `${filtered.length} creators you follow on X are on RareImagery!`
          : "None of your X follows are on RareImagery yet.",
    });
  } catch (err: any) {
    console.error("X seed error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to seed from X" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/social/seed-from-x
 * Batch-follow matched creators from X seed.
 * Body: { storeIds: string[] }
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.xUsername) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { storeIds } = await req.json();
    if (!Array.isArray(storeIds) || !storeIds.length) {
      return NextResponse.json(
        { error: "storeIds array is required" },
        { status: 400 }
      );
    }

    const myStore = await getStoreByXUsername(token.xUsername as string);
    if (!myStore) {
      return NextResponse.json(
        { error: "You need a store to follow creators" },
        { status: 403 }
      );
    }

    let followed = 0;
    const errors: string[] = [];

    for (const targetStoreId of storeIds) {
      if (targetStoreId === myStore.storeId) continue;
      try {
        await createFollow(myStore.storeId, targetStoreId, "", "x_import");
        followed++;
      } catch (err: any) {
        errors.push(`${targetStoreId}: ${err.message}`);
      }
    }

    // Mark X seed as imported on the user's store
    try {
      const DRUPAL_API_URL = process.env.DRUPAL_API_URL || "http://localhost:8081";
      const { drupalWriteHeaders } = await import("@/lib/drupal");
      const writeHeaders = await drupalWriteHeaders();
      await fetch(
        `${DRUPAL_API_URL}/jsonapi/commerce_store/online/${myStore.storeId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/vnd.api+json",
            Accept: "application/vnd.api+json",
            ...writeHeaders,
          },
          body: JSON.stringify({
            data: {
              type: "commerce_store--online",
              id: myStore.storeId,
              attributes: { field_x_seed_imported: true },
            },
          }),
        }
      );
    } catch {
      // Non-critical — don't fail the request
    }

    return NextResponse.json({
      followed,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully followed ${followed} creator${followed !== 1 ? "s" : ""} from X`,
    });
  } catch (err: any) {
    console.error("Batch follow error:", err.message);
    return NextResponse.json(
      { error: err.message || "Batch follow failed" },
      { status: 500 }
    );
  }
}

/** Fetch the user's X following list using X API v2 */
async function fetchXFollowing(
  xUserId: string,
  accessToken: string
): Promise<string[]> {
  const handles: string[] = [];
  let paginationToken: string | null = null;

  try {
    // Fetch up to 200 following (2 pages of 100)
    for (let page = 0; page < 2; page++) {
      const params = new URLSearchParams({
        max_results: "100",
        "user.fields": "username",
      });
      if (paginationToken) {
        params.set("pagination_token", paginationToken);
      }

      const res = await fetch(
        `https://api.x.com/2/users/${xUserId}/following?${params}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!res.ok) {
        console.error(`X API error: ${res.status}`);
        break;
      }

      const json = await res.json();
      const users = json.data ?? [];
      for (const user of users) {
        if (user.username) {
          handles.push(user.username);
        }
      }

      paginationToken = json.meta?.next_token ?? null;
      if (!paginationToken) break;
    }
  } catch (err) {
    console.error("Failed to fetch X following:", err);
  }

  return handles;
}
