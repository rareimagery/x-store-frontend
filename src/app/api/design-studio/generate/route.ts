import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { generateDesign } from "@/lib/grok-imagine";
import { createRateLimiter, rateLimitResponse } from "@/lib/rate-limit";

const designLimit = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 }); // 10/hour

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.xUsername) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (token.xId as string) || (token.sub as string) || "anon";
  const rl = designLimit(userId);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const { prompt, product_type } = await req.json();

  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
    return NextResponse.json({ error: "Prompt must be at least 3 characters" }, { status: 400 });
  }

  const productType = product_type || "t_shirt";
  const validTypes = ["t_shirt", "hoodie", "ballcap"];
  if (!validTypes.includes(productType)) {
    return NextResponse.json({ error: `Invalid product type. Use: ${validTypes.join(", ")}` }, { status: 400 });
  }

  try {
    const currentUsername = token.xUsername as string;
    const result = await generateDesign(prompt.trim(), productType, currentUsername);

    return NextResponse.json({
      success: true,
      image_url: result.url,
      used_pfp: result.usedPfp,
      pfp_username: result.pfpUsername,
      product_type: productType,
      original_prompt: prompt.trim(),
    });
  } catch (err: any) {
    console.error("[design-studio] Grok Imagine failed:", err);
    return NextResponse.json(
      { error: err.message || "Image generation failed" },
      { status: 502 }
    );
  }
}
