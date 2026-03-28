import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { CheckoutItem } from "@/lib/payments";
import { createPaymentIntent } from "@/app/actions/payment";
import { drupalAuthHeaders } from "@/lib/drupal";

const DRUPAL_API = process.env.DRUPAL_API_URL;

type AttributionPayload = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPath?: string;
};

function cleanMetaValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, 120);
}

/** Resolve the seller's Stripe Express account ID from their store profile. */
async function getSellerStripeAccountId(handle: string): Promise<string | null> {
  try {
    const clean = handle.replace(/^@/, "").toLowerCase();
    const res = await fetch(
      `${DRUPAL_API}/api/store/${encodeURIComponent(clean)}/profile`,
      { headers: { ...drupalAuthHeaders() }, next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data.stripeAccountId as string | null) ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { items, storeId, sellerXId, sellerHandle, provider, attribution } = (await req.json()) as {
      items: CheckoutItem[];
      storeId: string;
      sellerXId: string;
      sellerHandle?: string;
      provider?: "stripe" | "xmoney";
      attribution?: AttributionPayload;
    };

    if (!items?.length || !storeId) {
      return NextResponse.json(
        { error: "items and storeId are required" },
        { status: 400 }
      );
    }

    const handle = sellerHandle || sellerXId;
    const referrer = req.headers.get("referer") || req.headers.get("referrer") || "";
    const checkoutMetadata: Record<string, string> = {
      ...(cleanMetaValue(attribution?.utmSource) ? { attr_utm_source: cleanMetaValue(attribution?.utmSource)! } : {}),
      ...(cleanMetaValue(attribution?.utmMedium) ? { attr_utm_medium: cleanMetaValue(attribution?.utmMedium)! } : {}),
      ...(cleanMetaValue(attribution?.utmCampaign) ? { attr_utm_campaign: cleanMetaValue(attribution?.utmCampaign)! } : {}),
      ...(cleanMetaValue(attribution?.landingPath) ? { attr_landing_path: cleanMetaValue(attribution?.landingPath)! } : {}),
      ...(cleanMetaValue(referrer) ? { attr_referrer: cleanMetaValue(referrer)! } : {}),
    };

    // Prefer Stripe with Connect transfer when provider is not explicitly xmoney.
    if (provider !== "xmoney") {
      const { StripeProvider } = await import("@/lib/payments");
      const stripeProvider = new StripeProvider();
      if (stripeProvider.available) {
        const sellerStripeAccountId = handle
          ? await getSellerStripeAccountId(handle)
          : null;

        const baseUrl = process.env.NEXTAUTH_URL ?? "https://rareimagery.net";
        const paymentIntent = await stripeProvider.createCheckout({
          items,
          storeId,
          buyerXId: (token.xUsername as string | null) ?? null,
          sellerXId: sellerXId ?? null,
          sellerStripeAccountId: sellerStripeAccountId ?? undefined,
          metadata: checkoutMetadata,
          successUrl: `${baseUrl}/stores/${handle ?? storeId}?order_success=1`,
          cancelUrl: `${baseUrl}/stores/${handle ?? storeId}`,
        });

        return NextResponse.json({
          checkoutUrl: paymentIntent.checkoutUrl,
          paymentId: paymentIntent.id,
          provider: "stripe",
        });
      }
    }

    // Fall back to the legacy payment abstraction (X Money / other providers).
    const firstItem = items[0];
    const totalPrice = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const legacyIntent = await createPaymentIntent(
      {
        productId: firstItem.productId,
        price: totalPrice,
        sellerHandle: handle || storeId,
      },
      provider ?? "xmoney"
    );

    if (!legacyIntent.success) {
      return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
    }

    return NextResponse.json({
      checkoutUrl: legacyIntent.paymentLink,
      paymentId: `${provider ?? "xmoney"}-${Date.now()}`,
      provider: legacyIntent.provider,
      message: legacyIntent.message,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    console.error("Product checkout error:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
