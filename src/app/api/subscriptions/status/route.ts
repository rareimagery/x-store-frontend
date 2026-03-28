import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { drupalAuthHeaders } from "@/lib/drupal";
import { isFreeSubscriptionAllowlisted } from "@/lib/subscription-allowlist";

const DRUPAL_API = process.env.DRUPAL_API_URL;

/**
 * Check if the current user has an active subscription to a specific store.
 * GET /api/subscriptions/status?storeId=xxx
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ subscribed: false });
  }

  const tokenXId = (token.xId as string) || null;
  const tokenUsername = (token.xUsername as string) || null;

  if (isFreeSubscriptionAllowlisted({ xId: tokenXId, xUsername: tokenUsername })) {
    return NextResponse.json({
      subscribed: true,
      tier: "helper_free",
      tierName: "Helper Free Access",
      since: null,
      source: "allowlist",
    });
  }

  const storeId = req.nextUrl.searchParams.get("storeId");
  const buyerXId = tokenXId || tokenUsername || "";

  if (!storeId || !buyerXId) {
    return NextResponse.json({ subscribed: false });
  }

  try {
    // Check Drupal for active subscription record
    const params = new URLSearchParams({
      "filter[field_buyer_x_id]": buyerXId,
      "filter[field_store_id]": storeId,
      "filter[field_subscription_status]": "active",
    });

    const res = await fetch(
      `${DRUPAL_API}/jsonapi/node/store_subscription?${params.toString()}`,
      { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
    );

    if (!res.ok) {
      // Content type may not exist yet — treat as not subscribed
      return NextResponse.json({ subscribed: false, tier: null });
    }

    const json = await res.json();
    const subs = json.data ?? [];

    if (subs.length > 0) {
      const sub = subs[0].attributes;
      return NextResponse.json({
        subscribed: true,
        tier: sub.field_tier_id || null,
        tierName: sub.field_tier_name || null,
        since: sub.created || null,
      });
    }

    return NextResponse.json({ subscribed: false, tier: null });
  } catch {
    return NextResponse.json({ subscribed: false, tier: null });
  }
}
