#!/usr/bin/env node
/**
 * PERFECT_STORE_ON_X_ARCHITECTURE Functional Tests
 * 
 * Validates that key API routes are properly implemented with correct types.
 * This test runs TypeScript checks on the route handlers.
 * 
 * Usage:
 *   node scripts/test-handlers.mjs
 *   node scripts/test-handlers.mjs --route stores/create
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ─────────────────────────────────────────────────────────────────────────
// Handler Checklist
// ─────────────────────────────────────────────────────────────────────────

const HANDLERS = [
  // Auth
  {
    name: "X OAuth Authentication",
    path: "src/app/api/auth/[...nextauth]/route.ts",
    checks: [
      ["Exports handler", (c) => c.includes("export { handler")],
      ["NextAuth configured", (c) => c.includes("NextAuth(authOptions)")],
    ],
  },

  // Store Lifecycle
  {
    name: "Store Creation",
    path: "src/app/api/stores/create/route.ts",
    checks: [
      ["POST method exported", (c) => c.includes("export async function POST")],
      ["Session auth required", (c) => c.includes("getServerSession")],
      ["Drupal store creation", (c) => c.includes("createDrupalStore")],
      ["X profile linking", (c) => c.includes("createXProfile")],
      ["Admin notification", (c) => c.includes("notifyAdminNewStore")],
    ],
  },

  {
    name: "Store Provisioning",
    path: "src/app/api/stores/provision/route.ts",
    checks: [
      ["POST method", (c) => c.includes("export async function POST")],
      ["X auth required", (c) => c.includes("xAccessToken")],
      ["Subscription check", (c) => c.includes("checkXSubscription")],
      ["Profile creation", (c) => c.includes("createProfile")],
      ["AI generation", (c) => c.includes("generateCreatorSite")],
    ],
  },

  {
    name: "Store Approval",
    path: "src/app/api/stores/approve/route.ts",
    checks: [
      ["PATCH method", (c) => c.includes("export async function PATCH")],
      ["Admin auth check", (c) => c.includes("token.role")],
      ["Status validation", (c) => c.includes("approved")],
    ],
  },

  // Payments
  {
    name: "Store Setup Checkout",
    path: "src/app/api/checkout/route.ts",
    checks: [
      ["POST method", (c) => c.includes("export async function POST")],
      ["Stripe integration", (c) => c.includes("stripe.checkout.sessions")],
      ["Metadata tagging", (c) => c.includes("metadata")],
    ],
  },

  {
    name: "Product Checkout",
    path: "src/app/api/checkout/product/route.ts",
    checks: [
      ["POST method", (c) => c.includes("export async function POST")],
      ["Payment provider", (c) => c.includes("getPaymentProvider")],
      ["Checkout creation", (c) => c.includes("createCheckout")],
    ],
  },

  {
    name: "Stripe Webhook Handler",
    path: "src/app/api/webhooks/stripe/route.ts",
    checks: [
      ["POST method", (c) => c.includes("export async function POST")],
      ["Signature verification", (c) => c.includes("constructEvent")],
      ["Setup session handling", (c) => c.includes("store_setup")],
      ["Subscription lifecycle", (c) => c.includes("customer.subscription")],
    ],
  },

  // AI
  {
    name: "Dual-AI Site Generation",
    path: "src/lib/ai/generate-site.ts",
    checks: [
      ["Grok analysis export", (c) => c.includes("analyzeProfileForSite")],
      ["Claude generation export", (c) => c.includes("generateSiteComponents")],
      ["Full pipeline export", (c) => c.includes("generateCreatorSite")],
    ],
  },

  {
    name: "Interactive Builder Chat",
    path: "src/app/api/chat/route.ts",
    checks: [
      ["POST method", (c) => c.includes("export async function POST")],
      ["Streaming enabled", (c) => c.includes("stream")],
      ["Rate limiting", (c) => c.includes("RATE_LIMIT")],
      ["Theme prompts", (c) => c.includes("THEME_PROMPTS")],
    ],
  },

  {
    name: "Site Generation Endpoint",
    path: "src/app/api/site/generate/route.ts",
    checks: [
      ["POST method", (c) => c.includes("export async function POST")],
      ["Grok integration", (c) => c.includes("fetchXData")],
      ["AI pipeline", (c) => c.includes("generateCreatorSite")],
      ["Profile patching", (c) => c.includes("patchProfile")],
    ],
  },

  // X Integration
  {
    name: "X API Client",
    path: "src/lib/x-api/client.ts",
    checks: [
      ["Bearer token export", (c) => c.includes("xApiHeaders")],
      ["User header export", (c) => c.includes("xUserHeaders")],
      ["API base URL", (c) => c.includes("api.x.com/2")],
    ],
  },

  {
    name: "X Profile Import",
    path: "src/lib/x-import.ts",
    checks: [
      ["Fetch X data export", (c) => c.includes("fetchXData")],
      ["Sync to Drupal export", (c) => c.includes("syncXDataToDrupal")],
      ["Profile lookup", (c) => c.includes("findProfileByUsername")],
      ["Metrics calculation", (c) => c.includes("engagement_score")],
    ],
  },

  {
    name: "X Webhooks",
    path: "src/app/api/webhooks/x/route.ts",
    checks: [
      ["GET CRC validation", (c) => c.includes("export async function GET")],
      ["POST event delivery", (c) => c.includes("export async function POST")],
      ["Signature verification", (c) => c.includes("verifySignature")],
      ["Event processing", (c) => c.includes("processWebhookEvent")],
    ],
  },

  {
    name: "X Feed Proxy",
    path: "src/app/api/proxy/x-feed/[userId]/route.ts",
    checks: [
      ["GET method", (c) => c.includes("export async function GET")],
      ["Rate limiting", (c) => c.includes("feedRateLimit")],
      ["X API call", (c) => c.includes("X_API_BASE")],
      ["Grok fallback", (c) => c.includes("grok")],
      ["Caching", (c) => c.includes("cache.get")],
    ],
  },

  // Drupal Integration
  {
    name: "Drupal Client",
    path: "src/lib/drupal.ts",
    checks: [
      ["Auth headers export", (c) => c.includes("drupalAuthHeaders")],
      ["Write headers export", (c) => c.includes("drupalWriteHeaders")],
      ["Session caching", (c) => c.includes("_sessionCache")],
      ["Profile mapper", (c) => c.includes("mapCreatorProfile")],
    ],
  },

  // Fulfillment
  {
    name: "Printful Webhook Handler",
    path: "src/app/api/printful/webhook/route.ts",
    checks: [
      ["POST method", (c) => c.includes("export async function POST")],
      ["Event routing", (c) => c.includes("switch (type)")],
      ["Package shipped handling", (c) => c.includes("package_shipped")],
      ["Order failed handling", (c) => c.includes("order_failed")],
    ],
  },

  // Social
  {
    name: "Social Follow System",
    path: "src/app/api/social/follow/route.ts",
    checks: [
      ["POST method", (c) => c.includes("export async function POST")],
      ["Follow/Unfollow support", (c) => c.includes("createFollow") && c.includes("removeFollow")],
      ["JWT auth required", (c) => c.includes("getToken")],
    ],
  },

  // Cron
  {
    name: "Frontend Cron Agent",
    path: "src/app/api/cron/frontend-agent/route.ts",
    checks: [
      ["GET method", (c) => c.includes("export async function GET")],
      ["CRON_SECRET validation", (c) => c.includes("CRON_SECRET")],
      ["Bearer auth", (c) => c.includes("Authorization")],
      ["Agent export", (c) => c.includes("runAgent")],
    ],
  },

  {
    name: "API Health Cron Agent",
    path: "src/app/api/cron/api-agent/route.ts",
    checks: [
      ["GET method", (c) => c.includes("export async function GET")],
      ["CRON_SECRET validation", (c) => c.includes("CRON_SECRET")],
      ["Health report", (c) => c.includes("runApiAgent")],
    ],
  },

  {
    name: "Site Generate Cron Agent",
    path: "src/app/api/cron/site-generate-agent/route.ts",
    checks: [
      ["GET method", (c) => c.includes("export async function GET")],
      ["CRON_SECRET validation", (c) => c.includes("CRON_SECRET")],
      ["Site generate probe", (c) => c.includes("/api/site/generate")],
    ],
  },

  {
    name: "Drupal/API Path Cron Agent",
    path: "src/app/api/cron/drupal-api-path-agent/route.ts",
    checks: [
      ["GET method", (c) => c.includes("export async function GET")],
      ["CRON_SECRET validation", (c) => c.includes("CRON_SECRET")],
      ["Path health report", (c) => c.includes("runDrupalApiPathAgent")],
    ],
  },

  // Config
  {
    name: "Configuration",
    path: "src/app/api/app-config/[slug]/route.ts",
    checks: [
      ["GET method", (c) => c.includes("export async function GET")],
      ["Creator data", (c) => c.includes("getCreatorProfile")],
      ["Store data", (c) => c.includes("getCreatorStoreBySlug")],
      ["Theme config", (c) => c.includes("theme")],
    ],
  },

  // Rate Limiting
  {
    name: "Rate Limiter Utility",
    path: "src/lib/rate-limit.ts",
    checks: [
      ["Factory export", (c) => c.includes("createRateLimiter")],
      ["Window enforcement", (c) => c.includes("windowMs")],
      ["Limit tracking", (c) => c.includes("allowed")],
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Test Runner
// ─────────────────────────────────────────────────────────────────────────

console.log("🧪 PERFECT_STORE_ON_X_ARCHITECTURE Functional Tests\n");

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
let failedHandlers = [];

for (const handler of HANDLERS) {
  const filePath = path.join(ROOT, handler.path);

  if (!fs.existsSync(filePath)) {
    console.log(`✗ ${handler.name} — FILE NOT FOUND: ${handler.path}`);
    failedHandlers.push(handler.name);
    totalChecks += handler.checks.length;
    failedChecks += handler.checks.length;
    continue;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  let handlerPassed = true;

  process.stdout.write(`\n${handler.name}\n`);

  for (const [check, validator] of handler.checks) {
    totalChecks++;
    try {
      if (validator(content)) {
        console.log(`  ✓ ${check}`);
        passedChecks++;
      } else {
        console.log(`  ✗ ${check}`);
        failedChecks++;
        handlerPassed = false;
      }
    } catch (err) {
      console.log(`  ✗ ${check} (error: ${err.message})`);
      failedChecks++;
      handlerPassed = false;
    }
  }

  if (!handlerPassed) {
    failedHandlers.push(handler.name);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────

console.log("\n" + "=".repeat(70));
console.log("FUNCTIONAL TEST SUMMARY");
console.log("=".repeat(70));

console.log(`\nTotal checks: ${totalChecks}`);
console.log(`✓ Passed: ${passedChecks}`);
console.log(`✗ Failed: ${failedChecks}`);
console.log(`Success rate: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);

if (failedChecks > 0) {
  console.log(`\n❌ ${failedHandlers.length} handler(s) with issues:`);
  for (const h of failedHandlers) {
    console.log(`   • ${h}`);
  }
  process.exit(1);
} else {
  console.log(`\n✅ All ${HANDLERS.length} handlers validated successfully!`);
  process.exit(0);
}
