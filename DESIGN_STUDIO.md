# Design Studio — Technical & Design Documentation

**URL:** `/console/design-studio`
**Component:** `src/app/console/design-studio/page.tsx`
**AI Service:** `src/lib/grok-imagine.ts`
**API Routes:** `src/app/api/design-studio/generate/route.ts`, `src/app/api/design-studio/publish/route.ts`

---

## Overview

The Design Studio lets creators generate AI-powered merch designs using Grok Imagine, then publish them as purchasable products in their Drupal Commerce store with optional Printful fulfillment.

**Flow:** Prompt/Upload → Grok Imagine AI → Preview → Publish → Drupal Commerce Product + Printful Sync

---

## Page Layout

```
┌─────────────────────────────────────────────┐
│  Design Studio                              │
│  Describe your design, Grok Imagine creates │
│  it, publish to Printful in one click.      │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │   Drag & drop a reference image     │    │
│  │   Logo, artwork, photo, sketch      │    │
│  │   JPEG/PNG/WebP, max 4MB            │    │
│  │        [ Choose file ]              │    │
│  │   Optional — or just type a prompt  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Cyberpunk samurai cat wearing...   │    │
│  │                                     │    │
│  │  [ 👕 T-Shirt ] [ 🧥 Hoodie ]     │    │
│  │  [   $24.99  ] [ $44.99 ] [🧢$29] │    │
│  │                                     │    │
│  │  [====== Generate Design ======]    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─── Generated Design Preview ─────────┐   │
│  │  [ image preview ]                   │   │
│  │  ✅ Used @username PFP as reference  │   │
│  │  Title: _______________              │   │
│  │  Description: _______________        │   │
│  │  [ Publish 👕 to Printful ] [Discard]│   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌─── Printful ─────────────────────────┐   │
│  │  ✅ Store #12345                     │   │
│  │  — or —                              │   │
│  │  [Paste API key...] [Connect]        │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌─── Your Store Products ──────────────┐   │
│  │  [img] [img] [img]                   │   │
│  │  Tee   Hood  Snap                    │   │
│  │  $29   $59   $24                     │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## Design Decisions

### 1. Reference Image Upload (Drag & Drop)

**Decision:** Support three input methods — upload, PFP reference, text-only.

**Why:** Creators want to put their own branding on merch. A text prompt alone can't capture a specific logo or art style. The PFP shortcut (`use my pfp` or `use @username pfp`) covers the most common case (creators using their own avatar as merch art).

**Implementation:**
- File is read as base64 data URL client-side (`FileReader.readAsDataURL`)
- Sent in the JSON body to `/api/design-studio/generate` as `reference_image`
- Server validates: must be `data:image/`, max 6MB base64 (~4MB file)
- No Drupal upload needed — the image goes directly to Grok as multimodal input

**Why not upload to Drupal first?** Unnecessary round trip. The reference image is temporary — only the generated output matters. Keeping it client-side avoids storage management and latency.

### 2. Grok Imagine Integration

**File:** `src/lib/grok-imagine.ts`

**Decision:** Use `grok-imagine-image` model via `/v1/images/generations` endpoint.

**Why not chat completions?** The `grok-2-image` model name doesn't exist. The `grok-imagine-image` model uses the dedicated images endpoint, not chat. We tried chat completions first and got 400 errors — the images/generations endpoint is correct per x.ai docs.

**Prompt engineering:**
```
{user prompt} | print-ready {product_type} design, transparent background,
high resolution, centered artwork, vector clean edges, POD optimized
```

Product-specific suffixes ensure Grok generates print-ready output regardless of the user's prompt quality.

**PFP detection regex:**
```typescript
/@([A-Za-z0-9_]+)\s*(?:pfp|profile\s*pic|avatar|photo)/i  // @username pfp
/\b(?:my|the)\s+(?:pfp|profile\s*pic|avatar|photo)\b/i     // my pfp
```

When detected, the PFP mention is stripped from the design prompt (so Grok focuses on the design style, not the words "pfp"), and the actual image is sent as multimodal input.

### 3. Product Type Selection

**Decision:** Three product types with fixed default pricing.

| Type | Drupal Variation Bundle | Default Price | Printful Catalog ID |
|------|------------------------|---------------|---------------------|
| T-Shirt | `t_shirt` | $24.99 | 71 (Bella+Canvas 3001) |
| Hoodie | `hoodie` | $44.99 | 146 (Bella+Canvas 3719) |
| Ballcap | `ballcap` | $29.99 | 439 (Yupoong 6089M) |

**Why these three?** They're the core POD products with the highest margins and lowest fulfillment complexity. Adding more types (mugs, posters, etc.) is trivial — add to `PRINTFUL_PRODUCTS` map.

**Why fixed pricing?** Simplicity for v1. Creators can adjust prices later in the Products console page. The defaults are market-standard for POD merch.

### 4. Publish Flow

**File:** `src/app/api/design-studio/publish/route.ts`

**Decision:** Create the product in Drupal Commerce first, Printful second. Printful is optional.

**Why Drupal first?** The product must exist in Commerce to be purchasable. Printful connection is optional — creators can sell digital-only or fulfill manually. If Printful sync fails, the product still exists in the store.

**Publish sequence:**
1. Resolve store UUID from slug
2. Get Printful API key (if connected)
3. Upload design to Printful file library → get permanent URL
4. Create Printful sync product with size variants
5. Generate mockup (async, 5s wait + poll)
6. Create Commerce product variation (SKU, price)
7. Create Commerce product (title, description, store link, Printful ID)
8. Attach design image to product (fire-and-forget)
9. Revalidate store pages

**Why fire-and-forget for image attachment?** The image upload to Drupal's `field_images` can be slow. The product is already purchasable with the `field_product_image_url` fallback. The file attachment happens async so the user gets instant feedback.

### 5. Printful Connection UI

**Decision:** Inline API key input on the Design Studio page, not a separate settings page.

**Why?** The creator hits "Publish to Printful" and sees it's not connected — the connection UI is right there. No navigation away. Reduces friction from "generate → realize not connected → find settings → come back → try again" to "generate → paste key → publish."

**Verification:** The key is validated by calling `getStoreInfo(apiKey)` against Printful's API before saving. Invalid keys show an error immediately.

### 6. Store Products Grid

**Decision:** Show existing products at the bottom of the Design Studio.

**Why?** Creators need to see what they've already created. It reinforces the creation loop: generate → publish → see it in the grid → generate another. Each product card links to the public product detail page.

**Data source:** `/api/stores/products?slug={storeSlug}` — queries all product types (clothing, default, digital_download, crafts) from Drupal Commerce.

### 7. Auto-Save to Gallery

**Decision:** Every generated design auto-saves to the Grok Gallery.

**Why?** Creators generate many designs before publishing one. The gallery preserves all generations so they can come back later and publish a design they liked but skipped initially.

**Implementation:** After successful generation, a non-blocking `fetch("/api/gallery", { action: "add", item: {...} })` fires. Gallery failure doesn't affect the design flow.

### 8. Rate Limiting

**Decision:** 10 generations per hour per user.

**Why?** Grok Imagine costs $0.02-0.07 per image. 10/hour balances creative freedom with cost control. The rate limiter uses the user's X ID (from JWT), not IP, so it's accurate per-account.

---

## State Management

```typescript
// Core design state
prompt: string                    // Text prompt
productType: "t_shirt" | "hoodie" | "ballcap"
generating: boolean               // Loading spinner
designUrl: string | null          // Generated image URL
error: string | null              // Error display

