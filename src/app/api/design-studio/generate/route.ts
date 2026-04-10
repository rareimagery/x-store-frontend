import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { generateDesign } from "@/lib/grok-imagine";
import { createRateLimiter, rateLimitResponse } from "@/lib/rate-limit";

const designLimit = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 });

export const maxDuration = 60;

// Monthly generation tracking — 100 free, $0.25 per extra
const FREE_GENERATION_LIMIT = 100;
const OVERAGE_FEE_CENTS = 25; // $0.25
const monthlyGenCounts = new Map<string, { count: number; month: string }>();

function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getGenCount(userId: string): number {
  const entry = monthlyGenCounts.get(userId);
  const currentMonth = getMonthKey();
  if (!entry || entry.month !== currentMonth) return 0;
  return entry.count;
}

function incrementGenCount(userId: string): number {
  const currentMonth = getMonthKey();
  const entry = monthlyGenCounts.get(userId);
  if (!entry || entry.month !== currentMonth) {
    monthlyGenCounts.set(userId, { count: 1, month: currentMonth });
    return 1;
  }
  entry.count++;
  return entry.count;
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.xUsername) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (token.xId as string) || (token.sub as string) || "anon";
  const rl = designLimit(userId);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

  const { prompt, product_type, reference_image, variants: reqVariants } = await req.json();

  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
    return NextResponse.json({ error: "Prompt must be at least 3 characters" }, { status: 400 });
  }

  const productType = product_type || "t_shirt";
  const validTypes = ["t_shirt", "hoodie", "ballcap", "pet_bandana", "pet_hoodie", "digital_drop"];
  if (!validTypes.includes(productType)) {
    return NextResponse.json({ error: `Invalid product type. Use: ${validTypes.join(", ")}` }, { status: 400 });
  }

  // Check monthly generation limit
  const currentGenCount = getGenCount(userId);
  if (currentGenCount >= FREE_GENERATION_LIMIT) {
    // Over limit — for now allow but flag. Block when Stripe micropayment is wired.
    console.log(`[generate] ${token.xUsername} at ${currentGenCount + 1} generations (over ${FREE_GENERATION_LIMIT} free limit, $0.25 fee applies)`);
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
    const result = await generateDesign(
      prompt.trim(),
      productType,
      token.xUsername as string,
      referenceDataUrl,
      numVariants
    );

    const newCount = incrementGenCount(userId);
    const freeRemaining = Math.max(FREE_GENERATION_LIMIT - newCount, 0);

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
      generation_count: newCount,
      generations_remaining: freeRemaining,
      generation_fee_applies: newCount > FREE_GENERATION_LIMIT,
    });
  } catch (err: any) {
    console.error("[design-studio] Generate failed:", err);
    return NextResponse.json(
      { error: err.message || "Image generation failed" },
      { status: 502 }
    );
  }
}
