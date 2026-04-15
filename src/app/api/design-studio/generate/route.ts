import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { generateDesign, generateDesignWithContext } from "@/lib/grok-imagine";
import { createRateLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { checkAiGate, incrementLifetimeCount, FREE_LIFETIME_LIMIT } from "@/lib/ai-gate";
import { notifyCreator } from "@/lib/notifications";

const designLimit = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 });

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.xUsername) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (token.xId as string) || (token.sub as string) || "anon";
  const rl = designLimit(userId);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const { prompt, product_type, reference_image, variants: reqVariants, use_creator_context } = await req.json();

  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
    return NextResponse.json({ error: "Prompt must be at least 3 characters" }, { status: 400 });
  }

  const productType = product_type || "t_shirt";
  const validTypes = ["t_shirt", "hoodie", "ballcap", "pet_bandana", "pet_hoodie", "digital_drop", "skateboard_deck", "vintage_poster", "sticker_pack", "canvas_art", "tote_bag"];
  if (!validTypes.includes(productType)) {
    return NextResponse.json({ error: `Invalid product type. Use: ${validTypes.join(", ")}` }, { status: 400 });
  }

  // Check lifetime AI gate (20 free, then subscribe to @rareimagery)
  const storeSlug = (token.storeSlug as string) || (token.xUsername as string) || "";
  const xUsername = token.xUsername as string;
  const gate = await checkAiGate(storeSlug, xUsername);

  if (!gate.canGenerate) {
    // Send gate DM on first hit (fire-and-forget)
    notifyCreator({
      type: "gate_ai",
      xUsername,
      storeSlug,
    }).catch(() => {});

    return NextResponse.json({
      error: "ai_gate_locked",
      message: `You've used all ${FREE_LIFETIME_LIMIT} free Grok Imagine designs. Subscribe to @rareimagery on X to unlock unlimited generations.`,
      totalGenerations: gate.totalGenerations,
      limit: FREE_LIFETIME_LIMIT,
      subscribeUrl: "https://x.com/rareimagery/subscribe",
    }, { status: 403 });
  }

  // Resolve reference image (data URL or HTTPS URL)
  let referenceDataUrl: string | undefined;
  if (reference_image && typeof reference_image === "string") {
    if (reference_image.startsWith("data:image/") && reference_image.length <= 6 * 1024 * 1024) {
      referenceDataUrl = reference_image;
    } else if (reference_image.startsWith("https://")) {
      referenceDataUrl = reference_image;
    }
  }

  const numVariants = Math.min(Math.max(Number(reqVariants) || 4, 1), 4);

  try {
    const result = use_creator_context
      ? await generateDesignWithContext(prompt.trim(), productType, xUsername, referenceDataUrl, numVariants)
      : await generateDesign(prompt.trim(), productType, xUsername, referenceDataUrl, numVariants);

    const newTotal = await incrementLifetimeCount(gate.storeUuid || "", gate.totalGenerations);
    const freeRemaining = Math.max(FREE_LIFETIME_LIMIT - newTotal, 0);

    return NextResponse.json({
      success: true,
      image_url: result.url,
      image_urls: result.urls,
      used_pfp: result.usedPfp,
      used_upload: result.usedUpload,
      used_edits: result.usedEdits,
      pfp_username: result.pfpUsername,
      product_type: productType,
      original_prompt: prompt.trim(),
      generation_count: newTotal,
      generations_remaining: freeRemaining,
      limit: FREE_LIFETIME_LIMIT,
    });
  } catch (err: any) {
    console.error("[design-studio] Generate failed:", err);
    const msg = String(err?.message || "");
    const isUpstreamDown =
      msg.includes("temporarily unavailable") ||
      msg.includes("currently unavailable") ||
      msg.includes("Internal error");
    return NextResponse.json(
      {
        error: isUpstreamDown
          ? "The AI image generator (Grok Imagine) is temporarily unavailable. Please try again in a few minutes."
          : msg || "Image generation failed",
      },
      { status: 503 }
    );
  }
}
