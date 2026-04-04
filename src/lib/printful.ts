// ---------------------------------------------------------------------------
// Printful API Client — Centralized helpers for all Printful interactions
// ---------------------------------------------------------------------------
// Uses per-store Private Token auth (Bearer). Tokens are stored on Drupal
// commerce_store entities in field_printful_api_key.
// ---------------------------------------------------------------------------

import { drupalAuthHeaders } from "@/lib/drupal";

const PRINTFUL_BASE = "https://api.printful.com";
const DRUPAL_API = process.env.DRUPAL_API_URL;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Standard Printful API response envelope */
export interface PrintfulResponse<T = unknown> {
  code: number;
  result: T;
  paging?: { total: number; offset: number; limit: number };
  error?: { reason: string; message: string };
}

// -- Catalog types --

export interface PrintfulCategory {
  id: number;
  parent_id: number;
  image_url: string;
  title: string;
}

export interface PrintfulCatalogProduct {
  id: number;
  main_category_id: number;
  type: string;
  type_name: string;
  title: string;
  brand: string | null;
  model: string;
  image: string;
  variant_count: number;
  currency: string;
  is_discontinued: boolean;
  avg_fulfillment_time: number | null;
  techniques: { key: string; display_name: string; is_default: boolean }[];
  files: { id: string; type: string; title: string; additional_price: string | null }[];
  options: { id: string; title: string; type: string; values: Record<string, string> }[];
}

export interface PrintfulVariant {
  id: number;
  product_id: number;
  name: string;
  size: string;
  color: string;
  color_code: string;
  color_code2: string | null;
  image: string;
  price: string;
  in_stock: boolean;
  availability_regions: Record<string, string>;
  availability_status: { region: string; status: string }[];
}

// -- Sync Product types --

export interface PrintfulSyncProduct {
  id: number;
  external_id: string;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url: string;
  is_ignored: boolean;
}

export interface PrintfulSyncVariant {
  id: number;
  external_id: string;
  sync_product_id: number;
  name: string;
  synced: boolean;
  variant_id: number;
  retail_price: string;
  currency: string;
  is_ignored: boolean;
  sku: string;
  product: {
    variant_id: number;
    product_id: number;
    image: string;
    name: string;
  };
  files: PrintfulFile[];
  options: { id: string; value: unknown }[];
}

export interface PrintfulFile {
  type: string;
  id: number;
  url: string;
  options: { id: string; value: unknown }[];
  hash: string | null;
  filename: string | null;
  mime_type: string | null;
  size: number;
  width: number;
  height: number;
  dpi: number | null;
  status: string;
  created: number;
  thumbnail_url: string;
  preview_url: string;
  visible: boolean;
  is_temporary: boolean;
}

// -- Order types --

export interface PrintfulRecipient {
  name: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
  phone?: string;
  email?: string;
}

export interface PrintfulOrderItem {
  sync_variant_id?: number;
  external_id?: string;
  variant_id?: number;
  quantity: number;
  retail_price?: string;
  name?: string;
  files?: { type: string; url: string; position?: PrintfulFilePosition }[];
}

export interface PrintfulFilePosition {
  area_width: number;
  area_height: number;
  width: number;
  height: number;
  top: number;
  left: number;
  limit_to_print_area?: boolean;
}

export interface PrintfulRetailCosts {
  subtotal: string;
  discount?: string;
  shipping: string;
  tax: string;
}

export interface PrintfulOrderCreate {
  external_id?: string;
  shipping?: string;
  recipient: PrintfulRecipient;
  items: PrintfulOrderItem[];
  retail_costs?: PrintfulRetailCosts;
  confirm?: boolean;
}

export interface PrintfulOrder {
  id: number;
  external_id: string | null;
  store: number;
  status: string;
  shipping: string;
  shipping_service_name: string;
  created: number;
  updated: number;
  recipient: PrintfulRecipient;
  items: PrintfulOrderItem[];
  costs: {
    currency: string;
    subtotal: string;
    discount: string;
    shipping: string;
    digitization: string;
    additional_fee: string;
    fulfillment_fee: string;
    retail_delivery_fee: string;
    tax: string;
    vat: string;
    total: string;
  };
  retail_costs: PrintfulRetailCosts;
  shipments: PrintfulShipment[];
  dashboard_url: string;
}

export interface PrintfulShipment {
  id: number;
  carrier: string;
  service: string;
  tracking_number: string;
  tracking_url: string;
  created: number;
  ship_date: string;
  shipped_at: number;
  reshipment: boolean;
  items: { item_id: number; quantity: number }[];
}

// -- Shipping rate types --

export interface PrintfulShippingRate {
  id: string;
  name: string;
  rate: string;
  currency: string;
  minDeliveryDays: number;
  maxDeliveryDays: number;
  minDeliveryDate: string;
  maxDeliveryDate: string;
}

