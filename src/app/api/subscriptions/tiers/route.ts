import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";
import type { SubscriptionTier } from "@/lib/payments";

const DRUPAL_API = process.env.DRUPAL_API_URL;

/** GET /api/subscriptions/tiers?storeId=xxx — fetch tiers for a store */
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId || !DRUPAL_API) {
    return NextResponse.json({ tiers: [] });
  }

  try {
    const res = await fetch(
      `${DRUPAL_API}/jsonapi/commerce_store/online/${storeId}`,
      { headers: { ...drupalAuthHeaders() }, next: { revalidate: 60 } }
    );

    if (!res.ok) {
      return NextResponse.json({ tiers: [] });
    }

    const json = await res.json();
    const tiersJson = json.data?.attributes?.field_subscription_tiers;
    const tiers: SubscriptionTier[] = tiersJson
      ? JSON.parse(tiersJson)
      : [];

    return NextResponse.json({ tiers });
  } catch {
    return NextResponse.json({ tiers: [] });
  }
}

/** POST /api/subscriptions/tiers — save tiers for a store */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { storeId, tiers } = (await req.json()) as {
      storeId: string;
      tiers: SubscriptionTier[];
    };

    if (!storeId || !tiers) {
      return NextResponse.json(
        { error: "storeId and tiers are required" },
        { status: 400 }
      );
    }

    // Validate tier structure
    for (const tier of tiers) {
      if (!tier.name || tier.price < 0) {
        return NextResponse.json(
          { error: `Invalid tier: ${tier.name || "unnamed"}` },
          { status: 400 }
        );
      }
    }

    // Assign IDs to new tiers
    const processedTiers = tiers.map((t) => ({
      ...t,
      id: t.id || `tier_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    }));

    const writeHeaders = await drupalWriteHeaders();
    const res = await fetch(
      `${DRUPAL_API}/jsonapi/commerce_store/online/${storeId}`,
      {
        method: "PATCH",
        headers: {
          ...writeHeaders,
          "Content-Type": "application/vnd.api+json",
        },
        body: JSON.stringify({
          data: {
            type: "commerce_store--online",
            id: storeId,
            attributes: {
              field_subscription_tiers: JSON.stringify(processedTiers),
            },
          },
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Failed to save tiers:", text);
      return NextResponse.json(
        { error: "Failed to save subscription tiers" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, tiers: processedTiers });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to save tiers" },
      { status: 500 }
    );
  }
}
