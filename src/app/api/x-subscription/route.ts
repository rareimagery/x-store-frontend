import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

const DRUPAL_API = process.env.DRUPAL_API_URL;

/**
 * GET /api/x-subscription?xUsername=xxx
 * Returns the subscription tier for a given user.
 */
export async function GET(req: NextRequest) {
  const xUsername = req.nextUrl.searchParams.get("xUsername");
  if (!xUsername) {
    return NextResponse.json({ error: "xUsername required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${DRUPAL_API}/jsonapi/node/x_user_profile?filter[field_x_username]=${xUsername}&fields[node--x_user_profile]=field_x_subscription_tier,field_x_subscriber_since`,
      { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
    );
    if (!res.ok) {
      return NextResponse.json({ tier: "none" });
    }
    const data = await res.json();
    const profile = data.data?.[0];
    if (!profile) {
      return NextResponse.json({ tier: "none" });
    }

    return NextResponse.json({
      tier: profile.attributes?.field_x_subscription_tier || "none",
      since: profile.attributes?.field_x_subscriber_since || null,
    });
  } catch {
    return NextResponse.json({ tier: "none" });
  }
}

/**
 * POST /api/x-subscription
 * Claim subscription perks. Body: { action: "claim" }
 * Admin can also set tiers: { action: "set", xUsername, tier }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;
  const role = (session as any).role;

  if (action === "claim") {
    // User claims their own subscription
    const xUsername = (session as any).xUsername;
    if (!xUsername) {
      return NextResponse.json({ error: "No X username linked" }, { status: 400 });
    }

    // Find their profile
    const profileRes = await fetch(
      `${DRUPAL_API}/jsonapi/node/x_user_profile?filter[field_x_username]=${xUsername}`,
      { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
    );
    if (!profileRes.ok) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    const profileData = await profileRes.json();
    const profile = profileData.data?.[0];
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const currentTier = profile.attributes?.field_x_subscription_tier || "none";
    if (currentTier !== "none") {
      return NextResponse.json({
        success: true,
        tier: currentTier,
        message: "You already have an active subscription tier!",
      });
    }

    // Set to pending_claim — admin will approve with the actual tier
    const writeHeaders = await drupalWriteHeaders();
    const patchRes = await fetch(
      `${DRUPAL_API}/jsonapi/node/x_user_profile/${profile.id}`,
      {
        method: "PATCH",
        headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
        body: JSON.stringify({
          data: {
            type: "node--x_user_profile",
            id: profile.id,
            attributes: {
              field_x_subscription_tier: "rare_supporter",
              field_x_subscriber_since: new Date().toISOString().replace("Z", "+00:00"),
            },
          },
        }),
      }
    );

    if (!patchRes.ok) {
      const err = await patchRes.text();
      console.error("Claim failed:", err);
      return NextResponse.json({ error: "Failed to claim perks" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tier: "rare_supporter",
      message: "Perks claimed! Welcome, Rare Supporter.",
    });
  }

  if (action === "set") {
    // Admin sets a user's tier
    if (role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { xUsername, tier } = body;
    if (!xUsername || !["none", "rare_supporter", "inner_circle"].includes(tier)) {
      return NextResponse.json({ error: "Invalid xUsername or tier" }, { status: 400 });
    }

    const profileRes = await fetch(
      `${DRUPAL_API}/jsonapi/node/x_user_profile?filter[field_x_username]=${xUsername}`,
      { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
    );
    const profileData = await profileRes.json();
    const profile = profileData.data?.[0];
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const attrs: Record<string, unknown> = {
      field_x_subscription_tier: tier,
    };
    if (tier !== "none" && !profile.attributes?.field_x_subscriber_since) {
      attrs.field_x_subscriber_since = new Date().toISOString().replace("Z", "+00:00");
    }
    if (tier === "none") {
      attrs.field_x_subscriber_since = null;
    }

    const writeHeaders = await drupalWriteHeaders();
    const patchRes = await fetch(
      `${DRUPAL_API}/jsonapi/node/x_user_profile/${profile.id}`,
      {
        method: "PATCH",
        headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
        body: JSON.stringify({
          data: {
            type: "node--x_user_profile",
            id: profile.id,
            attributes: attrs,
          },
        }),
      }
    );

    if (!patchRes.ok) {
      const err = await patchRes.text();
      console.error("Set tier failed:", err);
      return NextResponse.json({ error: "Failed to update tier" }, { status: 500 });
    }

    return NextResponse.json({ success: true, tier, xUsername });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
