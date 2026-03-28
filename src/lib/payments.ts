// ---------------------------------------------------------------------------
// Payment Provider Abstraction Layer
// ---------------------------------------------------------------------------
// Designed to support X Money as the primary provider when its API launches.
// Stripe serves as the interim/fallback provider.
// ---------------------------------------------------------------------------

import type Stripe from "stripe";

/** Anti-spam listing fee charged via Stripe before product creation. */
export const LISTING_FEE_CENTS = 5; // $0.05

export interface PaymentIntent {
  id: string;
  provider: "xmoney" | "stripe" | "free";
  status: "pending" | "completed" | "failed" | "cancelled";
  amount: number;
  currency: string;
  buyerXId: string | null;
  sellerXId: string | null;
  storeId: string;
  metadata: Record<string, string>;
  checkoutUrl: string | null;
  createdAt: string;
}

export interface SubscriptionIntent {
  id: string;
  provider: "xmoney" | "stripe" | "free";
  status: "active" | "cancelled" | "past_due" | "pending";
  tierId: string;
  tierName: string;
  amount: number;
  currency: string;
  interval: "month" | "year";
  buyerXId: string | null;
  sellerXId: string | null;
  storeId: string;
  checkoutUrl: string | null;
}

export interface CheckoutItem {
  productId: string;
  variationId: string;
  title: string;
  price: number;
  currency: string;
  quantity: number;
}

export interface PaymentProvider {
  name: string;
  available: boolean;

  /** Create a checkout session for product purchases */
  createCheckout(params: {
    items: CheckoutItem[];
    storeId: string;
    buyerXId: string | null;
    sellerXId: string | null;
    metadata?: Record<string, string>;
    successUrl: string;
    cancelUrl: string;
  }): Promise<PaymentIntent>;
  /** Optional: Stripe Express account ID for the seller (enables automatic payouts) */
  sellerStripeAccountId?: string;

  /** Create a subscription for a creator's tier */
  createSubscription(params: {
    tierId: string;
    tierName: string;
    amount: number;
    currency: string;
    interval: "month" | "year";
    storeId: string;
    buyerXId: string | null;
    sellerXId: string | null;
    successUrl: string;
    cancelUrl: string;
  }): Promise<SubscriptionIntent>;

  /** Verify a payment/webhook callback */
  verifyPayment(paymentId: string): Promise<PaymentIntent>;

