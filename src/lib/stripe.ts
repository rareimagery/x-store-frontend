import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

// Lazy singleton — only initialized when actually used at runtime
let _stripe: Stripe | null = null;
export function getStripeClient(): Stripe {
  if (!_stripe) _stripe = getStripe();
  return _stripe;
}
