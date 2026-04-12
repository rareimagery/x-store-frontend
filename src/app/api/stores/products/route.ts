import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { drupalAuthHeaders, drupalWriteHeaders, drupalAbsoluteUrl } from "@/lib/drupal";
import { getStripeClient } from "@/lib/stripe";
import { LISTING_FEE_CENTS } from "@/lib/payments";
import { verifyStoreOwnership, isValidUUID, isSafeImageUrl } from "@/lib/ownership";
import { createRateLimiter, rateLimitResponse } from "@/lib/rate-limit";

const DRUPAL_API = process.env.DRUPAL_API_URL;

const productCreateLimit = createRateLimiter({ limit: 20, windowMs: 60 * 60 * 1000 }); // 20/hour

// UI type → Drupal bundle
const TYPE_MAP: Record<string, string> = {
  default: "default",
  digital_download: "digital_download",
  physical_custom: "crafts",
};

type ProductPayload = {
  title?: string;
  description?: string;
  price?: string;
  storeId?: string;
  productType?: string;
  imageUrl?: string;
  imageFile?: File;
  subscriberOnly?: boolean;
  minTier?: string;
  productId?: string;
  variationId?: string;
};

function parseBool(value: FormDataEntryValue | null, fallback = false): boolean {
  if (typeof value !== "string") return fallback;
  return value === "true" || value === "1";
}

async function readProductPayload(req: NextRequest): Promise<ProductPayload> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const maybeFile = form.get("imageFile");
    const imageFile =
      maybeFile instanceof File && maybeFile.size > 0 ? maybeFile : undefined;

    return {
      title: (form.get("title") as string) || undefined,
      description: (form.get("description") as string) || undefined,
      price: (form.get("price") as string) || undefined,
      storeId: (form.get("storeId") as string) || undefined,
      productType: (form.get("productType") as string) || undefined,
      imageUrl: (form.get("imageUrl") as string) || undefined,
      imageFile,
      subscriberOnly: parseBool(form.get("subscriberOnly"), false),
      minTier: (form.get("minTier") as string) || undefined,
      productId: (form.get("productId") as string) || undefined,
      variationId: (form.get("variationId") as string) || undefined,
    };
  }

  return (await req.json()) as ProductPayload;
}

/** Download an image URL and attach it to a product via JSON:API file upload */
async function attachProductImage(
  imageUrl: string,
  productUuid: string,
  productBundle: string,
  filename: string
): Promise<void> {
  if (!isSafeImageUrl(imageUrl)) return;
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return;
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const writeHeaders = await drupalWriteHeaders();
    await fetch(
      `${DRUPAL_API}/jsonapi/commerce_product/${productBundle}/${productUuid}/field_images`,
      {
        method: "POST",
        headers: {
          ...writeHeaders,
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `file; filename="${filename}.${ext}"`,
        },
        body: buffer,
      }
    );
  } catch {
    // Non-critical — product exists without image
  }
}

/** Attach uploaded image bytes to a product via JSON:API file upload */
async function attachProductImageFile(
  imageFile: File,
  productUuid: string,
  productBundle: string,
  filename: string
): Promise<void> {
  try {
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const contentType = imageFile.type || "image/jpeg";
    const safeName = filename.replace(/[^a-zA-Z0-9-_]/g, "-");
    const writeHeaders = await drupalWriteHeaders();

    await fetch(
      `${DRUPAL_API}/jsonapi/commerce_product/${productBundle}/${productUuid}/field_images`,
      {
        method: "POST",
        headers: {
          ...writeHeaders,
          "Content-Type": contentType,
          "Content-Disposition": `file; filename="${safeName}"`,
        },
        body: buffer,
      }
    );
  } catch {
    // Non-critical — product exists without image
  }
}

// ─── GET — list products for a store (all types) ──────────────────────────────

