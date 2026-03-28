#!/usr/bin/env node

/**
 * Phase 2 Integration Test Environment Setup
 * 
 * Validates that all required environment variables and services are available
 * before running integration tests.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const ENV_FILE = path.join(PROJECT_ROOT, ".env.local");

const log = (msg, level = "info") => {
  const icons = { info: "ℹ", success: "✓", error: "✗", warn: "⚠" };
  console.log(`${icons[level]} ${msg}`);
};

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

// Check environment file
log("\n📋 Environment Configuration", "info");
log("─".repeat(60), "info");

if (fs.existsSync(ENV_FILE)) {
  log(`.env.local found`, "success");
  checks.passed++;
} else {
  log(`.env.local not found`, "warn");
  log("  → Create with: cp .env.example .env.local", "info");
  checks.warnings++;
}

// Required variables for Phase 2 testing
const required = {
  "Server Setup": [
    { name: "NEXTAUTH_URL", example: "http://localhost:3000" },
    { name: "NEXTAUTH_SECRET", example: "your-random-secret-here" },
    { name: "NEXT_PUBLIC_API_URL", example: "http://localhost:3000" },
  ],
  "X Integration": [
    { name: "X_CLIENT_ID", example: "your-x-app-client-id" },
    { name: "X_CLIENT_SECRET", example: "your-x-app-secret" },
    { name: "X_BEARER_TOKEN", example: "your-x-bearer-token" },
    { name: "X_API_KEY", example: "optional-x-api-key" },
  ],
  "AI Services": [
    { name: "XAI_API_KEY", example: "xai_api_key_here (for Grok)" },
    { name: "ANTHROPIC_API_KEY", example: "sk-ant-... (for Claude)" },
  ],
  "Payment (Optional)": [
    { name: "STRIPE_SECRET_KEY", example: "sk_test_... (for Stripe)" },
    { name: "STRIPE_PUBLISHABLE_KEY", example: "pk_test_..." },
    { name: "STRIPE_WEBHOOK_SECRET", example: "whsec_... (for webhooks)" },
  ],
  "Drupal Backend": [
    { name: "DRUPAL_URL", example: "http://72.62.80.155" },
    { name: "DRUPAL_USERNAME", example: "admin" },
    { name: "DRUPAL_PASSWORD", example: "your-drupal-password" },
  ],
  "Testing": [
    { name: "CRON_SECRET", example: "your-cron-secret-for-background-jobs" },
    { name: "TEST_BASE_URL", example: "http://localhost:3000 (or production URL)" },
  ],
};

let envContent = "";
if (fs.existsSync(ENV_FILE)) {
  envContent = fs.readFileSync(ENV_FILE, "utf8");
}

let allPresent = true;
for (const [category, vars] of Object.entries(required)) {
  log(`\n${category}:`, "info");
  for (const v of vars) {
    const isPresent = envContent.includes(v.name + "=") && !envContent.includes(`${v.name}=`);
    const hasValue = envContent.includes(`${v.name}=`) && !envContent.match(`${v.name}=\\s*$`);

    if (hasValue) {
      log(`  ✓ ${v.name}`, "success");
      checks.passed++;
    } else {
      log(`  ○ ${v.name}`, "warn");
      log(`    Example: ${v.name}="${v.example}"`, "info");
      checks.warnings++;
      if (!category.includes("Optional")) {
        allPresent = false;
      }
    }
  }
}

// Service connectivity checks
log("\n🔌 Service Connectivity", "info");
log("─".repeat(60), "info");

const checkService = async (name, url, timeout = 5000) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      log(`✓ ${name}: ${url}`, "success");
      checks.passed++;
    } else {
      log(`⚠ ${name}: ${url} (${response.status})`, "warn");
      checks.warnings++;
    }
  } catch (error) {
    log(`✗ ${name}: ${url} (${error.message})`, "error");
    checks.failed++;
  }
};

log("Checking services (this may take a moment)...", "info");
await checkService("Frontend Server", "http://localhost:3000/api/auth/session", 3000);
await checkService("Drupal Backend", "http://72.62.80.155/jsonapi/node/store", 5000);
await checkService("Stripe API", "https://api.stripe.com/v1/charges", 3000);

// Test database
log("\n💾 Test Database", "info");
log("─".repeat(60), "info");

if (envContent.includes("DATABASE_URL=") || envContent.includes("DRUPAL_URL=")) {
  log("Database configuration found", "success");
  checks.passed++;
} else {
  log("Database URL not configured (using Drupal remote)", "warn");
  checks.warnings++;
}

// Summary
log("\n" + "═".repeat(60), "info");
log("Setup Summary", "info");
log("─".repeat(60), "info");
log(`✓ Passed: ${checks.passed}`, "success");
log(`⚠ Warnings: ${checks.warnings}`, "warn");
log(`✗ Failed: ${checks.failed}`, "error");

if (checks.failed > 0) {
  log("\n❌ Setup incomplete. Please fix errors above.", "error");
  log("To fix:", "info");
  log("1. Copy .env.example to .env.local", "info");
  log("2. Fill in all required API keys and URLs", "info");
  log("3. Ensure backend services are running", "info");
  process.exit(1);
}

if (checks.warnings > 0) {
  log("\n⚠️ Some configuration is missing. Tests may fail if services are unavailable.", "warn");
}

log("\n✅ Environment setup validated!", "success");
log("\nNext step: npm run test:integration", "info");
process.exit(0);
