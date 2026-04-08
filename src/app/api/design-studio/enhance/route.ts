import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * POST /api/design-studio/enhance
 * Uses Grok text model to enhance a design prompt and generate a product description.
 * Body: { prompt: string, product_type: string }
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prompt, product_type } = await req.json();
  if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });

  const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Grok API not configured" }, { status: 500 });

  const labelMap: Record<string, string> = { t_shirt: "T-Shirt", hoodie: "Hoodie", ballcap: "Ballcap", digital_drop: "Digital Art" };
  const productLabel = labelMap[product_type] || "product";

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "grok-3-mini",
        messages: [
          {
            role: "system",
            content: `You are a merch design prompt expert. Enhance the user's design idea into a detailed, vivid prompt optimized for AI image generation on a ${productLabel}. Keep it under 200 characters. Also write a short product description (1-2 sentences) for selling it online. Respond in JSON: {"enhanced": "...", "description": "..."}`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ enhanced: prompt, description: "" });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    try {
      const parsed = JSON.parse(content);
      return NextResponse.json({
        enhanced: parsed.enhanced || prompt,
        description: parsed.description || "",
      });
    } catch {
      return NextResponse.json({ enhanced: prompt, description: "" });
    }
  } catch {
    return NextResponse.json({ enhanced: prompt, description: "" });
  }
}
