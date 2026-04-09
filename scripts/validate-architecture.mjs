#!/usr/bin/env node
/**
 * PERFECT_STORE_ON_X_ARCHITECTURE Validation Suite
 * 
 * Validates that core architecture flows are properly implemented.
 * This is a static analysis + sanity check script, not a full integration test.
 * 
 * Usage:
 *   node scripts/validate-architecture.mjs
 *   node scripts/validate-architecture.mjs --verbose
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VERBOSE = process.argv.includes("--verbose");

// ─────────────────────────────────────────────────────────────────────────
// Test Results
// ─────────────────────────────────────────────────────────────────────────

let results = {
  passed: [],
  failed: [],
  warnings: [],
};

function pass(name, detail) {
  results.passed.push({ name, detail });
  console.log(`✓ ${name}`);
  if (VERBOSE && detail) console.log(`  → ${detail}`);
}

function fail(name, reason) {
  results.failed.push({ name, reason });
  console.log(`✗ ${name}`);
  console.log(`  ERROR: ${reason}`);
}

function warn(name, reason) {
  results.warnings.push({ name, reason });
  console.log(`⚠ ${name}`);
  console.log(`  WARNING: ${reason}`);
}

function info(msg) {
  if (VERBOSE) console.log(`ℹ ${msg}`);
}

// ─────────────────────────────────────────────────────────────────────────
// File utilities
// ─────────────────────────────────────────────────────────────────────────

function fileExists(p) {
  return fs.existsSync(p);
}

function readFile(p) {
  return fs.readFileSync(p, "utf8");
}

function findFiles(pattern) {
  const globToRegex = (glob) => {
    let pattern = glob
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, "[^/]*")
      .replace(/\*\*/g, ".*");
    return new RegExp(`^${pattern}$`);
  };

  const regex = globToRegex(pattern);
  const results = [];

  function traverse(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const relPath = path.relative(ROOT, fullPath);

      if (fs.statSync(fullPath).isDirectory()) {
        if (
          file !== "node_modules" &&
          file !== ".next" &&
          file !== ".git" &&
          file !== ".vercel"
        ) {
          traverse(fullPath);
        }
      } else if (regex.test(relPath)) {
        results.push(relPath);
      }
    }
  }

  traverse(ROOT);
  return results;
}

