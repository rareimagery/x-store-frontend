export const DRUPAL_API_URL = process.env.DRUPAL_API_URL || process.env.NEXT_PUBLIC_DRUPAL_URL || "";

if (!DRUPAL_API_URL && typeof window === "undefined") {
  console.error("[drupal] DRUPAL_API_URL is not set — Drupal API calls will fail");
}

const DRUPAL_PUBLIC_ASSET_BASE =
  process.env.DRUPAL_PUBLIC_URL || null;

// ---------------------------------------------------------------------------
// Auth helper — Cookie session auth for JSON:API (Basic Auth fails on writes)
// ---------------------------------------------------------------------------

let _sessionCache: {
  cookie: string;
  csrfToken: string;
  expiresAt: number;
} | null = null;

async function attemptDrupalLogin(
  user: string,
  pass: string
): Promise<Response> {
  const loginUrl = `${DRUPAL_API_URL}/user/login?_format=json`;

  const jsonRes = await fetch(loginUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ name: user, pass }),
  });

  if (jsonRes.ok) {
    return jsonRes;
  }

  const jsonBody = await jsonRes.text();
  console.warn(
    `[drupal] JSON login failed (${jsonRes.status}), retrying as form data: ${jsonBody.slice(0, 200)}`
  );

  const formRes = await fetch(loginUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ name: user, pass }).toString(),
  });

  if (formRes.ok) {
    return formRes;
  }

  const formBody = await formRes.text();
  throw new Error(
    `Drupal login failed: json=${jsonRes.status}, form=${formRes.status}. ` +
      `Response: ${formBody.slice(0, 300)}`
  );
}

async function getDrupalSession(): Promise<{
  cookie: string;
  csrfToken: string;
}> {
  // Return cached session if still valid (refresh every 10 minutes)
  if (_sessionCache && _sessionCache.expiresAt > Date.now()) {
    return { cookie: _sessionCache.cookie, csrfToken: _sessionCache.csrfToken };
  }

  const user = process.env.DRUPAL_API_USER;
  const pass = process.env.DRUPAL_API_PASS;
  if (!user || !pass) {
    throw new Error("DRUPAL_API_USER and DRUPAL_API_PASS must be set");
  }

  // Login to get session cookie
  const loginRes = await attemptDrupalLogin(user, pass);

  // Extract session cookie from Set-Cookie header
  const setCookies = loginRes.headers.getSetCookie?.() || [];
  const sessionCookie = setCookies
    .map((c) => c.split(";")[0])
    .find((c) => c.startsWith("SESS") || c.startsWith("SSESS"));

  if (!sessionCookie) {
    // Fallback: try raw header
    const rawCookie = loginRes.headers.get("set-cookie") || "";
    const match = rawCookie.match(/(S?SESS[^=]+=[^;]+)/);
    if (!match) throw new Error("No session cookie in login response");
    _sessionCache = {
      cookie: match[1],
      csrfToken: "",
      expiresAt: Date.now() + 10 * 60 * 1000,
    };
  } else {
    _sessionCache = {
      cookie: sessionCookie,
      csrfToken: "",
      expiresAt: Date.now() + 10 * 60 * 1000,
    };
  }

  // Get CSRF token
  const csrfRes = await fetch(`${DRUPAL_API_URL}/session/token`, {
    headers: { Cookie: _sessionCache!.cookie },
  });
  if (csrfRes.ok) {
    _sessionCache!.csrfToken = await csrfRes.text();
  }

  return {
    cookie: _sessionCache!.cookie,
    csrfToken: _sessionCache!.csrfToken,
  };
}

