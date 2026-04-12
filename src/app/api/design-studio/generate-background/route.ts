import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { generateBackground, generateBackgroundWithContext, refineBackground } from "@/lib/grok-imagine";
import { createRateLimiter, rateLimitResponse } from "@/lib/rate-limit";
import { drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";

const DRUPAL_API = process.env.DRUPAL_API_URL;
const bgLimit = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 });

export const maxDuration = 60;

const FREE_GENERATION_LIMIT = 100;

function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function getStoreGenCount(storeSlug: string): Promise<{ count: number; storeUuid: string | null }> {
  if (!DRUPAL_API) return { count: 0, storeUuid: null };
  try {
    const res = await fetch(
      `${DRUPAL_API}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(storeSlug)}&fields[commerce_store--online]=field_monthly_gen_count,field_gen_count_month`,
      { headers: { ...drupalAuthHeaders() }, next: { revalidate: 0 } }
    );
    if (!res.ok) return { count: 0, storeUuid: null };
    const json = await res.json();
    const store = json.data?.[0];
    if (!store) return { count: 0, storeUuid: null };
    const month = store.attributes?.field_gen_count_month || "";
    if (month !== getMonthKey()) return { count: 0, storeUuid: store.id };
    return { count: store.attributes?.field_monthly_gen_count || 0, storeUuid: store.id };
  } catch { return { count: 0, storeUuid: null }; }
}

async function incrementStoreGenCount(storeUuid: string, currentCount: number): Promise<number> {
  if (!DRUPAL_API || !storeUuid) return currentCount + 1;
  const newCount = currentCount + 1;
  try {
    const writeHeaders = await drupalWriteHeaders();
    await fetch(`${DRUPAL_API}/jsonapi/commerce_store/online/${storeUuid}`, {
      method: "PATCH",
      headers: { ...writeHeaders, "Content-Type": "application/vnd.api+json" },
      body: JSON.stringify({
        data: {
          type: "commerce_store--online", id: storeUuid,
          attributes: { field_monthly_gen_count: newCount, field_gen_count_month: getMonthKey() },
        },
      }),
    });
  } catch (err) { console.error("[generate-background] Failed to update gen count:", err); }
  return newCount;
}

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
  const { count: currentGenCount, storeUuid } = await getStoreGenCount(storeSlug);
  if (currentGenCount >= FREE_GENERATION_LIMIT) {
    console.log(`[generate-background] ${token.xUsername} at ${currentGenCount + 1} generations (over free limit)`);
  }

  try {
    let result;
    if (refineUrl && typeof refineUrl === "string" && refineUrl.startsWith("https://")) {
      result = await refineBackground(refineUrl, prompt.trim());
    } else {
      const numVariants = Math.min(Math.max(Number(reqN) || 4, 1), 4);
      const xUsername = token.xUsername as string;
      if (use_creator_context && xUsername) {
        result = await generateBackgroundWithContext(prompt.trim(), xUsername, numVariants);
      } else {
        result = await generateBackground(prompt.trim(), numVariants);
      }
    }

    const newCount = await incrementStoreGenCount(storeUuid || "", currentGenCount);
    const freeRemaining = Math.max(FREE_GENERATION_LIMIT - newCount, 0);

    return NextResponse.json({
      image_urls: result.urls,
      created: result.created,
      generation_count: newCount,
      generations_remaining: freeRemaining,
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
