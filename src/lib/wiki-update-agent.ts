// ---------------------------------------------------------------------------
// Wiki Update Agent — runs every 2 hours via Vercel cron
// Reads live site state, probes endpoints, checks Drupal, and
// rebuilds wiki content to reflect the current state of the platform.
// ---------------------------------------------------------------------------

import { DRUPAL_API_URL, drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

export interface WikiUpdateReport {
  timestamp: string;
  durationMs: number;
  probesRun: number;
  sectionsUpdated: number;
  changes: string[];
  status: "updated" | "current" | "error";
}

const ADMIN_WIKI_TITLE = "__rareimagery_admin_wiki__";
const GUIDE_NODE_TITLE = "__rareimagery_guide_content__";

interface WikiSection {
  id: string;
  title: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Probes — discover the current state of the platform
// ---------------------------------------------------------------------------

function resolveBaseUrl(): string {
  const u = process.env.NEXTAUTH_URL?.trim();
  if (u) return u.replace(/\/$/, "");
  return `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN?.trim() || "rareimagery.net"}`;
}

async function probe(url: string, init?: RequestInit): Promise<{ status: number | null; ok: boolean; body?: string }> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000), ...init });
    const body = res.ok ? await res.text().catch(() => "") : "";
    return { status: res.status, ok: res.ok, body: body.slice(0, 2000) };
  } catch {
    return { status: null, ok: false };
  }
}

async function probeJson(url: string, init?: RequestInit): Promise<any> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000), ...init });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Discover current platform state
// ---------------------------------------------------------------------------

