import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getStripeClient } from "@/lib/stripe";
import { drupalAuthHeaders } from "@/lib/drupal";

const DRUPAL_API = process.env.DRUPAL_API_URL;

/**
 * GET /api/stripe/connect/status
 *
 * Returns the Stripe Connect account status for the authenticated creator.
 * Used by the StripeConnectPanel component to show payout readiness.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const xUsername = (token.xUsername as string | undefined)?.replace(/^@/, "").toLowerCase();
  if (!xUsername) {
    return NextResponse.json({ error: "X username not found in session" }, { status: 400 });
  }

  try {
    // Fetch the store profile from Drupal to get the Stripe account ID.
    const profileRes = await fetch(
      `${DRUPAL_API}/api/store/${encodeURIComponent(xUsername)}/profile`,
      { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
    );

    if (!profileRes.ok) {
      return NextResponse.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        accountId: null,
      });
    }

    const profile = await profileRes.json();
    const stripeAccountId: string | null = profile.stripeAccountId ?? null;

    if (!stripeAccountId) {
      return NextResponse.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        accountId: null,
      });
    }

    // Retrieve live status from Stripe.
    const stripe = getStripeClient();
    const account = await stripe.accounts.retrieve(stripeAccountId);

    return NextResponse.json({
      connected: true,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      accountId: stripeAccountId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Status check failed";
    console.error("[stripe/connect/status]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
