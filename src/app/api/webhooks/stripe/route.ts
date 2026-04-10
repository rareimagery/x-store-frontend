import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";
import { createProductFromMetadata } from "@/app/api/stores/products/route";

const DRUPAL_API = process.env.DRUPAL_API_URL;

// USD currency UUID in Drupal (commerce_currency entity)
const USD_CURRENCY_UUID = "7be59a35-eea8-4d2d-8be4-b113aafad8d4";

async function createDrupalStore(slug: string, storeName: string) {
  const writeHeaders = await drupalWriteHeaders();
  const res = await fetch(`${DRUPAL_API}/jsonapi/commerce_store/online`, {
    method: "POST",
    headers: {
      ...writeHeaders,
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "commerce_store--online",
        attributes: {
          name: storeName,
          field_store_slug: slug,
          timezone: "America/New_York",
          address: {
            country_code: "US",
            address_line1: "N/A",
            locality: "New York",
            administrative_area: "NY",
            postal_code: "10001",
          },
          field_store_status: "pending",
        },
        relationships: {
          default_currency: {
            data: {
              type: "commerce_currency--commerce_currency",
              id: USD_CURRENCY_UUID,
            },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drupal store creation failed: ${res.status} — ${body.slice(0, 300)}`);
  }

  return res.json();
}

async function findXProfile(xUsername: string): Promise<string | null> {
  const params = new URLSearchParams({
    "filter[field_x_username]": xUsername,
  });

  const res = await fetch(
    `${DRUPAL_API}/jsonapi/node/x_user_profile?${params.toString()}`,
    { headers: { ...drupalAuthHeaders() } }
  );

  if (!res.ok) return null;

  const json = await res.json();
  const nodes = json.data ?? [];
  return nodes.length > 0 ? nodes[0].id : null;
}

async function linkProfileToStore(profileId: string, storeId: string) {
  const writeHeaders = await drupalWriteHeaders();
  const res = await fetch(
    `${DRUPAL_API}/jsonapi/node/x_user_profile/${profileId}`,
    {
      method: "PATCH",
      headers: {
        ...writeHeaders,
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "node--x_user_profile",
          id: profileId,
          relationships: {
            field_linked_store: {
              data: { type: "commerce_store--online", id: storeId },
            },
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Profile-store link failed: ${res.status} — ${body.slice(0, 300)}`);
  }

  return res.json();
}

/**
 * Create a $6/month recurring subscription for the store creator.
 * Uses Stripe's built-in subscription billing.
 */
async function createMonthlySubscription(customerId: string, storeSlug: string) {
  const stripe = getStripeClient();

  const price = await stripe.prices.create({
    currency: "usd",
    unit_amount: 600, // $6.00/month
    recurring: { interval: "month" },
    product_data: {
      name: "RareImagery Creator Store — Monthly",
      metadata: { store_slug: storeSlug },
    },
  });

  await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: price.id }],
    metadata: { store_slug: storeSlug, type: "store_monthly" },
  });
}

/**
 * Disable a store when its subscription lapses.
 */