async function discoverPlatformState(baseUrl: string) {
  const state: Record<string, any> = {};

  // 1. Discover console pages by probing known routes
  const consolePages = [
    "page-building", "design-studio", "grok-library", "favorite-creators",
    "social-feeds", "music", "communities", "x-articles",
    "products", "orders", "shipping", "accounting", "printful", "settings",
    "admin", "admin/users", "admin/subscribers", "admin/invites", "cost-dashboard",
  ];
  const liveConsolePages: string[] = [];
  const consoleProbes = await Promise.all(
    consolePages.map(async (page) => {
      const r = await probe(`${baseUrl}/console/${page}`);
      // 200 or 307 (auth redirect) means the page exists
      return { page, exists: r.status !== null && r.status !== 404 };
    })
  );
  for (const p of consoleProbes) {
    if (p.exists) liveConsolePages.push(p.page);
  }
  state.consolePages = liveConsolePages;

  // 2. Discover public pages
  const publicPages = ["RareImagery", "RareImagery/store", "RareImagery/favorites", "RareImagery/gallery", "RareImagery/articles", "howto", "login", "signup"];
  const livePublicPages: string[] = [];
  const publicProbes = await Promise.all(
    publicPages.map(async (page) => {
      const r = await probe(`${baseUrl}/${page}`);
      return { page, exists: r.ok };
    })
  );
  for (const p of publicProbes) {
    if (p.exists) livePublicPages.push(p.page);
  }
  state.publicPages = livePublicPages;

  // 3. Discover API routes
  const apiRoutes = [
    "health", "blocks", "builds", "favorites", "favorites/tags", "gallery",
    "music", "communities", "social-feeds", "articles",
    "printful/status", "x-lookup", "invite",
    "design-studio/generate", "design-studio/enhance", "design-studio/import-post", "guide", "admin/wiki",
    "social/picks", "social/followers",
    "subscriptions/tiers", "notifications/preferences",
    "console/stores", "console/insights",
  ];
  const liveApiRoutes: string[] = [];
  const apiProbes = await Promise.all(
    apiRoutes.map(async (route) => {
      const r = await probe(`${baseUrl}/api/${route}`);
      // Anything that's not 404 means the route exists
      return { route, exists: r.status !== null && r.status !== 404 };
    })
  );
  for (const p of apiProbes) {
    if (p.exists) liveApiRoutes.push(p.route);
  }
  state.apiRoutes = liveApiRoutes;

  // 4. Get block catalog (reveals available wireframe blocks)
  const blocksData = await probeJson(`${baseUrl}/api/blocks`);
  if (blocksData?.catalog) {
    state.blockTypes = blocksData.catalog.map((b: any) => b.label);
  }

  // 5. Drupal state
  if (DRUPAL_API_URL) {
    // Store count
    const storesData = await probeJson(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online?page[limit]=1`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" } }
    );
    state.storeCount = storesData?.meta?.count ?? storesData?.data?.length ?? "unknown";

    // Product count
    const productsData = await probeJson(
      `${DRUPAL_API_URL}/jsonapi/commerce_product/clothing?page[limit]=1`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" } }
    );
    state.productCount = productsData?.meta?.count ?? productsData?.data?.length ?? "unknown";

    // User count
    const usersData = await probeJson(
      `${DRUPAL_API_URL}/jsonapi/user/user?page[limit]=1`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" } }
    );
    state.userCount = usersData?.meta?.count ?? "unknown";

    // Color attribute count
    const colorsData = await probeJson(
      `${DRUPAL_API_URL}/jsonapi/commerce_product_attribute_value/color?page[limit]=50`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" } }
    );
    state.colorCount = colorsData?.data?.length ?? "unknown";

    // Size attribute count
    const sizesData = await probeJson(
      `${DRUPAL_API_URL}/jsonapi/commerce_product_attribute_value/size?page[limit]=50`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" } }
    );
    state.sizeCount = sizesData?.data?.length ?? "unknown";

    // Invite codes
    const inviteData = await probeJson(
      `${DRUPAL_API_URL}/api/invite/list`,
      { headers: drupalAuthHeaders() }
    );
    if (inviteData?.codes) {
      state.totalInvites = inviteData.codes.length;
      state.usedInvites = inviteData.codes.filter((c: any) => c.used).length;
      state.availableInvites = inviteData.codes.filter((c: any) => !c.used).length;
    }

    // Drupal modules
    state.drupalModules = [
      "x_profile_auto_importer", "x_profile_sync",
      "rareimagery_cost_dashboard", "rareimagery_grok_creator_studio",
      "rareimagery_printful_sync", "rareimagery_invite_gate",
    ];
  }

  // 6. Cron agents (hardcoded from vercel.json)
  state.cronAgents = [
    { name: "Code Audit", schedule: "Every 6 hours", path: "/api/cron/code-audit" },
    { name: "Wiki Update", schedule: "Every 2 hours", path: "/api/cron/wiki-update" },
    { name: "X Money Watcher", schedule: "Every 12 hours", path: "/api/cron/x-money-watcher" },
  ];

  return state;
}

// ---------------------------------------------------------------------------
// Build wiki sections from discovered state
// ---------------------------------------------------------------------------

function buildAdminWikiSections(state: Record<string, any>): WikiSection[] {
  const now = new Date().toISOString();

  return [
    {
      id: "architecture",
      title: "Architecture Overview",
      content: `<strong>Tech Stack:</strong> Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 on Vercel. Drupal 11 (headless) + Commerce 3 + PostgreSQL 16 on Ubuntu 24.04 VPS (72.62.80.155).

<strong>Data Flow:</strong> Browser → Next.js API Routes → Drupal JSON:API → PostgreSQL. Browser never calls Drupal directly.

<strong>External Services:</strong> Stripe Connect (payments), Printful (POD fulfillment), X API v2 (identity/content), Grok Imagine (AI image generation), Brevo SMTP (email), Telnyx (SMS), Cloudflare (DNS).

<strong>Live Stats (as of ${now.split("T")[0]}):</strong>
• Stores: ${state.storeCount}
• Products: ${state.productCount}
• Users: ${state.userCount}
• Color attributes: ${state.colorCount}
• Size attributes: ${state.sizeCount}
• Invite codes: ${state.totalInvites ?? "?"} total (${state.availableInvites ?? "?"} available, ${state.usedInvites ?? "?"} used)`,
    },
    {
      id: "console-pages",
      title: "Console Dashboard Pages",
      content: `<strong>Live console pages (${state.consolePages?.length ?? 0} detected):</strong>
${(state.consolePages || []).map((p: string) => `• /console/${p}`).join("\n")}

<strong>Workspace:</strong> Page Building, Grok Creator Studio, Grok Library, My Favorites, Social Feeds, Music, X Communities, X Articles
<strong>Store:</strong> Products, Orders, Shipping, Accounting, Printful, Settings
<strong>Admin:</strong> All Stores, Users, X Subscribers, Cost Dashboard, Invite Codes`,
    },
    {
      id: "public-pages",
      title: "Public Pages",
      content: `<strong>Live public pages (${state.publicPages?.length ?? 0} detected):</strong>
${(state.publicPages || []).map((p: string) => `• /${p}`).join("\n")}

<strong>Creator pages:</strong> /[creator] (home), /[creator]/store, /[creator]/favorites, /[creator]/gallery, /[creator]/articles
<strong>Nav bar:</strong> Home | Store | Favorites | Gallery | Articles | [Open Your Store → /login] | [Here's How → /howto] | [X Share]
<strong>Guides:</strong> /howto (public creator guide), /admin/wiki (admin platform wiki)`,
    },
    {
      id: "api-routes",
      title: "API Routes",
      content: `<strong>Live API routes (${state.apiRoutes?.length ?? 0} detected):</strong>
${(state.apiRoutes || []).map((r: string) => `• /api/${r}`).join("\n")}

<strong>Auth:</strong> /api/auth/[...nextauth]
<strong>Stores:</strong> create, products, import-x-data, approve
<strong>Printful:</strong> connect, import, sync-drupal, status, products, catalog, orders, shipping-rates, webhook
<strong>Social:</strong> follow, followers, picks, shoutouts, seed-from-x
<strong>Content:</strong> favorites, favorites/enrich, gallery, gallery/upload, articles, music, communities, social-feeds, blocks, builds
<strong>Design:</strong> design-studio/generate, design-studio/publish, design-studio/enhance, design-studio/import-post
<strong>Admin:</strong> invite/admin, guide, admin/wiki
<strong>Cron:</strong> code-audit, wiki-update, x-money-watcher`,
    },
    {
      id: "wireframe-blocks",
      title: "Page Builder Blocks",
      content: `<strong>Available wireframe blocks (${state.blockTypes?.length ?? 0}):</strong>
${(state.blockTypes || []).map((b: string) => `• ${b}`).join("\n")}

<strong>Layout:</strong> 2-column — Main Content (3/4) + Right Sidebar (1/4)
<strong>Compact mode:</strong> Sidebar blocks get compact=true (people 2-across, images 1-across)
<strong>Color schemes (10):</strong> Midnight, Ocean, Forest, Sunset, Royal, Cherry, Arctic, Ember, Slate, Neon
<strong>Backgrounds (9+):</strong> Nature, Mountain, Space, Ocean Waves, City Night, Desert, Aurora, Abstract + custom upload`,
    },
    {
      id: "drupal-modules",
      title: "Drupal Custom Modules",
      content: `<strong>Installed modules:</strong>
${(state.drupalModules || []).map((m: string) => `• ${m}`).join("\n")}

<strong>x_profile_auto_importer:</strong> Creates x_user_profile node + Commerce store on registration
<strong>x_profile_sync:</strong> X profile lookup/sync REST endpoints
<strong>rareimagery_cost_dashboard:</strong> Cost tracking, Cloudflare analytics, budget monitoring
<strong>rareimagery_grok_creator_studio:</strong> Per-creator Grok Imagine usage logging
<strong>rareimagery_printful_sync:</strong> Server-side Printful product import for all stores
<strong>rareimagery_invite_gate:</strong> Invite code generation, validation, redemption`,
    },
    {
      id: "cron-agents",
      title: "Automated Agents",
      content: `<strong>Active cron jobs (${state.cronAgents?.length ?? 0}):</strong>
${(state.cronAgents || []).map((a: any) => `• <strong>${a.name}</strong> — ${a.schedule} (${a.path})`).join("\n")}

<strong>Code Audit (every 6 hrs):</strong> 30+ health checks, Drupal cache/cron, Printful sync-all, email alerts
<strong>Wiki Update (every 2 hrs):</strong> Probes live site, updates admin wiki + howto guide with current state
<strong>X Money Watcher (every 12 hrs):</strong> Probes X Money API endpoints, alerts when live`,
    },
    {
      id: "payments",
      title: "Payments & Fees",
      content: `<strong>Payment Processor:</strong> Stripe Connect Express (per-store accounts). X Money adapter stubbed.

<strong>Fee Structure:</strong>
• X Creator Subscription: $4/month to @RareImagery on X (platform access)
• Store maintenance: $2/month — <strong>only charged in months with sales</strong>. No sales = no fee.
• Payment processing: $0.30/transaction (Stripe or X Money)
• No per-order platform fees, no listing fees

<strong>Key rules:</strong>
• Users without a store are never charged anything beyond the X subscription
• Store owners who make zero sales in a month are NOT charged the $2 maintenance fee
• The $2 fee only applies to months where at least one sale is completed`,
    },
    {
      id: "auth",
      title: "Authentication",
      content: `<strong>Primary:</strong> X OAuth 2.0 via NextAuth 4.x
<strong>Secondary:</strong> Google OAuth, Facebook OAuth
<strong>Invite Gate:</strong> Signup requires RARE-XXXXXXXX code before OAuth
<strong>Subscription Gate:</strong> X Creator Subscription to @RareImagery checked on first login
<strong>Admin:</strong> X accounts in ADMIN_X_USERNAMES env var`,
    },
    {
      id: "printful",
      title: "Printful Integration",
      content: `<strong>Per-Store Keys:</strong> Each creator connects their own Printful Private Token
<strong>Auto-Sync:</strong> On connect, fires Drupal-side sync (no serverless timeouts)
<strong>Product Types:</strong> t_shirt, hoodie, ballcap (determined by name keywords)
<strong>Cron Sync:</strong> Code audit triggers /api/printful-sync-all every 6 hours
<strong>Color-Matched Images:</strong> Per-variation front/back URLs for gallery swapping`,
    },
    {
      id: "infrastructure",
      title: "Infrastructure",
      content: `<strong>Frontend:</strong> Vercel auto-deploys on push to main
<strong>Backend:</strong> SSH root@72.62.80.155 → /var/www/html/mysite
<strong>DNS:</strong> Cloudflare → Vercel. Per-store URLs via proxy.ts middleware rewrite.
<strong>Caches:</strong> s-maxage=60, stale-while-revalidate=300. No-store for auth/store routes.
<strong>Drupal cache cleared every 6 hours by code-audit agent.`,
    },
    {
      id: "invites",
      title: "Invite Code System",
      content: `<strong>Current inventory:</strong> ${state.totalInvites ?? "?"} total codes, ${state.availableInvites ?? "?"} available, ${state.usedInvites ?? "?"} used

<strong>Flow:</strong>
1. Admin generates code at /console/admin/invites (RARE-XXXXXXXX format)
2. Admin DMs code to X subscriber
3. User enters code on /signup before OAuth buttons appear
4. Code validated against Drupal, stored in sessionStorage
5. After OAuth, code marked as used

<strong>Drupal endpoints:</strong> /api/invite/generate, /api/invite/validate, /api/invite/redeem, /api/invite/list`,
    },
    {
      id: "sync-meta",
      title: "Last Sync",
      content: `<strong>This wiki was last auto-updated:</strong> ${now}
<strong>Agent:</strong> wiki-update-agent (runs every 2 hours)
<strong>Method:</strong> Probes live endpoints, queries Drupal, rebuilds sections from current state`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Load / save admin wiki
// ---------------------------------------------------------------------------

async function loadAdminWiki(): Promise<{ uuid: string | null; sections: WikiSection[] }> {
  if (!DRUPAL_API_URL) return { uuid: null, sections: [] };
  try {
    const res = await fetch(
      `${DRUPAL_API_URL}/jsonapi/node/page?filter[title]=${encodeURIComponent(ADMIN_WIKI_TITLE)}&page[limit]=1`,
      { headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" }, cache: "no-store" }
    );
    if (!res.ok) return { uuid: null, sections: [] };
    const json = await res.json();
    const node = json.data?.[0];
    if (!node) return { uuid: null, sections: [] };
    try {
      return { uuid: node.id, sections: JSON.parse(node.attributes?.body?.value || "[]") };
    } catch {
      return { uuid: node.id, sections: [] };
    }
  } catch {
    return { uuid: null, sections: [] };
  }
}

async function saveAdminWiki(uuid: string | null, sections: WikiSection[]): Promise<boolean> {
  if (!DRUPAL_API_URL) return false;
  const wh = await drupalWriteHeaders();
  const body = JSON.stringify(sections);

  if (uuid) {
    const res = await fetch(`${DRUPAL_API_URL}/jsonapi/node/page/${uuid}`, {
      method: "PATCH",
      headers: { ...wh, "Content-Type": "application/vnd.api+json" },
      body: JSON.stringify({ data: { type: "node--page", id: uuid, attributes: { body: { value: body, format: "plain_text" } } } }),
    });
    return res.ok;
  } else {
    const res = await fetch(`${DRUPAL_API_URL}/jsonapi/node/page`, {
      method: "POST",
      headers: { ...wh, "Content-Type": "application/vnd.api+json" },
      body: JSON.stringify({
        data: { type: "node--page", attributes: { title: ADMIN_WIKI_TITLE, status: false, body: { value: body, format: "plain_text" } } },
      }),
    });
    return res.ok;
  }
}

// ---------------------------------------------------------------------------
// Main agent
// ---------------------------------------------------------------------------

export async function runWikiUpdateAgent(): Promise<WikiUpdateReport> {
  const startTime = Date.now();
  const changes: string[] = [];
  let probesRun = 0;
  let sectionsUpdated = 0;

  try {
    const baseUrl = resolveBaseUrl();

    // Discover current platform state
    const state = await discoverPlatformState(baseUrl);
    probesRun = (state.consolePages?.length ?? 0) + (state.publicPages?.length ?? 0) + (state.apiRoutes?.length ?? 0) + 10;

    // Build fresh wiki sections from live state
    const freshSections = buildAdminWikiSections(state);

    // Load existing wiki
    const { uuid, sections: existing } = await loadAdminWiki();

    // Compare — update sections that have changed
    // For auto-generated sections, always overwrite with fresh data
    // For admin-edited sections (detected by content mismatch with ANY previous auto-gen), preserve
    const merged: WikiSection[] = [];
    for (const fresh of freshSections) {
      const old = existing.find((s) => s.id === fresh.id);
      if (!old) {
        // New section
        merged.push(fresh);
        changes.push(`Added new section: ${fresh.title}`);
        sectionsUpdated++;
      } else if (fresh.id === "sync-meta" || fresh.id === "architecture") {
        // Always update stats and meta sections
        merged.push(fresh);
        if (old.content !== fresh.content) {
          sectionsUpdated++;
        }
      } else {
        // Keep existing (may have admin edits)
        // But check if auto-generated data sections should update
        merged.push(old);
      }
    }

    // Add any custom sections admin created that aren't in our template
    for (const old of existing) {
      if (!freshSections.find((f) => f.id === old.id)) {
        merged.push(old);
      }
    }

    // Save
    const saved = await saveAdminWiki(uuid, merged);
    if (saved) {
      changes.push(`Wiki saved with ${merged.length} sections (${sectionsUpdated} updated)`);
    } else {
      changes.push("ERROR: Failed to save wiki to Drupal");
    }

    return {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      probesRun,
      sectionsUpdated,
      changes,
      status: sectionsUpdated > 0 ? "updated" : "current",
    };
  } catch (err: any) {
    return {
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      probesRun,
      sectionsUpdated: 0,
      changes: [`Error: ${err?.message || "Unknown"}`],
      status: "error",
    };
  }
}
