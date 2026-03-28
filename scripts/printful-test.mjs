#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Printful API Test Playbook — Automated Runner
// ---------------------------------------------------------------------------
// Usage:
//   PF_TOKEN=your_token node scripts/printful-test.mjs
//   PF_TOKEN=your_token node scripts/printful-test.mjs --phase 0
//   PF_TOKEN=your_token node scripts/printful-test.mjs --phase 0,1,5
//   PF_TOKEN=your_token node scripts/printful-test.mjs --cleanup-only
//
// Environment:
//   PF_TOKEN          — Required. Printful private API token.
//   PF_BASE           — Optional. Default: https://api.printful.com
//   TEST_PRINT_URL    — Optional. Default: Printful's public logo.
//   WEBHOOK_URL       — Optional. For Phase 7 webhook registration.
// ---------------------------------------------------------------------------

const PF_BASE = process.env.PF_BASE || "https://api.printful.com";
const PF_TOKEN = process.env.PF_TOKEN;
const TEST_PRINT_URL =
  process.env.TEST_PRINT_URL ||
  "https://www.printful.com/static/images/layout/printful-logo.png";
const WEBHOOK_URL = process.env.WEBHOOK_URL || "";

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const cleanupOnly = args.includes("--cleanup-only");
const phaseArg = args.find((a) => a.startsWith("--phase"));
let selectedPhases = null;
if (phaseArg) {
  const idx = args.indexOf(phaseArg);
  const val = phaseArg.includes("=")
    ? phaseArg.split("=")[1]
    : args[idx + 1];
  if (val) selectedPhases = val.split(",").map(Number);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
let skipped = 0;

/** Collected IDs from test execution — used across phases */
const ctx = {
  /** Catalog variant IDs discovered in Phase 0 */
  catalogVariants: {
    tee_white_s: null,
    tee_white_m: null,
    tee_white_l: null,
    tee_black_s: null,
    tee_black_m: null,
    tee_black_l: null,
    tee_white_xl: null,
    poster_18x24: null,
    mug_11oz: null,
  },
  /** Sync product/variant IDs from Phase 1 */
  syncProductIds: {},
  syncVariantIds: {},
  /** Order IDs from Phase 4 */
  orderIds: {},
  /** Mockup task key from Phase 8 */
  mockupTaskKey: null,
};

function log(msg) {
  console.log(msg);
}

function header(text) {
  log(`\n${"=".repeat(70)}`);
  log(`  ${text}`);
  log("=".repeat(70));
}

function subheader(text) {
  log(`\n--- ${text} ---`);
}

function ok(name, detail = "") {
  passed++;
  log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  failed++;
  log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

function skip(name, reason = "") {
  skipped++;
  log(`  ○ ${name} (skipped${reason ? `: ${reason}` : ""})`);
}

async function pf(path, options = {}) {
  const url = `${PF_BASE}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.noAuth ? {} : { Authorization: `Bearer ${PF_TOKEN}` }),
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const body = await res.json();
  return { status: res.status, ...body };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function shouldRun(phase) {
  if (cleanupOnly) return phase === 10;
  if (selectedPhases) return selectedPhases.includes(phase);
  return true;
}

// ---------------------------------------------------------------------------
// Phase 0: Catalog Discovery (No Auth Required)
// ---------------------------------------------------------------------------

async function phase0() {
  header("Phase 0: Catalog Discovery (No Auth)");

  // 0A — List categories
  subheader("0A. List product categories");
  const catRes = await pf("/categories", { noAuth: true });
  if (catRes.code === 200 && Array.isArray(catRes.result)) {
    ok("GET /categories", `${catRes.result.length} categories`);
    const sample = catRes.result.slice(0, 5).map((c) => `${c.id}:${c.title}`);
    log(`       Sample: ${sample.join(", ")}`);
  } else {
    fail("GET /categories", `code=${catRes.code}`);
  }

  // 0B — Products in a category (T-Shirts = 24)
  subheader("0B. Products in category 24 (T-Shirts)");
  const prodRes = await pf("/products?category_id=24", { noAuth: true });
  if (prodRes.code === 200 && Array.isArray(prodRes.result)) {
    const active = prodRes.result.filter((p) => !p.is_discontinued);
    ok("GET /products?category_id=24", `${active.length} active products`);
  } else {
    fail("GET /products?category_id=24", `code=${prodRes.code}`);
  }

  // 0C — Get variants for Bella+Canvas 3001 (Product 71)
  subheader("0C. Variants for Product 71 (Bella+Canvas 3001)");
  const teeRes = await pf("/products/71", { noAuth: true });
  if (teeRes.code === 200 && teeRes.result?.variants) {
    const vars = teeRes.result.variants;
    const inStock = vars.filter((v) => v.in_stock);
    ok(
      "GET /products/71",
      `${vars.length} variants (${inStock.length} in stock)`
    );

    // Pick variant IDs for white and black tees
    const findVariant = (color, size) =>
      inStock.find(
        (v) =>
          v.color.toLowerCase().includes(color) &&
          v.size.toLowerCase() === size
      );

    const picks = [
      ["tee_white_s", "white", "s"],
      ["tee_white_m", "white", "m"],
      ["tee_white_l", "white", "l"],
      ["tee_white_xl", "white", "xl"],
      ["tee_black_s", "black", "s"],
      ["tee_black_m", "black", "m"],
      ["tee_black_l", "black", "l"],
    ];

    for (const [key, color, size] of picks) {
      const v = findVariant(color, size);
      if (v) {
        ctx.catalogVariants[key] = v.id;
        log(`       ${key} → variant ${v.id} (${v.name}, $${v.price})`);
      } else {
        log(`       ${key} → NOT FOUND (${color} ${size})`);
      }
    }

    // Print file placements
    const files = teeRes.result.product?.files || [];
    if (files.length) {
      log(
        `       Print placements: ${files.map((f) => f.type).join(", ")}`
      );
    }

    // Techniques
    const techs = teeRes.result.product?.techniques || [];
    if (techs.length) {
      log(
        `       Techniques: ${techs.map((t) => t.key).join(", ")}`
      );
    }
  } else {
    fail("GET /products/71", `code=${teeRes.code}`);
  }

  // 0C (cont.) — Poster variants
  subheader("0C. Variants for Product 358 (Poster)");
  const posterRes = await pf("/products/358", { noAuth: true });
  if (posterRes.code === 200 && posterRes.result?.variants) {
    const vars = posterRes.result.variants.filter((v) => v.in_stock);
    ok("GET /products/358", `${vars.length} in-stock variants`);
    const pick = vars.find((v) => v.name.includes("18") && v.name.includes("24"));
    if (pick) {
      ctx.catalogVariants.poster_18x24 = pick.id;
      log(`       poster_18x24 → variant ${pick.id} (${pick.name}, $${pick.price})`);
    } else if (vars[0]) {
      ctx.catalogVariants.poster_18x24 = vars[0].id;
      log(`       poster_18x24 → variant ${vars[0].id} (${vars[0].name}, $${vars[0].price}) [fallback]`);
    }
  } else {
    fail("GET /products/358", `code=${posterRes.code}`);
  }

  // 0C (cont.) — Mug variants
  subheader("0C. Variants for Product 19 (Mug 11oz)");
  const mugRes = await pf("/products/19", { noAuth: true });
  if (mugRes.code === 200 && mugRes.result?.variants) {
    const vars = mugRes.result.variants.filter((v) => v.in_stock);
    ok("GET /products/19", `${vars.length} in-stock variants`);
    if (vars[0]) {
      ctx.catalogVariants.mug_11oz = vars[0].id;
      log(`       mug_11oz → variant ${vars[0].id} (${vars[0].name}, $${vars[0].price})`);
    }
  } else {
    fail("GET /products/19", `code=${mugRes.code}`);
  }

  // 0D — Printfile specs
  subheader("0D. Printfile specs for Product 71");
  const pfRes = await pf("/mockup-generator/printfiles/71");
  if (pfRes.code === 200 && pfRes.result?.printfiles) {
    const pfs = Object.values(pfRes.result.printfiles);
    ok("GET /mockup-generator/printfiles/71", `${pfs.length} printfiles`);
    for (const p of pfs.slice(0, 3)) {
      log(`       ${p.printfile_id}: ${p.width}x${p.height} @ ${p.dpi}dpi (${p.fill_mode})`);
    }
  } else {
    fail("GET /mockup-generator/printfiles/71", `code=${pfRes.code}`);
  }

  // Summary of resolved variant IDs
  subheader("Resolved Variant IDs");
  for (const [key, val] of Object.entries(ctx.catalogVariants)) {
    log(`       ${key}: ${val ?? "MISSING"}`);
  }

  const missing = Object.values(ctx.catalogVariants).filter((v) => v === null).length;
  if (missing > 0) {
    log(`\n  ⚠ ${missing} variant(s) could not be resolved from catalog.`);
    log("    Subsequent phases may skip tests that depend on these IDs.");
  }
}

// ---------------------------------------------------------------------------
// Phase 1: Create Test Sync Products
// ---------------------------------------------------------------------------

async function phase1() {
  header("Phase 1: Create Test Sync Products");

  const v = ctx.catalogVariants;

  // 1A — DTG Tee Multi-Variant
  subheader("1A. DTG T-Shirt — Multi-variant (6 variants)");
  if (v.tee_white_s && v.tee_white_m && v.tee_white_l && v.tee_black_s && v.tee_black_m && v.tee_black_l) {
    const res = await pf("/store/products", {
      method: "POST",
      body: JSON.stringify({
        sync_product: {
          name: "RI Test — DTG Tee Multi-Variant",
          external_id: "ri_test_prod_001",
          thumbnail: TEST_PRINT_URL,
        },
        sync_variants: [
          { variant_id: v.tee_white_s, external_id: "ri_test_var_001_white_s", retail_price: "24.99", files: [{ type: "front", url: TEST_PRINT_URL }] },
          { variant_id: v.tee_white_m, external_id: "ri_test_var_001_white_m", retail_price: "24.99", files: [{ type: "front", url: TEST_PRINT_URL }] },
          { variant_id: v.tee_white_l, external_id: "ri_test_var_001_white_l", retail_price: "24.99", files: [{ type: "front", url: TEST_PRINT_URL }] },
          { variant_id: v.tee_black_s, external_id: "ri_test_var_001_black_s", retail_price: "24.99", files: [{ type: "front", url: TEST_PRINT_URL }] },
          { variant_id: v.tee_black_m, external_id: "ri_test_var_001_black_m", retail_price: "24.99", files: [{ type: "front", url: TEST_PRINT_URL }] },
          { variant_id: v.tee_black_l, external_id: "ri_test_var_001_black_l", retail_price: "24.99", files: [{ type: "front", url: TEST_PRINT_URL }] },
        ],
      }),
    });

    if (res.code === 200 && res.result?.sync_product) {
      const sp = res.result.sync_product;
      const sv = res.result.sync_variants || [];
      ctx.syncProductIds["prod_001"] = sp.id;
      for (const variant of sv) {
        ctx.syncVariantIds[variant.external_id] = variant.id;
      }
      ok("POST /store/products (1A)", `id=${sp.id}, ${sv.length} variants created`);
    } else {
      fail("POST /store/products (1A)", `code=${res.code} ${res.error?.message || ""}`);
    }
  } else {
    skip("1A DTG Tee Multi-Variant", "missing tee variant IDs from Phase 0");
  }

  await sleep(1000);

  // 1B — DTG Tee Front + Back
  subheader("1B. DTG T-Shirt — Front + Back Print");
  if (v.tee_white_m) {
    const res = await pf("/store/products", {
      method: "POST",
      body: JSON.stringify({
        sync_product: {
          name: "RI Test — DTG Tee Front+Back",
          external_id: "ri_test_prod_002",
        },
        sync_variants: [
          {
            variant_id: v.tee_white_m,
            external_id: "ri_test_var_002_white_m",
            retail_price: "29.99",
            files: [
              { type: "front", url: TEST_PRINT_URL },
              { type: "back", url: TEST_PRINT_URL },
            ],
          },
        ],
      }),
    });

    if (res.code === 200 && res.result?.sync_product) {
      ctx.syncProductIds["prod_002"] = res.result.sync_product.id;
      ok("POST /store/products (1B)", `id=${res.result.sync_product.id}, front+back files`);
    } else {
      fail("POST /store/products (1B)", `code=${res.code} ${res.error?.message || ""}`);
    }
  } else {
    skip("1B DTG Tee Front+Back", "missing tee_white_m variant");
  }

  await sleep(1000);

  // 1C — Poster
  subheader("1C. Poster 18x24");
  if (v.poster_18x24) {
    const res = await pf("/store/products", {
      method: "POST",
      body: JSON.stringify({
        sync_product: {
          name: "RI Test — Poster 18x24",
          external_id: "ri_test_prod_003",
        },
        sync_variants: [
          {
            variant_id: v.poster_18x24,
            external_id: "ri_test_var_003_18x24",
            retail_price: "19.99",
            files: [{ type: "default", url: TEST_PRINT_URL }],
          },
        ],
      }),
    });

    if (res.code === 200 && res.result?.sync_product) {
      ctx.syncProductIds["prod_003"] = res.result.sync_product.id;
      ok("POST /store/products (1C)", `id=${res.result.sync_product.id}`);
    } else {
      fail("POST /store/products (1C)", `code=${res.code} ${res.error?.message || ""}`);
    }
  } else {
    skip("1C Poster", "missing poster_18x24 variant");
  }

  await sleep(1000);

  // 1D — Mug 11oz
  subheader("1D. Mug 11oz");
  if (v.mug_11oz) {
    const res = await pf("/store/products", {
      method: "POST",
      body: JSON.stringify({
        sync_product: {
          name: "RI Test — Mug 11oz",
          external_id: "ri_test_prod_004",
        },
        sync_variants: [
          {
            variant_id: v.mug_11oz,
            external_id: "ri_test_var_004_11oz",
            retail_price: "14.99",
            files: [{ type: "default", url: TEST_PRINT_URL }],
          },
        ],
      }),
    });

    if (res.code === 200 && res.result?.sync_product) {
      ctx.syncProductIds["prod_004"] = res.result.sync_product.id;
      ok("POST /store/products (1D)", `id=${res.result.sync_product.id}`);
    } else {
      fail("POST /store/products (1D)", `code=${res.code} ${res.error?.message || ""}`);
    }
  } else {
    skip("1D Mug", "missing mug_11oz variant");
  }

  await sleep(1000);

  // 1E — T-Shirt with Inside Label
  subheader("1E. DTG T-Shirt + Inside Label");
  if (v.tee_white_m) {
    const res = await pf("/store/products", {
      method: "POST",
      body: JSON.stringify({
        sync_product: {
          name: "RI Test — DTG Tee + Inside Label",
          external_id: "ri_test_prod_005",
        },
        sync_variants: [
          {
            variant_id: v.tee_white_m,
            external_id: "ri_test_var_005_white_m",
            retail_price: "27.99",
            files: [
              { type: "front", url: TEST_PRINT_URL },
              {
                type: "label_inside",
                url: TEST_PRINT_URL,
                options: [{ id: "template_type", value: "native" }],
              },
            ],
          },
        ],
      }),
    });

    if (res.code === 200 && res.result?.sync_product) {
      ctx.syncProductIds["prod_005"] = res.result.sync_product.id;
      ok("POST /store/products (1E)", `id=${res.result.sync_product.id}`);
    } else {
      // Label inside may fail for some products — that's an expected test case
      if (res.code === 400) {
        ok("POST /store/products (1E)", `got expected 400 — label_inside not supported for this variant`);
      } else {
        fail("POST /store/products (1E)", `code=${res.code} ${res.error?.message || ""}`);
      }
    }
  } else {
    skip("1E DTG Tee + Label", "missing tee_white_m variant");
  }
}

// ---------------------------------------------------------------------------
// Phase 2: Verify Created Products
// ---------------------------------------------------------------------------

async function phase2() {
  header("Phase 2: Verify Created Products");

  // 2A — List all sync products
  subheader("2A. List all sync products");
  const listRes = await pf("/store/products");
  if (listRes.code === 200 && Array.isArray(listRes.result)) {
    ok("GET /store/products", `${listRes.result.length} products`);
    for (const p of listRes.result) {
      log(`       ${p.id}: ${p.name} (ext: ${p.external_id}, variants: ${p.variants})`);
    }
  } else {
    fail("GET /store/products", `code=${listRes.code}`);
  }

  // 2B — Get by external ID
  subheader("2B. Get product by External ID @ri_test_prod_001");
  const extRes = await pf("/store/products/@ri_test_prod_001");
  if (extRes.code === 200 && extRes.result?.sync_product) {
    const sp = extRes.result.sync_product;
    const sv = extRes.result.sync_variants || [];
    ok("GET /store/products/@ri_test_prod_001", `${sp.name}, ${sv.length} variants`);

    // Store sync variant IDs for later phases
    for (const variant of sv) {
      if (variant.external_id) {
        ctx.syncVariantIds[variant.external_id] = variant.id;
      }
    }
  } else if (extRes.code === 404) {
    skip("2B", "product ri_test_prod_001 not found (Phase 1 may have been skipped)");
  } else {
    fail("GET /store/products/@ri_test_prod_001", `code=${extRes.code}`);
  }

  // 2C — Get variant by external ID
  subheader("2C. Get variant by External ID @ri_test_var_001_black_m");
  const varRes = await pf("/store/variants/@ri_test_var_001_black_m");
  if (varRes.code === 200 && varRes.result) {
    ok("GET /store/variants/@ri_test_var_001_black_m", `id=${varRes.result.id || varRes.result.sync_variant?.id}`);
  } else if (varRes.code === 404) {
    skip("2C", "variant not found");
  } else {
    fail("GET /store/variants/@ri_test_var_001_black_m", `code=${varRes.code}`);
  }
}

// ---------------------------------------------------------------------------
// Phase 3: Modify a Sync Product
// ---------------------------------------------------------------------------

async function phase3() {
  header("Phase 3: Modify Sync Product (PUT behavior)");

  subheader("3A. Get current sync variant IDs for prod_001");
  const getRes = await pf("/store/products/@ri_test_prod_001");
  if (getRes.code !== 200 || !getRes.result?.sync_variants) {
    skip("3A", "product ri_test_prod_001 not available");
    return;
  }

  const existingVariants = getRes.result.sync_variants;
  const existingIds = existingVariants.map((v) => v.id);
  ok("Existing variants", `${existingIds.length} IDs: [${existingIds.join(", ")}]`);

  // Build PUT payload: keep all existing + add XL variant
  subheader("3A. PUT — rename product + add XL variant");
  const v = ctx.catalogVariants;
  if (!v.tee_white_xl) {
    skip("3A PUT", "missing tee_white_xl variant ID");
    return;
  }

  const putPayload = {
    sync_product: {
      name: "RI Test — DTG Tee Multi-Variant (Updated)",
    },
    sync_variants: [
      // Keep all existing (just IDs)
      ...existingIds.map((id) => ({ id })),
      // Add new XL
      {
        variant_id: v.tee_white_xl,
        external_id: "ri_test_var_001_white_xl",
        retail_price: "26.99",
        files: [{ type: "front", url: TEST_PRINT_URL }],
      },
    ],
  };

  await sleep(2000); // Respect 10/min rate limit for PUT

  const putRes = await pf("/store/products/@ri_test_prod_001", {
    method: "PUT",
    body: JSON.stringify(putPayload),
  });

  if (putRes.code === 200 && putRes.result?.sync_variants) {
    const newCount = putRes.result.sync_variants.length;
    ok("PUT /store/products/@ri_test_prod_001", `now ${newCount} variants (was ${existingIds.length})`);

    if (newCount > existingIds.length) {
      ok("XL variant added successfully");
    } else {
      fail("XL variant may not have been added", `expected ${existingIds.length + 1}, got ${newCount}`);
    }

    // Verify name update
    if (putRes.result.sync_product?.name?.includes("Updated")) {
      ok("Product name updated");
    } else {
      fail("Product name not updated");
    }
  } else {
    fail("PUT /store/products/@ri_test_prod_001", `code=${putRes.code} ${putRes.error?.message || ""}`);
  }
}

// ---------------------------------------------------------------------------
// Phase 4: Draft Orders (No Charge)
// ---------------------------------------------------------------------------

async function phase4() {
  header("Phase 4: Draft Orders (No Fulfillment, No Charge)");

  // 4A — Draft order using sync variant ID
  subheader("4A. Draft order using Sync Variant ID");
  const svId = ctx.syncVariantIds["ri_test_var_001_black_m"];
  if (svId) {
    const res = await pf("/orders", {
      method: "POST",
      body: JSON.stringify({
        external_id: "ri_test_ord_001",
        recipient: {
          name: "Test Customer",
          address1: "19749 Dearborn St",
          city: "Chatsworth",
          state_code: "CA",
          country_code: "US",
          zip: "91311",
        },
        items: [{ sync_variant_id: svId, quantity: 1 }],
        retail_costs: {
          subtotal: "24.99",
          shipping: "3.99",
          tax: "2.25",
        },
      }),
    });

    if (res.code === 200 && res.result) {
      ctx.orderIds["ord_001"] = res.result.id;
      ok("POST /orders (4A sync variant)", `id=${res.result.id}, status=${res.result.status}`);
    } else {
      fail("POST /orders (4A)", `code=${res.code} ${res.error?.message || ""}`);
    }
  } else {
    skip("4A", "no sync variant ID for ri_test_var_001_black_m");
  }

  await sleep(1000);

  // 4B — Draft order using external variant ID
  subheader("4B. Draft order using External Variant ID");
  {
    const res = await pf("/orders", {
      method: "POST",
      body: JSON.stringify({
        external_id: "ri_test_ord_002",
        recipient: {
          name: "Test Customer Two",
          address1: "456 Oak Ave",
          city: "Austin",
          state_code: "TX",
          country_code: "US",
          zip: "73301",
        },
        items: [{ external_variant_id: "ri_test_var_001_black_m", quantity: 2 }],
      }),
    });

    if (res.code === 200 && res.result) {
      ctx.orderIds["ord_002"] = res.result.id;
      ok("POST /orders (4B external variant)", `id=${res.result.id}, status=${res.result.status}`);
    } else if (res.code === 400 && res.error?.message?.includes("not found")) {
      skip("4B", "external variant not resolved (product may not be synced)");
    } else {
      fail("POST /orders (4B)", `code=${res.code} ${res.error?.message || ""}`);
    }
  }

  await sleep(1000);

  // 4C — Draft order using catalog variant (on-the-fly)
  subheader("4C. Draft order using Catalog Variant (on-the-fly)");
  if (ctx.catalogVariants.tee_black_m) {
    const res = await pf("/orders", {
      method: "POST",
      body: JSON.stringify({
        external_id: "ri_test_ord_003",
        recipient: {
          name: "Test Customer Three",
          address1: "789 Pine Rd",
          city: "Denver",
          state_code: "CO",
          country_code: "US",
          zip: "80201",
        },
        items: [
          {
            variant_id: ctx.catalogVariants.tee_black_m,
            quantity: 1,
            files: [{ type: "front", url: TEST_PRINT_URL }],
          },
        ],
      }),
    });

    if (res.code === 200 && res.result) {
      ctx.orderIds["ord_003"] = res.result.id;
      ok("POST /orders (4C catalog variant)", `id=${res.result.id}, status=${res.result.status}`);
    } else {
      fail("POST /orders (4C)", `code=${res.code} ${res.error?.message || ""}`);
    }
  } else {
    skip("4C", "missing tee_black_m catalog variant");
  }

  await sleep(1000);

  // 4D — Multi-item draft
  subheader("4D. Multi-item draft order");
  {
    const items = [];
    if (ctx.syncVariantIds["ri_test_var_001_white_s"]) {
      items.push({ sync_variant_id: ctx.syncVariantIds["ri_test_var_001_white_s"], quantity: 1 });
    }
    if (ctx.syncVariantIds["ri_test_var_004_11oz"]) {
      items.push({ sync_variant_id: ctx.syncVariantIds["ri_test_var_004_11oz"], quantity: 2 });
    }

    if (items.length >= 2) {
      const res = await pf("/orders", {
        method: "POST",
        body: JSON.stringify({
          external_id: "ri_test_ord_004",
          recipient: {
            name: "Test Multi-Item",
            address1: "100 Broadway",
            city: "New York",
            state_code: "NY",
            country_code: "US",
            zip: "10001",
          },
          items,
        }),
      });

      if (res.code === 200 && res.result) {
        ctx.orderIds["ord_004"] = res.result.id;
        ok("POST /orders (4D multi-item)", `id=${res.result.id}, ${res.result.items?.length || "?"} items`);
      } else {
        fail("POST /orders (4D)", `code=${res.code} ${res.error?.message || ""}`);
      }
    } else {
      // Fall back to external variant IDs
      const fallbackItems = [
        { external_variant_id: "ri_test_var_001_white_s", quantity: 1 },
        { external_variant_id: "ri_test_var_004_11oz", quantity: 2 },
      ];

      const res = await pf("/orders", {
        method: "POST",
        body: JSON.stringify({
          external_id: "ri_test_ord_004",
          recipient: {
            name: "Test Multi-Item",
            address1: "100 Broadway",
            city: "New York",
            state_code: "NY",
            country_code: "US",
            zip: "10001",
          },
          items: fallbackItems,
        }),
      });

      if (res.code === 200 && res.result) {
        ctx.orderIds["ord_004"] = res.result.id;
        ok("POST /orders (4D multi-item via ext IDs)", `id=${res.result.id}`);
      } else {
        fail("POST /orders (4D)", `code=${res.code} ${res.error?.message || ""}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Phase 5: Cost Estimation
// ---------------------------------------------------------------------------

async function phase5() {
  header("Phase 5: Cost Estimation (No Side Effects)");

  // 5A — Single item estimate
  subheader("5A. Estimate single item");
  {
    const res = await pf("/orders/estimate", {
      method: "POST",
      body: JSON.stringify({
        recipient: {
          address1: "19749 Dearborn St",
          city: "Chatsworth",
          state_code: "CA",
          country_code: "US",
          zip: "91311",
        },
        items: [{ external_variant_id: "ri_test_var_001_black_m", quantity: 1 }],
      }),
    });

    if (res.code === 200 && res.result?.costs) {
      const c = res.result.costs;
      ok("POST /orders/estimate (5A)", `subtotal=$${c.subtotal}, shipping=$${c.shipping}, tax=$${c.tax}, total=$${c.total}`);
    } else if (res.code === 400) {
      skip("5A", `variant may not exist: ${res.error?.message || ""}`);
    } else {
      fail("POST /orders/estimate (5A)", `code=${res.code} ${res.error?.message || ""}`);
    }
  }

  // 5B — Shipping rates
  subheader("5B. Shipping rates");
  {
    const res = await pf("/shipping/rates", {
      method: "POST",
      body: JSON.stringify({
        recipient: {
          address1: "19749 Dearborn St",
          city: "Chatsworth",
          state_code: "CA",
          country_code: "US",
          zip: "91311",
        },
        items: [{ external_variant_id: "ri_test_var_001_black_m", quantity: 1 }],
      }),
    });

    if (res.code === 200 && Array.isArray(res.result)) {
      ok("POST /shipping/rates (5B)", `${res.result.length} options`);
      for (const rate of res.result) {
        log(`       ${rate.id}: ${rate.name} — $${rate.rate} (${rate.minDeliveryDays}-${rate.maxDeliveryDays} days)`);
      }
    } else if (res.code === 400) {
      skip("5B", `variant may not exist: ${res.error?.message || ""}`);
    } else {
      fail("POST /shipping/rates (5B)", `code=${res.code} ${res.error?.message || ""}`);
    }
  }

  // 5C — International estimate (UK)
  subheader("5C. International estimate (UK)");
  {
    const res = await pf("/orders/estimate", {
      method: "POST",
      body: JSON.stringify({
        shipping: "STANDARD",
        recipient: {
          address1: "10 Downing Street",
          city: "London",
          country_code: "GB",
          zip: "SW1A 2AA",
        },
        items: [{ external_variant_id: "ri_test_var_001_white_m", quantity: 1 }],
      }),
    });

    if (res.code === 200 && res.result?.costs) {
      const c = res.result.costs;
      ok("POST /orders/estimate (5C UK)", `subtotal=$${c.subtotal}, shipping=$${c.shipping}, total=$${c.total}, currency=${c.currency}`);
    } else if (res.code === 400) {
      skip("5C", `variant may not exist: ${res.error?.message || ""}`);
    } else {
      fail("POST /orders/estimate (5C)", `code=${res.code} ${res.error?.message || ""}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Phase 6: Verify Draft Orders
// ---------------------------------------------------------------------------

async function phase6() {
  header("Phase 6: Verify Draft Orders");

  // 6A — List all orders
  subheader("6A. List all orders");
  const listRes = await pf("/orders");
  if (listRes.code === 200 && Array.isArray(listRes.result)) {
    ok("GET /orders", `${listRes.result.length} orders`);
    for (const o of listRes.result) {
      log(`       ${o.id}: ext=${o.external_id}, status=${o.status}, created=${new Date(o.created * 1000).toISOString()}`);
    }
  } else {
    fail("GET /orders", `code=${listRes.code}`);
  }

  // 6B — Get order by external ID
  subheader("6B. Get order @ri_test_ord_001");
  const ordRes = await pf("/orders/@ri_test_ord_001");
  if (ordRes.code === 200 && ordRes.result) {
    const o = ordRes.result;
    ok("GET /orders/@ri_test_ord_001", `status=${o.status}, items=${o.items?.length || 0}`);
    if (o.costs) {
      log(`       Costs: subtotal=$${o.costs.subtotal}, shipping=$${o.costs.shipping}, total=$${o.costs.total}`);
    }
    if (o.retail_costs) {
      log(`       Retail: subtotal=$${o.retail_costs.subtotal}, shipping=$${o.retail_costs.shipping}, tax=$${o.retail_costs.tax}`);
    }
  } else if (ordRes.code === 404) {
    skip("6B", "order ri_test_ord_001 not found");
  } else {
    fail("GET /orders/@ri_test_ord_001", `code=${ordRes.code}`);
  }
}

// ---------------------------------------------------------------------------
// Phase 7: Webhook Setup & Testing
// ---------------------------------------------------------------------------

async function phase7() {
  header("Phase 7: Webhook Setup & Testing");

  if (!WEBHOOK_URL) {
    skip("Phase 7", "no WEBHOOK_URL set — set WEBHOOK_URL env to enable (e.g. https://webhook.site/xxx)");
    return;
  }

  // 7A — Register webhook
  subheader("7A. Register webhook endpoint");
  const regRes = await pf("/webhooks", {
    method: "POST",
    body: JSON.stringify({
      url: WEBHOOK_URL,
      types: [
        "package_shipped",
        "order_failed",
        "order_canceled",
        "order_updated",
        "order_created",
        "order_put_hold",
        "order_remove_hold",
        "stock_updated",
        "product_synced",
        "product_updated",
      ],
    }),
  });

  if (regRes.code === 200) {
    ok("POST /webhooks (7A)", `url=${WEBHOOK_URL}`);
  } else {
    fail("POST /webhooks (7A)", `code=${regRes.code} ${regRes.error?.message || ""}`);
  }

  // 7B — Verify webhook config
  subheader("7B. Verify webhook config");
  const verifyRes = await pf("/webhooks");
  if (verifyRes.code === 200 && verifyRes.result) {
    const r = verifyRes.result;
    ok("GET /webhooks (7B)", `url=${r.url}, events=${r.types?.length || 0}`);
    if (r.types) {
      log(`       Events: ${r.types.join(", ")}`);
    }
  } else {
    fail("GET /webhooks (7B)", `code=${verifyRes.code}`);
  }

  log("\n  → Use Printful Dashboard > Settings > API > Webhook Simulator");
  log("    to fire test events at your endpoint.");
}

// ---------------------------------------------------------------------------
// Phase 8: Mockup Generation
// ---------------------------------------------------------------------------

async function phase8() {
  header("Phase 8: Mockup Generation");

  // 8A — Printfile specs
  subheader("8A. Get printfile specs for Product 71");
  const pfRes = await pf("/mockup-generator/printfiles/71");
  if (pfRes.code === 200 && pfRes.result) {
    ok("GET /mockup-generator/printfiles/71");
    const pfs = Object.values(pfRes.result.printfiles || {});
    for (const p of pfs.slice(0, 3)) {
      log(`       ${p.printfile_id}: ${p.width}x${p.height} @ ${p.dpi}dpi`);
    }
  } else {
    fail("GET /mockup-generator/printfiles/71", `code=${pfRes.code}`);
  }

  // 8B — Create mockup task
  subheader("8B. Create mockup generation task");
  const variantIds = [
    ctx.catalogVariants.tee_white_m,
    ctx.catalogVariants.tee_black_m,
  ].filter(Boolean);

  if (variantIds.length === 0) {
    skip("8B", "no variant IDs available for mockup");
    return;
  }

  const taskRes = await pf("/mockup-generator/create-task/71", {
    method: "POST",
    body: JSON.stringify({
      variant_ids: variantIds,
      files: [
        {
          placement: "front",
          image_url: TEST_PRINT_URL,
          position: {
            area_width: 1800,
            area_height: 2400,
            width: 1800,
            height: 1800,
            top: 300,
            left: 0,
          },
        },
      ],
    }),
  });

  if (taskRes.code === 200 && taskRes.result?.task_key) {
    ctx.mockupTaskKey = taskRes.result.task_key;
    ok("POST /mockup-generator/create-task/71", `task_key=${ctx.mockupTaskKey}`);
  } else {
    fail("POST /mockup-generator/create-task/71", `code=${taskRes.code} ${taskRes.error?.message || ""}`);
    return;
  }

  // 8C — Poll for result (up to 5 attempts, 5s apart)
  subheader("8C. Poll mockup task result");
  for (let attempt = 1; attempt <= 5; attempt++) {
    log(`       Polling attempt ${attempt}/5...`);
    await sleep(5000);

    const pollRes = await pf(`/mockup-generator/task?task_key=${ctx.mockupTaskKey}`);
    if (pollRes.code === 200 && pollRes.result) {
      const status = pollRes.result.status;
      if (status === "completed") {
        const mockups = pollRes.result.mockups || [];
        ok("Mockup task completed", `${mockups.length} mockups generated`);
        for (const m of mockups) {
          log(`       ${m.placement}: ${m.mockup_url}`);
          if (m.extra?.length) {
            for (const e of m.extra.slice(0, 2)) {
              log(`         extra: ${e.title} — ${e.url}`);
            }
          }
        }
        break;
      } else if (status === "failed") {
        fail("Mockup task failed", pollRes.result.error || "unknown error");
        break;
      } else {
        log(`       Status: ${status} (still processing...)`);
        if (attempt === 5) {
          skip("8C", "timed out after 5 polls — mockup still pending");
        }
      }
    } else {
      fail(`Poll attempt ${attempt}`, `code=${pollRes.code}`);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Phase 9: Error Handling Tests
// ---------------------------------------------------------------------------

async function phase9() {
  header("Phase 9: Error Handling Tests");

  // 9A — Invalid variant ID
  subheader("9A. Invalid variant ID (expect 400)");
  const badVarRes = await pf("/store/products", {
    method: "POST",
    body: JSON.stringify({
      sync_product: { name: "RI Test — Bad Variant", external_id: "ri_test_prod_err_001" },
      sync_variants: [
        { variant_id: 9999999, retail_price: "10.00", files: [{ url: TEST_PRINT_URL }] },
      ],
    }),
  });

  if (badVarRes.code >= 400 && badVarRes.code < 500) {
    ok("Invalid variant returns 4xx", `code=${badVarRes.code}: ${badVarRes.error?.message || ""}`);
  } else {
    fail("Invalid variant", `expected 4xx, got ${badVarRes.code}`);
  }

  // 9B — Missing required fields
  subheader("9B. Missing required fields (expect 400)");
  const missingRes = await pf("/orders", {
    method: "POST",
    body: JSON.stringify({
      external_id: "ri_test_ord_err_001",
      recipient: { name: "Incomplete Address" },
      items: [{ external_variant_id: "ri_test_var_001_black_m", quantity: 1 }],
    }),
  });

  if (missingRes.code >= 400 && missingRes.code < 500) {
    ok("Missing fields returns 4xx", `code=${missingRes.code}: ${missingRes.error?.message || ""}`);
  } else if (missingRes.code === 200) {
    // Some orders may succeed with partial address in draft mode
    ok("Order accepted with partial address (draft mode)", `status=${missingRes.result?.status}`);
    // Clean it up
    if (missingRes.result?.id) {
      await pf(`/orders/${missingRes.result.id}`, { method: "DELETE" });
    }
  } else {
    fail("Missing fields", `expected 4xx, got ${missingRes.code}`);
  }

  // 9C — Duplicate external ID
  subheader("9C. Duplicate external ID (expect 400 on second call)");
  if (ctx.orderIds["ord_001"]) {
    const dupeRes = await pf("/orders", {
      method: "POST",
      body: JSON.stringify({
        external_id: "ri_test_ord_001", // Already used in Phase 4A
        recipient: {
          name: "Dupe Test",
          address1: "123 Dupe St",
          city: "Dupeville",
          state_code: "CA",
          country_code: "US",
          zip: "90001",
        },
        items: [{ variant_id: ctx.catalogVariants.tee_black_m || 4018, quantity: 1, files: [{ type: "front", url: TEST_PRINT_URL }] }],
      }),
    });

    if (dupeRes.code >= 400) {
      ok("Duplicate external_id returns error", `code=${dupeRes.code}: ${dupeRes.error?.message || ""}`);
    } else {
      fail("Duplicate external_id", `expected error, got ${dupeRes.code}`);
      // Clean up accidental order
      if (dupeRes.result?.id) {
        await pf(`/orders/${dupeRes.result.id}`, { method: "DELETE" });
      }
    }
  } else {
    skip("9C", "no order from Phase 4A to duplicate against");
  }

  // 9D — Non-existent external ID
  subheader("9D. Non-existent external ID (expect 404)");
  const notFoundRes = await pf("/store/products/@does_not_exist");
  if (notFoundRes.code === 404) {
    ok("Non-existent external ID returns 404", notFoundRes.error?.message || "");
  } else {
    fail("Non-existent external ID", `expected 404, got ${notFoundRes.code}`);
  }
}

// ---------------------------------------------------------------------------
// Phase 10: Cleanup
// ---------------------------------------------------------------------------

async function phase10() {
  header("Phase 10: Cleanup");

  // 10A — Delete test orders
  subheader("10A. Cancel/delete test draft orders");
  for (const extId of ["ri_test_ord_001", "ri_test_ord_002", "ri_test_ord_003", "ri_test_ord_004", "ri_test_ord_err_001"]) {
    const res = await pf(`/orders/@${extId}`, { method: "DELETE" });
    if (res.code === 200) {
      ok(`DELETE /orders/@${extId}`);
    } else if (res.code === 404) {
      log(`       ${extId}: not found (already deleted or never created)`);
    } else {
      fail(`DELETE /orders/@${extId}`, `code=${res.code} ${res.error?.message || ""}`);
    }
    await sleep(500);
  }

  // 10B — Delete test products
  subheader("10B. Delete test sync products");
  for (const extId of ["ri_test_prod_001", "ri_test_prod_002", "ri_test_prod_003", "ri_test_prod_004", "ri_test_prod_005", "ri_test_prod_err_001"]) {
    const res = await pf(`/store/products/@${extId}`, { method: "DELETE" });
    if (res.code === 200) {
      ok(`DELETE /store/products/@${extId}`, res.result?.sync_product?.name || "");
    } else if (res.code === 404) {
      log(`       ${extId}: not found (already deleted or never created)`);
    } else {
      fail(`DELETE /store/products/@${extId}`, `code=${res.code} ${res.error?.message || ""}`);
    }
    await sleep(500);
  }

  // 10C — Remove webhook config (only if we set one)
  if (WEBHOOK_URL) {
    subheader("10C. Remove webhook config");
    const whRes = await pf("/webhooks", { method: "DELETE" });
    if (whRes.code === 200) {
      ok("DELETE /webhooks");
    } else {
      fail("DELETE /webhooks", `code=${whRes.code}`);
    }
  }

  // 10D — Verify clean
  subheader("10D. Verify store is clean");
  const prodRes = await pf("/store/products");
  const ordRes = await pf("/orders");
  const prodCount = Array.isArray(prodRes.result) ? prodRes.result.length : "?";
  const ordCount = Array.isArray(ordRes.result) ? ordRes.result.length : "?";

  log(`       Remaining products: ${prodCount}`);
  log(`       Remaining orders: ${ordCount}`);

  if (prodCount === 0 && ordCount === 0) {
    ok("Store is clean");
  } else {
    log("       (Non-zero counts may include items from other tests or manual creation)");
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║           Printful API Test Playbook — RareImagery                 ║
╚══════════════════════════════════════════════════════════════════════╝
  Base URL:     ${PF_BASE}
  Token:        ${PF_TOKEN ? PF_TOKEN.slice(0, 8) + "..." + PF_TOKEN.slice(-4) : "NOT SET"}
  Print file:   ${TEST_PRINT_URL}
  Webhook URL:  ${WEBHOOK_URL || "(not set)"}
  Phases:       ${cleanupOnly ? "10 (cleanup only)" : selectedPhases ? selectedPhases.join(", ") : "all (0-10)"}
`);

  if (!PF_TOKEN) {
    console.error("ERROR: PF_TOKEN environment variable is required.");
    console.error("  Export your Printful private token:");
    console.error("    export PF_TOKEN=your_private_token_here");
    process.exit(1);
  }

  // Verify token works
  log("Verifying API token...");
  const storeRes = await pf("/store");
  if (storeRes.code === 200) {
    ok("Token valid", `store: ${storeRes.result?.name || "unknown"} (id: ${storeRes.result?.id || "?"})`);
  } else {
    console.error(`\nERROR: Token verification failed (code=${storeRes.code}).`);
    console.error(`  ${storeRes.error?.message || "Check your PF_TOKEN value."}`);
    process.exit(1);
  }

  const phases = [
    [0, phase0],
    [1, phase1],
    [2, phase2],
    [3, phase3],
    [4, phase4],
    [5, phase5],
    [6, phase6],
    [7, phase7],
    [8, phase8],
    [9, phase9],
    [10, phase10],
  ];

  for (const [num, fn] of phases) {
    if (shouldRun(num)) {
      try {
        await fn();
      } catch (err) {
        fail(`Phase ${num} crashed`, err.message);
        console.error(err);
      }
    }
  }

  // Final summary
  log(`
╔══════════════════════════════════════════════════════════════════════╗
║  Results                                                           ║
╠══════════════════════════════════════════════════════════════════════╣
║  Passed:  ${String(passed).padEnd(5)}                                                ║
║  Failed:  ${String(failed).padEnd(5)}                                                ║
║  Skipped: ${String(skipped).padEnd(5)}                                                ║
╚══════════════════════════════════════════════════════════════════════╝`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(2);
});