export function drupalAuthHeaders(): Record<string, string> {
  // For synchronous callers (GET requests), Basic Auth still works
  const user = process.env.DRUPAL_API_USER;
  const pass = process.env.DRUPAL_API_PASS;
  if (user && pass) {
    return {
      Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`,
    };
  }
  const token = process.env.DRUPAL_API_TOKEN;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

/** Get auth headers for write operations (POST/PATCH/DELETE) — session cookie + CSRF token */
export async function drupalWriteHeaders(): Promise<Record<string, string>> {
  try {
    const session = await getDrupalSession();
    if (session.cookie) {
      return {
        Cookie: session.cookie,
        "X-CSRF-Token": session.csrfToken,
      };
    }
  } catch (err) {
    console.warn("[drupal] Session auth failed, falling back to Basic Auth:", err);
  }

  // Fallback to Basic Auth (works from localhost but may fail externally)
  const headers = drupalAuthHeaders();
  if (Object.keys(headers).length === 0) {
    throw new Error(
      "No auth credentials available: set DRUPAL_API_USER+DRUPAL_API_PASS or DRUPAL_API_TOKEN"
    );
  }
  return headers;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TopPost {
  id: string;
  text: string;
  image_url?: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  date: string;
}

export interface TopFollower {
  username: string;
  display_name: string;
  profile_image_url?: string;
  follower_count: number;
  verified: boolean;
}

export interface Metrics {
  engagement_score: number;
  avg_likes: number;
  avg_retweets: number;
  avg_views: number;
  top_themes: string[];
  recommended_products: string[];
  posting_frequency: string;
  audience_sentiment: string;
}

export interface ProductImage {
  url: string;
  alt: string;
}

export interface ProductVariation {
  id: string;
  sku: string;
  price: string;
  currency: string;
  list_price: string | null;
  image_url: string | null;
  stock: number | null;
  on_sale: boolean;
  attributes: Record<string, string>;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  sku: string;
  image_url: string | null;
  subscriber_only: boolean;
  min_tier: string | null;
}

export interface ProductDetail {
  id: string;
  drupal_internal_id: number;
  title: string;
  body: string;
  short_description: string;
  product_type: string;
  slug: string;
  price: string;
  list_price: string | null;
  currency: string;
  sku: string;
  images: ProductImage[];
  variations: ProductVariation[];
  store_name: string;
  store_slug: string;
  store_logo: string | null;
  // Shared fields
  categories: string[];
  tags: string[];
  seo_title: string;
  seo_description: string;
  featured: boolean;
  // Clothing fields
  brand: string | null;
  gender: string | null;
  material: string | null;
  care_instructions: string | null;
  country_of_origin: string | null;
  sustainability: string | null;
  size_guide: string | null;
  // Digital fields
  file_formats: string[];
  file_size: string | null;
  license_type: string | null;
  license_details: string | null;
  instant_download: boolean;
  software_required: string | null;
  dimensions_resolution: string | null;
  page_count: number | null;
  language: string | null;
  version: string | null;
  changelog: string | null;
  // Craft fields
  handmade: boolean;
  made_to_order: boolean;
  production_time: string | null;
  materials_used: string | null;
  craft_dimensions: string | null;
  customizable: boolean;
  customization_details: string | null;
  craft_technique: string | null;
  occasion: string | null;
  safety_info: string | null;
  maker: string | null;
  gift_wrap: boolean;
  // Shipping
  shipping_weight: string | null;
  shipping_class: string | null;
  // Printful POD
  printful_product_id: string | null;
  print_technique: string | null;
  // Access control
  subscriber_only: boolean;
  min_tier: string | null;
  // Related
  related_product_ids: string[];
}

export interface CreatorProfile {
  id: string;
  drupal_internal__nid: number;
  title: string;
  x_username: string;
  bio: string;
  follower_count: number;
  profile_picture_url: string | null;
  banner_url: string | null;
  top_posts: TopPost[];
  top_followers: TopFollower[];
  metrics: Metrics | null;
  linked_store_id: string | null;
  linked_store_path: string | null;
  store_theme: string;
  store_theme_config: Record<string, any> | null;
  myspace_background: string | null;
  myspace_music_url: string | null;
  myspace_glitter_color: string | null;
  myspace_accent_color: string | null;
  store_status: "pending" | "approved" | "rejected" | "suspended" | null;
  subscription_tiers: import("@/lib/payments").SubscriptionTier[];
  x_subscription_tier: string | null;
  pinned_post: TopPost | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function drupalAbsoluteUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  const raw = path.startsWith("http") ? path : `${DRUPAL_API_URL}${path}`;

  try {
    const resolved = new URL(raw);
    const apiHost = new URL(DRUPAL_API_URL).host;
    const isIpHost = /^\d+\.\d+\.\d+\.\d+$/.test(resolved.hostname);
    const isDrupalApiHost = resolved.host === apiHost;

    if (DRUPAL_PUBLIC_ASSET_BASE && (isIpHost || isDrupalApiHost)) {
      const publicBase = new URL(DRUPAL_PUBLIC_ASSET_BASE);
      resolved.protocol = publicBase.protocol;
      resolved.host = publicBase.host;
      return resolved.toString();
    }

    // If the Drupal origin is private/IP-only or plain HTTP, route file assets
    // through our same-origin HTTPS proxy to avoid mixed-content and 404s.
    if ((isIpHost || isDrupalApiHost) && resolved.pathname.startsWith("/sites/default/files/")) {
      const proxiedPath = `${resolved.pathname}${resolved.search}`;
      return `/api/drupal-asset?path=${encodeURIComponent(proxiedPath)}`;
    }

    return resolved.toString();
  } catch {
    return raw;
  }
}

function withAssetVersion(url: string | null, version: string | number | null | undefined): string | null {
  if (!url) return null;
  if (!version) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(String(version))}`;
}

function parseJsonField<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function parseMultiJsonField<T>(raw: unknown): T[] {
  // Single JSON string containing an array (cardinality-1 fields from Drupal sync).
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch { /* not valid JSON */ }
    return [];
  }

  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (typeof item === "string") return parseJsonField<T>(item);
      if (item && typeof item === "object") {
        // Drupal sometimes returns text items as objects with a value key.
        const value = (item as { value?: unknown }).value;
        if (typeof value === "string") return parseJsonField<T>(value);
      }
      return null;
    })
    .filter(Boolean) as T[];
}

