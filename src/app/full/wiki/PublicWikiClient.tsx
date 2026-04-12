"use client";

import { useEffect, useState } from "react";

interface WikiSection {
  id: string;
  title: string;
  content: string;
}

const WIKI_SECTIONS: WikiSection[] = [
  {
    id: "architecture",
    title: "Architecture Overview",
    content: `<strong>Tech Stack:</strong> Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 on self-hosted VPS. Drupal 11 (headless) + Commerce 3 + PostgreSQL 16 on Ubuntu 24.04 VPS.

<strong>Data Flow:</strong> Browser &rarr; Next.js API Routes &rarr; Drupal JSON:API &rarr; PostgreSQL. Browser never calls Drupal directly.

<strong>External Services:</strong> Stripe Connect (payments &amp; payouts), Printful (print-on-demand fulfillment), X API v2 (identity/content), Grok AI (image generation + editing + chat), Brevo SMTP (email), Cloudflare (DNS + SSL).

<strong>Domain Architecture:</strong>
&bull; www.rareimagery.net &mdash; Main site, console, login, API, auth
&bull; {slug}.rareimagery.net &mdash; Public creator storefronts (subdomain routing via proxy.ts)
&bull; Wildcard DNS: *.rareimagery.net &rarr; VPS, Cloudflare Flexible SSL`,
  },
  {
    id: "auth",
    title: "Authentication & Access",
    content: `<strong>Primary:</strong> X (Twitter) OAuth 2.0 with PKCE via NextAuth 4.x
<strong>Scope:</strong> tweet.read, users.read, follows.read, offline.access
<strong>Session:</strong> JWT-based with xUsername, xId, storeSlug, role, providerType

<strong>Access Gates:</strong>
&bull; <strong>Invite Code:</strong> Signup at /signup requires a RARE-XXXXXXXX invite code validated against Drupal. Codes are single-use, redeemed after store creation.
&bull; <strong>Subscription:</strong> X Creator Subscription to @RareImagery checked on first login.
&bull; <strong>Admin:</strong> X accounts listed in ADMIN_X_USERNAMES env var get full admin access.

<strong>Roles:</strong>
&bull; admin &mdash; Full console + admin panel (stores, users, invites, cost dashboard)
&bull; creator &mdash; Console for their own store only

<strong>Callback URL:</strong> https://www.rareimagery.net/api/auth/callback/twitter`,
  },
  {
    id: "creator-flow",
    title: "Creator Signup Flow",
    content: `<strong>End-to-end flow for a new creator:</strong>

1. Receive invite code from RareImagery team
2. Go to /signup &rarr; enter invite code &rarr; validated against Drupal
3. Click "Sign up with X" &rarr; X OAuth 2.0 with PKCE
4. Subscription check (must subscribe to @RareImagery on X)
5. Onboarding wizard: verify X profile data, choose subdomain (real-time availability check), pick store template
6. Store creation: POST /api/stores/create &rarr; Drupal provision endpoint creates user + X profile + Commerce store atomically
7. Invite code redeemed automatically after store creation
8. DNS provisioned: {slug}.rareimagery.net goes live
9. Creator lands in Console at /console

<strong>Drupal Provision (atomic):</strong> Single call to POST /api/creator/provision creates:
&bull; Drupal user with x_creator role
&bull; x_user_profile node with all X API data (avatar, banner, bio, followers, verified status)
&bull; Commerce store with slug, status=approved, linked to profile
&bull; Profile images downloaded and attached as Drupal file entities`,
  },
  {
    id: "console",
    title: "Console Dashboard",
    content: `<strong>Workspace section:</strong>
&bull; <strong>Page Building</strong> &mdash; Drag-and-drop wireframe editor (Main Content + Right Sidebar columns)
&bull; <strong>Grok Creator Studio</strong> &mdash; AI design tool with Refine, Design Chat, Session History, Mockup Preview (see below)
&bull; <strong>Products</strong> &mdash; Drag-and-drop product grid with tabs: All Products, Printful, My Uploads. Edit/delete with modal.
&bull; <strong>Grok Library</strong> &mdash; Saved AI-generated designs with folders. "Use in Studio" button loads design back into Creator Studio.
&bull; <strong>My Subscribers</strong> &mdash; X Creator Subscriber dashboard with stats, search, tier management
&bull; <strong>My Favorites</strong> &mdash; Drag-and-drop creator curation with @dnd-kit
&bull; <strong>Social Feeds</strong> &mdash; Connect TikTok, Instagram, YouTube accounts
&bull; <strong>Music</strong> &mdash; Spotify + Apple Music playlist builder

<strong>Store section (dropdown):</strong>
&bull; Orders, Shipping, Accounting, Printful, Settings

<strong>Platform Admin (admin only):</strong>
&bull; All Stores, Users, X Subscribers, Cost Dashboard, Invite Codes`,
  },
  {
    id: "design-studio",
    title: "Grok Creator Studio",
    content: `<strong>Purpose:</strong> AI-powered design tool for creating print-on-demand products. Creators describe their design, Grok generates it, they refine it, preview it on the product, and publish to Printful.

<strong>6 Product Types:</strong> T-Shirt, Hoodie, Ballcap, Pet Bandana, Pet Hoodie, Digital Drop

<strong>2 Engines:</strong>
&bull; <strong>Grok AI</strong> &mdash; Text-to-image via /v1/images/generations. With reference image, uses /v1/images/edits (preserves reference). 4 variants per generation.
&bull; <strong>Exact+Text</strong> &mdash; Server-side Sharp compositing. 8 style variants (Bold, Neon, Streetwear, Vintage, Clean, Fire, Ice, Purple). No AI, pixel-perfect.

<strong>Input Tools:</strong>
&bull; Free-text prompt + "Enhance with AI" (Grok 3 Mini rewrites for print optimization)
&bull; From @profile &mdash; fetch any X user's PFP as reference
&bull; From X Post &mdash; import post text + images + engagement stats
&bull; Upload &mdash; reference image (JPEG/PNG/WebP, max 4MB)

<strong>Refine This (Phase 1):</strong> Hover any variant thumbnail &rarr; "Refine" overlay. Opens refinement panel with free-text prompt + quick chips (Warmer colors, More detail, Bolder contrast, Simpler/cleaner, Darker mood, Add texture). Uses Edit API with n=1, appends refined variant to grid for comparison.

<strong>Design Chat:</strong> Floating purple sparkle button opens AI design assistant drawer. Powered by /api/design-studio/chat. Suggests prompts with "Use" button that auto-fills the prompt field.

<strong>Session History:</strong> Collapsible accordion below results showing all generation attempts with thumbnails. Click any historical variant to bring it back.

<strong>Mockup Preview:</strong> "Preview" button calls Printful mockup API to show design on actual product (hoodie, t-shirt, etc.) before publishing. Polls up to 30 seconds.

<strong>Publishing:</strong> Set title + price &rarr; Publish to Printful &rarr; creates sync product with all size/color variants &rarr; creates Drupal Commerce product. $1.00 flat fee per publish.

<strong>Generation Limits:</strong> 100 free/month (tracked in Drupal, persists across deploys). $0.25 per generation after free tier. Progress bar shown on page load.`,
  },
  {
    id: "products",
    title: "Products & Store",
    content: `<strong>Product Types:</strong> Clothing (t-shirt, hoodie, ballcap), Pet (bandana, hoodie), Digital Drop, General, Physical Custom

<strong>Products Page (/console/products):</strong>
&bull; Drag-and-drop grid with @dnd-kit (2 cols mobile, 3 tablet, 4 desktop)
&bull; Cards show product image, type badge, price, variant count, hover edit/delete
&bull; Tabs: All Products, Printful, My Uploads
&bull; Product order saved to Drupal field_product_order via POST /api/stores/products/order
&bull; "Create Product" links to Design Studio

<strong>Public Storefront:</strong> Products displayed at {slug}.rareimagery.net/store
&bull; Product detail pages at /products/{product-slug} (global route, passes through on subdomains)
&bull; Color-matched image gallery, size/color selection, Add to Cart + Buy Now buttons

<strong>Printful Integration:</strong>
&bull; Per-store API keys stored in Drupal (field_printful_api_key)
&bull; Catalog IDs: t_shirt=71, hoodie=146, ballcap=439, pet_bandana=902, pet_hoodie=921
&bull; Webhook at /api/printful/webhook handles: package_shipped, order_failed, order_canceled, hold, stock_updated
&bull; Source IP validation against known Printful IPs`,
  },
  {
    id: "payments",
    title: "Payments & Checkout",
    content: `<strong>Payment Processor:</strong> Stripe Connect Express (per-store accounts)

<strong>How Payments Work:</strong>
1. Customer clicks Buy Now or Add to Cart on a creator's store
2. Cart page (/cart) shows items, quantities, totals
3. Checkout button creates Stripe Checkout session via POST /api/checkout/products
4. Customer enters card on Stripe-hosted checkout page (RareImagery never sees card data)
5. Stripe splits payment: creator's earnings &rarr; their Stripe account, platform fee deducted
6. Webhook (checkout.session.completed) creates Drupal Commerce order + submits Printful fulfillment order
7. Creator receives payout to their bank via Stripe (typically 2 business days)

<strong>RareImagery never holds creator money.</strong> Payments go directly from customer to creator via Stripe Connect.

<strong>Stripe Connect Onboarding:</strong> Console &rarr; Settings &rarr; "Connect Stripe for Payouts" &rarr; redirects to Stripe Express onboarding (ID verification, bank details). Account ID saved to Drupal field_stripe_account_id.

<strong>Fee Structure:</strong>
&bull; Payment processing: 2.9% + $0.30 per transaction (standard Stripe rate)
&bull; Grok AI generations: 100 free/month, $0.25 each after
&bull; Publish to Printful: $1.00 per product published
&bull; Product listings: first 50 free, $0.05 per listing after
&bull; Printful base cost: varies per product (deducted from retail price, difference is creator profit)

<strong>Webhook Events Handled:</strong>
&bull; checkout.session.completed &mdash; Creates Drupal order + Printful fulfillment
&bull; customer.subscription.deleted &mdash; Suspends store
&bull; invoice.payment_failed &mdash; Sets store to payment_warning
&bull; invoice.payment_succeeded &mdash; Clears payment_warning

<strong>Commerce Order Fields:</strong> field_stripe_session_id, field_printful_status, field_printful_order_id, field_tracking_number, field_shipping_carrier, field_tracking_url`,
  },
  {
    id: "drupal",
    title: "Drupal Backend",
    content: `<strong>Stack:</strong> Drupal 11.3.5, PHP 8.3 FPM, PostgreSQL 16, Nginx, Ubuntu 24.04

<strong>8 RareImagery Custom Modules:</strong>
&bull; <strong>rareimagery_creator_api</strong> &mdash; REST controller: provision, profile CRUD, sync-x, change-slug, check-slug
&bull; <strong>rareimagery_store_provision</strong> &mdash; Atomic user + profile + store creation with audit logging
&bull; <strong>rareimagery_x_sync</strong> &mdash; XProfileFetcher service, X API v2 data normalization, image downloads
&bull; <strong>rareimagery_subdomain</strong> &mdash; SubdomainManager: slug availability, DNS provisioning
&bull; <strong>rareimagery_invite_gate</strong> &mdash; Invite code generation, validation, redemption
&bull; <strong>rareimagery_printful_sync</strong> &mdash; Server-side Printful product import
&bull; <strong>rareimagery_grok_creator_studio</strong> &mdash; Grok usage logging per creator
&bull; <strong>rareimagery_cost_dashboard</strong> &mdash; Cost tracking and analytics

<strong>Content Model:</strong>
&bull; Node: x_user_profile (15+ fields: username, bio, pfp, followers, verified, etc.)
&bull; Commerce Store: online &mdash; field_store_slug, field_stripe_account_id, field_printful_api_key, field_product_order, field_monthly_gen_count, field_page_builds, field_my_favorites, etc.
&bull; Commerce Products: clothing, printful, default, digital_download, crafts
&bull; Commerce Orders: default &mdash; with tracking, Stripe, and Printful fields
&bull; Attributes: color (17 values), size (10 values)

<strong>All 5 store API routes are thin proxies to Drupal modules:</strong>
&bull; POST /api/stores/create &rarr; POST /api/creator/provision
&bull; GET/PATCH /api/stores/edit &rarr; /api/creator/profile/{username}
&bull; POST /api/stores/sync-x &rarr; /api/creator/sync-x/{username}
&bull; POST /api/stores/change-slug &rarr; /api/creator/change-slug/{username}
&bull; GET /api/stores/check-slug &rarr; /api/creator/check-slug?slug=x`,
  },
  {
    id: "page-builder",
    title: "Page Builder",
    content: `<strong>Layout:</strong> 2-column wireframe &mdash; Main Content (3/4 width) + Right Sidebar (1/4 width)

<strong>Block Types (10):</strong> Product Grid, Pinned Post, Social Feed, Music Player, Grok Gallery, TikTok, Instagram, YouTube, My Favorites, Top Followers

<strong>Color Schemes (10):</strong> Midnight, Ocean, Forest, Sunset, Royal, Cherry, Arctic, Ember, Slate, Neon

<strong>Page Backgrounds (9):</strong> Nature, Mountain, Space, Ocean Waves, City Night, Desert, Aurora, Abstract + custom upload

<strong>Storage:</strong> Layouts saved as JSON to Drupal via /api/builds. Published builds render on the public creator page at {slug}.rareimagery.net.`,
  },
  {
    id: "subdomain-routing",
    title: "Subdomain Routing",
    content: `<strong>How it works:</strong> proxy.ts (Next.js 16 Proxy) extracts subdomain from Host header, rewrites requests to /[creator] route.

<strong>Reserved subdomains:</strong> www, console, api, admin, app, mail, support, help, blog, login

<strong>System paths on subdomains redirect to www:</strong> /login, /signup, /onboarding, /admin, /auth, /howto, /eula, /privacy, /terms, /builder, /playground, /studio, /purchase-success, /maintenance

<strong>Special handling:</strong>
&bull; /console on subdomains &rarr; rewrites with X-Store-Slug header (stays on subdomain)
&bull; /products/* on subdomains &rarr; passes through to global /products/[slug] route (not rewritten)

<strong>Slug vs Username:</strong> Store slug can differ from X username (e.g. slug "rare" &rarr; X username "rareimagery"). resolveUsernameFromSlug() handles the lookup. basePath prop system ensures all links work correctly on both www and subdomains.`,
  },
  {
    id: "api-routes",
    title: "API Routes",
    content: `<strong>Auth:</strong> /api/auth/[...nextauth]
<strong>Stores:</strong> /api/stores/create, /api/stores/edit, /api/stores/sync-x, /api/stores/change-slug, /api/stores/check-slug, /api/stores/products, /api/stores/products/order, /api/stores/gen-count
<strong>Design Studio:</strong> /api/design-studio/generate, /api/design-studio/composite, /api/design-studio/publish, /api/design-studio/enhance, /api/design-studio/import-post, /api/design-studio/chat, /api/design-studio/preview-mockup
<strong>Printful:</strong> /api/printful/connect, /api/printful/status, /api/printful/products, /api/printful/catalog, /api/printful/orders, /api/printful/shipping-rates, /api/printful/webhook, /api/printful/webhook/setup
<strong>Payments:</strong> /api/checkout, /api/checkout/products, /api/webhooks/stripe, /api/stripe/connect/onboard, /api/stripe/connect/status
<strong>Cart:</strong> /api/cart (GET/POST &mdash; cookie-based, add/update/remove/clear)
<strong>Content:</strong> /api/favorites, /api/gallery, /api/articles, /api/music, /api/social-feeds, /api/blocks, /api/builds
<strong>Social:</strong> /api/social/follow, /api/social/followers, /api/social/picks, /api/social/shoutouts
<strong>Invite:</strong> /api/invite (POST validate, PUT redeem)
<strong>Admin:</strong> /api/admin/wiki, /api/invite/admin`,
  },
  {
    id: "infrastructure",
    title: "Infrastructure & Deployment",
    content: `<strong>Frontend VPS:</strong> /var/www/rareimagery, PM2 process manager (port 3000). Auto-deploy via GitHub webhook on push to main.

<strong>Backend VPS:</strong> Drupal at /var/www/html/mysite
&bull; Nginx reverse proxy: port 80 &rarr; Next.js (port 3000) + PHP 8.3 FPM (Drupal)
&bull; PostgreSQL 16 (native, not Docker)
&bull; Build command: ./node_modules/.bin/next build (npx next build also works)

<strong>DNS:</strong> Cloudflare manages rareimagery.net. Wildcard A record (*.rareimagery.net). SSL: Cloudflare Flexible mode.

<strong>Environment:</strong> .env.production on VPS with all required keys (Drupal, X OAuth, Stripe, XAI, Cloudflare, SMTP). .env.local for local development pointing to VPS Drupal.

<strong>Deployment flow:</strong> git push origin main &rarr; deploy hook auto-pulls &rarr; rm -rf .next &rarr; ./node_modules/.bin/next build &rarr; pm2 restart rareimagery`,
  },
];

