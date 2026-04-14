import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { generateBackground, generateBackgroundWithContext, refineBackground } from "@/lib/grok-imagine";
import { createRateLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { checkAiGate, incrementLifetimeCount, FREE_LIFETIME_LIMIT } from "@/lib/ai-gate";

const bgLimit = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 });

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.xUsername) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (token.xId as string) || (token.sub as string) || "anon";
  const rl = bgLimit(userId);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const { prompt, n: reqN, refineUrl, use_creator_context } = await req.json();

  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
    return NextResponse.json({ error: "Prompt must be at least 3 characters" }, { status: 400 });
  }

  const storeSlug = (token.storeSlug as string) || (token.xUsername as string) || "";
  const xUsername = token.xUsername as string;
  const gate = await checkAiGate(storeSlug, xUsername);

  if (!gate.canGenerate) {
    return NextResponse.json({
      error: "ai_gate_locked",
      message: `You've used all ${FREE_LIFETIME_LIMIT} free Grok Imagine designs. Subscribe to @rareimagery on X to unlock unlimited generations.`,
      totalGenerations: gate.totalGenerations,
      limit: FREE_LIFETIME_LIMIT,
      subscribeUrl: "https://x.com/rareimagery/subscribe",
    }, { status: 403 });
  }

  try {
    let result;
    if (refineUrl && typeof refineUrl === "string" && refineUrl.startsWith("https://")) {
      result = await refineBackground(refineUrl, prompt.trim());
    } else {
      const numVariants = Math.min(Math.max(Number(reqN) || 4, 1), 4);
      if (use_creator_context && xUsername) {
        result = await generateBackgroundWithContext(prompt.trim(), xUsername, numVariants);
      } else {
        result = await generateBackground(prompt.trim(), numVariants);
      }
    }

    const newTotal = await incrementLifetimeCount(gate.storeUuid || "", gate.totalGenerations);
    const freeRemaining = Math.max(FREE_LIFETIME_LIMIT - newTotal, 0);

    return NextResponse.json({
      image_urls: result.urls,
      created: result.created,
      generation_count: newTotal,
      generations_remaining: freeRemaining,
      limit: FREE_LIFETIME_LIMIT,
    });
  } catch (err: any) {
    console.error("[generate-background] Failed:", err);
    const msg = String(err?.message || "");
    const isUpstreamDown =
      msg.includes("temporarily unavailable") ||
      msg.includes("currently unavailable") ||
      msg.includes("Internal error");
    return NextResponse.json(
      {
        error: isUpstreamDown
          ? "Grok Imagine is temporarily unavailable. Please try again in a few minutes."
          : msg || "Background generation failed",
      },
      { status: isUpstreamDown ? 503 : 500 }
    );
  }
}
