/**
 * Wiki Docs Agent — runs every 12 hours via /api/cron/docs-update
 *
 * Scans the codebase (git log + key files), sends context to Grok 3 Mini,
 * and rewrites both the public wiki (/full/wiki) and howto guide (/howto)
 * with accurate, up-to-date content stored in Drupal.
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

export interface DocsUpdateReport {
  timestamp: string;
  durationMs: number;
  wikiUpdated: boolean;
  howtoUpdated: boolean;
  changes: string[];
  status: "updated" | "current" | "error";
}

const XAI_API_KEY = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
const BASE_URL = process.env.NEXTAUTH_URL || "https://www.rareimagery.net";
const CRON_SECRET = process.env.CRON_SECRET;

// Read a file safely, returning empty string on failure
function readFile(relativePath: string, maxLines = 80): string {
  try {
    const fullPath = join(process.cwd(), relativePath);
    const content = readFileSync(fullPath, "utf-8");
    const lines = content.split("\n");
    return lines.slice(0, maxLines).join("\n");
  } catch {
    return "";
  }
}

// Get recent git history
function getGitLog(count = 20): string {
  try {
    return execSync(`git log --oneline -${count}`, { cwd: process.cwd(), encoding: "utf-8", timeout: 5000 });
  } catch {
    return "(git log unavailable)";
  }
}

// Call Grok 3 Mini for text generation
async function grokGenerate(systemPrompt: string, userPrompt: string): Promise<string | null> {
  if (!XAI_API_KEY) return null;

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${XAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "grok-3-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 8000,
      }),
    });

    if (!res.ok) {
      console.error("[docs-agent] Grok API error:", res.status);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error("[docs-agent] Grok call failed:", err);
    return null;
  }
}

// Fetch existing content from an API endpoint
async function fetchExistingSections(endpoint: string): Promise<any[]> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.sections || [];
  } catch {
    return [];
  }
}

// Save sections to an API endpoint
async function saveSections(endpoint: string, sections: any[]): Promise<boolean> {
  if (!CRON_SECRET) return false;
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${CRON_SECRET}` },
      body: JSON.stringify({ sections }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Parse Grok's response into sections array
function parseSections(raw: string): any[] | null {
  try {
    // Try to find JSON array in the response
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].title) {
        return parsed;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function runDocsUpdateAgent(): Promise<DocsUpdateReport> {
  const startTime = Date.now();
  const changes: string[] = [];

  try {
    if (!XAI_API_KEY) {
      return { timestamp: new Date().toISOString(), durationMs: Date.now() - startTime, wikiUpdated: false, howtoUpdated: false, changes: ["XAI_API_KEY not set"], status: "error" };
    }

    // 1. Gather context from codebase
    const gitLog = getGitLog(20);
    const proxyTs = readFile("src/proxy.ts", 40);
    const sidebar = readFile("src/components/ConsoleSidebar.tsx", 40);
    const authExports = readFile("src/lib/auth.ts", 30);
    const paymentsTs = readFile("src/lib/payments.ts", 30);
    const designStudio = readFile("src/app/console/design-studio/page.tsx", 40);
    const productsPage = readFile("src/app/console/products/page.tsx", 30);
    const cartPage = readFile("src/app/cart/page.tsx", 20);
    const stripeWebhook = readFile("src/app/api/webhooks/stripe/route.ts", 30);

    const codeContext = `
## Recent Git Commits (last 20):
${gitLog}

## Subdomain Routing (proxy.ts):
${proxyTs}

## Console Sidebar Navigation:
${sidebar}

## Auth Configuration (first 30 lines):
${authExports}

## Payments Library (first 30 lines):
${paymentsTs}

## Design Studio (first 40 lines):
${designStudio}

## Products Page (first 30 lines):
${productsPage}

## Cart Page (first 20 lines):
${cartPage}

## Stripe Webhook (first 30 lines):
${stripeWebhook}
`.trim();

    // 2. Fetch existing content
    const existingWiki = await fetchExistingSections("/api/public-wiki");
    const existingHowto = await fetchExistingSections("/api/public-howto");

    // 3. Generate public wiki via Grok
    const wikiSystemPrompt = `You are a technical documentation writer for the RareImagery X Marketplace platform. Write accurate, in-depth technical documentation in JSON format.

Output ONLY a JSON array of sections. Each section: { "id": "string", "title": "string", "content": "HTML string" }.
Content should use HTML: <strong> for emphasis, &bull; for bullets, &mdash; for dashes, &rarr; for arrows.
Do NOT include any markdown, code fences, or explanation outside the JSON array.
Cover these sections (keep these exact IDs): architecture, auth, creator-flow, console, design-studio, products, payments, drupal, page-builder, subdomain-routing, api-routes, infrastructure.`;

    const wikiUserPrompt = `Here is the current codebase state. Rewrite the platform wiki with accurate technical documentation.

${existingWiki.length > 0 ? `Current wiki sections for reference (update these):\n${JSON.stringify(existingWiki.map(s => ({ id: s.id, title: s.title })))}` : "No existing wiki — create fresh."}

${codeContext}`;

    changes.push("Generating public wiki via Grok...");
    const wikiRaw = await grokGenerate(wikiSystemPrompt, wikiUserPrompt);
    let wikiUpdated = false;

    if (wikiRaw) {
      const wikiSections = parseSections(wikiRaw);
      if (wikiSections && wikiSections.length >= 5) {
        wikiUpdated = await saveSections("/api/public-wiki", wikiSections);
        changes.push(wikiUpdated ? `Wiki updated: ${wikiSections.length} sections` : "Wiki save failed");
      } else {
        changes.push("Wiki: Grok response could not be parsed into valid sections");
      }
    } else {
      changes.push("Wiki: Grok returned no content");
    }

    // 4. Generate howto via Grok
    const howtoSystemPrompt = `You are a friendly guide writer for the RareImagery creator platform. Write clear, step-by-step instructions for creators.

Output ONLY a JSON array of sections. Each section: { "id": "string", "title": "string", "content": "HTML string" }.
Content should use the howto CSS classes for formatting:
- Steps: <div class="g-steps"><div class="g-step"><div class="g-step-num">1</div><div><div class="g-step-title">Title</div><div class="g-step-desc">Description</div></div></div></div>
- Callouts: <div class="g-callout g-callout-tip"><span>&#10022;</span><div>Content</div></div>
- Tables: <table class="g-table"><thead><tr><th>Col</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>
- Regular text: <p>Text</p>, <h3>Heading</h3>, <strong>Bold</strong>
Do NOT include markdown, code fences, or text outside the JSON array.
Section IDs to use: s-invite, s-setup, s-products, s-themes, s-pages, s-dashboard, s-payments, s-subscriptions.`;

    const howtoUserPrompt = `Here is the current platform state. Rewrite the creator how-to guide with accurate, friendly instructions.

${existingHowto.length > 0 ? `Current howto sections for reference:\n${JSON.stringify(existingHowto.map(s => ({ id: s.id, title: s.title })))}` : "No existing howto — create fresh."}

${codeContext}`;

    changes.push("Generating howto via Grok...");
    const howtoRaw = await grokGenerate(howtoSystemPrompt, howtoUserPrompt);
    let howtoUpdated = false;

    if (howtoRaw) {
      const howtoSections = parseSections(howtoRaw);
      if (howtoSections && howtoSections.length >= 3) {
        howtoUpdated = await saveSections("/api/public-howto", howtoSections);
        changes.push(howtoUpdated ? `Howto updated: ${howtoSections.length} sections` : "Howto save failed");
      } else {
        changes.push("Howto: Grok response could not be parsed into valid sections");
      }
    } else {
      changes.push("Howto: Grok returned no content");
    }

    const status = wikiUpdated || howtoUpdated ? "updated" : "current";

    return {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      wikiUpdated,
      howtoUpdated,
      changes,
      status,
    };
  } catch (err: any) {
    return {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      wikiUpdated: false,
      howtoUpdated: false,
      changes: [...changes, `Error: ${err.message}`],
      status: "error",
    };
  }
}
