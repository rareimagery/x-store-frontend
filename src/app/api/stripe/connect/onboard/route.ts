import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getStripeClient } from "@/lib/stripe";
import { drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

const DRUPAL_API = process.env.DRUPAL_API_URL;

/**
 * POST /api/stripe/connect/onboard
 *
 * Starts or resumes Stripe Connect Express onboarding for the authenticated creator.
 * Returns the Stripe AccountLink URL to redirect the creator to Stripe's onboarding flow.
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const xUsername = (token.xUsername as string | undefined)?.replace(/^@/, "").toLowerCase();
  if (!xUsername) {
    return NextResponse.json({ error: "X username not found in session" }, { status: 400 });
  }

  try {
    // 1. Find the store via X profile → linked store relationship
    const profileRes = await fetch(
      `${DRUPAL_API}/jsonapi/node/x_user_profile?filter[field_x_username]=${encodeURIComponent(xUsername)}&include=field_linked_store`,
      { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
    );

    if (!profileRes.ok) {
      return NextResponse.json({ error: "Store profile not found" }, { status: 404 });
    }

    const profileJson = await profileRes.json();
    const profileNode = profileJson.data?.[0];
    if (!profileNode) {
      return NextResponse.json({ error: "X profile not found" }, { status: 404 });
    }

    // Find the linked store in included data
    const storeRef = profileNode.relationships?.field_linked_store?.data;
    if (!storeRef) {
      return NextResponse.json({ error: "No store linked to this profile" }, { status: 404 });
    }

    const store = (profileJson.included || []).find(
      (inc: any) => inc.id === storeRef.id && inc.type?.startsWith("commerce_store")
    );
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const storeUuid = store.id;
    const storeInternalId = store.attributes?.drupal_internal__store_id;
    let stripeAccountId: string | null = store.attributes?.field_stripe_account_id || null;

    const stripe = getStripeClient();

    // 2. Create an Express account if the store doesn't have one.
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        metadata: {
          x_handle: xUsername,
          store_id: String(storeInternalId),
        },
      });
      stripeAccountId = account.id;

      // Save the Stripe account ID to the store via JSON:API
      const writeHeaders = await drupalWriteHeaders();
      await fetch(`${DRUPAL_API}/jsonapi/commerce_store/online/${storeUuid}`, {
        method: "PATCH",
        headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
        body: JSON.stringify({
          data: {
            type: "commerce_store--online",
            id: storeUuid,
            attributes: {
              field_stripe_account_id: stripeAccountId,
            },
          },
        }),
      });

      console.log(`[stripe/connect] Created Express account ${stripeAccountId} for @${xUsername}`);
    }

    // 3. Generate an AccountLink for the onboarding UI.
    const returnBase = process.env.NEXTAUTH_URL ?? "https://www.rareimagery.net";
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${returnBase}/console/settings?stripe_refresh=1`,
      return_url: `${returnBase}/console/settings?stripe_return=1`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Stripe Connect onboarding failed";
    console.error("[stripe/connect/onboard]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
