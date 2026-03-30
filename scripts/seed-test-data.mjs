/**
 * Seed script: creates 5 test stores + 1 product each in Drupal
 * Run: node scripts/seed-test-data.mjs
 */

const DRUPAL_API = process.env.DRUPAL_API_URL || "http://72.62.80.155";
const DRUPAL_USER = process.env.DRUPAL_API_USER || "admin";
const DRUPAL_PASS = process.env.DRUPAL_API_PASS || "admin";
const USD_CURRENCY_UUID = "7be59a35-eea8-4d2d-8be4-b113aafad8d4";

// ── Test stores ──────────────────────────────────────────────────────────────

const STORES = [
  {
    slug: "pixelcraft-studio",
    name: "PixelCraft Studio",
    email: "pixel@rareimagery.net",
    xUsername: "pixelcraft_studio",
    bio: "Digital pixel art prints for your walls and screens. Retro vibes, modern quality.",
    theme: "neon",
    product: {
      title: "8-Bit Sunset Print",
      description: "A hand-crafted pixel art sunset in 8-bit style. Perfect for gaming dens and creative spaces. Ships as a high-res digital download (4K PNG).",
      price: "24.99",
      type: "digital_download",
    },
  },
  {
    slug: "neon-prints-la",
    name: "Neon Prints LA",
    email: "neon@rareimagery.net",
    xUsername: "neon_prints_la",
    bio: "Bold neon-inspired wall art from Los Angeles. Light up your space.",
    theme: "neon",
    product: {
      title: "Neon Palms Poster",
      description: "Electric pink and cyan palm trees against a midnight LA skyline. Printed on premium matte stock, 18×24 inches.",
      price: "39.99",
      type: "default",
    },
  },
  {
    slug: "editorial-press",
    name: "Editorial Press",
    email: "editorial@rareimagery.net",
    xUsername: "editorial_press",
    bio: "Curated photography books and art prints. Minimal. Intentional. Beautiful.",
    theme: "editorial",
    product: {
      title: "Streets Vol. 1 — Art Book",
      description: "A 120-page hardcover photography book documenting urban life across 12 cities. Archival paper, lay-flat binding.",
      price: "89.00",
      type: "default",
    },
  },
  {
    slug: "vintage-vault",
    name: "VintageVault",
    email: "vault@rareimagery.net",
    xUsername: "vintage_vault",
    bio: "Rare vintage photography prints from the 1960s–1990s. Authenticated originals and museum-quality reproductions.",
    theme: "minimal",
    product: {
      title: "Golden Gate 1972 — Archival Print",
      description: "Museum-quality giclée reproduction of a rare 1972 photograph of the Golden Gate Bridge at golden hour. Edition of 50, signed and numbered.",
      price: "149.00",
      type: "default",
    },
  },
  {
    slug: "retrospace-gallery",
    name: "RetroSpace Gallery",
    email: "retro@rareimagery.net",
    xUsername: "retrospace_gallery",
    bio: "Y2K and MySpace-era aesthetic digital art. Bring back the early internet.",
    theme: "myspace",
    product: {
      title: "Y2K Desktop Pack",
      description: "50 digital wallpapers and icons inspired by early-2000s internet culture. Glitter, gradients, and nostalgia included. Instant download.",
      price: "12.00",
      type: "digital_download",
    },
  },
];

// ── Drupal auth ───────────────────────────────────────────────────────────────