async function disableStore(storeSlug: string) {
  // Find store by slug
  const res = await fetch(
    `${DRUPAL_API}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(storeSlug)}`,
    { headers: { ...drupalAuthHeaders() } }
  );

  if (!res.ok) return;
  const json = await res.json();
  const stores = json.data ?? [];
  if (stores.length === 0) return;

  const storeUuid = stores[0].id;

  const writeHeaders = await drupalWriteHeaders();
  await fetch(`${DRUPAL_API}/jsonapi/commerce_store/online/${storeUuid}`, {
    method: "PATCH",
    headers: {
      ...writeHeaders,
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "commerce_store--online",
        id: storeUuid,
        attributes: {
          field_store_status: "suspended",
        },
      },
    }),
  });

  console.log(`Store "${storeSlug}" suspended due to subscription lapse`);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event;
  const stripe = getStripeClient();
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const sessionType = session.metadata?.type;

      // Handle product listing fee payments
      if (sessionType === "product_listing") {
        try {
          await createProductFromMetadata(session.metadata as Record<string, string>);
        } catch (err: any) {
          console.error("[webhook] Product creation after listing fee failed:", err.message);
        }
        break;
      }

      // Handle product purchases — create Drupal order + submit to Printful
      if (sessionType === "product_purchase") {
        try {
          const customerEmail = session.customer_details?.email || session.metadata?.customer_email || "";
          const storeSlug = session.metadata?.store_slug || "";
          const itemsJson = session.metadata?.items || "[]";
          const items = JSON.parse(itemsJson);
          const shippingDetails = (session as any).shipping_details || session.customer_details;

          // 1. Find the store UUID
          const storeRes = await fetch(
            `${DRUPAL_API}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(storeSlug)}&fields[commerce_store--online]=field_printful_api_key`,
            { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
          );
          const storeJson = storeRes.ok ? await storeRes.json() : null;
          const storeUuid = storeJson?.data?.[0]?.id;
          const printfulKey = storeJson?.data?.[0]?.attributes?.field_printful_api_key;

          if (!storeUuid) {
            console.error("[webhook] Store not found for product purchase:", storeSlug);
            break;
          }

          // 2. Create Drupal Commerce order
          const writeHeaders = await drupalWriteHeaders();
          const orderRes = await fetch(`${DRUPAL_API}/jsonapi/commerce_order/default`, {
            method: "POST",
            headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
            body: JSON.stringify({
              data: {
                type: "commerce_order--default",
                attributes: {
                  state: "completed",
                  mail: customerEmail,
                  total_price: {
                    number: session.amount_total ? (session.amount_total / 100).toFixed(2) : "0.00",
                    currency_code: "USD",
                  },
                  field_printful_status: "pending",
                  field_stripe_session_id: session.id,
                },
                relationships: {
                  store_id: { data: { type: "commerce_store--online", id: storeUuid } },
                },
              },
            }),
          });

          let drupalOrderId: string | null = null;
          if (orderRes.ok) {
            const orderData = await orderRes.json();
            drupalOrderId = orderData.data?.attributes?.drupal_internal__order_id || orderData.data?.id;
            console.log("[webhook] Drupal order created:", drupalOrderId);
          } else {
            console.error("[webhook] Drupal order creation failed:", await orderRes.text().catch(() => ""));
          }

          // 3. Submit to Printful for fulfillment (if store has Printful key)
          if (printfulKey && items.length > 0 && shippingDetails) {
            try {
              const recipient = {
                name: shippingDetails.name || customerEmail,
                address1: shippingDetails.address?.line1 || "",
                address2: shippingDetails.address?.line2 || "",
                city: shippingDetails.address?.city || "",
                state_code: shippingDetails.address?.state || "",
                country_code: shippingDetails.address?.country || "US",
                zip: shippingDetails.address?.postal_code || "",
                email: customerEmail,
              };

              const printfulItems = items.map((item: any) => ({
                sync_variant_id: item.printfulVariantId ? Number(item.printfulVariantId) : undefined,
                variant_id: item.printfulVariantId ? Number(item.printfulVariantId) : undefined,
                quantity: item.quantity || 1,
                retail_price: item.price || "0.00",
                name: item.title || "Product",
              })).filter((i: any) => i.sync_variant_id || i.variant_id);

              if (printfulItems.length > 0) {
                const pfRes = await fetch("https://api.printful.com/orders", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${printfulKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    external_id: drupalOrderId ? `ri_ord_${drupalOrderId}` : `ri_sess_${session.id}`,
                    recipient,
                    items: printfulItems,
                  }),
                });

                if (pfRes.ok) {
                  const pfData = await pfRes.json();
                  console.log("[webhook] Printful order created:", pfData.result?.id);
                } else {
                  const pfErr = await pfRes.text().catch(() => "");
                  console.error("[webhook] Printful order failed:", pfErr.slice(0, 300));
                }
              }
            } catch (pfErr) {
              console.error("[webhook] Printful submission error:", pfErr);
            }
          }

          console.log(`[webhook] Product purchase completed: order=${drupalOrderId}, store=${storeSlug}, items=${items.length}`);
        } catch (err: any) {
          console.error("[webhook] Product purchase handler error:", err.message);
        }
        break;
      }

      // Only handle store setup checkouts
      if (sessionType !== "store_setup") break;

      const storeSlug = session.metadata?.storeSlug;
      const xUsername = session.metadata?.xUsername;

      if (!storeSlug || !xUsername) {
        console.error("Missing metadata on checkout session:", session.id);
        break;
      }

      try {
        // 1. Create the Commerce Store in Drupal
        const storeData = await createDrupalStore(
          storeSlug,
          `${xUsername}'s Store`
        );
        const storeId = storeData.data.id;

        // 2. Find existing Creator X Profile and link it to the store
        const profileId = await findXProfile(xUsername);
        if (profileId) {
          await linkProfileToStore(profileId, storeId);
        } else {
          console.warn(
            `No existing X profile found for @${xUsername}, store created without link`
          );
        }

        // 3. Create the $6/month recurring subscription (first month included in setup fee)
        if (session.customer) {
          await createMonthlySubscription(
            session.customer as string,
            storeSlug
          );
        }

        console.log(
          `Store "${storeSlug}" created for @${xUsername}, $6/month subscription started`
        );
      } catch (err: any) {
        console.error("Webhook processing error:", err.message);
        // Return 200 anyway so Stripe doesn't retry endlessly — log for manual fix
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const storeSlug = subscription.metadata?.store_slug;

      console.log(
        `Subscription ${subscription.id} cancelled for customer ${subscription.customer}`
      );

      if (storeSlug) {
        try {
          await disableStore(storeSlug);
        } catch (err: any) {
          console.error("Failed to disable store on subscription lapse:", err.message);
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const customerId = invoice.customer as string | null;
      const attemptCount: number = (invoice as any).attempt_count ?? 1;

      console.warn(
        `[dunning] Payment failed for customer ${customerId}, invoice ${invoice.id}, attempt #${attemptCount}`
      );

      // On the first failure, set store status to "payment_warning" so the
      // creator console can surface the issue. Stripe will auto-retry; the store
      // is only suspended when customer.subscription.deleted fires.
      if (customerId) {
        try {
          // Find the store by Stripe customer ID via Drupal JSON:API.
          const params = new URLSearchParams({
            "filter[field_stripe_customer_id]": customerId,
            "fields[commerce_store--online]": "id,field_store_slug,field_store_status",
          });
          const storeRes = await fetch(
            `${DRUPAL_API}/jsonapi/commerce_store/online?${params.toString()}`,
            { headers: { ...drupalAuthHeaders() } }
          );

          if (storeRes.ok) {
            const storeJson = await storeRes.json();
            const stores = storeJson.data ?? [];

            for (const store of stores) {
              const slug: string = store.attributes?.field_store_slug ?? "";
              const currentStatus: string = store.attributes?.field_store_status ?? "";

              // Only flag if the store is currently active (not already suspended).
              if (currentStatus === "approved" || currentStatus === "active") {
                const writeHeaders = await drupalWriteHeaders();
                await fetch(
                  `${DRUPAL_API}/jsonapi/commerce_store/online/${store.id}`,
                  {
                    method: "PATCH",
                    headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
                    body: JSON.stringify({
                      data: {
                        type: "commerce_store--online",
                        id: store.id,
                        attributes: { field_store_status: "payment_warning" },
                      },
                    }),
                  }
                );

                console.warn(
                  `[dunning] Store "${slug}" flagged as payment_warning after failed payment (attempt #${attemptCount})`
                );
              }
            }
          }
        } catch (err: any) {
          // Non-critical — Stripe will retry anyway
          console.error("[dunning] Failed to update store warning status:", err.message);
        }
      }
      break;
    }

    case "invoice.payment_succeeded": {
      // Clear any payment_warning flag if payment recovers after a failed attempt.
      const invoice = event.data.object;
      const customerId = invoice.customer as string | null;
      if (!customerId) break;

      try {
        const params = new URLSearchParams({
          "filter[field_stripe_customer_id]": customerId,
          "fields[commerce_store--online]": "id,field_store_slug,field_store_status",
        });
        const storeRes = await fetch(
          `${DRUPAL_API}/jsonapi/commerce_store/online?${params.toString()}`,
          { headers: { ...drupalAuthHeaders() } }
        );

        if (storeRes.ok) {
          const storeJson = await storeRes.json();
          for (const store of storeJson.data ?? []) {
            if (store.attributes?.field_store_status === "payment_warning") {
              const writeHeaders = await drupalWriteHeaders();
              await fetch(
                `${DRUPAL_API}/jsonapi/commerce_store/online/${store.id}`,
                {
                  method: "PATCH",
                  headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
                  body: JSON.stringify({
                    data: {
                      type: "commerce_store--online",
                      id: store.id,
                      attributes: { field_store_status: "approved" },
                    },
                  }),
                }
              );
              console.log(
                `[dunning] Store "${store.attributes.field_store_slug}" restored to approved after payment recovery`
              );
            }
          }
        }
      } catch (err: any) {
        console.error("[dunning] Failed to clear warning status:", err.message);
      }
      break;
    }

    default:
      // Unhandled event type — ignore
      break;
  }

  return NextResponse.json({ received: true });
}