function firstNonEmptyString(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function resolveImageFromRelationship(
  relationshipData: unknown,
  included: any[]
): string | null {
  if (!relationshipData) return null;

  const refs = Array.isArray(relationshipData)
    ? relationshipData
    : [relationshipData];

  for (const ref of refs) {
    const refId = (ref as { id?: string })?.id;
    if (!refId) continue;

    const entity = included.find((inc: any) => inc.id === refId);
    if (!entity) continue;

    if (entity.type === "file--file") {
      const url = withAssetVersion(
        drupalAbsoluteUrl(entity.attributes?.uri?.url),
        entity.attributes?.changed ?? entity.attributes?.drupal_internal__fid ?? null
      );
      if (url) return url;
      continue;
    }

    if (typeof entity.type === "string" && entity.type.startsWith("media--")) {
      const mediaFileRef = entity.relationships?.field_media_image?.data;
      const mediaFileId = mediaFileRef?.id;
      if (!mediaFileId) continue;

      const fileEntity = included.find(
        (inc: any) => inc.id === mediaFileId && inc.type === "file--file"
      );

      const mediaUrl = withAssetVersion(
        drupalAbsoluteUrl(fileEntity?.attributes?.uri?.url),
        fileEntity?.attributes?.changed ?? fileEntity?.attributes?.drupal_internal__fid ?? null
      );
      if (mediaUrl) return mediaUrl;
    }
  }

  return null;
}

function firstRelationshipId(relationshipData: unknown): string | null {
  if (!relationshipData) return null;
  const refs = Array.isArray(relationshipData)
    ? relationshipData
    : [relationshipData];
  for (const ref of refs) {
    const refId = (ref as { id?: string })?.id;
    if (typeof refId === "string" && refId.length > 0) return refId;
  }
  return null;
}

async function resolveFileUrlByUuid(
  fileUuid: string,
  options?: { noStore?: boolean }
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      "fields[file--file]": "uri,changed,drupal_internal__fid",
    });
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/file/file/${fileUuid}?${params.toString()}`,
      options?.noStore ? { cache: "no-store" } : { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const attrs = json?.data?.attributes;
    return withAssetVersion(
      drupalAbsoluteUrl(attrs?.uri?.url),
      attrs?.changed ?? attrs?.drupal_internal__fid ?? null
    );
  } catch {
    return null;
  }
}

function mapCreatorProfile(node: any, included: any[] = []): CreatorProfile {
  const attrs = node.attributes;
  const rels = node.relationships;

  const profilePicUrl =
    resolveImageFromRelationship(rels?.field_x_pfp?.data, included) ||
    firstNonEmptyString(
      attrs?.field_profile_picture_url,
      attrs?.field_profile_image_url,
      attrs?.field_x_avatar_url
    );

  const bannerUrl =
    resolveImageFromRelationship(rels?.field_x_background?.data, included) ||
    firstNonEmptyString(
      attrs?.field_x_banner_url,
      attrs?.field_banner_url,
      attrs?.field_profile_banner_url
    );

  // Parse multi-value JSON text fields
  const topPosts: TopPost[] = parseMultiJsonField<TopPost>(attrs.field_top_posts)
    .sort((a, b) => {
      const ta = a.date ? Date.parse(a.date) : 0;
      const tb = b.date ? Date.parse(b.date) : 0;
      return tb - ta;
    });

  const topFollowers: TopFollower[] = parseMultiJsonField<TopFollower>(attrs.field_top_followers);

  const metrics = parseJsonField<Metrics>(attrs.field_metrics);

  // Linked store
  const storeRel = rels?.field_linked_store?.data;
  const linkedStoreId = storeRel?.id ?? null;
  let linkedStorePath: string | null = null;
  if (linkedStoreId) {
    const storeEntity = included.find(
      (inc: any) => inc.id === linkedStoreId
    );
    if (storeEntity) {
      linkedStorePath = storeEntity.attributes?.path?.alias ?? null;
    }
  }

  return {
    id: node.id,
    drupal_internal__nid: attrs.drupal_internal__nid,
    title: attrs.title,
    x_username: attrs.field_x_username,
    bio: attrs.field_x_bio?.processed ?? attrs.field_x_bio?.value ?? attrs.field_bio_description?.processed ?? attrs.field_bio_description?.value ?? "",
    follower_count: attrs.field_x_followers ?? attrs.field_follower_count ?? 0,
    profile_picture_url: profilePicUrl,
    banner_url: bannerUrl,
    top_posts: topPosts,
    top_followers: topFollowers,
    metrics,
    linked_store_id: linkedStoreId,
    linked_store_path: linkedStorePath,
    store_theme: attrs.field_store_theme ?? "default",
    store_theme_config: parseJsonField<Record<string, any>>(attrs.field_store_theme_config),
    myspace_background: attrs.field_myspace_background ?? null,
    myspace_music_url: attrs.field_myspace_music_url ?? null,
    myspace_glitter_color: attrs.field_myspace_glitter_color ?? null,
    myspace_accent_color: attrs.field_myspace_accent_color ?? null,
    store_status: (() => {
      if (!linkedStoreId) return null;
      const storeEntity = included.find((inc: any) => inc.id === linkedStoreId);
      return storeEntity?.attributes?.field_store_status ?? null;
    })(),
    subscription_tiers: (() => {
      if (!linkedStoreId) return [];
      const storeEntity = included.find((inc: any) => inc.id === linkedStoreId);
      const raw = storeEntity?.attributes?.field_subscription_tiers;
      if (!raw) return [];
      try { return JSON.parse(raw); } catch { return []; }
    })(),
    x_subscription_tier: attrs.field_x_subscription_tier ?? null,
    pinned_post: parseJsonField<TopPost>(attrs.field_pinned_post),
  };
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

export async function getCreatorProfile(
  username: string,
  options?: { noStore?: boolean }
): Promise<CreatorProfile | null> {
  const includeCandidates = [
    "field_linked_store,field_x_pfp,field_x_pfp.field_media_image,field_x_background,field_x_background.field_media_image",
    "field_linked_store,field_x_pfp,field_x_background",
  ];

  try {
    for (const include of includeCandidates) {
      const params = new URLSearchParams({
        "filter[field_x_username]": username,
        include,
      });

      const url = `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?${params.toString()}`;
      const res = await fetch(
        url,
        options?.noStore ? { cache: "no-store" } : { next: { revalidate: 60 } }
      );

      if (!res.ok) {
        if (res.status === 400) {
          continue;
        }
        console.error(`Drupal API error: ${res.status} ${res.statusText}`);
        return null;
      }

      const json = await res.json();
      const nodes = json.data;
      if (!nodes || nodes.length === 0) return null;

      const node = nodes[0];
      const profile = mapCreatorProfile(node, json.included ?? []);

      // Fallback: if relationship exists but include payload omitted file entity,
      // resolve directly from /jsonapi/file/file/{uuid} before falling back to X URL fields.
      const pfpRef = firstRelationshipId(node?.relationships?.field_x_pfp?.data);
      const bannerRef = firstRelationshipId(node?.relationships?.field_x_background?.data);

      const needsPfpDirectLookup =
        !!pfpRef && (!profile.profile_picture_url || /pbs\.twimg\.com/i.test(profile.profile_picture_url));
      const needsBannerDirectLookup = !!bannerRef && !profile.banner_url;

      if (needsPfpDirectLookup || needsBannerDirectLookup) {
        const [resolvedPfp, resolvedBanner] = await Promise.all([
          needsPfpDirectLookup && pfpRef ? resolveFileUrlByUuid(pfpRef, options) : Promise.resolve(null),
          needsBannerDirectLookup && bannerRef ? resolveFileUrlByUuid(bannerRef, options) : Promise.resolve(null),
        ]);

        return {
          ...profile,
          profile_picture_url: resolvedPfp || profile.profile_picture_url,
          banner_url: resolvedBanner || profile.banner_url,
        };
      }

      return profile;
    }

    console.error("Drupal API error: all creator profile include variants failed");
    return null;
  } catch (err) {
    console.error("getCreatorProfile failed (network/timeout):", err);
    return null;
  }
}

export async function getAllCreatorProfiles(): Promise<CreatorProfile[]> {
  const includeCandidates = [
    "field_linked_store,field_x_pfp,field_x_pfp.field_media_image,field_x_background,field_x_background.field_media_image",
    "field_linked_store,field_x_pfp,field_x_background",
    "field_linked_store",
  ];

  for (const include of includeCandidates) {
    const params = new URLSearchParams({ include });
    const url = `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?${params.toString()}`;
    const res = await fetch(url, { next: { revalidate: 60 } });

    if (!res.ok) {
      if (res.status === 400) {
        continue;
      }
      console.error(`Drupal API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const json = await res.json();
    const nodes = json.data ?? [];
    const included = json.included ?? [];

    return nodes.map((n: any) => mapCreatorProfile(n, included));
  }

  console.error("Drupal API error: all creator profile include variants failed");
  return [];
}

