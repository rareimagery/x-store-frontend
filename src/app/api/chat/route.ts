import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getStoreUrl } from "@/lib/store-url";

const XAI_API_URL = "https://api.x.ai/v1/chat/completions";

const rateLimitMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 3600000; // 1 hour

// ---------------------------------------------------------------------------
// Base rules shared across storefront styles.
// ---------------------------------------------------------------------------

const BASE_RULES = `You are a Next.js frontend engineer building components for RareImagery creator storefronts.

Rules:
- Output only valid React/JSX code that can run in a browser with Babel standalone
- Use Tailwind CSS utility classes for layout and spacing
- Use inline styles or <style> tags for custom animations — Tailwind cannot express these
- Never explain concepts — respond with code only
- Always export a default function component
- Output a single self-contained component per response
- Do not use import statements (React is available globally in the preview)
- If the request is unclear, default to a styled card or section component`;

// ---------------------------------------------------------------------------
// Style-specific instructions.
// ---------------------------------------------------------------------------

const THEME_PROMPTS: Record<string, string> = {
  xai3: `Visual language: Dark, premium, X-inspired.
- Backgrounds: zinc-950, zinc-900, pure black
- Accent colors: indigo-500, purple-500, gold/amber highlights
- Typography: clean sans-serif, monospace for stats/numbers
- Borders: subtle zinc-800, rounded-xl containers
- Layout: centered column (max 600px), card-based, generous padding
- Vibe: sleek, data-driven, premium creator platform`,

  minimal: `Visual language: Clean, light, whitespace-forward.
- Backgrounds: white, gray-50, warm neutrals
- Accent colors: black text, subtle gray borders, one pop color (indigo or teal)
- Typography: system font stack, light weights, generous line height
- Borders: thin (1px), light gray, large border-radius
- Layout: max-width containers, lots of whitespace, grid-based
- Vibe: elegant, calm, editorial simplicity`,

  neon: `Visual language: Cyberpunk, dark, neon glow.
- Backgrounds: pure black (#000), very dark grays
- Accent colors: cyan (#00ffff), magenta (#ff00ff), neon green (#00ff80), electric blue
- Typography: bold sans-serif, uppercase headers, glow text-shadows
- Borders: neon glow effects (box-shadow with color), thick colored borders
- Layout: asymmetric, bold sections, full-bleed color blocks
- Animations: pulse, glow transitions, color cycling
- Vibe: synthwave, cyberpunk, high-energy`,

  editorial: `Visual language: Magazine-style, warm, sophisticated.
- Backgrounds: cream (#faf8f5), warm white, soft beige
- Accent colors: deep navy, burgundy, forest green, warm gold
- Typography: serif headings (Georgia/Times), sans body text, large type sizes
- Borders: thin rules, editorial dividers, minimal decoration
- Layout: magazine grid, pull quotes, asymmetric columns, generous margins
- Vibe: editorial, curated, gallery-like, intellectual`,

  myspace: `Visual language: MySpace-era Y2K, maximalist, nostalgic.
- Backgrounds: tiled emoji patterns, glitter textures, dark or neon gradients
- Typography: CSS blink, rainbow text, glitter-text animations, marquee elements
- Colors: hot pink (#ff0080), electric purple, cyber teal (#00ffff), scene gold, deep black
- Borders: pixel-art style, thick neon glows, dashed/dotted with color
- Layout: expressive, asymmetric, dense — not clean or minimal
- Animations: blink, rainbow color cycling, glitter sparkle, marquee scroll
- Vibe: chaotic, fun, deeply personal, peak MySpace energy`,

  xmimic: `Visual language: X/Twitter clone, timeline-focused.
- Backgrounds: black (#000), zinc-900 cards
- Accent colors: blue-500 (X blue), white text, gray-500 secondary
- Typography: system sans-serif, 15px body, bold display names
- Borders: 1px zinc-800 dividers, rounded-2xl cards
- Layout: single column (600px max), timeline cards, avatar + content rows
- Vibe: social media, familiar, content-first, conversation-threaded`,

  "template-builder": `You are operating in RareImagery Template Builder mode.
- Return ONLY valid JSON, never JSX.
- JSON format must be: { "layoutSchemaVersion": 1, "data": { "content": [...], "root": { "props": {} } } }
- Allowed component types in data.content: Hero, ProductGrid, DonationBar, PostsList
- Each content item must be { "type": "<allowed>", "props": { ... } }
- Keep copy concise and conversion-focused for creator storefronts
- If user asks for changes, return a full updated JSON payload for the canvas`,

  "builder-copilot": `You are operating in RareImagery Builder Copilot mode.
- Return ONLY valid JSON.
- JSON format must be: { "summary": string, "actions": AiAction[] }
- AiAction types:
  1) { "type": "add_block", "blockType": "top-menu"|"profile-header"|"sidebar"|"friends-list"|"post-feed"|"product-grid"|"media-widget"|"custom-embed" }
  2) { "type": "remove_block", "blockType": <same as above> }
  3) { "type": "set_name", "name": string }
  4) { "type": "set_theme", "field": "pageBg"|"menuBg"|"sidebarBg"|"surface"|"surfaceMuted"|"accent"|"textPrimary"|"textSecondary"|"border", "value": string }
  5) { "type": "set_block_prop", "blockType": <same as above>, "key": string, "value": string|number|boolean }
- Keep actions safe and minimal; prefer at most 6 actions.
- Never output prose outside JSON.`,
};

