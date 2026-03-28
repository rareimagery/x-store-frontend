import type { XImportData } from "./x-import";

const XAI_API_URL = "https://api.x.ai/v1/chat/completions";
const XAI_API_KEY = process.env.XAI_API_KEY;

const VALID_THEMES = ["xai3", "default", "minimal", "neon", "editorial", "myspace"];

export interface GrokEnhancements {
  storeBio: string;
  suggestedProducts: Array<{
    name: string;
    description: string;
    category: string;
  }>;
  recommendedTheme: string;
  topThemes: string[];
  audienceSentiment: string;
}

async function grokChat(
  systemPrompt: string,
  userPrompt: string
): Promise<string | null> {
  if (!XAI_API_KEY) {
    console.warn("XAI_API_KEY not set — skipping Grok enhancement");
    return null;
  }

  try {
    const res = await fetch(XAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      console.error(`Grok API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error("Grok API call failed:", err);
    return null;
  }
}

export async function enhanceCreatorProfile(
  xData: XImportData
): Promise<GrokEnhancements | null> {
  const postSummary = xData.topPosts
    .slice(0, 6)
    .map((p) => `- "${p.text.slice(0, 120)}" (${p.likes} likes, ${p.views} views)`)
    .join("\n");

  const systemPrompt = `You are an AI assistant helping X (Twitter) creators set up their online storefront on the RareImagery marketplace. Analyze the creator's profile and content to provide personalized recommendations. Always respond with valid JSON.`;

  const userPrompt = `Analyze this X creator's profile and help them set up their store:

Username: @${xData.username}
Display Name: ${xData.displayName}
Bio: ${xData.bio || "(no bio)"}
Followers: ${xData.followerCount.toLocaleString()}
Verified: ${xData.verified}
Raw content themes: ${xData.metrics.top_themes.join(", ") || "none detected"}

Recent posts:
${postSummary || "(no posts available)"}

Available storefront styles: "xai3" (dark premium X-inspired, default), "default" (clean white e-commerce), "minimal" (simple & elegant), "neon" (dark with neon accents), "editorial" (magazine-style), "myspace" (retro social page)

Return a JSON object with exactly these fields:
{
  "storeBio": "A polished 2-3 sentence store description written in first person that would work as a storefront bio. Reference their actual content and style.",
  "suggestedProducts": [
    {"name": "Product name", "description": "One sentence description", "category": "clothing|digital_download|crafts|printful"}
  ],
  "recommendedTheme": "one of: xai3, default, minimal, neon, editorial, myspace",
  "topThemes": ["theme1", "theme2", "theme3", "theme4", "theme5"],
  "audienceSentiment": "Very Positive|Positive|Neutral|Mixed"
}

Provide 3-5 product suggestions that match what this creator would likely sell based on their content. Be creative but realistic.`;

  const raw = await grokChat(systemPrompt, userPrompt);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    return {
      storeBio: parsed.storeBio || xData.bio,
      suggestedProducts: Array.isArray(parsed.suggestedProducts)
        ? parsed.suggestedProducts.slice(0, 5)
        : [],
      recommendedTheme: VALID_THEMES.includes(parsed.recommendedTheme)
        ? parsed.recommendedTheme
        : "xai3",
      topThemes: Array.isArray(parsed.topThemes)
        ? parsed.topThemes.slice(0, 5)
        : xData.metrics.top_themes,
      audienceSentiment: parsed.audienceSentiment || "Positive",
    };
  } catch (err) {
    console.error("Failed to parse Grok response:", err);
    return null;
  }
}

/**
 * Enhance X data with Grok AI and merge results back into metrics.
 * If Grok fails, returns the original data unchanged (graceful degradation).
 */
export async function enhanceAndMergeMetrics(
  xData: XImportData
): Promise<XImportData> {
  const enhancements = await enhanceCreatorProfile(xData);
  if (!enhancements) return xData;

  return {
    ...xData,
    metrics: {
      ...xData.metrics,
      audience_sentiment: enhancements.audienceSentiment,
      recommended_products: enhancements.suggestedProducts.map((p) => p.name),
      top_themes: enhancements.topThemes,
    },
  };
}