export async function getCreatorStore(storeId: string): Promise<any | null> {
  const url = `${DRUPAL_API_URL}/jsonapi/commerce_store/online/${storeId}`;

  const res = await fetch(url, { next: { revalidate: 60 } });

  if (!res.ok) {
    console.error(`Drupal store API error: ${res.status}`);
    return null;
  }

  const json = await res.json();
  return json.data ?? null;
}

export async function getCreatorStoreBySlug(
  slug: string
): Promise<any | null> {
  const params = new URLSearchParams({
    "filter[field_store_slug]": slug,
    include: "field_linked_x_profile",
  });

  const url = `${DRUPAL_API_URL}/jsonapi/commerce_store/online?${params.toString()}`;

  const res = await fetch(url, { next: { revalidate: 60 } });

  if (!res.ok) {
    console.error(`Drupal store-by-slug API error: ${res.status}`);
    return null;
  }

  const json = await res.json();
  const stores = json.data ?? [];
  if (stores.length === 0) return null;

  return { store: stores[0], included: json.included ?? [] };
}

export async function getStoreProducts(storeId: string): Promise<Product[]> {
  // Query all product types for this store
  const productTypes = ["default", "clothing", "digital_download", "crafts", "printful"];
  // Include candidates: try full includes first, fall back to simpler ones on 400
  const includeCandidates = [
    "variations,variations.field_variation_image,field_images,field_images.field_media_image",
    "variations,field_images",
    "variations",
  ];
  const allProducts: Product[] = [];

  for (const type of productTypes) {
    try {
      let res: Response | null = null;
      for (const include of includeCandidates) {
        const params = new URLSearchParams({
          "filter[stores.meta.drupal_internal__target_id]": storeId,
          include,
          "page[limit]": "50",
        });

        const url = `${DRUPAL_API_URL}/jsonapi/commerce_product/${type}?${params.toString()}`;
        res = await fetch(url, { next: { revalidate: 60 } });

        if (res.ok || res.status !== 400) break;
      }

      if (!res || !res.ok) continue;

      const json = await res.json();
      const products = json.data ?? [];
      const included = json.included ?? [];

      for (const p of products) {
        const attrs = p.attributes;

        const variationRef = p.relationships?.variations?.data?.[0];
        let price = "0.00";
        let currency = "USD";
        let sku = "";
        if (variationRef) {
          const variation = included.find(
            (inc: any) => inc.id === variationRef.id
          );
          if (variation) {
            price = variation.attributes?.price?.number ?? "0.00";
            currency = variation.attributes?.price?.currency_code ?? "USD";
            sku = variation.attributes?.sku ?? "";
          }
        }

        const imageUrl =
          resolveImageFromRelationship(p.relationships?.field_images?.data, included) ||
          resolveImageFromRelationship(variationRef, included) ||
          firstNonEmptyString(attrs.field_product_image_url);

        allProducts.push({
          id: p.id,
          title: attrs.title,
          description: attrs.body?.processed ?? attrs.body?.value ?? "",
          price,
          currency,
          sku,
          image_url: imageUrl,
          subscriber_only: attrs.field_subscriber_only ?? false,
          min_tier: attrs.field_min_tier ?? null,
        });
      }
    } catch {
      // Skip failing product types silently
    }
  }

  return allProducts;
}

