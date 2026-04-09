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

  const { prompt, product_type, reference_image, reference_mode, variants: reqVariants } = await req.json();

  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
    return NextResponse.json({ error: "Prompt must be at least 3 characters" }, { status: 400 });
  }

  const productType = product_type || "t_shirt";
  const validTypes = ["t_shirt", "hoodie", "ballcap", "digital_drop"];
  if (!validTypes.includes(productType)) {
    return NextResponse.json({ error: `Invalid product type. Use: ${validTypes.join(", ")}` }, { status: 400 });
  }

  try {
    const currentUsername = token.xUsername as string;

    // Validate reference image if provided (data URL or HTTPS image URL)
    let referenceDataUrl: string | undefined;
    if (reference_image && typeof reference_image === "string") {
      if (reference_image.startsWith("data:image/")) {
        if (reference_image.length > 6 * 1024 * 1024) {
          return NextResponse.json({ error: "Reference image too large (max 4MB)" }, { status: 400 });
        }
        referenceDataUrl = reference_image;
      } else if (reference_image.startsWith("https://")) {
        // Pass HTTPS URLs directly — Grok Imagine accepts them
        referenceDataUrl = reference_image;
      }
    }

    console.log("[design-studio] Generate request:", {
      hasReferenceImage: !!reference_image,
      referenceImageType: reference_image ? (typeof reference_image === "string" ? reference_image.slice(0, 30) : typeof reference_image) : "none",
      resolvedRef: referenceDataUrl ? referenceDataUrl.slice(0, 50) : "none",
      reference_mode,
      product_type: productType,
      promptPreview: prompt.trim().slice(0, 60),
    });

    const numVariants = Math.min(Math.max(Number(reqVariants) || 4, 1), 4);
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
