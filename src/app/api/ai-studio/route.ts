import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const XAI_API_URL = "https://api.x.ai/v1/chat/completions";

// ---------------------------------------------------------------------------
// Rate limiting — 10 generations / hour per user
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 3_600_000; // 1 hour

// ---------------------------------------------------------------------------
// Valid component IDs the playground understands
// ---------------------------------------------------------------------------
const VALID_COMPONENTS = new Set([
  "subscriber-hero",
  "product-grid",
  "video-embed",
  "testimonials",
  "top-posts",
  "merch-shelf",
]);

// ---------------------------------------------------------------------------
// System prompt — subscriber-first storefront builder
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are Grok Studio Builder for rareimagery.net — expert Next.js 15 (App Router, Server Components) + Tailwind + shadcn/ui engineer.
You have full access to this creator's Drupal data: X handle, bio, avatar, Grok videos (R2 URLs), products, subscriber count, verified badge.
Every component must be subscriber-first: make "$4/month with X Money" the strongest CTA everywhere.
Output ONLY clean, copy-pasteable JSX (one self-contained component) + optional custom CSS. Use modern mobile-first design.
Prioritize Grok video embeds, one-click X Money subscribe buttons, and X-native feel.

You MUST respond with a single valid JSON object in exactly this shape (no markdown fences, no extra text):
{"tailwindCode":"<self-contained JSX component string>","componentsToAdd":["subscriber-hero"]}

"tailwindCode" — one self-contained React component using Tailwind CSS classes. React is available globally; no imports.
"componentsToAdd" — array of section IDs to inject. Choose from: subscriber-hero, product-grid, video-embed, testimonials, top-posts, merch-shelf.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type AIStudioRequest = {
  prompt?: unknown;
  handle?: unknown;
  drupalContext?: unknown;
};

interface AIStudioResult {
  tailwindCode: string;
  componentsToAdd: string[];
}

function buildUserMessage(prompt: string, handle: string, ctx: unknown): string {
  const lines = [
    `Creator: @${handle}`,
    ctx ? `Drupal context:\n${JSON.stringify(ctx).slice(0, 4000)}` : "",
    `\nRequest: ${prompt}`,
    "\nReturn the JSON object only.",
  ];
  return lines.filter(Boolean).join("\n");
}

function extractJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// Heuristic fallbacks when Grok call fails or API key missing
function heuristicComponents(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const result: string[] = [];
  if (/(video|reel|clip|grok)/.test(lower)) result.push("video-embed");
  if (/(product|shop|merch|bundle|checkout)/.test(lower)) result.push("product-grid");
  if (/(subscribe|subscriber|membership|\$4|cta)/.test(lower)) result.push("subscriber-hero");
  if (/(post|feed|latest|timeline)/.test(lower)) result.push("top-posts");
  return Array.from(new Set(result));
}

function heuristicTailwind(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (/(retro|myspace|y2k)/.test(lower)) {
    return [
      ":root { --ri-accent: #ff5db1; }",
      "[data-ri-preview] h1, [data-ri-preview] h2 { text-shadow: 0 0 18px rgba(255,93,177,0.45); }",
      "[data-ri-preview] .ri-card { border-radius: 18px; background: linear-gradient(145deg,#160b2e,#3e0f44); border: 1px solid rgba(255,255,255,0.2); }",
    ].join("\n");
  }
  if (/(minimal|clean|simple)/.test(lower)) {
    return [
      "[data-ri-preview] { --ri-surface: #f8fafc; --ri-text: #111827; }",
      "[data-ri-preview] .ri-card { background: var(--ri-surface); color: var(--ri-text); border: 1px solid rgba(17,24,39,0.09); border-radius: 14px; }",
    ].join("\n");
  }
  return "[data-ri-preview] .ri-card { border-radius: 16px; border: 1px solid rgba(148,163,184,0.24); }";
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (token.sub ?? token.xId ?? "anon") as string;

  // Rate limiting
  const now = Date.now();
  const limit = rateLimitMap.get(userId) ?? { count: 0, reset: now + RATE_WINDOW };
  if (now > limit.reset) { limit.count = 0; limit.reset = now + RATE_WINDOW; }
  if (limit.count >= RATE_LIMIT) {
    return NextResponse.json({ error: "Rate limit reached. Try again in an hour." }, { status: 429 });
  }
  limit.count++;
  rateLimitMap.set(userId, limit);

  const body = (await req.json().catch(() => ({}))) as AIStudioRequest;
  const prompt = (typeof body.prompt === "string" ? body.prompt : "").trim();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const handle = typeof body.handle === "string" ? body.handle : "creator";
  const apiKey = process.env.XAI_API_KEY;

  // Fall back to heuristics when no API key (dev / cold test)
  if (!apiKey) {
    const result: AIStudioResult = {
      tailwindCode: heuristicTailwind(prompt),
      componentsToAdd: heuristicComponents(prompt),
    };
    return NextResponse.json(result);
  }

  let grokResult: AIStudioResult | null = null;
  try {
    const aiRes = await fetch(XAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-3-mini",
        temperature: 0.5,
        max_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserMessage(prompt, handle, body.drupalContext) },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (aiRes.ok) {
      const json = await aiRes.json() as { choices?: Array<{ message?: { content?: string } }> };
      const raw = json.choices?.[0]?.message?.content ?? "";
      const parsed = extractJsonObject(raw);

      if (parsed) {
        const tailwindCode = typeof parsed.tailwindCode === "string" ? parsed.tailwindCode : heuristicTailwind(prompt);
        const rawComponents = Array.isArray(parsed.componentsToAdd) ? parsed.componentsToAdd : [];
        const componentsToAdd = Array.from(
          new Set(
            rawComponents
              .map((v) => String(v))
              .filter((v) => VALID_COMPONENTS.has(v))
          )
        );
        grokResult = { tailwindCode, componentsToAdd };
      }
    } else {
      console.error("[ai-studio] xAI error:", aiRes.status);
    }
  } catch (err) {
    console.error("[ai-studio] request failed:", err);
  }

  // Merge Grok result with heuristic fallbacks
  const tailwindCode = grokResult?.tailwindCode || heuristicTailwind(prompt);
  const componentsToAdd = Array.from(
    new Set([...(grokResult?.componentsToAdd ?? []), ...heuristicComponents(prompt)])
  );

  return NextResponse.json({ tailwindCode, componentsToAdd } satisfies AIStudioResult);
}
