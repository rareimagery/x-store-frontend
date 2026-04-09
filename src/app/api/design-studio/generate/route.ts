import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { generateDesign } from "@/lib/grok-imagine";
import { generateWithIdeogram, isIdeogramConfigured } from "@/lib/ideogram";
import { createRateLimiter, rateLimitResponse } from "@/lib/rate-limit";

const designLimit = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 });

export const maxDuration = 60;

type Provider = "grok" | "ideogram" | "auto";

// Detect if prompt is text-heavy (mentions adding text, words, typography)
function isTextHeavyPrompt(prompt: string): boolean {
  return /\b(text|words?|title|typography|font|letter|write|add\s+['"]|with\s+['"]|saying)\b/i.test(prompt);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.xUsername) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (token.xId as string) || (token.sub as string) || "anon";
  const rl = designLimit(userId);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const { prompt, product_type, reference_image, reference_mode, provider: reqProvider, variants: reqVariants } = await req.json();

  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
    return NextResponse.json({ error: "Prompt must be at least 3 characters" }, { status: 400 });
  }

  const productType = product_type || "t_shirt";
  const validTypes = ["t_shirt", "hoodie", "ballcap", "digital_drop"];
  if (!validTypes.includes(productType)) {
    return NextResponse.json({ error: `Invalid product type. Use: ${validTypes.join(", ")}` }, { status: 400 });
  }

  // Resolve reference image
  let referenceDataUrl: string | undefined;
  if (reference_image && typeof reference_image === "string") {
    if (reference_image.startsWith("data:image/") && reference_image.length <= 6 * 1024 * 1024) {
      referenceDataUrl = reference_image;
    } else if (reference_image.startsWith("https://")) {
      referenceDataUrl = reference_image;
    }
  }

  // Resolve provider
  let provider: Provider = reqProvider || "auto";
  if (provider === "auto") {
    if (isIdeogramConfigured() && isTextHeavyPrompt(prompt.trim())) {
      provider = "ideogram";
    } else if (isIdeogramConfigured()) {
      provider = "ideogram"; // Default to Ideogram for quality when available
    } else {
      provider = "grok";
    }
  }

  // Fallback if requested provider isn't configured
  if (provider === "ideogram" && !isIdeogramConfigured()) {
    provider = "grok";
  }

  const numVariants = Math.min(Math.max(Number(reqVariants) || 4, 1), 4);

  console.log("[design-studio] Generate:", {
    provider,
    hasRef: !!referenceDataUrl,
    reference_mode,
    product_type: productType,
    promptPreview: prompt.trim().slice(0, 60),
  });

  try {
    if (provider === "ideogram") {
      const result = await generateWithIdeogram({
        prompt: prompt.trim(),
        numImages: numVariants,
        productType,
        styleRef: referenceDataUrl?.startsWith("https://") ? referenceDataUrl : undefined,
      });

      return NextResponse.json({
        success: true,
        image_url: result.url,
        image_urls: result.urls,
        provider: "ideogram",
        product_type: productType,
        original_prompt: prompt.trim(),
      });
    }

    // Grok Imagine
    const currentUsername = token.xUsername as string;
    const refMode = reference_mode === "creative" ? "creative" : "exact";
    const result = await generateDesign(prompt.trim(), productType, currentUsername, referenceDataUrl, numVariants, refMode);

    return NextResponse.json({
      success: true,
      image_url: result.url,
      image_urls: result.urls,
      used_pfp: result.usedPfp,
      used_upload: result.usedUpload,
      pfp_username: result.pfpUsername,
      reference_mode: result.referenceMode,
      provider: "grok",
      product_type: productType,
      original_prompt: prompt.trim(),
    });
  } catch (err: any) {
    console.error(`[design-studio] ${provider} failed:`, err);
    return NextResponse.json(
      { error: err.message || "Image generation failed" },
      { status: 502 }
    );
  }
}
