import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { drupalWriteHeaders } from "@/lib/drupal";
import { getStoreByXUsername } from "@/lib/social";

const DRUPAL_API_URL = process.env.DRUPAL_API_URL || "";

export interface PickEntry {
  storeId: string;
  storeName: string;
  storeSlug: string;
  xUsername: string;
  profilePictureUrl: string | null;
}

/**
 * GET /api/social/picks?storeId=xxx
 * Get a store's curated picks list.
 */
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) {
    return NextResponse.json(
      { error: "storeId is required" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online/${storeId}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json({ picks: [] });
    }

    const json = await res.json();
    const raw = json.data?.attributes?.field_my_picks;

    let picks: PickEntry[] = [];
    if (raw) {
      try {
        picks = JSON.parse(raw);
      } catch {
        picks = [];
      }
    }

    return NextResponse.json({ picks });
  } catch (err: any) {
    console.error("Picks fetch error:", err.message);
    return NextResponse.json({ picks: [] });
  }
}

/**
 * PUT /api/social/picks
 * Update the current user's picks list.
 * Body: { picks: PickEntry[] }
 */
export async function PUT(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.xUsername) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { picks } = await req.json();

    if (!Array.isArray(picks)) {
      return NextResponse.json(
        { error: "picks must be an array" },
        { status: 400 }
      );
    }

    if (picks.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 picks allowed" },
        { status: 400 }
      );
    }

    const myStore = await getStoreByXUsername(token.xUsername as string);
    if (!myStore) {
      return NextResponse.json(
        { error: "You need a store to manage picks" },
        { status: 403 }
      );
    }

    // Validate: no self-picks
    const filtered = picks.filter(
      (p: PickEntry) => p.storeId !== myStore.storeId
    );

    const writeHeaders = await drupalWriteHeaders();
    const res = await fetch(
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
            attributes: {
              field_my_picks: JSON.stringify(filtered),
            },
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Picks update failed:", res.status, errText.slice(0, 300));
      return NextResponse.json(
        { error: "Failed to update picks" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      picks: filtered,
      message: `Picks updated (${filtered.length} creator${filtered.length !== 1 ? "s" : ""})`,
    });
  } catch (err: any) {
    console.error("Picks error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to update picks" },
      { status: 500 }
    );
  }
}
