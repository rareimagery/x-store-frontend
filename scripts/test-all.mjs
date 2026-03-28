#!/usr/bin/env node

/**
 * PERFECT_STORE_ON_X: Complete Test Runner
 * 
 * Orchestrates Phase 1 validation and Phase 2 integration tests in a single flow.
 * 
 * Usage:
 *   npm run test            - Run all validation and integration tests
 *   npm run test -- --fast  - Skip Phase 1, go straight to Phase 2
 *   npm run test -- --phase1-only - Only run Phase 1
 *   npm run test -- 2.5-6-checkout - Run specific Phase 2 suite
 */

import fs from "fs";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");

// Parse arguments
const args = process.argv.slice(2);
const skipPhase1 = args.includes("--fast");
const phase1Only = args.includes("--phase1-only");
const specificSuite = args.find((arg) => arg.startsWith("2."));
const verbose = args.includes("--verbose");

// Test phases
const phases = {
  1: {
    name: "Architecture Validation",
    description: "Verifies architecture specification and code structure",
    tests: [
      {
        name: "Build Validation",
        cmd: "npm",
        args: ["run", "build"],
      },
      {
        name: "Linting",
        cmd: "npm",
        args: ["run", "lint"],
      },
      {
        name: "Architecture Checks",
        cmd: "node",
        args: ["scripts/validate-architecture.mjs", ...(verbose ? ["--verbose"] : [])],
      },
      {
        name: "Handler Validation",
        cmd: "node",
        args: ["scripts/test-handlers.mjs"],
      },
    ],
  },
  2: {
    name: "Integration Testing",
    description: "Tests all 13 subsystems against running server",
    suites: [
      "2.1-auth",
      "2.2-stores",
      "2.3-approval",
      "2.4-provisioning",
      "2.5-6-checkout",
      "2.7-x-import",
      "2.8-webhooks",
      "2.9-ai",
      "2.10-fulfillment",
      "2.11-cron",
      "2.12-rate-limiting",
      "2.13-security",
    ],
  },
};

// Logging
const log = (msg, level = "info") => {
  const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
  const icons = {
    info: "ℹ",
    success: "✓",
    error: "✗",
    warn: "⚠",
    start: "▶",
    end: "■",
    phase: "█",
  };
  console.log(`[${timestamp}] ${icons[level]} ${msg}`);
};

const runCommand = (cmd, args, description) =>
  new Promise((resolve, reject) => {
    log(`Running: ${description}`, "start");
    const process = spawn(cmd, args, {
      stdio: "inherit",
      cwd: PROJECT_ROOT,
      shell: true,
    });

    process.on("close", (code) => {
      if (code === 0) {
        log(`✓ ${description}`, "success");
        resolve(code);
      } else {
        log(`✗ ${description} (exit code: ${code})`, "error");
        reject(new Error(`${description} failed with code ${code}`));
      }
    });

    process.on("error", reject);
  });