async function getDrupalSession() {
  const res = await fetch(`${DRUPAL_API}/user/login?_format=json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: DRUPAL_USER, pass: DRUPAL_PASS }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);

  const setCookies = res.headers.getSetCookie?.() ?? [];
  let cookie = setCookies.map(c => c.split(";")[0]).find(c => c.startsWith("SESS") || c.startsWith("SSESS"));
  if (!cookie) {
    const raw = res.headers.get("set-cookie") ?? "";
    const m = raw.match(/(S?SESS[^=]+=\S+?)(?:;|$)/);
    if (!m) throw new Error("No session cookie in login response");
    cookie = m[1];
  }

  const csrfRes = await fetch(`${DRUPAL_API}/session/token`, { headers: { Cookie: cookie } });
  const csrfToken = csrfRes.ok ? await csrfRes.text() : "";

  return { cookie, csrfToken };
}

function writeHeaders(session) {
  return {
    Cookie: session.cookie,
    "X-CSRF-Token": session.csrfToken,
    "Content-Type": "application/vnd.api+json",
  };
}

// ── Creators ──────────────────────────────────────────────────────────────────

async function createStore(session, store) {
  const res = await fetch(`${DRUPAL_API}/jsonapi/commerce_store/online`, {
    method: "POST",
    headers: writeHeaders(session),
    body: JSON.stringify({
      data: {
        type: "commerce_store--online",
        attributes: {
          name: store.name,
          field_store_slug: store.slug,
          mail: store.email,
          timezone: "America/New_York",
          address: {
            country_code: "US",
            address_line1: "123 Main St",
            locality: "New York",
            administrative_area: "NY",
            postal_code: "10001",
          },
          field_store_status: "approved",
        },
        relationships: {
          default_currency: {
            data: { type: "commerce_currency--commerce_currency", id: USD_CURRENCY_UUID },
          },
        },
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Store creation failed for ${store.slug}: ${res.status} — ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.data.id;
}

async function createProfile(session, storeId, store) {
  const res = await fetch(`${DRUPAL_API}/jsonapi/node/creator_x_profile`, {
    method: "POST",
    headers: writeHeaders(session),
    body: JSON.stringify({
      data: {
        type: "node--creator_x_profile",
        attributes: {
          title: `${store.xUsername} X Profile`,
          field_x_username: store.xUsername,
          field_store_theme: store.theme,
          field_bio_description: { value: store.bio, format: "basic_html" },
          field_follower_count: Math.floor(Math.random() * 50000) + 1000,
        },
        relationships: {
          field_linked_store: {
            data: { type: "commerce_store--online", id: storeId },
          },
        },
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Profile creation failed for ${store.xUsername}: ${res.status} — ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.data.id;
}

async function createProduct(session, storeId, store) {
  const { title, description, price, type } = store.product;
  const bundle = type === "digital_download" ? "digital_download" : "default";
  const sku = `${store.slug}-seed-${Date.now()}`;

  // 1. Variation
  const varRes = await fetch(`${DRUPAL_API}/jsonapi/commerce_product_variation/${bundle}`, {
    method: "POST",
    headers: writeHeaders(session),
    body: JSON.stringify({
      data: {
        type: `commerce_product_variation--${bundle}`,
        attributes: {
          sku,
          price: { number: price, currency_code: "USD" },
          status: true,
        },
      },
    }),
  });
  if (!varRes.ok) {
    const text = await varRes.text();
    throw new Error(`Variation creation failed for ${title}: ${varRes.status} — ${text.slice(0, 300)}`);
  }
  const variationId = (await varRes.json()).data.id;

  // 2. Product
  const prodRes = await fetch(`${DRUPAL_API}/jsonapi/commerce_product/${bundle}`, {
    method: "POST",
    headers: writeHeaders(session),
    body: JSON.stringify({
      data: {
        type: `commerce_product--${bundle}`,
        attributes: {
          title,
          status: true,
          ...(bundle !== "digital_download" ? { body: { value: description, format: "basic_html" } } : {}),
          field_subscriber_only: false,
        },
        relationships: {
          stores: { data: [{ type: "commerce_store--online", id: storeId }] },
          variations: { data: [{ type: `commerce_product_variation--${bundle}`, id: variationId }] },
        },
      },
    }),
  });
  if (!prodRes.ok) {
    const text = await prodRes.text();
    throw new Error(`Product creation failed for ${title}: ${prodRes.status} — ${text.slice(0, 300)}`);
  }
  const productId = (await prodRes.json()).data.id;
  return { productId, variationId, sku };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔑 Logging in to Drupal…");
  const session = await getDrupalSession();
  console.log("✅ Authenticated\n");

  for (const store of STORES) {
    console.log(`━━━ ${store.name} (@${store.xUsername}) ━━━`);

    try {
      const storeId = await createStore(session, store);
      console.log(`  ✅ Store created — UUID: ${storeId}`);

      const profileId = await createProfile(session, storeId, store);
      console.log(`  ✅ Profile created — UUID: ${profileId}`);

      const { productId, sku } = await createProduct(session, storeId, store);
      console.log(`  ✅ Product "${store.product.title}" — UUID: ${productId} (SKU: ${sku})`);

      console.log(`  🔗 Store URL: https://${store.slug}.rareimagery.net`);
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    }

    console.log();
    // Small delay to avoid CSRF token race conditions
    await new Promise(r => setTimeout(r, 400));
  }

  console.log("✨ Seeding complete.");
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
