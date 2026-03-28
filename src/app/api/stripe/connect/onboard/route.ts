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
 *
 * Flow:
 *   1. Look up the creator's x_creator_store node via the profile REST endpoint.
 *   2. If no account exists, create a Stripe Express account and save it to Drupal.
 *   3. Create and return an AccountLink for the onboarding UI.
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
    // 1. Get the x_creator_store node ID + existing Stripe account ID via Drupal REST.
    const profileRes = await fetch(
      `${DRUPAL_API}/api/store/${encodeURIComponent(xUsername)}/profile`,
      { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
    );

    if (!profileRes.ok) {
      return NextResponse.json({ error: "Store profile not found" }, { status: 404 });
    }

    const profile = await profileRes.json();
    const nodeId: number = profile.nodeId;
    let stripeAccountId: string | null = profile.stripeAccountId ?? null;

    const stripe = getStripeClient();

    // 2. Create an Express account if the store doesn't have one.
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        metadata: {
          x_handle: xUsername,
          store_node_id: String(nodeId),
        },
      });
      stripeAccountId = account.id;

      // Persist to Drupal via the dedicated onboarding REST resource.
      const writeHeaders = await drupalWriteHeaders();
      const saveRes = await fetch(
        `${DRUPAL_API}/api/dashboard/stores/${nodeId}/stripe-onboarding`,
        {
          method: "POST",
          headers: {
            ...writeHeaders,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      // If the Drupal endpoint returned its own URL, use that; otherwise proceed
      // with the account we just created. Either way the account ID is now saved.
      if (saveRes.ok) {
        const saveData = await saveRes.json().catch(() => ({}));
        if (saveData.url) {
          return NextResponse.json({ url: saveData.url });
        }
      }
    }

    // 3. Generate an AccountLink so the creator can complete / update their profile.
    const returnBase = process.env.NEXTAUTH_URL ?? "https://rareimagery.net";
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${returnBase}/console?stripe_refresh=1`,
      return_url: `${returnBase}/console?stripe_return=1`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Stripe Connect onboarding failed";
    console.error("[stripe/connect/onboard]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
