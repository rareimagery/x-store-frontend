import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const XAI_API_URL = "https://api.x.ai/v1/chat/completions";

const SYSTEM_PROMPT = `You are the Design Assistant inside RareImagery's Product Creator — a multi-engine merch design tool.

You help creators design T-Shirts, Hoodies, Ballcaps, and Digital Drops. You know what engine, product type, and prompt are active.

Core rules:
- Be concise. 2-3 sentences max.
- When suggesting a prompt, wrap it in **bold** so the "Use this prompt" button appears.
- Format prompts for print: centered, vibrant, high contrast, clean edges.
- Be encouraging. Never refuse creative requests.

Three design engines:
1. **Exact+Text** (blue) — Server-side compositing. Places the user's exact uploaded image on a canvas with text above/below. No AI — pixel perfect. Best for: logos, PFPs, pet photos with text. 4 style variants (Bold, Neon, Streetwear, Vintage).
2. **Ideogram** (purple) — Ideogram v3 AI. Best-in-class text rendering. Produces high-quality designs with readable, well-styled text. Best for: text-heavy designs, typography, posters, branded merch. $0.03/img.
3. **Grok AI** (green) — Grok Imagine Pro. Creative/artistic generation with reference image support. Best for: artistic designs, style remixes, abstract. $0.07/img for exact mode, $0.02/img for creative.
4. **Auto** (white) — Picks the best engine automatically. Routes to Ideogram for text-heavy prompts, otherwise best available.

When to recommend each:
- User wants text on a design → Ideogram or Exact+Text
- User wants their exact uploaded photo preserved → Exact+Text
- User wants artistic/creative AI generation → Grok AI
- User isn't sure → Auto

Iteration: After generating, users can refine ("more vibrant", "different colors", "try without text"). Encourage iteration.

Product types: T-Shirt (front print), Hoodie (bigger/bolder), Ballcap (compact embroidery-style), Digital Drop (any art).`;

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 500 });
  }

  const { messages, productType, context } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Messages required" }, { status: 400 });
  }

  let systemContent = SYSTEM_PROMPT;
  if (productType) systemContent += `\n\nCurrent product type: ${productType}`;
  if (context) systemContent += `\n\nCurrent studio state: ${context}`;

  try {
    const res = await fetch(XAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-3-mini",
        messages: [
          { role: "system", content: systemContent },
          ...messages.slice(-10), // Keep last 10 messages for context
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[design-chat] xAI error:", res.status, text.slice(0, 300));
      return NextResponse.json({ error: "Grok request failed" }, { status: 502 });
    }

    const json = await res.json();
    const reply = json.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[design-chat] Error:", err);
    return NextResponse.json({ error: "Grok request failed" }, { status: 502 });
  }
}