// -- Tax rate types --

export interface PrintfulTaxRate {
  required: boolean;
  rate: number;
  shipping_taxable: boolean;
}

// -- Webhook types --

export type PrintfulWebhookEvent =
  | "package_shipped"
  | "package_returned"
  | "order_created"
  | "order_updated"
  | "order_failed"
  | "order_canceled"
  | "order_put_hold"
  | "order_put_hold_approval"
  | "order_remove_hold"
  | "order_refunded"
  | "product_synced"
  | "product_updated"
  | "product_deleted"
  | "stock_updated";

export interface PrintfulWebhookPayload {
  type: PrintfulWebhookEvent;
  created: number;
  retries: number;
  store: number;
  data: {
    order?: PrintfulOrder;
    shipment?: PrintfulShipment;
    sync_product?: PrintfulSyncProduct;
    sync_variants?: { id: number; external_id?: string; availability_status?: string }[];
    reason?: string;
  };
}

// -- Mockup types --

export interface PrintfulMockupTask {
  task_key: string;
  status: "pending" | "completed" | "failed";
  mockups?: {
    placement: string;
    variant_ids: number[];
    mockup_url: string;
    extra: { title: string; url: string; option: string; option_group: string }[];
  }[];
  error?: string;
}

// ---------------------------------------------------------------------------
// External ID helpers (per API reference strategy)
// ---------------------------------------------------------------------------

export function productExternalId(drupalNodeId: string | number): string {
  return `ri_prod_${drupalNodeId}`;
}

export function variantExternalId(
  drupalNodeId: string | number,
  color: string,
  size: string
): string {
  const c = color.toLowerCase().replace(/[^a-z0-9]/g, "");
  const s = size.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `ri_var_${drupalNodeId}_${c}_${s}`.slice(0, 32);
}

export function orderExternalId(drupalOrderId: string | number): string {
  return `ri_ord_${drupalOrderId}`;
}

export function orderItemExternalId(drupalLineItemId: string | number): string {
  return `ri_item_${drupalLineItemId}`;
}

// ---------------------------------------------------------------------------
// Per-store API key retrieval from Drupal
// ---------------------------------------------------------------------------