  /** Cancel a subscription */
  cancelSubscription(subscriptionId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// X Money Provider (stub — ready for API launch)
// ---------------------------------------------------------------------------

export class XMoneyProvider implements PaymentProvider {
  name = "xmoney";

  // Will be set to true when X Money API is available
  get available(): boolean {
    return !!process.env.XMONEY_API_KEY;
  }

  async createCheckout(params: {
    items: CheckoutItem[];
    storeId: string;
    buyerXId: string | null;
    sellerXId: string | null;
    metadata?: Record<string, string>;
    successUrl: string;
    cancelUrl: string;
  }): Promise<PaymentIntent> {
    // When X Money API launches, this will call:
    // POST https://api.x.com/2/payments/intents
    // {
    //   sender_id: params.buyerXId,
    //   recipient_id: params.sellerXId,
    //   amount: { value: total, currency: "USD" },
    //   items: params.items,
    //   success_url: params.successUrl,
    //   cancel_url: params.cancelUrl,
    // }
    throw new Error(
      "X Money is not yet available. Please use an alternative payment method."
    );
  }

  async createSubscription(params: {
    tierId: string;
    tierName: string;
    amount: number;
    currency: string;
    interval: "month" | "year";
    storeId: string;
    buyerXId: string | null;
    sellerXId: string | null;
    successUrl: string;
    cancelUrl: string;
  }): Promise<SubscriptionIntent> {
    // When X Money API launches:
    // POST https://api.x.com/2/payments/subscriptions
    // {
    //   subscriber_id: params.buyerXId,
    //   creator_id: params.sellerXId,
    //   plan: { amount, currency, interval },
    //   metadata: { tier_id: params.tierId },
    // }
    throw new Error(
      "X Money subscriptions are not yet available."
    );
  }

  async verifyPayment(paymentId: string): Promise<PaymentIntent> {
    // GET https://api.x.com/2/payments/intents/{paymentId}
    throw new Error("X Money verification not yet available.");
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    // DELETE https://api.x.com/2/payments/subscriptions/{subscriptionId}
    throw new Error("X Money cancellation not yet available.");
  }
}

// ---------------------------------------------------------------------------
// Stripe Provider (interim/fallback)
// ---------------------------------------------------------------------------

export class StripeProvider implements PaymentProvider {
  name = "stripe";

  get available(): boolean {
    return !!process.env.STRIPE_SECRET_KEY;
  }

  async createCheckout(params: {
    items: CheckoutItem[];
    storeId: string;
    buyerXId: string | null;
    sellerXId: string | null;
    sellerStripeAccountId?: string;
    metadata?: Record<string, string>;
    successUrl: string;
    cancelUrl: string;
  }): Promise<PaymentIntent> {
    const { getStripeClient } = await import("@/lib/stripe");
    const stripe = getStripeClient();

    const lineItems = params.items.map((item) => ({
      price_data: {
        currency: item.currency.toLowerCase(),
        product_data: { name: item.title },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const subtotalCents = params.items.reduce(
      (sum, i) => sum + Math.round(i.price * 100) * i.quantity,
      0
    );
    const feeCents = Math.round(subtotalCents * 0.029) + 30;
    const currency = params.items[0]?.currency?.toLowerCase() ?? "usd";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      metadata: {
        store_id: params.storeId,
        buyer_x_id: params.buyerXId ?? "",
        seller_x_id: params.sellerXId ?? "",
        type: "product_purchase",
        ...(params.metadata ?? {}),
        items: JSON.stringify(
          params.items.map((i) => ({
            id: i.productId,
            vid: i.variationId,
            qty: i.quantity,
          }))
        ),
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    };

    if (params.sellerStripeAccountId) {
      // Route funds to the seller's connected account automatically.
      // Platform retains feeCents as the application fee.
      sessionParams.payment_intent_data = {
        application_fee_amount: feeCents,
        transfer_data: { destination: params.sellerStripeAccountId },
      };
    } else {
      // No connected account yet — add fee as a visible line item so it still covers costs.
      lineItems.push({
        price_data: {
          currency,
          product_data: { name: "Platform processing fee" },
          unit_amount: feeCents,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return {
      id: session.id,
      provider: "stripe",
      status: "pending",
      amount: params.items.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      ),
      currency: params.items[0]?.currency ?? "USD",
      buyerXId: params.buyerXId,
      sellerXId: params.sellerXId,
      storeId: params.storeId,
      metadata: session.metadata ?? {},
      checkoutUrl: session.url,
      createdAt: new Date().toISOString(),
    };
  }

  async createSubscription(params: {
    tierId: string;
    tierName: string;
    amount: number;
    currency: string;
    interval: "month" | "year";
    storeId: string;
    buyerXId: string | null;
    sellerXId: string | null;
    successUrl: string;
    cancelUrl: string;
  }): Promise<SubscriptionIntent> {
    const { getStripeClient } = await import("@/lib/stripe");
    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: params.currency.toLowerCase(),
            product_data: {
              name: `${params.tierName} — Monthly Subscription`,
            },
            unit_amount: Math.round(params.amount * 100),
            recurring: { interval: params.interval },
          },
          quantity: 1,
        },
      ],
      metadata: {
        tier_id: params.tierId,
        store_id: params.storeId,
        buyer_x_id: params.buyerXId ?? "",
        seller_x_id: params.sellerXId ?? "",
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    return {
      id: session.id,
      provider: "stripe",
      status: "pending",
      tierId: params.tierId,
      tierName: params.tierName,
      amount: params.amount,
      currency: params.currency,
      interval: params.interval,
      buyerXId: params.buyerXId,
      sellerXId: params.sellerXId,
      storeId: params.storeId,
      checkoutUrl: session.url,
    };
  }

  async verifyPayment(paymentId: string): Promise<PaymentIntent> {
    const { getStripeClient } = await import("@/lib/stripe");
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(paymentId);

    return {
      id: session.id,
      provider: "stripe",
      status: session.payment_status === "paid" ? "completed" : "pending",
      amount: (session.amount_total ?? 0) / 100,
      currency: session.currency ?? "usd",
      buyerXId: session.metadata?.buyer_x_id ?? null,
      sellerXId: session.metadata?.seller_x_id ?? null,
      storeId: session.metadata?.store_id ?? "",
      metadata: session.metadata ?? {},
      checkoutUrl: null,
      createdAt: new Date(session.created * 1000).toISOString(),
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    const { getStripeClient } = await import("@/lib/stripe");
    const stripe = getStripeClient();
    await stripe.subscriptions.cancel(subscriptionId);
  }
}

// ---------------------------------------------------------------------------
// Provider Resolution
// ---------------------------------------------------------------------------

let _xmoney: XMoneyProvider | null = null;
let _stripe: StripeProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  // Prefer X Money when available
  if (!_xmoney) _xmoney = new XMoneyProvider();
  if (_xmoney.available) return _xmoney;

  // Fall back to Stripe
  if (!_stripe) _stripe = new StripeProvider();
  if (_stripe.available) return _stripe;

  throw new Error("No payment provider configured");
}

export function getAvailableProviders(): PaymentProvider[] {
  const providers: PaymentProvider[] = [];
  if (!_xmoney) _xmoney = new XMoneyProvider();
  if (!_stripe) _stripe = new StripeProvider();
  if (_xmoney.available) providers.push(_xmoney);
  if (_stripe.available) providers.push(_stripe);
  return providers;
}

// ---------------------------------------------------------------------------
// Subscription Tier Types (stored in Drupal, consumed by UI)
// ---------------------------------------------------------------------------

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  description: string;
  perks: string[];
  subscriberCount: number;
  featured: boolean;
}