function containsText(p, text) {
  try {
    const content = readFile(p);
    return content.includes(text);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Validation Suites
// ─────────────────────────────────────────────────────────────────────────

console.log("🔍 PERFECT_STORE_ON_X_ARCHITECTURE Validation Suite\n");

// ─ 1. Documentation
console.log("[1] Documentation Files");
const docFiles = [
  "PERFECT_STORE_ON_X_ARCHITECTURE.md",
  "PERFECT_STORE_ON_X_ARCHITECTURE_IMPLEMENTATION_MAP.md",
];

for (const file of docFiles) {
  const p = path.join(ROOT, "..", file);
  if (fileExists(p)) {
    const size = fs.statSync(p).size;
    pass(`${file}`, `${(size / 1024).toFixed(1)}KB`);
  } else {
    fail(`${file}`, "Missing architecture documentation");
  }
}

// ─ 2. Core Routing
console.log("\n[2] Routing & Subdomain Resolve");

if (fileExists(path.join(ROOT, "src/proxy.ts"))) {
  pass("proxy.ts exists", "Subdomain rewrite middleware");
  const proxy = readFile(path.join(ROOT, "src/proxy.ts"));
  if (proxy.includes("RESERVED_SUBDOMAINS")) {
    pass("Reserved subdomains config", "✓ Configured");
  } else {
    fail("Reserved subdomains", "Not found in proxy.ts");
  }
} else {
  fail("proxy.ts", "Subdomain routing middleware missing");
}

if (fileExists(path.join(ROOT, "src/app/stores/[creator]/page.tsx"))) {
  pass("Creator storefront page", "[creator]/page.tsx");
} else {
  fail("Creator storefront", "[creator]/page.tsx missing");
}

// ─ 3. Auth
console.log("\n[3] Authentication & Identity");

const authPath = path.join(ROOT, "src/lib/auth.ts");
if (fileExists(authPath)) {
  pass("auth.ts exists", "NextAuth config");
  const auth = readFile(authPath);
  if (
    auth.includes("TwitterProvider") &&
    auth.includes("CredentialsProvider")
  ) {
    pass("Multi-auth providers", "X OAuth 2.0 + Credentials");
  } else {
    fail("Auth providers", "Missing expected providers");
  }
  if (auth.includes("syncXDataToDrupal")) {
    pass("X sync on login", "Auto-provisioning enabled");
  } else {
    warn("X sync on login", "No auto-sync found");
  }
} else {
  fail("auth.ts", "Missing authentication configuration");
}

// ─ 4. Store Lifecycle
console.log("\n[4] Store Lifecycle Flows");

const storeRoutes = [
  "src/app/api/stores/create/route.ts",
  "src/app/api/stores/provision/route.ts",
  "src/app/api/stores/approve/route.ts",
];

for (const route of storeRoutes) {
  const p = path.join(ROOT, route);
  if (fileExists(p)) {
    const routeName = route.split("/").slice(-2, -1)[0];
    pass(`POST /api/stores/${routeName}`, "Route handler present");
  } else {
    fail(`/api/stores/${route.split("/").slice(-2, -1)[0]}`, "Handler missing");
  }
}

// ─ 5. Payments
console.log("\n[5] Payment Processing");

const checkoutPath = path.join(ROOT, "src/app/api/checkout/route.ts");
if (fileExists(checkoutPath)) {
  pass("Store setup checkout", "POST /api/checkout");
  const checkout = readFile(checkoutPath);
  if (checkout.includes("stripe")) {
    pass("Stripe integration", "Checkout handler uses Stripe");
  }
}

const webhookPath = path.join(ROOT, "src/app/api/webhooks/stripe/route.ts");
if (fileExists(webhookPath)) {
  pass("Stripe webhook handler", "POST /api/webhooks/stripe");
  const webhook = readFile(webhookPath);
  if (
    webhook.includes("checkout.session.completed") &&
    webhook.includes("customer.subscription.deleted")
  ) {
    pass("Webhook events", "Both setup + subscription paths");
  }
} else {
  fail("Stripe webhook", "Handler missing");
}

// ─ 6. AI Integration
console.log("\n[6] AI Architecture");

const aiFiles = {
  "src/lib/ai/generate-site.ts": "Dual-AI generation (Grok + Claude)",
  "src/app/api/chat/route.ts": "Interactive builder chat",
  "src/app/api/site/generate/route.ts": "Site generation endpoint",
};

for (const [file, desc] of Object.entries(aiFiles)) {
  const p = path.join(ROOT, file);
  if (fileExists(p)) {
    pass(`AI: ${desc}`, file);
  } else {
    fail(`AI: ${desc}`, `${file} missing`);
  }
}

// ─ 7. X Integration
console.log("\n[7] X API Integration");

const xFiles = {
  "src/lib/x-api/client.ts": "X API client",
  "src/lib/x-import.ts": "X profile import",
  "src/app/api/proxy/x-feed/[userId]/route.ts": "X feed proxy",
  "src/app/api/webhooks/x/route.ts": "X webhooks",
};

for (const [file, desc] of Object.entries(xFiles)) {
  const p = path.join(ROOT, file);
  if (fileExists(p)) {
    pass(`X: ${desc}`, file);
  } else {
    fail(`X: ${desc}`, `${file} missing`);
  }
}

// ─ 8. Drupal Integration
console.log("\n[8] Drupal Backend Integration");

const drupalPath = path.join(ROOT, "src/lib/drupal.ts");
if (fileExists(drupalPath)) {
  const drupal = readFile(drupalPath);
  pass("Drupal client", "src/lib/drupal.ts");

  if (drupal.includes("drupalAuthHeaders")) {
    pass("Read auth (Basic)", "drupalAuthHeaders defined");
  } else {
    fail("Read auth", "drupalAuthHeaders undefined");
  }

  if (drupal.includes("drupalWriteHeaders")) {
    pass("Write auth (Cookie+CSRF)", "drupalWriteHeaders defined");
  } else {
    fail("Write auth", "drupalWriteHeaders undefined");
  }
} else {
  fail("Drupal client", "src/lib/drupal.ts missing");
}

// ─ 9. Fulfillment
console.log("\n[9] Fulfillment Integration");

const printfulWebhook = path.join(
  ROOT,
  "src/app/api/printful/webhook/route.ts"
);
if (fileExists(printfulWebhook)) {
  const webhook = readFile(printfulWebhook);
  pass("Printful webhook", "Handler present");

  const events = [
    "package_shipped",
    "order_failed",
    "order_updated",
    "stock_updated",
  ];
  const handled = events.filter((e) => webhook.includes(e));
  if (handled.length >= 3) {
    pass(`Webhook events`, `${handled.length}/${events.length} types handled`);
  } else {
    warn("Webhook events", `Only ${handled.length}/${events.length} types`);
  }
} else {
  fail("Printful webhook", "Handler missing");
}

// ─ 10. Cron & Health
console.log("\n[10] Scheduled Operations");

if (fileExists(path.join(ROOT, "src/app/api/cron/frontend-agent/route.ts"))) {
  pass("Frontend cron agent", "30-minute intervals");
}
if (fileExists(path.join(ROOT, "src/app/api/cron/api-agent/route.ts"))) {
  pass("API health agent", "6-hour intervals");
}
if (fileExists(path.join(ROOT, "src/app/api/cron/site-generate-agent/route.ts"))) {
  pass("Site generate agent", "5-hour intervals");
}
if (fileExists(path.join(ROOT, "src/app/api/cron/drupal-api-path-agent/route.ts"))) {
  pass("Drupal/API path agent", "5-hour intervals");
}

// ─ 11. Configuration
console.log("\n[11] Environment & Security");

if (fileExists(path.join(ROOT, ".env.example"))) {
  pass(".env.example", "Template exists");
}

if (fileExists(path.join(ROOT, ".env.local"))) {
  warn(
    ".env.local",
    "Local environment file present (ensure not in git)"
  );
}

const nextConfigPath = path.join(ROOT, "next.config.ts");
if (fileExists(nextConfigPath)) {
  const nextConfig = readFile(nextConfigPath);
  if (nextConfig.includes("remotePatterns")) {
    pass("Next.js image security", "remotePatterns configured");
  }
  if (nextConfig.includes("Strict-Transport-Security")) {
    pass("Security headers", "HSTS configured");
  }
} else {
  fail("Next config", "next.config.ts missing");
}

// ─ 12. Type Safety
console.log("\n[12] Type Safety");

if (fileExists(path.join(ROOT, "tsconfig.json"))) {
  const tsconfig = readFile(path.join(ROOT, "tsconfig.json"));
  const json = JSON.parse(tsconfig);
  if (json.compilerOptions?.strict) {
    pass("TypeScript strict mode", "Enabled");
  } else {
    warn("TypeScript strict mode", "Not enabled");
  }
}

// ─ 13. Rate Limiting & Protection
console.log("\n[13] Rate Limiting & Anti-Abuse");

const rateLimitPath = path.join(ROOT, "src/lib/rate-limit.ts");
if (fileExists(rateLimitPath)) {
  pass("Rate limiter utility", "src/lib/rate-limit.ts");
  const rl = readFile(rateLimitPath);
  if (rl.includes("createRateLimiter")) {
    pass("Rate limit factory", "createRateLimiter exported");
  }
} else {
  warn("Rate limiting", "src/lib/rate-limit.ts not found");
}

// ─ 14. Route Inventory
console.log("\n[14] API Route Inventory");

const apiRoutes = findFiles("src/app/api/*/route.ts");
const deepRoutes = findFiles("src/app/api/*/*/route.ts");
const allRoutes = [...new Set([...apiRoutes, ...deepRoutes])];

const routesByCategory = {
  auth: allRoutes.filter((r) => r.includes("/auth/")),
  stores: allRoutes.filter((r) => r.includes("/stores/")),
  checkout: allRoutes.filter((r) => r.includes("/checkout")),
  social: allRoutes.filter((r) => r.includes("/social/")),
  printful: allRoutes.filter((r) => r.includes("/printful/")),
  webhooks: allRoutes.filter((r) => r.includes("/webhooks/")),
  cron: allRoutes.filter((r) => r.includes("/cron/")),
};

pass(`API routes inventory`, `${allRoutes.length} routes found`);

for (const [cat, routes] of Object.entries(routesByCategory)) {
  if (routes.length > 0) {
    info(`  ${cat}: ${routes.length} routes`);
  }
}

// ─ 15. Build Output
console.log("\n[15] Build Artifacts");

if (fileExists(path.join(ROOT, ".next"))) {
  pass("Next.js build", ".next directory present");
} else {
  warn("Next.js build", ".next directory not found (run npm run build)");
}

// ─────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────

console.log("\n" + "=".repeat(70));
console.log("VALIDATION SUMMARY");
console.log("=".repeat(70));

console.log(
  `\n✓ Passed:  ${results.passed.length}`,
  results.passed.length > 0 ? "" : "(none)"
);
console.log(
  `✗ Failed:  ${results.failed.length}`,
  results.failed.length > 0 ? "⚠️ ACTION NEEDED" : ""
);
console.log(
  `⚠ Warnings: ${results.warnings.length}`,
  results.warnings.length > 0 ? "(review)" : ""
);

// Critical failures
if (results.failed.length > 0) {
  console.log("\n🚨 CRITICAL FAILURES:");
  for (const fail of results.failed) {
    console.log(`  • ${fail.name}: ${fail.reason}`);
  }
  process.exit(1);
} else {
  console.log("\n✅ All critical checks passed!");
  if (results.warnings.length > 0) {
    console.log(`\n⚠️  ${results.warnings.length} warnings to review:`);
    for (const warn of results.warnings) {
      console.log(`  • ${warn.name}: ${warn.reason}`);
    }
  }
  process.exit(0);
}