interface CreatorContext {
  username?: string;
  storeSlug?: string;
  bio?: string;
  followerCount?: number;
  products?: Array<{ name: string; price?: string }>;
  topPosts?: Array<{ title?: string; summary?: string }>;
}

function getSystemPrompt(theme: string, ctx?: CreatorContext): string {
  if (theme === "template-builder" || theme === "builder-copilot") {
    const lines: string[] = [THEME_PROMPTS["template-builder"]];
    if (theme === "builder-copilot") {
      lines[0] = THEME_PROMPTS["builder-copilot"];
    }
    if (ctx?.username) {
      lines.push(`Creator handle: @${ctx.username}`);
    }
    if (ctx?.products?.length) {
      lines.push(
        `Known products: ${ctx.products
          .slice(0, 8)
          .map((p) => `${p.name}${p.price ? ` ($${p.price})` : ""}`)
          .join(", ")}`
      );
    }
    if (ctx?.topPosts?.length) {
      lines.push(
        `Known posts: ${ctx.topPosts
          .slice(0, 5)
          .map((p) => p.title ?? p.summary ?? "")
          .filter(Boolean)
          .join(" | ")}`
      );
    }
    return lines.join("\n");
  }

  const themeBlock = THEME_PROMPTS[theme] || THEME_PROMPTS.xai3;
  const base = `${BASE_RULES}\n\nStore style: "${theme}"\n${themeBlock}`;

  if (!ctx?.username) return base;

  const lines: string[] = [
    `\n\n--- Creator Context ---`,
    `Creator: @${ctx.username}`,
  ];
  if (ctx.storeSlug) lines.push(`Store URL: ${getStoreUrl(ctx.storeSlug)}`);
  if (ctx.bio) lines.push(`Bio: ${ctx.bio}`);
  if (ctx.followerCount) lines.push(`Audience: ${ctx.followerCount.toLocaleString()} followers`);
  if (ctx.products?.length) {
    lines.push(`Products: ${ctx.products.slice(0, 5).map((p) => `${p.name}${p.price ? ` ($${p.price})` : ""}`).join(", ")}`);
  }
  if (ctx.topPosts?.length) {
    lines.push(`Top content: ${ctx.topPosts.slice(0, 3).map((p) => p.title ?? p.summary ?? "").join("; ")}`);
  }
  lines.push(
    `Prioritize this creator's context — feature their products above the fold and reflect their brand voice.`,
    `--- End Context ---`
  );
  return base + lines.join("\n");
}

// ---------------------------------------------------------------------------
// Route handler — streaming with prompt caching
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (token.sub ?? token.xId ?? "anon") as string;

  // Rate limiting
  const now = Date.now();
  const limit = rateLimitMap.get(userId) ?? {
    count: 0,
    reset: now + RATE_WINDOW,
  };
  if (now > limit.reset) {
    limit.count = 0;
    limit.reset = now + RATE_WINDOW;
  }
  if (limit.count >= RATE_LIMIT) {
    return NextResponse.json(
      { error: "Rate limit reached. Try again in an hour." },
      { status: 429 }
    );
  }
  limit.count++;
  rateLimitMap.set(userId, limit);

  const { message, theme, creatorContext } = await req.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const systemPrompt = getSystemPrompt(theme || "xai3", creatorContext as CreatorContext | undefined);

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 500 });
  }

  let generated = "";
  try {
    const useJsonResponse = (theme || "xai3") === "template-builder";

    const aiRes = await fetch(XAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-3-mini",
        ...(useJsonResponse ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.6,
        max_tokens: 4000,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("[chat] xAI error:", aiRes.status, text.slice(0, 400));
      return NextResponse.json({ error: "Grok request failed" }, { status: 502 });
    }

    const json = await aiRes.json();
    generated = json.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    console.error("[chat] xAI request failed:", err);
    return NextResponse.json({ error: "Grok request failed" }, { status: 502 });
  }

  const readableStream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(generated));
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
    },
  });
}
