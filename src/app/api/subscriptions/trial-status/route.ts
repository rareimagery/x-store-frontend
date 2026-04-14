import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";

const TRIAL_DAYS = 7;

/**
 * GET /api/subscriptions/trial-status
 * Returns the authenticated creator's trial/subscription status.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeSlug = (token.storeSlug as string) || "";
  const xUsername = (token.xUsername as string) || "";

  if (!storeSlug && !xUsername) {
    return NextResponse.json({
      status: "new",
      trialStart: null,
      trialEnd: null,
      daysRemaining: -1,
      plan: null,
      subscriptionId: null,
      canStartTrial: true,
    });
  }

  // Find the store
  const slug = storeSlug || xUsername;
  try {
    // Try by slug first, then by username via profile
    let storeData: any = null;

    const slugRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_trial_start,field_subscription_status,field_subscription_id,field_subscription_plan`,
      { headers: { ...drupalAuthHeaders() }, cache: "no-store" }
    );
    if (slugRes.ok) {
      const json = await slugRes.json();
      storeData = json.data?.[0];
    }

    // Fallback: find via profile → linked store
    if (!storeData && xUsername) {
      const profileRes = await fetch(
        `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?filter[field_x_username]=${encodeURIComponent(xUsername)}&include=field_linked_store&fields[commerce_store--online]=field_trial_start,field_subscription_status,field_subscription_id,field_subscription_plan`,
        { headers: { ...drupalAuthHeaders() }, cache: "no-store" }
      );
      if (profileRes.ok) {
        const pJson = await profileRes.json();
        const included = pJson.included || [];
        storeData = included.find((i: any) => i.type === "commerce_store--online");
      }
    }

    if (!storeData) {
      return NextResponse.json({
        status: "new",
        trialStart: null,
        trialEnd: null,
        daysRemaining: -1,
        plan: null,
        subscriptionId: null,
        canStartTrial: true,
      });
    }

    const attrs = storeData.attributes || {};
    const subscriptionStatus = attrs.field_subscription_status || null;
    const subscriptionPlan = attrs.field_subscription_plan || null;
    const subscriptionId = attrs.field_subscription_id || null;
    const trialStartRaw = attrs.field_trial_start || null;

    // If subscription is active, return immediately
    if (subscriptionStatus === "active") {
      return NextResponse.json({
        status: "active",
        trialStart: trialStartRaw,
        trialEnd: null,
        daysRemaining: -1,
        plan: subscriptionPlan || "creator_basic",
        subscriptionId,
        canStartTrial: false,
      });
    }

    // Calculate trial status
    if (trialStartRaw) {
      const trialStart = new Date(trialStartRaw);
      const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const now = new Date();
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      if (daysRemaining > 0) {
        return NextResponse.json({
          status: "trialing",
          trialStart: trialStartRaw,
          trialEnd: trialEnd.toISOString(),
          daysRemaining,
          plan: "free_trial",
          subscriptionId: null,
          canStartTrial: false,
        });
      } else {
        return NextResponse.json({
          status: subscriptionStatus === "canceled" ? "canceled" : "expired",
          trialStart: trialStartRaw,
          trialEnd: trialEnd.toISOString(),
          daysRemaining: 0,
          plan: subscriptionPlan,
          subscriptionId,
          canStartTrial: false,
        });
      }
    }

    // No trial start date — treat as trialing from store creation (graceful fallback)
    return NextResponse.json({
      status: subscriptionStatus || "trialing",
      trialStart: null,
      trialEnd: null,
      daysRemaining: TRIAL_DAYS,
      plan: subscriptionPlan || "free_trial",
      subscriptionId,
      canStartTrial: false,
    });
  } catch (err) {
    console.error("[trial-status] Error:", err);
    // Fail open — don't block users if Drupal is down
    return NextResponse.json({
      status: "trialing",
      trialStart: null,
      trialEnd: null,
      daysRemaining: TRIAL_DAYS,
      plan: "free_trial",
      subscriptionId: null,
      canStartTrial: false,
    });
  }
}