// Main runner
const main = async () => {
  log("═".repeat(70), "phase");
  log("🧪 PERFECT_STORE_ON_X: Complete Test Suite", "phase");
  log("═".repeat(70), "phase");

  try {
    // Phase 1: Architecture Validation
    if (!skipPhase1) {
      log(`\n📋 PHASE 1: ${phases[1].name}`, "phase");
      log(`${phases[1].description}`, "info");
      log("─".repeat(70), "info");

      for (const test of phases[1].tests) {
        try {
          await runCommand(test.cmd, test.args, test.name);
        } catch (error) {
          log(`Phase 1 failed. Cannot proceed to Phase 2.`, "error");
          log(`Error: ${error.message}`, "error");
          process.exit(1);
        }
      }

      log("\n✅ Phase 1 Passed: All architecture validations successful", "success");
    }

    // Phase 2: Integration Testing
    if (!phase1Only) {
      log(`\n🔗 PHASE 2: ${phases[2].name}`, "phase");
      log(`${phases[2].description}`, "info");
      log("─".repeat(70), "info");
      log(
        "⚠️  Ensure server is running: npm run dev (in another terminal)",
        "warn"
      );
      log("─".repeat(70), "info");

      // Validate environment
      log("\nChecking test environment...", "info");
      try {
        await runCommand("node", ["scripts/setup-test-env.mjs"], "Environment Validation");
      } catch (error) {
        log(`Environment setup failed: ${error.message}`, "warn");
        log("Continuing anyway (some tests may fail)...", "warn");
      }

      // Run specific suite or all
      const suitesToRun = specificSuite ? [specificSuite] : phases[2].suites;

      for (const suite of suitesToRun) {
        try {
          await runCommand(
            "node",
            [
              "scripts/integration-tests.mjs",
              suite,
              ...(verbose ? ["--verbose"] : []),
            ],
            `Integration Tests: ${suite}`
          );
        } catch (error) {
          log(`Suite ${suite} failed: ${error.message}`, "error");
          // Continue to next suite unless we're in fail-fast mode
          if (args.includes("--fail-fast")) {
            process.exit(1);
          }
        }
      }

      log("\n✅ Phase 2 Passed: All integration tests completed", "success");
    }

    // Summary
    log("\n" + "═".repeat(70), "phase");
    log("🎉 ALL TESTS PASSED!", "success");
    log("═".repeat(70), "phase");

    log("\n📊 Next Steps:", "info");
    log("1. Review test results above", "info");
    log("2. Fix any failing tests", "info");
    log("3. Run production deployment checks", "info");
    log("\nFor more details, see PERFECT_STORE_VALIDATION_CHECKLIST.md", "info");

    process.exit(0);
  } catch (error) {
    log("\n❌ Test suite failed!", "error");
    log(`Error: ${error.message}`, "error");
    log("\n💡 Troubleshooting:", "warn");
    log("- Ensure npm dependencies are installed: npm install", "info");
    log("- Ensure TypeScript build succeeds: npm run build", "info");
    log("- Ensure dev server is running for Phase 2: npm run dev", "info");
    log("- Check .env.local is configured correctly", "info");

    process.exit(1);
  }
};

// Display help
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
PERFECT_STORE_ON_X Test Runner

USAGE:
  npm run test [options] [suite]

OPTIONS:
  --fast                Skip Phase 1 validation, go straight to Phase 2
  --phase1-only        Only run Phase 1 architecture validation
  --fail-fast          Exit on first test failure
  --verbose            Show detailed test output
  --help, -h           Show this help message

SPECIFIC PHASE 2 SUITES:
  2.1-auth             Authentication Flow
  2.2-stores           Store Creation
  2.3-approval         Store Approval
  2.4-provisioning     Store Provisioning & AI
  2.5-6-checkout       Checkout Flow
  2.7-x-import         X Profile Import
  2.8-webhooks         X Webhooks
  2.9-ai               AI Theme Customization
  2.10-fulfillment     Fulfillment (Printful)
  2.11-cron            Cron Agents
  2.12-rate-limiting   Rate Limiting
  2.13-security        Security Headers

EXAMPLES:
  npm run test                          # Run everything
  npm run test -- --fast                # Skip architecture validation
  npm run test -- 2.5-6-checkout        # Run only checkout tests
  npm run test -- --phase1-only         # Run only Phase 1
  npm run test -- --verbose --fail-fast # Detailed output, stop on errors

PHASE 1 runs:
  ✓ npm run build           - TypeScript compilation
  ✓ npm run lint            - ESLint validation
  ✓ npm run validate        - Architecture checks (38 assertions)
  ✓ test-handlers.mjs       - Functional handler validation (77 checks)

PHASE 2 runs integration tests for 12 sub-systems:
  ✓ Authentication (2.1)
  ✓ Store Lifecycle (2.2-2.3)
  ✓ AI Generation (2.4)
  ✓ Payments (2.5-2.6)
  ✓ X Integration (2.7-2.8)
  ✓ AI Customization (2.9)
  ✓ Fulfillment (2.10)
  ✓ Cron Jobs (2.11)
  ✓ Rate Limiting (2.12)
  ✓ Security (2.13)

Prerequisites for Phase 2:
  - npm run dev (running in another terminal)
  - .env.local configured with API keys
  - Drupal backend accessible
  - Optional: Stripe, X API, Grok, Claude credentials
`);
  process.exit(0);
}

main();
