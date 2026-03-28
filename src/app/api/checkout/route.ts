import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getStripeClient } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storeSlug, xUsername } = await req.json();

  if (!storeSlug || !xUsername) {
    return NextResponse.json(
      { error: "storeSlug and xUsername are required" },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Store Setup + First Month",
              description:
                "$5 one-time setup fee + $6 first month for your RareImagery Creator Store",
            },
            unit_amount: 1100, // $5 setup + $6 first month = $11
          },
          quantity: 1,
        },
      ],
      metadata: {
        storeSlug,
        xUsername,
        type: "store_setup",
      },
      success_url: `${process.env.NEXTAUTH_URL}/console/upgrade-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/console`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err.message);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
