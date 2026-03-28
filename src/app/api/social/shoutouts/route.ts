import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { drupalWriteHeaders, drupalAuthHeaders } from "@/lib/drupal";
import { getStoreByXUsername } from "@/lib/social";

const DRUPAL_API_URL = process.env.DRUPAL_API_URL || "http://localhost:8081";

/**
 * GET /api/social/shoutouts?storeId=xxx
 * Get shoutouts for a store (most recent 10).
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
    const params = new URLSearchParams({
      "filter[field_to_store]": storeId,
      "filter[field_shoutout_status]": "published",
      "sort": "-created",
      "page[limit]": "10",
    });

    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/node/shoutout?${params}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json({ shoutouts: [] });
    }

    const json = await res.json();
    const shoutouts = (json.data ?? []).map((node: any) => ({
      id: node.id,
      text: node.attributes.field_shoutout_text ?? "",
      fromStoreId: node.attributes.field_from_store ?? "",
      fromXUsername: node.attributes.field_from_x_username ?? "",
      fromProfilePic: node.attributes.field_from_profile_pic ?? null,
      createdAt: node.attributes.created ?? "",
    }));

    return NextResponse.json({ shoutouts });
  } catch (err: any) {
    console.error("Shoutouts fetch error:", err.message);
    return NextResponse.json({ shoutouts: [] });
  }
}

/**
 * POST /api/social/shoutouts
 * Post a shoutout on another creator's wall.
 * Body: { targetStoreId: string, text: string }
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.xUsername) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { targetStoreId, text } = await req.json();

    if (!targetStoreId || !text) {
      return NextResponse.json(
        { error: "targetStoreId and text are required" },
        { status: 400 }
      );
    }

    if (text.length > 120) {
      return NextResponse.json(
        { error: "Shoutout must be 120 characters or less" },
        { status: 400 }
      );
    }

    // Get the poster's store
    const myStore = await getStoreByXUsername(token.xUsername as string);
    if (!myStore) {
      return NextResponse.json(
        { error: "You need a store to post shoutouts" },
        { status: 403 }
      );
    }

    if (myStore.storeId === targetStoreId) {
      return NextResponse.json(
        { error: "You cannot shoutout your own store" },
        { status: 400 }
      );
    }

    // Check that target store has shoutouts enabled
    const storeRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online/${targetStoreId}`,
      { cache: "no-store" }
    );
    if (storeRes.ok) {
      const storeJson = await storeRes.json();
      const enabled = storeJson.data?.attributes?.field_shoutout_enabled;
      if (enabled === false) {
        return NextResponse.json(
          { error: "This creator has disabled shoutouts" },
          { status: 403 }
        );
      }
    }

    // Get poster's profile picture
    let profilePic: string | null = null;
    try {
      const profileParams = new URLSearchParams({
        "filter[field_x_username]": token.xUsername as string,
        include: "field_profile_picture",
      });
      const profileRes = await fetch(
        `${DRUPAL_API_URL}/jsonapi/node/creator_x_profile?${profileParams}`,
        { cache: "no-store" }
      );
      if (profileRes.ok) {
        const profileJson = await profileRes.json();
        const pfpRef =
          profileJson.data?.[0]?.relationships?.field_profile_picture?.data;
        if (pfpRef) {
          const fileEntity = (profileJson.included ?? []).find(
            (inc: any) => inc.id === pfpRef.id && inc.type === "file--file"
          );
          if (fileEntity?.attributes?.uri?.url) {
            const path = fileEntity.attributes.uri.url;
            profilePic = path.startsWith("http")
              ? path
              : `${DRUPAL_API_URL}${path}`;
          }
        }
      }
    } catch {
      // Non-critical
    }

    // Create the shoutout node
    const writeHeaders = await drupalWriteHeaders();
    const body = {
      data: {
        type: "node--shoutout",
        attributes: {
          title: `Shoutout from @${token.xUsername}`,
          field_from_store: myStore.storeId,
          field_to_store: targetStoreId,
          field_shoutout_text: text,
          field_shoutout_status: "published",
          field_from_x_username: token.xUsername,
          field_from_profile_pic: profilePic ?? "",
        },
      },
    };

    const createRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/node/shoutout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/vnd.api+json",
          Accept: "application/vnd.api+json",
          ...writeHeaders,
        },
        body: JSON.stringify(body),
      }
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("Shoutout create failed:", createRes.status, errText.slice(0, 300));
      return NextResponse.json(
        { error: "Failed to post shoutout" },
        { status: 500 }
      );
    }

    const result = await createRes.json();
    return NextResponse.json({
      id: result.data.id,
      message: "Shoutout posted!",
    });
  } catch (err: any) {
    console.error("Shoutout error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to post shoutout" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social/shoutouts
 * Delete a shoutout (only the store owner can delete shoutouts on their wall).
 * Body: { shoutoutId: string }
 */
export async function DELETE(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.xUsername) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { shoutoutId } = await req.json();
    if (!shoutoutId) {
      return NextResponse.json(
        { error: "shoutoutId is required" },
        { status: 400 }
      );
    }

    // Verify the user owns the target store or posted the shoutout
    const shoutoutRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/node/shoutout/${shoutoutId}`,
      { cache: "no-store" }
    );
    if (!shoutoutRes.ok) {
      return NextResponse.json({ error: "Shoutout not found" }, { status: 404 });
    }

    const shoutoutJson = await shoutoutRes.json();
    const toStoreId = shoutoutJson.data?.attributes?.field_to_store;
    const fromUsername = shoutoutJson.data?.attributes?.field_from_x_username;

    const myStore = await getStoreByXUsername(token.xUsername as string);
    const isWallOwner = myStore && myStore.storeId === toStoreId;
    const isPoster = fromUsername === token.xUsername;

    if (!isWallOwner && !isPoster) {
      return NextResponse.json(
        { error: "You can only delete shoutouts on your wall or ones you posted" },
        { status: 403 }
      );
    }

    // Soft delete — set status to "deleted"
    const writeHeaders = await drupalWriteHeaders();
    await fetch(
      `${DRUPAL_API_URL}/jsonapi/node/shoutout/${shoutoutId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/vnd.api+json",
          Accept: "application/vnd.api+json",
          ...writeHeaders,
        },
        body: JSON.stringify({
          data: {
            type: "node--shoutout",
            id: shoutoutId,
            attributes: { field_shoutout_status: "deleted" },
          },
        }),
      }
    );

    return NextResponse.json({ message: "Shoutout removed" });
  } catch (err: any) {
    console.error("Shoutout delete error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to delete shoutout" },
      { status: 500 }
    );
  }
}
