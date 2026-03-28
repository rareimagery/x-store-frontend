#!/usr/bin/env node

/**
 * Test Results Reporter
 * 
 * Generates comprehensive test reports in multiple formats:
 * - Console output (pretty printed)
 * - JSON (machine readable)
 * - Markdown (markdown)
 * - HTML (web viewable)
 * 
 * Usage:
 *   npm run test 2>&1 | node scripts/test-reporter.mjs --format json
 *   npm run test 2>&1 | node scripts/test-reporter.mjs --format html
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");

// Parse arguments
const args = process.argv.slice(2);
const format = args.find((arg) => arg.startsWith("--format="))?.split("=")[1] || "console";
const outputFile = args.find((arg) => arg.startsWith("--output="))?.split("=")[1];

// Parse stdin (test output)
let testData = "";
process.stdin.on("data", (chunk) => {
  testData += chunk.toString();
});

process.stdin.on("end", () => {
  const report = parseTestOutput(testData);

  if (format === "json") {
    outputJSON(report, outputFile);
  } else if (format === "html") {
    outputHTML(report, outputFile);
  } else if (format === "markdown") {
    outputMarkdown(report, outputFile);
  } else {
    outputConsole(report);
  }
});

// Parser
function parseTestOutput(output) {
  const lines = output.split("\n");
  const report = {
    timestamp: new Date().toISOString(),
    phases: {},
    suites: {},
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    duration: null,
    status: "unknown",
  };

  let currentPhase = null;
  let currentSuite = null;

  for (const line of lines) {
    // Parse phase headers
    if (line.includes("PHASE") && (line.includes("Architecture") || line.includes("Integration"))) {
      const match = line.match(/PHASE \d+: (.+)/);
      if (match) {
        currentPhase = match[1];
        report.phases[currentPhase] = { tests: 0, passed: 0, failed: 0 };
      }
    }

    // Parse suite headers
    if (line.includes("Suite:") || line.match(/^\s+\d+\.\d+-\w+/)) {
      const match = line.match(/Suite: (.+)/) || line.match(/(\d+\.\d+-\w+)/);
      if (match) {
        currentSuite = match[1];
        report.suites[currentSuite] = { tests: [], totalTests: 0, passed: 0, failed: 0 };
      }
    }

    // Parse test results
    if (line.includes("✓") || line.includes("✗")) {
      const passed = line.includes("✓");
      const testName = line
        .replace(/\s*✓\s*/, "")
        .replace(/\s*✗\s*/, "")
        .trim();

      report.totalTests++;
      if (passed) {
        report.passedTests++;
      } else {
        report.failedTests++;
      }

      if (currentSuite && report.suites[currentSuite]) {
        report.suites[currentSuite].totalTests++;
        if (passed) {
          report.suites[currentSuite].passed++;
        } else {
          report.suites[currentSuite].failed++;
        }
        report.suites[currentSuite].tests.push({
          name: testName,
          passed,
        });
      }

      if (currentPhase && report.phases[currentPhase]) {
        report.phases[currentPhase].tests++;
        if (passed) {
          report.phases[currentPhase].passed++;
        } else {
          report.phases[currentPhase].failed++;
        }
      }
    }

    // Parse summary
    if (line.includes("Total:") && line.includes("/")) {
      const match = line.match(/(\d+)\/(\d+)/);
      if (match) {
        report.status = line.includes("failed") ? "failed" : "passed";
      }
    }

    // Parse duration
    if (line.includes("Duration:")) {
      const match = line.match(/Duration: ([\d.]+)s/);
      if (match) {
        report.duration = parseFloat(match[1]);
      }
    }
  }

  return report;
}

// Output formats
function outputConsole(report) {
  console.log("\n" + "═".repeat(70));
  console.log("📊 TEST RESULTS REPORT");
  console.log("═".repeat(70));

  console.log(`\nTimestamp: ${report.timestamp}`);
  console.log(`Status: ${report.status.toUpperCase()}`);
  console.log(`Duration: ${report.duration ? report.duration + "s" : "unknown"}`);

  console.log("\n📋 Summary:");
  console.log(`  Total Tests: ${report.totalTests}`);
  console.log(`  Passed: ${report.passedTests}`);
  console.log(`  Failed: ${report.failedTests}`);
  const passRate = report.totalTests > 0 ? ((report.passedTests / report.totalTests) * 100).toFixed(1) : 0;
  console.log(`  Pass Rate: ${passRate}%`);

  console.log("\n📈 By Phase:");
  for (const [phase, data] of Object.entries(report.phases)) {
    console.log(`  ${phase}: ${data.passed}/${data.tests} passed`);
  }

  console.log("\n📋 By Suite:");
  for (const [suite, data] of Object.entries(report.suites)) {
    const status = data.failed === 0 ? "✓" : "✗";
    console.log(`  ${status} ${suite}: ${data.passed}/${data.totalTests}`);
  }

  console.log("\n" + "═".repeat(70));
}

function outputJSON(report, outputFile) {
  const json = JSON.stringify(report, null, 2);

  if (outputFile) {
    fs.writeFileSync(path.join(PROJECT_ROOT, outputFile), json);
    console.log(`Report saved to ${outputFile}`);
  } else {
    console.log(json);
  }
}