export async function GET(req: NextRequest) {
  let storeId = req.nextUrl.searchParams.get("storeId");
  const slug = req.nextUrl.searchParams.get("slug");

  // Resolve slug to storeId if provided
  if (!storeId && slug && DRUPAL_API) {
    try {
      const slugRes = await fetch(
        `${DRUPAL_API}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=drupal_internal__store_id`,
        { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
      );
      if (slugRes.ok) {
        const slugJson = await slugRes.json();
        storeId = String(slugJson.data?.[0]?.attributes?.drupal_internal__store_id ?? "");
      }
    } catch {}
  }

  if (!storeId) {
    return NextResponse.json({ error: "storeId or slug required" }, { status: 400 });
  }

  const productTypes = ["default", "clothing", "digital_download", "crafts"];
  const allProducts: unknown[] = [];

  await Promise.all(
    productTypes.map(async (type) => {
      try {
        const params = new URLSearchParams({
          "filter[stores.meta.drupal_internal__target_id]": storeId,
          include: "variations,field_images",
          "page[limit]": "50",
        });
        const res = await fetch(
          `${DRUPAL_API}/jsonapi/commerce_product/${type}?${params}`,
          { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
        );
        if (!res.ok) return;

        const json = await res.json();
        const included: Array<{
          id: string;
          type: string;
          attributes: Record<string, unknown>;
        }> = json.included ?? [];

        for (const p of json.data ?? []) {
          const varRef = p.relationships?.variations?.data?.[0];
          const variation = varRef
            ? included.find((i) => i.id === varRef.id)
            : null;

          let imageUrl: string | null = null;
          const imgRef = p.relationships?.field_images?.data?.[0];
          if (imgRef) {
            const file = included.find(
              (i) => i.id === imgRef.id && i.type === "file--file"
            );
            if (file) {
              const uri = (
                file.attributes?.uri as { url: string } | undefined
              )?.url;
              imageUrl = drupalAbsoluteUrl(uri) || null;
            }
          }

          const va = variation?.attributes ?? {};
          allProducts.push({
            id: p.id,
            drupal_id: p.attributes.drupal_internal__product_id,
            title: p.attributes.title,
            description: (p.attributes.body as { value?: string } | null)?.value ?? "",
            price:
              (va.price as { number: string } | undefined)?.number ?? "0.00",
            currency:
              (va.price as { currency_code: string } | undefined)
                ?.currency_code ?? "USD",
            sku: (va.sku as string) ?? "",
            image_url: imageUrl,
            product_type: type,
            variation_id: (variation as { id: string } | null)?.id ?? null,
            subscriber_only: p.attributes.field_subscriber_only ?? false,
            min_tier: p.attributes.field_min_tier ?? null,
            status: p.attributes.status,
          });
        }
      } catch {
        // skip failing types silently
      }
    })
  );

  return NextResponse.json({ products: allProducts });
}

// Free product threshold — listing fee kicks in after this many products per store
const FREE_LISTING_LIMIT = 50;

/** Count total products across all types for a store (by Drupal internal store ID). */
async function countStoreProducts(storeId: string): Promise<number> {
  const productTypes = ["default", "digital_download", "crafts"];
  let total = 0;

  await Promise.all(
    productTypes.map(async (type) => {
      try {
        const params = new URLSearchParams({
          "filter[stores.meta.drupal_internal__target_id]": storeId,
          "page[limit]": "1", // we only need the count
        });
        const res = await fetch(
          `${DRUPAL_API}/jsonapi/commerce_product/${type}?${params}`,
          { headers: { ...drupalAuthHeaders() }, cache: "no-store" }
        );
        if (!res.ok) return;
        const json = await res.json();
        total += json.meta?.count ?? (json.data?.length ?? 0);
      } catch {
        // skip
      }
    })
  );

  return total;
}

// ─── POST — create a new product ($0.05 fee after 50 listings) ───────────────

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (token.xId as string) || (token.sub as string) || "anon";
  const rl = productCreateLimit(userId);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const {
    title,
    description,
    price,
    storeId,
    productType = "default",
    imageUrl,
    imageFile,
    subscriberOnly = false,
    minTier,
  } = await readProductPayload(req);

  if (!title || !price || !storeId || !isValidUUID(storeId)) {
    return NextResponse.json(
      { error: "title, price, and storeId are required" },
      { status: 400 }
    );
  }

  if (!(await verifyStoreOwnership(token, storeId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check product count — free under limit, $0.05 fee after
  const productCount = await countStoreProducts(storeId);

  if (productCount >= FREE_LISTING_LIMIT) {
    // Require listing fee via Stripe checkout
    const stripe = getStripeClient();
    const baseUrl = process.env.NEXTAUTH_URL
      || `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net"}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: LISTING_FEE_CENTS,
            product_data: { name: "Product Listing Fee" },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "product_listing",
        title: title.slice(0, 200),
        description: (description || "").slice(0, 490),
        price: String(price),
        store_id: storeId,
        product_type: productType,
        image_url: imageUrl || "",
        subscriber_only: String(subscriberOnly),
        min_tier: minTier || "",
      },
      success_url: `${baseUrl}/console/products?listed=true`,
      cancel_url: `${baseUrl}/console/products`,
    });

    return NextResponse.json({
      requiresPayment: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      productCount,
      freeLimit: FREE_LISTING_LIMIT,
    });
  }

  // Under limit — create directly (no fee)
  return createProductDirect({
    title,
    description,
    price,
    storeId,
    productType,
    imageUrl,
    imageFile,
    subscriberOnly,
    minTier,
  });
}

/** Create product directly in Drupal (no payment required). */
async function createProductDirect(opts: {
  title: string;
  description?: string;
  price: string;
  storeId: string;
  productType: string;
  imageUrl?: string;
  imageFile?: File;
  subscriberOnly: boolean;
  minTier?: string;
}) {
  const {
    title,
    description,
    price,
    storeId,
    productType,
    imageUrl,
    imageFile,
    subscriberOnly,
    minTier,
  } = opts;
  const bundle = TYPE_MAP[productType] ?? "default";
  const sku = `${storeId}-${Date.now()}`;
  const writeHeaders = await drupalWriteHeaders();

  // 1. Create variation
  const variationRes = await fetch(
    `${DRUPAL_API}/jsonapi/commerce_product_variation/${bundle}`,
    {
      method: "POST",
      headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
      body: JSON.stringify({
        data: {
          type: `commerce_product_variation--${bundle}`,
          attributes: {
            sku,
            price: { number: String(price), currency_code: "USD" },
            status: true,
          },
        },
      }),
    }
  );

  if (!variationRes.ok) {
    console.error("Variation creation failed:", await variationRes.text());
    return NextResponse.json(
      { error: "Failed to create product variation" },
      { status: 500 }
    );
  }
  const variationId = (await variationRes.json()).data.id as string;

  // 2. Create product
  const productAttrs: Record<string, unknown> = {
    title,
    status: true,
    field_subscriber_only: subscriberOnly,
  };
  if (description) productAttrs.body = { value: description, format: "basic_html" };
  if (minTier) productAttrs.field_min_tier = minTier;

  const productRes = await fetch(
    `${DRUPAL_API}/jsonapi/commerce_product/${bundle}`,
    {
      method: "POST",
      headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
      body: JSON.stringify({
        data: {
          type: `commerce_product--${bundle}`,
          attributes: productAttrs,
          relationships: {
            stores: {
              data: [{ type: "commerce_store--online", id: storeId }],
            },
            variations: {
              data: [
                {
                  type: `commerce_product_variation--${bundle}`,
                  id: variationId,
                },
              ],
            },
          },
        },
      }),
    }
  );

  if (!productRes.ok) {
    console.error("Product creation failed:", await productRes.text());
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
  const productId = (await productRes.json()).data.id as string;

  // 3. Attach image fire-and-forget
  if (imageFile) {
    void attachProductImageFile(imageFile, productId, bundle, `${sku}-${imageFile.name}`);
  }
  if (imageUrl) attachProductImage(imageUrl, productId, bundle, sku);

  return NextResponse.json({ id: productId, title, price, sku, product_type: bundle });
}

/**
 * Create a product in Drupal after listing fee payment.
 * Called from the Stripe webhook handler.
 */
export async function createProductFromMetadata(metadata: Record<string, string>): Promise<void> {
  const res = await createProductDirect({
    title: metadata.title,
    description: metadata.description,
    price: metadata.price,
    storeId: metadata.store_id,
    productType: metadata.product_type || "default",
    imageUrl: metadata.image_url || undefined,
    imageFile: undefined,
    subscriberOnly: metadata.subscriber_only === "true",
    minTier: metadata.min_tier || undefined,
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Product creation failed: ${body.error}`);
  }

  console.log(`[listing-fee] Product "${metadata.title}" created (${body.id}) after $0.05 fee`);
}

// ─── PATCH — update an existing product ───────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    productId,
    storeId,
    productType = "default",
    variationId,
    title,
    description,
    price,
    imageUrl,
    imageFile,
    subscriberOnly,
    minTier,
  } = await readProductPayload(req);

  if (!productId || !storeId || !isValidUUID(storeId)) {
    return NextResponse.json({ error: "productId and storeId required" }, { status: 400 });
  }

  if (!(await verifyStoreOwnership(token, storeId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bundle = TYPE_MAP[productType] ?? productType;
  const writeHeaders = await drupalWriteHeaders();

  // Patch product attributes
  const productAttrs: Record<string, unknown> = {};
  if (title !== undefined) productAttrs.title = title;
  if (description !== undefined)
    productAttrs.body = { value: description, format: "basic_html" };
  if (subscriberOnly !== undefined)
    productAttrs.field_subscriber_only = subscriberOnly;
  if (minTier !== undefined) productAttrs.field_min_tier = minTier;

  if (Object.keys(productAttrs).length > 0) {
    const pRes = await fetch(
      `${DRUPAL_API}/jsonapi/commerce_product/${bundle}/${productId}`,
      {
        method: "PATCH",
        headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
        body: JSON.stringify({
          data: {
            type: `commerce_product--${bundle}`,
            id: productId,
            attributes: productAttrs,
          },
        }),
      }
    );
    if (!pRes.ok) {
      console.error("Product PATCH failed:", await pRes.text());
      return NextResponse.json(
        { error: "Failed to update product" },
        { status: 500 }
      );
    }
  }

  // Patch variation price
  if (price !== undefined && variationId) {
    await fetch(
      `${DRUPAL_API}/jsonapi/commerce_product_variation/${bundle}/${variationId}`,
      {
        method: "PATCH",
        headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
        body: JSON.stringify({
          data: {
            type: `commerce_product_variation--${bundle}`,
            id: variationId,
            attributes: {
              price: { number: String(price), currency_code: "USD" },
            },
          },
        }),
      }
    );
  }

  // Attach new image fire-and-forget
  if (imageFile) {
    void attachProductImageFile(imageFile, productId, bundle, `img-${Date.now()}-${imageFile.name}`);
  }
  if (imageUrl) attachProductImage(imageUrl, productId, bundle, `img-${Date.now()}`);

  return NextResponse.json({ updated: true });
}

// ─── DELETE — delete a product ────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId, storeId, productType = "default" } = (await req.json()) as {
    productId: string;
    storeId: string;
    productType?: string;
  };
  if (!productId || !storeId || !isValidUUID(storeId)) {
    return NextResponse.json({ error: "productId and storeId required" }, { status: 400 });
  }

  if (!(await verifyStoreOwnership(token, storeId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const bundle = TYPE_MAP[productType] ?? productType;
  const writeHeaders = await drupalWriteHeaders();

  const res = await fetch(
    `${DRUPAL_API}/jsonapi/commerce_product/${bundle}/${productId}`,
    { method: "DELETE", headers: writeHeaders }
  );

  if (!res.ok && res.status !== 204) {
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted: true });
}