// ---------------------------------------------------------------------------
// Product Detail API Functions
// ---------------------------------------------------------------------------

function authHeaders(): Record<string, string> {
  return drupalAuthHeaders();
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractText(field: any): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field.processed ?? field.value ?? "";
}

function mapProductDetail(
  product: any,
  included: any[],
  productType: string
): ProductDetail {
  const attrs = product.attributes;
  const rels = product.relationships ?? {};

  // Images — from field_images file references, fallback to field_product_image_url
  const imageRefs = rels.field_images?.data ?? [];
  const images: ProductImage[] = imageRefs
    .map((ref: any) => {
      const file = included.find(
        (inc: any) => inc.id === ref.id && inc.type === "file--file"
      );
      if (!file) return null;
      const url = drupalAbsoluteUrl(file.attributes?.uri?.url);
      return url ? { url, alt: ref.meta?.alt || attrs.title } : null;
    })
    .filter(Boolean) as ProductImage[];

  // Fallback: use field_product_image_url if no file-based images
  if (images.length === 0 && attrs.field_product_image_url) {
    images.push({ url: attrs.field_product_image_url, alt: attrs.title });
  }

  // Variations
  const variationRefs = rels.variations?.data ?? [];
  const variations: ProductVariation[] = variationRefs
    .map((ref: any) => {
      const v = included.find((inc: any) => inc.id === ref.id && inc.type?.startsWith("commerce_product_variation"));
      if (!v) return null;
      const va = v.attributes;

      // Variation image
      let varImage: string | null = null;
      const varImgRef = v.relationships?.field_variation_image?.data;
      if (varImgRef) {
        const imgFile = included.find(
          (inc: any) => inc.id === varImgRef.id && inc.type === "file--file"
        );
        if (imgFile) {
          varImage = drupalAbsoluteUrl(imgFile.attributes?.uri?.url);
        }
      }

      // Gather attributes (size, color, etc.) — resolve from relationships or attributes
      const attrMap: Record<string, string> = {};
      const vRels = v.relationships ?? {};

      // Entity reference attributes (included as relationships in JSON:API)
      for (const [relName, label] of [["attribute_color", "color"], ["attribute_size", "size"]] as const) {
        const ref = vRels[relName]?.data;
        if (ref?.id) {
          const attrValue = included.find((inc: any) => inc.id === ref.id && inc.type?.includes("commerce_product_attribute_value"));
          if (attrValue) {
            attrMap[label] = attrValue.attributes?.name ?? "";
          }
        }
      }

      // Fallback: plain text attribute fields
      if (!attrMap.size && va.attribute_size) attrMap.size = va.attribute_size;
      if (!attrMap.color && va.attribute_color) attrMap.color = va.attribute_color;
      if (!attrMap.size && va.field_size?.value) attrMap.size = va.field_size.value;
      if (!attrMap.color && va.field_color?.value) attrMap.color = va.field_color.value;
      if (va.field_license_tier) attrMap.license_tier = va.field_license_tier;
      if (va.field_color_finish) attrMap.color_finish = va.field_color_finish;
      if (va.field_size_option) attrMap.size_option = va.field_size_option;
      if (va.field_material_option) attrMap.material_option = va.field_material_option;

      return {
        id: v.id,
        sku: va.sku ?? "",
        price: va.price?.number ?? "0.00",
        currency: va.price?.currency_code ?? "USD",
        list_price: va.list_price?.number ?? null,
        image_url: varImage,
        stock: va.field_stock ?? null,
        on_sale: va.field_on_sale ?? false,
        attributes: attrMap,
      } as ProductVariation;
    })
    .filter(Boolean) as ProductVariation[];

  // Store info
  let storeName = "Unknown Store";
  let storeSlug = "";
  const storeLogo: string | null = null;
  const storeRef = rels.stores?.data?.[0];
  if (storeRef) {
    const store = included.find((inc: any) => inc.id === storeRef.id);
    if (store) {
      storeName = store.attributes?.name ?? "Unknown Store";
      storeSlug = store.attributes?.field_store_slug ?? "";
      const logoRef = store.relationships?.field_linked_x_profile?.data;
      if (logoRef) {
        // Will be resolved from profile
      }
    }
  }

  // Price from first variation
  const firstVar = variations[0];
  const price = firstVar?.price ?? "0.00";
  const currency = firstVar?.currency ?? "USD";
  const sku = firstVar?.sku ?? "";
  const listPrice = firstVar?.list_price ?? null;

  // Taxonomy terms
  const categories: string[] = [];
  const catRefs = rels.field_categories?.data ?? [];
  for (const ref of catRefs) {
    const term = included.find((inc: any) => inc.id === ref.id && inc.type?.startsWith("taxonomy_term"));
    if (term) categories.push(term.attributes?.name ?? "");
  }

  const tags: string[] = [];
  const tagRefs = rels.field_tags?.data ?? [];
  for (const ref of tagRefs) {
    const term = included.find((inc: any) => inc.id === ref.id && inc.type?.startsWith("taxonomy_term"));
    if (term) tags.push(term.attributes?.name ?? "");
  }

  // Related products
  const relatedIds: string[] = (rels.field_related_products?.data ?? []).map((r: any) => r.id);

  return {
    id: product.id,
    drupal_internal_id: attrs.drupal_internal__product_id,
    title: attrs.title,
    body: extractText(attrs.body),
    short_description: extractText(attrs.field_short_description) || extractText(attrs.body).replace(/<[^>]*>/g, "").slice(0, 200),
    product_type: productType,
    slug: slugify(attrs.title),
    price,
    list_price: listPrice,
    currency,
    sku,
    images,
    variations,
    store_name: storeName,
    store_slug: storeSlug,
    store_logo: storeLogo,
    categories,
    tags,
    seo_title: attrs.field_seo_title ?? "",
    seo_description: attrs.field_seo_description ?? "",
    featured: attrs.field_featured ?? false,
    // Clothing
    brand: attrs.field_brand ?? null,
    gender: attrs.field_gender ?? null,
    material: extractText(attrs.field_material) || null,
    care_instructions: extractText(attrs.field_care_instructions) || null,
    country_of_origin: attrs.field_country_of_origin ?? null,
    sustainability: extractText(attrs.field_sustainability) || null,
    size_guide: extractText(attrs.field_size_guide) || null,
    // Digital
    file_formats: attrs.field_file_formats ?? [],
    file_size: attrs.field_file_size ?? null,
    license_type: attrs.field_license_type ?? null,
    license_details: extractText(attrs.field_license_details) || null,
    instant_download: attrs.field_instant_download ?? false,
    software_required: extractText(attrs.field_software_required) || null,
    dimensions_resolution: attrs.field_dimensions_resolution ?? null,
    page_count: attrs.field_page_count ?? null,
    language: attrs.field_language ?? null,
    version: attrs.field_version ?? null,
    changelog: extractText(attrs.field_changelog) || null,
    // Crafts
    handmade: attrs.field_handmade ?? false,
    made_to_order: attrs.field_made_to_order ?? false,
    production_time: attrs.field_production_time ?? null,
    materials_used: extractText(attrs.field_materials_used) || null,
    craft_dimensions: attrs.field_craft_dimensions ?? null,
    customizable: attrs.field_customizable ?? false,
    customization_details: extractText(attrs.field_customization_details) || null,
    craft_technique: attrs.field_craft_technique ?? null,
    occasion: attrs.field_occasion ?? null,
    safety_info: extractText(attrs.field_safety_info) || null,
    maker: attrs.field_maker ?? null,
    gift_wrap: attrs.field_gift_wrap ?? false,
    // Shipping
    shipping_weight: attrs.field_shipping_weight?.toString() ?? null,
    shipping_class: attrs.field_shipping_class ?? null,
    // Printful
    printful_product_id: attrs.field_printful_product_id ?? null,
    print_technique: attrs.field_print_technique ?? null,
    // Access control
    subscriber_only: attrs.field_subscriber_only ?? false,
    min_tier: attrs.field_min_tier ?? null,
    // Related
    related_product_ids: relatedIds,
  };
}

