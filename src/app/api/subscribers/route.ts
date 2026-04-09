import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

interface SubscriberRow {
  id: string;
  username: string;
  display_name: string;
  profile_image_url: string | null;
  follower_count: number;
  verified: boolean;
  tier: string;
  subscriber_since: string | null;
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.xUsername) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!DRUPAL_API_URL) {
    return NextResponse.json({ subscribers: [] });
  }

  try {
    // Fetch all profiles that have a subscription tier set (not empty/null)
    const params = new URLSearchParams({
      "page[limit]": "100",
      "filter[has-tier][condition][path]": "field_x_subscription_tier",
      "filter[has-tier][condition][operator]": "IS NOT NULL",
      "fields[node--x_user_profile]":
        "field_x_username,field_x_display_name,field_x_followers,field_x_verified,field_x_avatar_url,field_x_subscription_tier,field_x_subscriber_since",
    });

    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?${params.toString()}`,
      {
        headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json({ subscribers: [] });
    }

    const json = await res.json();
    const subscribers: SubscriberRow[] = (json.data || [])
      .map((n: any) => {
        const a = n.attributes;
        const tier = a.field_x_subscription_tier || "";
        // Skip profiles with tier "none" or empty
        if (!tier || tier === "none") return null;
        return {
          id: n.id,
          username: a.field_x_username || "",
          display_name: a.field_x_display_name || "",
          profile_image_url: a.field_x_avatar_url || null,
          follower_count: a.field_x_followers || 0,
          verified: a.field_x_verified || false,
          tier,
          subscriber_since: a.field_x_subscriber_since || null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ subscribers });
  } catch {
    return NextResponse.json({ subscribers: [] });
  }
}
