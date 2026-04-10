import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";
import type { CartItem } from "@/app/api/cart/route";

/**
 * POST /api/checkout/products
 * Creates a Stripe Checkout session for product purchases.
 * Reads cart from request body, creates line items, enables shipping collection.
 */
export async function POST(req: NextRequest) {
  const { items, storeSlug } = (await req.json()) as {
    items: CartItem[];
    storeSlug: string;
  };

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  if (!storeSlug) {
    return NextResponse.json({ error: "storeSlug required" }, { status: 400 });
  }

  // Look up seller's Stripe Connect account (for fund routing)
  let sellerStripeAccountId: string | null = null;
  try {
    const storeRes = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(storeSlug)}&fields[commerce_store--online]=field_stripe_account_id`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );
    if (storeRes.ok) {
      const storeJson = await storeRes.json();
      sellerStripeAccountId = storeJson.data?.[0]?.attributes?.field_stripe_account_id || null;
    }
  } catch {}

  try {
    const stripe = getStripeClient();

    const lineItems = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.title,
          ...(item.imageUrl ? { images: [item.imageUrl] } : {}),
          metadata: {
            variationId: item.variationId,
            printfulVariantId: item.printfulVariantId || "",
            size: item.size || "",
            color: item.color || "",
          },
        },
        unit_amount: Math.round(parseFloat(item.price) * 100),
      },
      quantity: item.quantity,
    }));

    // Serialize cart items for webhook (Stripe metadata max 500 chars per value)
    const itemsMeta = JSON.stringify(
      items.map((i) => ({
        productId: i.productId,
        variationId: i.variationId,
        printfulVariantId: i.printfulVariantId || "",
        title: i.title.slice(0, 40),
        price: i.price,
        quantity: i.quantity,
        size: i.size || "",
        color: i.color || "",
      }))
    ).slice(0, 500);

    const sessionConfig: any = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      shipping_address_collection: {
        allowed_countries: [
          "US", "CA", "GB", "AU", "DE", "FR", "ES", "IT", "NL", "SE",
          "NO", "DK", "FI", "BE", "AT", "CH", "IE", "NZ", "JP",
        ],
      },
      metadata: {
        type: "product_purchase",
        store_slug: storeSlug,
        items: itemsMeta,
      },
      success_url: `${process.env.NEXTAUTH_URL}/purchase-success?seller=${encodeURIComponent(storeSlug)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/${storeSlug}/store`,
    };

    // Route funds to seller via Stripe Connect (if connected)
    if (sellerStripeAccountId) {
      const totalAmount = items.reduce(
        (sum, i) => sum + Math.round(parseFloat(i.price) * 100) * i.quantity,
        0
      );
      // Platform fee: 2.9% + $0.30
      const platformFee = Math.round(totalAmount * 0.029) + 30;
      sessionConfig.payment_intent_data = {
        transfer_data: {
          destination: sellerStripeAccountId,
        },
        application_fee_amount: platformFee,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error("[checkout/products] Stripe error:", err.message);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
