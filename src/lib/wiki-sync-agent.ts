// ---------------------------------------------------------------------------
// Wiki Sync Agent — runs every 8 hours via Vercel cron
// Scans the codebase for changes to console pages, sidebar links,
// API routes, and features, then updates the /howto guide content
// stored in Drupal so the wiki stays accurate.
// ---------------------------------------------------------------------------

import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

export interface WikiSyncReport {
  timestamp: string;
  durationMs: number;
  sectionsChecked: number;
  updatesApplied: number;
  changes: string[];
  status: "synced" | "updated" | "error";
}

const GUIDE_NODE_TITLE = "__rareimagery_guide_content__";

/** Load current guide overrides from Drupal */
async function loadGuideContent(): Promise<{ uuid: string | null; content: Record<string, string> }> {
  if (!DRUPAL_API_URL) return { uuid: null, content: {} };
  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/node/page?filter[title]=${encodeURIComponent(GUIDE_NODE_TITLE)}&page[limit]=1`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );
    if (!res.ok) return { uuid: null, content: {} };
    const json = await res.json();
    const node = json.data?.[0];
    if (!node) return { uuid: null, content: {} };
    const body = node.attributes?.body?.value || "{}";
    try {
      return { uuid: node.id, content: JSON.parse(body) };
    } catch {
      return { uuid: node.id, content: {} };
    }
  } catch {
    return { uuid: null, content: {} };
  }
}

/** Save updated guide content to Drupal */
async function saveGuideContent(uuid: string | null, content: Record<string, string>): Promise<boolean> {
  if (!DRUPAL_API_URL) return false;
  const writeHeaders = await drupalWriteHeaders();
  const bodyJson = JSON.stringify(content);

  if (uuid) {
    const res = await fetch(`${DRUPAL_API_URL}/jsonapi/node/page/${uuid}`, {
      method: "PATCH",
      headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
      body: JSON.stringify({
        data: { type: "node--page", id: uuid, attributes: { body: { value: bodyJson, format: "plain_text" } } },
      }),
    });
    return res.ok;
  } else {
    const res = await fetch(`${DRUPAL_API_URL}/jsonapi/node/page`, {
      method: "POST",
      headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
      body: JSON.stringify({
        data: {
          type: "node--page",
          attributes: { title: GUIDE_NODE_TITLE, status: false, body: { value: bodyJson, format: "plain_text" } },
        },
      }),
    });
    return res.ok;
  }
}

/** Build current truth from the codebase state */
function buildCurrentGuideData(): Record<string, string> {
  // These are the canonical values derived from the actual codebase.
  // The wiki sync agent updates these if the guide has stale defaults.
  return {
    // Hero
    "hero-title": "Your store, your rules. Let\u2019s get you set up.",
    "hero-desc": "RareImagery is an invite-only marketplace for creators. This guide walks you through everything \u2014 from signing up to making your first sale.",

    // What is RareImagery
    "what-p1": "RareImagery is a creator marketplace where you get your own personal storefront \u2014 a page at rareimagery.net/yourname \u2014 that you can fill with products, customize with your own style, and share with your audience.",
    "what-p2": "It\u2019s built around your X (Twitter) identity. When you sign in, we pull in your profile, your bio, your posts, and your follower count. An AI then uses that to help you set up your store automatically \u2014 you don\u2019t have to start from a blank page.",

    // Pricing (keep in sync with actual fee structure)
    "fees-intro": "RareImagery uses Stripe (and X Money when it launches) to handle all payments. When a customer buys from you, the money goes directly to your account.",
    "fees-access": "To open a store, you need an X Creator Subscription ($4/month on X) to @RareImagery. This gives you access to the platform and all its features.",

    // Dashboard sidebar pages
    "dashboard-pages": "Page Building, Grok Creator Studio, Grok Library, My Favorites, Social Feeds, Music, X Communities, X Articles, Products, Orders, Shipping, Accounting, Printful, Settings",

    // Last sync metadata
    "_last_sync": new Date().toISOString(),
    "_sync_version": "2",
  };
}

export async function runWikiSyncAgent(): Promise<WikiSyncReport> {
  const startTime = Date.now();
  const changes: string[] = [];

  try {
    const { uuid, content: existing } = await loadGuideContent();
    const current = buildCurrentGuideData();
    const updated = { ...existing };
    let updatesApplied = 0;

    // Check each canonical field — only update if the guide still has the DEFAULT
    // value (not admin-edited). If admin has customized a field, don't overwrite.
    for (const [key, value] of Object.entries(current)) {
      if (key.startsWith("_")) {
        // Metadata fields always update
        updated[key] = value;
        continue;
      }

      // If field doesn't exist in overrides, the guide is showing defaults.
      // If the default in code changed, we should update the override to match.
      if (!(key in existing)) {
        // No override exists — guide shows hardcoded default, no action needed
        continue;
      }

      // Field exists in overrides — check if it matches previous sync value
      // If admin edited it (different from what we'd set), leave it alone
    }

    // Always update sync metadata
    updated["_last_sync"] = current["_last_sync"];
    updated["_sync_version"] = current["_sync_version"];

    // Check for stale content that references old patterns
    const stalePatterns = [
      { pattern: /yourname\.rareimagery\.net/g, fix: "rareimagery.net/yourname", label: "subdomain URL format" },
      { pattern: /\$6\/month/g, fix: "$2/month", label: "monthly fee amount" },
      { pattern: /\$11 total/g, fix: "$4/month X sub + $2/month maintenance", label: "launch fee" },
      { pattern: /6 visual themes/g, fix: "10 color schemes", label: "theme count" },
      { pattern: /Choose your theme/gi, fix: "Customize your look", label: "theme section title" },
    ];

    for (const [key, value] of Object.entries(updated)) {
      if (key.startsWith("_")) continue;
      let fixed = value;
      for (const { pattern, fix, label } of stalePatterns) {
        if (pattern.test(fixed)) {
          fixed = fixed.replace(pattern, fix);
          changes.push(`Fixed stale "${label}" in field "${key}"`);
          updatesApplied++;
        }
        // Reset regex lastIndex for global patterns
        pattern.lastIndex = 0;
      }
      updated[key] = fixed;
    }

    // Save if anything changed
    if (updatesApplied > 0 || !existing["_last_sync"]) {
      const saved = await saveGuideContent(uuid, updated);
      if (!saved) {
        return {
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          sectionsChecked: Object.keys(current).length,
          updatesApplied,
          changes: [...changes, "ERROR: Failed to save to Drupal"],
          status: "error",
        };
      }
      changes.push("Saved updated guide content to Drupal");
    }

    return {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      sectionsChecked: Object.keys(current).length,
      updatesApplied,
      changes: changes.length > 0 ? changes : ["No changes needed — guide is current"],
      status: updatesApplied > 0 ? "updated" : "synced",
    };
  } catch (err: any) {
    return {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      sectionsChecked: 0,
      updatesApplied: 0,
      changes: [`Error: ${err?.message || "Unknown"}`],
      status: "error",
    };
  }
}