function outputMarkdown(report, outputFile) {
  let markdown = `# Test Results Report

**Date:** ${report.timestamp}  
**Status:** ${report.status}  
**Duration:** ${report.duration}s

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${report.totalTests} |
| Passed | ${report.passedTests} |
| Failed | ${report.failedTests} |
| Pass Rate | ${((report.passedTests / report.totalTests) * 100).toFixed(1)}% |

## Results by Phase

`;

  for (const [phase, data] of Object.entries(report.phases)) {
    markdown += `### ${phase}

- Tests: ${data.tests}
- Passed: ${data.passed}
- Failed: ${data.failed}

`;
  }

  markdown += `## Results by Suite\n\n`;
  for (const [suite, data] of Object.entries(report.suites)) {
    const status = data.failed === 0 ? "✓" : "✗";
    markdown += `### ${status} ${suite}\n\n`;
    markdown += `- Total: ${data.totalTests}\n`;
    markdown += `- Passed: ${data.passed}\n`;
    markdown += `- Failed: ${data.failed}\n\n`;

    if (data.tests.length > 0) {
      markdown += `#### Individual Tests\n\n`;
      for (const test of data.tests) {
        const icon = test.passed ? "✓" : "✗";
        markdown += `- ${icon} ${test.name}\n`;
      }
      markdown += "\n";
    }
  }

  if (outputFile) {
    fs.writeFileSync(path.join(PROJECT_ROOT, outputFile), markdown);
    console.log(`Report saved to ${outputFile}`);
  } else {
    console.log(markdown);
  }
}

function outputHTML(report, outputFile) {
  const passRate = report.totalTests > 0 ? ((report.passedTests / report.totalTests) * 100).toFixed(1) : 0;
  const statusColor = report.status === "passed" ? "#28a745" : "#dc3545";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Results Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    h1 { margin-bottom: 10px; }
    .metadata {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      color: #666;
      font-size: 14px;
    }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      background: ${statusColor};
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    .card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .card h3 { color: #333; font-size: 14px; text-transform: uppercase; margin-bottom: 10px; }
    .card .number {
      font-size: 32px;
      font-weight: bold;
      color: #0066cc;
    }
    .phase {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .phase h2 { margin-bottom: 15px; font-size: 18px; }
    .suite {
      background: #f9f9f9;
      padding: 15px;
      border-left: 4px solid #0066cc;
      margin-bottom: 15px;
      border-radius: 4px;
    }
    .suite.failed { border-left-color: #dc3545; }
    .suite h3 { margin-bottom: 10px; font-size: 14px; }
    .suite .stats {
      display: flex;
      gap: 20px;
      font-size: 13px;
      color: #666;
    }
    .test-list { margin-top: 10px; padding-left: 20px; }
    .test { margin-bottom: 5px; font-size: 12px; }
    .test.passed { color: #28a745; }
    .test.failed { color: #dc3545; }
    .progress {
      background: #eee;
      height: 20px;
      border-radius: 10px;
      overflow: hidden;
      margin-top: 10px;
    }
    .progress-bar {
      background: #28a745;
      height: 100%;
      transition: width 0.3s;
    }
    footer {
      text-align: center;
      color: #999;
      font-size: 12px;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🧪 PERFECT_STORE_ON_X Test Results</h1>
      <div class="metadata">
        <span>Generated: ${new Date().toLocaleString()}</span>
        <span>Report: ${report.timestamp}</span>
        <div class="status">${report.status.toUpperCase()}</div>
      </div>
    </header>

    <div class="summary">
      <div class="card">
        <h3>Total Tests</h3>
        <div class="number">${report.totalTests}</div>
      </div>
      <div class="card">
        <h3>Passed</h3>
        <div class="number" style="color: #28a745;">${report.passedTests}</div>
      </div>
      <div class="card">
        <h3>Failed</h3>
        <div class="number" style="color: ${report.failedTests > 0 ? '#dc3545' : '#999'};">${report.failedTests}</div>
      </div>
      <div class="card">
        <h3>Pass Rate</h3>
        <div class="number">${passRate}%</div>
        <div class="progress">
          <div class="progress-bar" style="width: ${passRate}%;"></div>
        </div>
      </div>
    </div>

    ${Object.entries(report.phases)
      .map(
        ([phase, data]) => `
    <div class="phase">
      <h2>${phase}</h2>
      <p>Tests: ${data.tests} | Passed: ${data.passed} | Failed: ${data.failed}</p>
    </div>
    `
      )
      .join("")}

    <div class="phase">
      <h2>Suite Details</h2>
      ${Object.entries(report.suites)
        .map(
          ([suite, data]) => `
      <div class="suite ${data.failed > 0 ? "failed" : ""}">
        <h3>${data.failed > 0 ? "✗" : "✓"} ${suite}</h3>
        <div class="stats">
          <span>Total: ${data.totalTests}</span>
          <span style="color: #28a745;">Passed: ${data.passed}</span>
          <span style="color: #dc3545;">Failed: ${data.failed}</span>
        </div>
        ${
          data.tests.length > 0
            ? `
        <div class="test-list">
          ${data.tests
            .map((t) => `<div class="test ${t.passed ? "passed" : "failed"}">
            ${t.passed ? "✓" : "✗"} ${t.name}
          </div>`)
            .join("")}
        </div>
        `
            : ""
        }
      </div>
      `
        )
        .join("")}
    </div>

    <footer>
      <p>PERFECT_STORE_ON_X Phase 2: Comprehensive Integration Test Report</p>
      <p>Generated on ${new Date().toISOString()}</p>
    </footer>
  </div>
</body>
</html>`;

  if (outputFile) {
    fs.writeFileSync(path.join(PROJECT_ROOT, outputFile), html);
    console.log(`Report saved to ${outputFile}`);
  } else {
    console.log(html);
  }
}
