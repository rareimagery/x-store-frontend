import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getStripeClient } from "@/lib/stripe";

// Stripe Price IDs — set these in .env.production after creating products in Stripe Dashboard
const PLAN_PRICES: Record<string, string> = {
  creator_basic: process.env.STRIPE_CREATOR_PRICE_ID || "",
  creator_pro: process.env.STRIPE_CREATOR_PRO_PRICE_ID || "",
  creator_unlimited: process.env.STRIPE_CREATOR_UNLIMITED_PRICE_ID || "",
};

/**
 * POST /api/subscriptions/subscribe
 * Creates a Stripe Checkout Session for a creator subscription.
 * Returns { checkoutUrl } for redirect.
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.xUsername) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = await req.json();
  if (!plan || !PLAN_PRICES[plan]) {
    return NextResponse.json(
      { error: `Invalid plan. Choose: ${Object.keys(PLAN_PRICES).join(", ")}` },
      { status: 400 }
    );
  }

  const priceId = PLAN_PRICES[plan];
  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price not configured for this plan. Contact support." },
      { status: 500 }
    );
  }

  const stripe = getStripeClient();
  const xUsername = token.xUsername as string;
  const email = (token.email as string) || undefined;

  try {
    // Find or create Stripe Customer
    const existing = await stripe.customers.list({ email, limit: 1 });
    let customerId: string;

    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: { xUsername, plan },
      });
      customerId = customer.id;
    }

    // Create Checkout Session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/console/billing?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/console/billing?canceled=true`,
      metadata: { xUsername, plan },
      subscription_data: {
        metadata: { xUsername, plan },
      },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err: any) {
    console.error("[subscribe] Stripe error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