// Reference image
refPreview: string | null         // Object URL for local preview
refDataUrl: string | null         // Base64 data URL sent to API
dragActive: boolean               // Drag-over visual state

// PFP detection feedback
usedPfp: { used: boolean; username?: string }
usedUpload: boolean

// Publish flow
title: string                     // Product title
description: string               // Product description
publishing: boolean               // Publish loading
published: {                      // Success state
  product_type: string
  mockup_url: string | null
  retail_price: string
  design_url: string | null
  printful_synced: boolean
} | null

// Printful connection
printfulKey: string               // API key input
printfulConnected: string | null  // Connected store name
storeUuid: string | null          // For connect API call
connecting: boolean

// Store products
storeProducts: StoreProduct[]     // Loaded on mount
loadingProducts: boolean
```

---

## API Endpoints

### POST `/api/design-studio/generate`

**Auth:** NextAuth JWT required
**Rate limit:** 10/hour per user
**Max duration:** 60s (Vercel function timeout)

**Request:**
```json
{
  "prompt": "cyberpunk cat",
  "product_type": "t_shirt",
  "reference_image": "data:image/png;base64,..." // optional
}
```

**Response:**
```json
{
  "success": true,
  "image_url": "https://...",
  "used_pfp": false,
  "used_upload": true,
  "pfp_username": null,
  "product_type": "t_shirt",
  "original_prompt": "cyberpunk cat"
}
```

### POST `/api/design-studio/publish`

**Auth:** NextAuth JWT required
**Max duration:** 120s

**Request:**
```json
{
  "image_url": "https://...",
  "product_type": "t_shirt",
  "title": "Cyberpunk Cat Tee",
  "description": "AI-generated design",
  "price": "24.99"
}
```

**Response:**
```json
{
  "success": true,
  "drupal_product_id": "uuid",
  "printful_product_id": "123",
  "title": "Cyberpunk Cat Tee",
  "product_type": "T-Shirt",
  "variation_type": "t_shirt",
  "retail_price": "24.99",
  "sku": "rareimagery-ai-1234567890",
  "mockup_url": "https://...",
  "design_url": "https://..."
}
```

---

## Drupal Commerce Integration

### Product Creation

The publish route creates:

1. **Variation** (`commerce_product_variation--{bundle}`)
   - SKU: `{slug}-ai-{timestamp}`
   - Price: `{amount} USD`

2. **Product** (`commerce_product--clothing`)
   - Title, body (description)
   - `field_printful_product_id` (if synced)
   - `field_product_image_url` (design image URL)
   - Linked to store via `stores` relationship
   - Linked to variation via `variations` relationship

3. **Image attachment** (async)
   - Downloads design image
   - POSTs binary to `field_images` on the product

### Auth for Writes

Uses `drupalWriteHeaders()` which:
1. Logs in via `/user/login?_format=json` to get session cookie
2. Fetches CSRF token from `/session/token`
3. Sends both `Cookie` and `X-CSRF-Token` headers

Basic Auth alone fails for PATCH/POST from external IPs (Drupal's security behavior).

---

## Printful Integration

### File Upload
```
POST /files → { url: designImageUrl, filename: "slug-product-timestamp.png" }
Returns: PrintfulFile with preview_url
```

### Sync Product Creation
```
POST /store/products → {
  sync_product: { name, thumbnail },
  sync_variants: [{ variant_id, retail_price, files: [{ type: "default", url }] }]
}
```

### Mockup Generation
```
POST /mockup-generator/create-task/{catalogId} → { task_key }
GET  /mockup-generator/task?task_key={key} → { mockups: [{ mockup_url }] }
```

5-second delay between create and poll. Mockup failure is non-blocking.

---

## File Structure

```
src/
├── lib/
│   └── grok-imagine.ts          # Grok Imagine service (generate, PFP detection)
├── app/
│   ├── api/
│   │   └── design-studio/
│   │       ├── generate/route.ts  # AI generation endpoint
│   │       └── publish/route.ts   # Publish to Drupal + Printful
│   └── console/
│       └── design-studio/
│           └── page.tsx           # Design Studio UI
```

---

## CSS / Styling

- Dark theme consistent with console (`bg-zinc-950`, `border-zinc-800`)
- Gradient purple CTA button for Generate (`from-violet-600 to-fuchsia-600`)
- Green success states (emerald for Printful connected, published)
- Amber warnings (Printful not connected)
- Product type pills with emoji icons and price labels
- Drag-and-drop zone with dashed border + indigo highlight on drag-over
- Product grid uses `grid-cols-2 sm:grid-cols-3` responsive layout

---

## Error Handling

| Error | Display | Recovery |
|-------|---------|----------|
| Grok API fails | Red error banner below prompt | User retries |
| No API key | "XAI_API_KEY not configured" | Admin sets env var |
| Rate limited | 429 with retry-after | Wait and retry |
| Publish fails | Red error in publish section | User retries |
| Printful not connected | Amber "not connected" message | Paste API key inline |
| Image too large | "Reference image too large (max 4MB)" | User resizes |
| Invalid file type | "Only JPEG, PNG, or WebP images" | User selects correct file |

---

*Documentation generated for RareImagery Design Studio v1.0*
