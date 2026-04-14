import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

/**
 * GET /api/stores/grace-status?store={slug}
 * Returns grace period status for the current visitor on a creator's store.
 * Auto-starts grace period on first visit if gate is enabled.
 */
export async function GET(req: NextRequest) {
  const storeSlug = req.nextUrl.searchParams.get("store");
  if (!storeSlug) {
    return NextResponse.json({ error: "store param required" }, { status: 400 });
  }

  const token = await getToken({ req });
  const visitorUsername = (token?.xUsername as string) || "";

  // Not logged in — return prompt to log in
  if (!visitorUsername) {
    return NextResponse.json({
      status: "not_logged_in",
      gateEnabled: true,
      message: "Log in with X to unlock full access",
    });
  }

  // Look up the creator's store to get their username and gate settings
  try {
    const storeRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(storeSlug)}&include=field_x_user_profile&fields[commerce_store--online]=field_store_slug,field_subscribe_gate_enabled,field_subscribe_gate_days,field_subscribe_gate_mode,field_subscribe_gate_bonus`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );

    if (!storeRes.ok) {
      return NextResponse.json({ status: "error", gateEnabled: false }, { status: 502 });
    }

    const storeJson = await storeRes.json();
    const store = storeJson.data?.[0];
    if (!store) {
      return NextResponse.json({ status: "store_not_found", gateEnabled: false }, { status: 404 });
    }

    const attrs = store.attributes || {};
    const gateEnabled = attrs.field_subscribe_gate_enabled ?? false;
    const graceDays = attrs.field_subscribe_gate_days ?? 3;
    const gateMode = attrs.field_subscribe_gate_mode || "soft";
    const gateBonus = attrs.field_subscribe_gate_bonus || "none";

    // Find creator username from included profile
    let creatorUsername = "";
    const included = storeJson.included || [];
    for (const item of included) {
      if (item.type === "node--x_user_profile") {
        creatorUsername = item.attributes?.field_x_username || "";
        break;
      }
    }

    // If gate not enabled, full access
    if (!gateEnabled) {
      return NextResponse.json({
        status: "full_access",
        gateEnabled: false,
        creatorUsername,
      });
    }

    // Creator viewing own store — auto-pass
    if (visitorUsername.toLowerCase() === creatorUsername.toLowerCase()) {
      return NextResponse.json({
        status: "claimed",
        gateEnabled: true,
        creatorUsername,
        message: "Owner viewing own store",
      });
    }

    // Admin bypass
    const role = token?.role as string;
    if (role === "admin") {
      return NextResponse.json({
        status: "claimed",
        gateEnabled: true,
        creatorUsername,
        message: "Admin bypass",
      });
    }

    // Check grace status from Drupal
    const graceRes = await fetch(
      `${DRUPAL_API_URL}/api/grace-status/${encodeURIComponent(creatorUsername)}/${encodeURIComponent(visitorUsername)}`,
      { headers: drupalAuthHeaders(), cache: "no-store" }
    );

    if (!graceRes.ok) {
      // Fail open — don't block users if Drupal is down
      return NextResponse.json({ status: "full_access", gateEnabled: true, creatorUsername });
    }

    const graceData = await graceRes.json();

    // No record — start grace period
    if (graceData.status === "no_record") {
      const startRes = await fetch(`${DRUPAL_API_URL}/api/grace-start`, {
        method: "POST",
        headers: { ...drupalAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          visitor_x_id: visitorUsername,
          creator_x_id: creatorUsername,
          creator_store_slug: storeSlug,
          grace_days: graceDays,
        }),
      });

      if (startRes.ok) {
        const startData = await startRes.json();
        return NextResponse.json({
          ...startData,
          gateEnabled: true,
          gateMode,
          gateBonus,
          graceDays,
          creatorUsername,
        });
      }

      // Fail open
      return NextResponse.json({ status: "in_grace", gateEnabled: true, creatorUsername, hours_remaining: graceDays * 24 });
    }

    // Return existing grace status
    return NextResponse.json({
      ...graceData,
      gateEnabled: true,
      gateMode,
      gateBonus,
      graceDays,
      creatorUsername,
    });
  } catch (err) {
    console.error("[grace-status] Error:", err);
    // Fail open
    return NextResponse.json({ status: "full_access", gateEnabled: false });
  }
}

/**
 * POST /api/stores/grace-status
 * Claim subscription (visitor says "I subscribed").
 * Body: { store, claim_method? }
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  const visitorUsername = (token?.xUsername as string) || "";
  if (!visitorUsername) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const storeSlug = body.store || "";
  const claimMethod = body.claim_method || "self_claim";

  if (!storeSlug) {
    return NextResponse.json({ error: "store required" }, { status: 400 });
  }

  // Look up creator username from store
  try {
    const storeRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(storeSlug)}&include=field_x_user_profile`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );

    let creatorUsername = "";
    if (storeRes.ok) {
      const storeJson = await storeRes.json();
      const included = storeJson.included || [];
      for (const item of included) {
        if (item.type === "node--x_user_profile") {
          creatorUsername = item.attributes?.field_x_username || "";
          break;
        }
      }
    }

    if (!creatorUsername) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    // Try to verify follow via X API before accepting claim
    let finalClaimMethod = claimMethod;
    let followVerified = false;
    if (claimMethod === "self_claim" && process.env.X_API_BEARER_TOKEN) {
      try {
        const { fetchXProfile } = await import("@/lib/x-api");
        const targetProfile = await fetchXProfile(creatorUsername);
        if (targetProfile?.data?.id) {
          const followRes = await fetch(
            `https://api.x.com/2/users/${targetProfile.data.id}/followers?max_results=1000&user.fields=username`,
            { headers: { Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN}` }, cache: "no-store" }
          );
          if (followRes.ok) {
            const followData = await followRes.json();
            const followers = followData.data || [];
            followVerified = followers.some(
              (f: any) => f.username?.toLowerCase() === visitorUsername.toLowerCase()
            );
            if (followVerified) {
              finalClaimMethod = "follow_verified";
            }
          }
        }
      } catch {
        // Verification failed — still honor the claim
      }
    }

    // Claim grace period
    const claimRes = await fetch(`${DRUPAL_API_URL}/api/grace-claim`, {
      method: "POST",
      headers: { ...drupalAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        visitor_x_id: visitorUsername,
        creator_x_id: creatorUsername,
        claim_method: finalClaimMethod,
      }),
    });

    if (claimRes.ok) {
      const claimData = await claimRes.json();
      return NextResponse.json({ ...claimData, follow_verified: followVerified });
    }

    return NextResponse.json({ error: "Claim failed" }, { status: 502 });
  } catch (err) {
    console.error("[grace-claim] Error:", err);
    return NextResponse.json({ error: "Claim failed" }, { status: 502 });
  }
}