const PRODUCT_TYPES = ["default", "clothing", "digital_download", "crafts", "printful"] as const;

const PRODUCT_INCLUDES: Record<string, string> = {
  default: "variations,field_images,stores",
  clothing: "variations,variations.attribute_color,variations.attribute_size,field_images,stores",
  digital_download: "variations,field_images,field_preview_images,stores,field_categories,field_tags",
  crafts: "variations,variations.field_variation_image,field_images,stores,field_categories,field_tags",
  printful: "variations,variations.field_variation_image,variations.field_color_swatch,field_images,stores,field_categories,field_tags",
};

export async function getAllProductSlugs(): Promise<{ slug: string; type: string }[]> {
  const slugs: { slug: string; type: string }[] = [];

  for (const type of PRODUCT_TYPES) {
    try {
      const params = new URLSearchParams();
      params.set(`fields[commerce_product--${type}]`, "title");
      params.set("page[limit]", "100");
      const url = `${DRUPAL_API_URL}/jsonapi/commerce_product/${type}?${params.toString()}`;
      const res = await fetch(url, { next: { revalidate: 60 }, headers: authHeaders() });
      if (!res.ok) continue;
      const json = await res.json();
      for (const p of json.data ?? []) {
        slugs.push({ slug: slugify(p.attributes.title), type });
      }
    } catch {
      continue;
    }
  }

  return slugs;
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  for (const type of PRODUCT_TYPES) {
    try {
      const includes = PRODUCT_INCLUDES[type] || PRODUCT_INCLUDES.default;
      const params = new URLSearchParams({
        include: includes,
        "page[limit]": "50",
      });
      const url = `${DRUPAL_API_URL}/jsonapi/commerce_product/${type}?${params.toString()}`;
      const res = await fetch(url, { next: { revalidate: 60 }, headers: authHeaders() });
      if (!res.ok) continue;
      const json = await res.json();
      const included = json.included ?? [];

      for (const p of json.data ?? []) {
        if (slugify(p.attributes.title) === slug) {
          return mapProductDetail(p, included, type);
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function getRelatedProducts(
  productDetail: ProductDetail
): Promise<Product[]> {
  // If explicit related products exist, fetch them
  if (productDetail.related_product_ids.length > 0) {
    // For now, fetch products from the same store as a fallback
  }

  // Fallback: same store products
  if (productDetail.store_slug) {
    const allProducts = await getProductsByStoreSlug(productDetail.store_slug);
    return allProducts
      .filter((p) => p.id !== productDetail.id)
      .slice(0, 8);
  }

  return [];
}

export async function getProductsByStoreSlug(slug: string): Promise<Product[]> {
  // Try Drupal first
  try {
    const stores = await getCreatorStoreBySlug(slug);
    if (stores) {
      const storeInternalId =
        stores.store?.attributes?.drupal_internal__store_id;
      if (storeInternalId) {
        const products = await getStoreProducts(String(storeInternalId));
        if (products.length > 0) return products;
      }
    }
  } catch {
    // Drupal unavailable — fall through to mock data
  }

  // Fallback to mock products
  const { getMockProducts } = await import("./mock-products");
  return getMockProducts(slug);
}

// ---------------------------------------------------------------------------
// Convenience: fetch all creator data in one call (for page-level usage)
// ---------------------------------------------------------------------------

export interface CreatorData {
  profile: CreatorProfile;
  products: Product[];
  pfp: string | null;
  banner: string | null;
  pinnedPost: TopPost | null;
  recentPosts: TopPost[];
  topFollowers: TopFollower[];
  bio: string;
  followerCount: number;
  handle: string;
  displayName: string;
  metrics: Metrics | null;
}

// ---------------------------------------------------------------------------
// Console-specific queries (admin pages, layout)
// All use Basic Auth (drupalAuthHeaders) for read operations.
// ---------------------------------------------------------------------------

export interface ConsoleStoreData {
  profileNodeId: string;
  storeName: string | null;
  storeSlug: string;
  storeId: string | null;
  storeDrupalId: string | null;
  storeStatus: string | null;
  currentTheme: string;
  xSubscriptionTier: string | null;
}

function mapConsoleStoreData(profile: any, store: any, fallbackSlug: string): ConsoleStoreData {
  return {
    profileNodeId: profile?.id || "",
    storeName: store?.attributes?.name || profile?.attributes?.title || null,
    storeSlug: store?.attributes?.field_store_slug || fallbackSlug,
    storeId: store?.id || null,
    storeDrupalId: store ? String(store.attributes?.drupal_internal__store_id) : null,
    storeStatus: store?.attributes?.field_store_status || null,
    currentTheme: profile?.attributes?.field_store_theme || "xai3",
    xSubscriptionTier: profile?.attributes?.field_x_subscription_tier || null,
  };
}

/** Fetch all console stores for an X username (supports multi-store owners). */
export async function getConsoleProfiles(xUsername: string): Promise<ConsoleStoreData[]> {
  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?filter[field_x_username]=${xUsername}&include=field_linked_store`,
      { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
    );
    if (!res.ok) return [];

    const data = await res.json();
    const profiles = Array.isArray(data.data) ? data.data : [];
    const included = Array.isArray(data.included) ? data.included : [];

    const stores = profiles
      .map((profile: any) => {
        const storeRef = profile.relationships?.field_linked_store?.data;
        const store = storeRef
          ? included.find((inc: any) => inc.id === storeRef.id)
          : null;
        return mapConsoleStoreData(profile, store, xUsername);
      })
      .filter((entry: ConsoleStoreData) => !!entry.profileNodeId);

    const deduped = new Map<string, ConsoleStoreData>();
    for (const entry of stores) {
      const key = entry.storeId || `profile:${entry.profileNodeId}`;
      if (!deduped.has(key)) deduped.set(key, entry);
    }
    return Array.from(deduped.values());
  } catch {
    return [];
  }
}

/** Fetch all console stores for a user by email (for non-X users). */
export async function getConsoleProfilesByEmail(email: string): Promise<ConsoleStoreData[]> {
  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[mail]=${encodeURIComponent(email)}&include=field_linked_x_profile`,
      { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
    );
    if (!res.ok) return [];

    const data = await res.json();
    const stores = Array.isArray(data.data) ? data.data : [];
    const included = Array.isArray(data.included) ? data.included : [];

    return stores.map((store: any) => {
      const profileRef = store.relationships?.field_linked_x_profile?.data;
      const profile = profileRef
        ? included.find((inc: any) => inc.id === profileRef.id)
        : null;
      return mapConsoleStoreData(profile, store, store.attributes?.field_store_slug || "");
    });
  } catch {
    return [];
  }
}

/** Fetch console context data for a user by X username. */
export async function getConsoleProfile(xUsername: string): Promise<ConsoleStoreData | null> {
  const all = await getConsoleProfiles(xUsername);
  return all[0] || null;
}

/** Fetch console context data for a user by email (for non-X users). */
export async function getConsoleProfileByEmail(email: string): Promise<ConsoleStoreData | null> {
  const all = await getConsoleProfilesByEmail(email);
  return all[0] || null;
}

/** Fetch all stores sorted by creation date, with linked X profiles. */
export async function getAllStoresForAdmin(): Promise<{ data: any[]; included: any[] }> {
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_store/online?sort=-created&include=field_linked_x_profile`,
    {
      headers: { ...drupalAuthHeaders() },
      next: { revalidate: 30 },
    }
  );
  if (!res.ok) return { data: [], included: [] };
  const json = await res.json();
  return { data: json.data || [], included: json.included || [] };
}

/** Fetch profiles with an active subscription tier (not "none"). */
export async function getSubscriberProfiles(): Promise<any[]> {
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/node/x_user_profile` +
      `?filter[tier-filter][condition][path]=field_x_subscription_tier` +
      `&filter[tier-filter][condition][operator]=<>` +
      `&filter[tier-filter][condition][value]=none` +
      `&fields[node--x_user_profile]=field_x_username,field_x_subscription_tier,field_x_subscriber_since,title` +
      `&sort=-field_x_subscriber_since`,
    {
      headers: { ...drupalAuthHeaders() },
      next: { revalidate: 0 },
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

/** Fetch all profiles with sparse fields for admin tier management. */
export async function getAllProfilesForAdmin(): Promise<any[]> {
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/node/x_user_profile` +
      `?fields[node--x_user_profile]=field_x_username,field_x_subscription_tier,title` +
      `&sort=field_x_username&page[limit]=100`,
    {
      headers: { ...drupalAuthHeaders() },
      next: { revalidate: 0 },
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

/** Fetch all user profiles with linked store data for admin user management. */
export async function getAllUsersForAdmin(): Promise<{
  data: any[];
  included: any[];
}> {
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/node/x_user_profile` +
      `?include=field_linked_store` +
      `&sort=-created&page[limit]=100`,
    {
      headers: { ...drupalAuthHeaders() },
      next: { revalidate: 0 },
    }
  );
  if (!res.ok) return { data: [], included: [] };
  const json = await res.json();
  return { data: json.data || [], included: json.included || [] };
}

/** Fetch a single store by UUID. */
export async function getStoreById(id: string): Promise<any | null> {
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_store/online/${id}`,
    {
      headers: { ...drupalAuthHeaders() },
      next: { revalidate: 0 },
    }
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data || null;
}

/** Fetch the creator X profile linked to a given store UUID. */
export async function getProfileByStoreId(storeId: string): Promise<any | null> {
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?filter[field_linked_store.id]=${storeId}`,
    {
      headers: { ...drupalAuthHeaders() },
      next: { revalidate: 0 },
    }
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data?.[0] ?? null;
}

export async function fetchCreatorData(handle: string): Promise<CreatorData | null> {
  const [profile, products] = await Promise.all([
    getCreatorProfile(handle),
    getProductsByStoreSlug(handle),
  ]);

  if (!profile) return null;

  return {
    profile,
    products,
    pfp: profile.profile_picture_url,
    banner: profile.banner_url,
    pinnedPost: profile.top_posts[0] ?? null,
    recentPosts: profile.top_posts,
    topFollowers: profile.top_followers,
    bio: profile.bio,
    followerCount: profile.follower_count,
    handle: profile.x_username,
    displayName: profile.title || profile.x_username,
    metrics: profile.metrics,
  };
}