export default function PublicWikiClient() {
  const [sections, setSections] = useState(WIKI_SECTIONS);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Fetch latest content from Drupal (falls back to hardcoded defaults)
  useEffect(() => {
    fetch("/api/public-wiki")
      .then((r) => r.json())
      .then((d) => {
        if (d.sections && Array.isArray(d.sections) && d.sections.length > 0) {
          setSections(d.sections);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActiveSection(e.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );
    const els = document.querySelectorAll(".wiki-section");
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex min-h-screen bg-zinc-950 text-white">
      {/* Sidebar TOC */}
      <nav className="fixed top-0 left-0 w-64 h-screen border-r border-zinc-800 bg-zinc-900/80 overflow-y-auto p-4 hidden md:block">
        <div className="mb-6">
          <h2 className="text-sm font-bold text-indigo-400">RareImagery</h2>
          <p className="text-[10px] text-zinc-500 mt-1">Platform Wiki</p>
        </div>
        <div className="space-y-0.5">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`block rounded-lg px-3 py-1.5 text-xs transition ${
                activeSection === s.id
                  ? "bg-indigo-600/20 text-indigo-400 font-medium"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              {s.title}
            </a>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="md:ml-64 flex-1 max-w-4xl px-6 md:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">RareImagery Platform Wiki</h1>
          <p className="text-sm text-zinc-500 mt-2">
            Complete platform documentation for the RareImagery X Marketplace.
          </p>
        </div>

        {sections.map((section) => (
          <section key={section.id} id={section.id} className="wiki-section mb-8">
            <h2 className="text-lg font-bold text-white mb-3 pb-2 border-b border-zinc-800">
              {section.title}
            </h2>
            <div
              className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          </section>
        ))}

        <footer className="mt-16 pt-6 border-t border-zinc-800 text-center">
          <p className="text-xs text-zinc-600">
            RareImagery X Marketplace &mdash; Creator commerce powered by X, Grok AI, Stripe Connect, and Printful.
          </p>
        </footer>
      </main>
    </div>
  );
}
