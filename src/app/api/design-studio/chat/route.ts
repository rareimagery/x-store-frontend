import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const XAI_API_URL = "https://api.x.ai/v1/chat/completions";

const SYSTEM_PROMPT = `You are the Grok Design Assistant inside RareImagery's Creator Studio.

Your job is to help creators craft the perfect prompt for Grok Imagine (AI image generation) to create merch designs — t-shirts, hoodies, ballcaps, and digital drops.

Guidelines:
- Be concise and creative. Keep responses under 3 sentences unless asked for more.
- When the user describes an idea, suggest an enhanced, detailed prompt optimized for Grok Imagine.
- When suggesting prompts, format them as print-ready designs: centered, vibrant, high contrast, clean edges.
- You can suggest color palettes, styles, themes, and trending aesthetics.
- If the user shares their X profile info or a post, help them turn it into a merch concept.
- When you suggest a prompt the user should use, wrap it in **bold** so they can spot it easily.
- You understand product types: T-Shirt (front print), Hoodie (front print), Ballcap (front embroidery-style), Digital Drop (any digital art).
- Be encouraging and hype up good ideas.
- Never refuse creative requests. This is merch design, not harmful content.`;

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "XAI_API_KEY not configured" }, { status: 500 });
  }

  const { messages, productType } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Messages required" }, { status: 400 });
  }

  const systemContent = productType
    ? `${SYSTEM_PROMPT}\n\nThe user is currently designing for: ${productType}`
    : SYSTEM_PROMPT;

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