export async function getStorePrintfulKey(
  storeUuid: string
): Promise<string | null> {
  if (!DRUPAL_API) return null;
  const res = await fetch(
    `${DRUPAL_API}/jsonapi/commerce_store/online/${storeUuid}`,
    { headers: { ...drupalAuthHeaders() } }
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data?.attributes?.field_printful_api_key || null;
}

// ---------------------------------------------------------------------------
// Core API caller with error handling
// ---------------------------------------------------------------------------

export class PrintfulApiError extends Error {
  constructor(
    public code: number,
    public reason: string,
    message: string
  ) {
    super(message);
    this.name = "PrintfulApiError";
  }
}

export async function printfulFetch<T = unknown>(
  path: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<PrintfulResponse<T>> {
  const url = `${PRINTFUL_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const body = await res.json() as PrintfulResponse<T>;

  if (!res.ok || body.code < 200 || body.code >= 300) {
    throw new PrintfulApiError(
      body.code || res.status,
      body.error?.reason || "unknown",
      body.error?.message || `Printful API error: ${res.status}`
    );
  }

  return body;
}

/** Unauthenticated fetch for public catalog endpoints */
export async function printfulPublicFetch<T = unknown>(
  path: string
): Promise<PrintfulResponse<T>> {
  const url = `${PRINTFUL_BASE}${path}`;

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });

  const body = await res.json() as PrintfulResponse<T>;

  if (!res.ok || body.code < 200 || body.code >= 300) {
    throw new PrintfulApiError(
      body.code || res.status,
      body.error?.reason || "unknown",
      body.error?.message || `Printful API error: ${res.status}`
    );
  }

  return body;
}

// ---------------------------------------------------------------------------
// Catalog API (public, no auth)
// ---------------------------------------------------------------------------

export async function getCatalogCategories(): Promise<PrintfulCategory[]> {
  const res = await printfulPublicFetch<PrintfulCategory[]>("/categories");
  return res.result;
}

export async function getCatalogProducts(
  categoryId?: number
): Promise<PrintfulCatalogProduct[]> {
  const path = categoryId ? `/products?category_id=${categoryId}` : "/products";
  const res = await printfulPublicFetch<PrintfulCatalogProduct[]>(path);
  // Filter out discontinued products
  return res.result.filter((p) => !p.is_discontinued);
}

export async function getCatalogProduct(
  productId: number
): Promise<{ product: PrintfulCatalogProduct; variants: PrintfulVariant[] }> {
  const res = await printfulPublicFetch<{
    product: PrintfulCatalogProduct;
    variants: PrintfulVariant[];
  }>(`/products/${productId}`);
  return res.result;
}

export async function getCatalogVariant(
  variantId: number
): Promise<PrintfulVariant> {
  const res = await printfulPublicFetch<{ variant: PrintfulVariant }>(
    `/products/variant/${variantId}`
  );
  return res.result.variant;
}

export async function getProductSizes(
  productId: number
): Promise<unknown> {
  const res = await printfulPublicFetch<unknown>(`/products/${productId}/sizes`);
  return res.result;
}

// ---------------------------------------------------------------------------
// Sync Products API (auth required)
// ---------------------------------------------------------------------------

export async function listSyncProducts(
  apiKey: string,
  offset = 0,
  limit = 20
): Promise<PrintfulResponse<PrintfulSyncProduct[]>> {
  return printfulFetch<PrintfulSyncProduct[]>(
    `/store/products?offset=${offset}&limit=${limit}`,
    apiKey
  );
}

export async function getSyncProduct(
  apiKey: string,
  productId: number | string
): Promise<{ sync_product: PrintfulSyncProduct; sync_variants: PrintfulSyncVariant[] }> {
  const res = await printfulFetch<{
    sync_product: PrintfulSyncProduct;
    sync_variants: PrintfulSyncVariant[];
  }>(`/store/products/${productId}`, apiKey);
  return res.result;
}

export async function createSyncProduct(
  apiKey: string,
  payload: {
    sync_product: {
      name: string;
      external_id?: string;
      thumbnail?: string;
    };
    sync_variants: {
      variant_id: number;
      external_id?: string;
      retail_price: string;
      files: { type: string; url: string }[];
    }[];
  }
): Promise<{ sync_product: PrintfulSyncProduct; sync_variants: PrintfulSyncVariant[] }> {
  const res = await printfulFetch<{
    sync_product: PrintfulSyncProduct;
    sync_variants: PrintfulSyncVariant[];
  }>("/store/products", apiKey, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.result;
}

export async function updateSyncProduct(
  apiKey: string,
  productId: number | string,
  payload: {
    sync_product?: { name?: string; external_id?: string; thumbnail?: string };
    sync_variants?: {
      id?: number;
      variant_id: number;
      external_id?: string;
      retail_price: string;
      files: { type: string; url: string }[];
    }[];
  }
): Promise<{ sync_product: PrintfulSyncProduct; sync_variants: PrintfulSyncVariant[] }> {
  const res = await printfulFetch<{
    sync_product: PrintfulSyncProduct;
    sync_variants: PrintfulSyncVariant[];
  }>(`/store/products/${productId}`, apiKey, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.result;
}

export async function deleteSyncProduct(
  apiKey: string,
  productId: number | string
): Promise<void> {
  await printfulFetch(`/store/products/${productId}`, apiKey, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Orders API (auth required)
// ---------------------------------------------------------------------------

export async function createOrder(
  apiKey: string,
  order: PrintfulOrderCreate
): Promise<PrintfulOrder> {
  const res = await printfulFetch<PrintfulOrder>("/orders", apiKey, {
    method: "POST",
    body: JSON.stringify(order),
  });
  return res.result;
}

export async function estimateOrderCosts(
  apiKey: string,
  order: PrintfulOrderCreate
): Promise<PrintfulOrder> {
  const res = await printfulFetch<PrintfulOrder>("/orders/estimate", apiKey, {
    method: "POST",
    body: JSON.stringify(order),
  });
  return res.result;
}

export async function getOrder(
  apiKey: string,
  orderId: number | string
): Promise<PrintfulOrder> {
  const res = await printfulFetch<PrintfulOrder>(
    `/orders/${orderId}`,
    apiKey
  );
  return res.result;
}

export async function confirmOrder(
  apiKey: string,
  orderId: number | string
): Promise<PrintfulOrder> {
  const res = await printfulFetch<PrintfulOrder>(
    `/orders/${orderId}/confirm`,
    apiKey,
    { method: "POST" }
  );
  return res.result;
}

export async function cancelOrder(
  apiKey: string,
  orderId: number | string
): Promise<PrintfulOrder> {
  const res = await printfulFetch<PrintfulOrder>(
    `/orders/${orderId}`,
    apiKey,
    { method: "DELETE" }
  );
  return res.result;
}

export async function listOrders(
  apiKey: string,
  offset = 0,
  limit = 20
): Promise<PrintfulResponse<PrintfulOrder[]>> {
  return printfulFetch<PrintfulOrder[]>(
    `/orders?offset=${offset}&limit=${limit}`,
    apiKey
  );
}

// ---------------------------------------------------------------------------
// Shipping Rates API (auth required)
// ---------------------------------------------------------------------------

export async function getShippingRates(
  apiKey: string,
  recipient: PrintfulRecipient,
  items: { variant_id?: number; external_variant_id?: string; quantity: number }[]
): Promise<PrintfulShippingRate[]> {
  const res = await printfulFetch<PrintfulShippingRate[]>(
    "/shipping/rates",
    apiKey,
    {
      method: "POST",
      body: JSON.stringify({ recipient, items }),
    }
  );
  return res.result;
}

// ---------------------------------------------------------------------------
// Tax Rates API
// ---------------------------------------------------------------------------

export async function getTaxRates(
  apiKey: string,
  recipient: { country_code: string; state_code?: string; city?: string; zip?: string }
): Promise<PrintfulTaxRate> {
  const res = await printfulFetch<PrintfulTaxRate>("/tax/rates", apiKey, {
    method: "POST",
    body: JSON.stringify({ recipient }),
  });
  return res.result;
}

export async function getTaxCountries(
  apiKey: string
): Promise<unknown[]> {
  const res = await printfulFetch<unknown[]>("/tax/countries", apiKey);
  return res.result;
}

// ---------------------------------------------------------------------------
// Webhook API (auth required)
// ---------------------------------------------------------------------------

const RECOMMENDED_EVENTS: PrintfulWebhookEvent[] = [
  "package_shipped",
  "package_returned",
  "order_failed",
  "order_canceled",
  "order_put_hold",
  "order_remove_hold",
  "stock_updated",
];

export async function setupWebhooks(
  apiKey: string,
  webhookUrl: string,
  events: PrintfulWebhookEvent[] = RECOMMENDED_EVENTS
): Promise<unknown> {
  const res = await printfulFetch<unknown>("/webhooks", apiKey, {
    method: "POST",
    body: JSON.stringify({ url: webhookUrl, types: events }),
  });
  return res.result;
}

export async function getWebhooks(apiKey: string): Promise<unknown> {
  const res = await printfulFetch<unknown>("/webhooks", apiKey);
  return res.result;
}

export async function deleteWebhooks(apiKey: string): Promise<void> {
  await printfulFetch("/webhooks", apiKey, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Mockup Generator API (auth required)
// ---------------------------------------------------------------------------

export async function createMockupTask(
  apiKey: string,
  productId: number,
  files: { placement: string; image_url: string; position?: PrintfulFilePosition }[],
  variantIds?: number[],
  format?: "jpg" | "png"
): Promise<{ task_key: string }> {
  const body: Record<string, unknown> = { files };
  if (variantIds?.length) body.variant_ids = variantIds;
  if (format) body.format = format;

  const res = await printfulFetch<{ task_key: string }>(
    `/mockup-generator/create-task/${productId}`,
    apiKey,
    { method: "POST", body: JSON.stringify(body) }
  );
  return res.result;
}

export async function getMockupTaskResult(
  apiKey: string,
  taskKey: string
): Promise<PrintfulMockupTask> {
  const res = await printfulFetch<PrintfulMockupTask>(
    `/mockup-generator/task?task_key=${taskKey}`,
    apiKey
  );
  return res.result;
}

export async function getPrintfileInfo(
  apiKey: string,
  productId: number
): Promise<unknown> {
  const res = await printfulFetch<unknown>(
    `/mockup-generator/printfiles/${productId}`,
    apiKey
  );
  return res.result;
}

export async function getMockupTemplates(
  apiKey: string,
  productId: number
): Promise<unknown> {
  const res = await printfulFetch<unknown>(
    `/mockup-generator/templates/${productId}`,
    apiKey
  );
  return res.result;
}

// ---------------------------------------------------------------------------
// File Library API (auth required)
// ---------------------------------------------------------------------------

export async function uploadFile(
  apiKey: string,
  fileUrl: string,
  filename?: string
): Promise<PrintfulFile> {
  const body: Record<string, string> = { url: fileUrl };
  if (filename) body.filename = filename;

  const res = await printfulFetch<PrintfulFile>("/files", apiKey, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.result;
}

export async function getFile(
  apiKey: string,
  fileId: number
): Promise<PrintfulFile> {
  const res = await printfulFetch<PrintfulFile>(`/files/${fileId}`, apiKey);
  return res.result;
}

// ---------------------------------------------------------------------------
// Store Info API (auth required)
// ---------------------------------------------------------------------------

export async function getStoreInfo(apiKey: string): Promise<unknown> {
  const res = await printfulFetch<unknown>("/store", apiKey);
  return res.result;
}

export async function updatePackingSlip(
  apiKey: string,
  slip: {
    email?: string;
    phone?: string;
    message?: string;
    logo_url?: string;
    store_name?: string;
  }
): Promise<unknown> {
  const res = await printfulFetch<unknown>("/store/packing-slip", apiKey, {
    method: "POST",
    body: JSON.stringify(slip),
  });
  return res.result;
}
