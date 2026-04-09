import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getPaymentProvider } from "@/lib/payments";
import { createRateLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { getStoreUrl } from "@/lib/store-url";

const subCheckoutLimit = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 }); // 10/hour

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (token.xId as string) || (token.sub as string) || "anon";
  const rl = subCheckoutLimit(userId);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  try {
    const { tierId, tierName, amount, currency, interval, storeId, sellerXId, storeSlug } =
      await req.json();

    if (!tierId || !amount || !storeId) {
      return NextResponse.json(
        { error: "tierId, amount, and storeId are required" },
        { status: 400 }
      );
    }

    const provider = getPaymentProvider();

    const intent = await provider.createSubscription({
      tierId,
      tierName: tierName || "Subscription",
      amount: parseFloat(amount),
      currency: currency || "USD",
      interval: interval || "month",
      storeId,
      buyerXId: (token.xId as string) || null,
      sellerXId: sellerXId || null,
      successUrl: `${getStoreUrl(storeSlug || storeId)}?subscribed=true`,
      cancelUrl: getStoreUrl(storeSlug || storeId),
    });

    return NextResponse.json({
      checkoutUrl: intent.checkoutUrl,
      subscriptionId: intent.id,
      provider: intent.provider,
    });
  } catch (err: any) {
    console.error("Subscription checkout error:", err.message);
    return NextResponse.json(
      { error: err.message || "Subscription checkout failed" },
      { status: 500 }
    );
  }
}
