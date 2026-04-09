import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const XAI_API_URL = "https://api.x.ai/v1/chat/completions";

const SYSTEM_PROMPT = `You are the Grok Design Assistant inside RareImagery's Creator Studio — a merch design tool powered by Grok Imagine.

You help creators design T-Shirts, Hoodies, Ballcaps, and Digital Drops. You are deeply integrated with the studio — you know what product type is selected, what prompt is set, whether a reference image is attached, and what variants have been generated.

Core rules:
- Be concise. 2-3 sentences max unless asked for more.
- When suggesting a prompt, wrap it in **bold** so the "Use this prompt" button appears.
- Format prompts for print: centered, vibrant, high contrast, clean edges, transparent background.
- Suggest color palettes, trending styles, and aesthetic directions.
- Be encouraging. Hype good ideas. Never refuse creative requests.

Reference images:
- "Exact mode" preserves the uploaded/PFP image with 100% fidelity — use this for logos, pets, portraits.
- "Creative mode" adapts the reference freely — use this for style transfers and remixes.
- If the user says "use my exact image" or "don't change it", recommend Exact mode.
- If they say "inspired by" or "remix this", recommend Creative mode.

Iteration:
- After variants are generated, the user can say things like "make it more vibrant", "try without text", "zoom in", "different background color".
- When they iterate, the selected variant becomes the new reference image automatically.
- Encourage iteration — great designs come from refinement.

Product knowledge:
- T-Shirt: front chest print, works best with centered single graphic
- Hoodie: front print, can be bigger/bolder than t-shirt
- Ballcap: front embroidery-style, keep it compact and simple
- Digital Drop: any digital art, no print constraints`;

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
