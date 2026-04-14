import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getStripeClient } from "@/lib/stripe";

/**
 * POST /api/subscriptions/manage
 * Creates a Stripe Billing Portal session for the customer to manage
 * their subscription (update card, cancel, change plan).
 * Returns { portalUrl } for redirect.
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.xUsername) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = (token.email as string) || undefined;
  if (!email) {
    return NextResponse.json({ error: "No email on account" }, { status: 400 });
  }

  const stripe = getStripeClient();

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      return NextResponse.json({ error: "No billing account found" }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${process.env.NEXTAUTH_URL}/console/billing`,
    });

    return NextResponse.json({ portalUrl: session.url });
  } catch (err: any) {
    console.error("[manage] Stripe portal error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create portal session" },
      { status: 500 }
    );
  }
}
