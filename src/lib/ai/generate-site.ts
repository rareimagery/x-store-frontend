// ---------------------------------------------------------------------------
// Dual-AI Site Generation Pipeline
// Grok (profile intelligence) → Grok (component generation)
// Per rareimagery-dual-ai-architecture.md
// ---------------------------------------------------------------------------

import type { XImportData } from "@/lib/x-import";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GrokSiteAnalysis {
  rewrittenBio: string;
  suggestedCategory: string;
  suggestedThemePreset: string;
  brandKeywords: string[];
  colorMood: string;
  audienceType: string;
}

export interface GeneratedSiteComponents {
  heroSection: string;
  aboutSection: string;
  layoutConfig: { type: string; columns: number; gap: string };
  customCSS: string;
  themeOverrides: { primaryColor: string; accentColor: string; fontFamily: string };
}

export interface SiteGenerationResult {
  grokAnalysis: GrokSiteAnalysis;
  components: GeneratedSiteComponents;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Theme mapping — map Grok suggestions to existing themes
// ---------------------------------------------------------------------------

const THEME_MAP: Record<string, string> = {
  y2k_pink: "myspace",
  dark_emo: "neon",
  neon_cyber: "neon",
  scene_gold: "editorial",
  // Direct matches
  xai3: "xai3",
  minimal: "minimal",
  neon: "neon",
  editorial: "editorial",
  myspace: "myspace",
  default: "xai3",
};

function resolveTheme(suggested: string): string {
  return THEME_MAP[suggested] || "xai3";
}

// ---------------------------------------------------------------------------
// Grok Profile Analysis (AI #1) — extends existing enhanceCreatorProfile
// ---------------------------------------------------------------------------

const XAI_API_URL = "https://api.x.ai/v1/chat/completions";

export async function analyzeProfileForSite(
  xData: XImportData
): Promise<GrokSiteAnalysis | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    console.warn("[site-gen] XAI_API_KEY not set — using defaults");
    return null;
  }

  const postSummary = xData.topPosts
    .slice(0, 6)
    .map((p) => `- "${p.text.slice(0, 120)}" (${p.likes} likes)`)
    .join("\n");

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
          {
            role: "system",
            content: `You are a creative director for RareImagery, a creator storefront platform.
Analyze this X profile and return JSON only (no markdown, no preamble):
{
  "rewrittenBio": "A punchy storefront bio (max 160 chars, first person)",
  "suggestedCategory": "one of: artist, musician, designer, writer, photographer, maker, creator",
  "suggestedThemePreset": "one of: xai3, minimal, neon, editorial, myspace",
  "brandKeywords": ["keyword1", "keyword2", "keyword3"],
  "colorMood": "one of: warm, cool, dark, vibrant",
  "audienceType": "one of: creative, tech, lifestyle, music"
}`,
          },
          {
            role: "user",
            content: `Username: @${xData.username}
Display Name: ${xData.displayName}
Bio: ${xData.bio || "(no bio)"}
Followers: ${xData.followerCount.toLocaleString()}
Content themes: ${xData.metrics.top_themes.join(", ") || "none detected"}

Recent posts:
${postSummary || "(no posts available)"}`,
          },
        ],
        temperature: 0.5,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`[site-gen] Grok API error: ${res.status}`);
      return null;
    }

    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return {
      rewrittenBio: parsed.rewrittenBio || xData.bio,
      suggestedCategory: parsed.suggestedCategory || "creator",
      suggestedThemePreset: parsed.suggestedThemePreset || "xai3",
      brandKeywords: Array.isArray(parsed.brandKeywords)
        ? parsed.brandKeywords.slice(0, 5)
        : [],
      colorMood: parsed.colorMood || "dark",
      audienceType: parsed.audienceType || "creative",
    };
  } catch (err) {
    console.error("[site-gen] Grok analysis failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Grok Site Generation (AI #2)
// ---------------------------------------------------------------------------

const THEME_STYLE_HINTS: Record<string, string> = {
  xai3: "Dark premium (zinc-950/zinc-900 bg, indigo/purple accents, monospace stats, rounded-xl cards, max-w-xl centered)",
  minimal: "Clean light (white/gray-50 bg, black text, subtle borders, generous whitespace, system fonts)",
  neon: "Cyberpunk dark (black bg, cyan/magenta/neon-green glow effects, bold uppercase, pulse animations)",
  editorial: "Magazine warm (cream bg, serif headings, navy/burgundy accents, editorial grid, large type)",
  myspace: "Y2K maximalist (glitter/emoji patterns, hot pink/cyber teal, blink/marquee animations, dense chaotic layout)",
  xmimic: "X/Twitter clone (black bg, blue-500 accents, single-column timeline, avatar+content rows)",
};

export async function generateSiteComponents(
  xData: XImportData,
  grokAnalysis: GrokSiteAnalysis
): Promise<GeneratedSiteComponents> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("XAI_API_KEY not configured");
  }

  const theme = resolveTheme(grokAnalysis.suggestedThemePreset);
  const styleHint = THEME_STYLE_HINTS[theme] || THEME_STYLE_HINTS.xai3;

  const res = await fetch(XAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-3",
      max_tokens: 8192,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a senior frontend engineer building premium Next.js/Tailwind storefront components. Output valid JSON only.",
        },
        {
          role: "user",
          content: `Generate Next.js/Tailwind storefront components for a creator.

CREATOR DATA:
- Name: ${xData.displayName}
- Username: @${xData.username}
- Bio: ${grokAnalysis.rewrittenBio}
- Category: ${grokAnalysis.suggestedCategory}
- Color mood: ${grokAnalysis.colorMood}
- Brand keywords: ${grokAnalysis.brandKeywords.join(", ")}
- Avatar URL: ${xData.profileImageUrl || "none"}
- Banner URL: ${xData.bannerUrl || "none"}
- Follower count: ${xData.followerCount.toLocaleString()}

THEME: "${theme}" — ${styleHint}

REQUIREMENTS:
- Components are self-contained JSX strings using Tailwind utility classes
- Use inline styles or <style> tags for custom animations
- Do not use import statements (React is globally available)
- Each component must export a default function
- Mobile-first responsive design
- Include hover effects and micro-animations

Return JSON only (no markdown fences, no preamble):
{
  "heroSection": "export default function Hero() { return (<JSX for hero with avatar, name, bio, follower count>) }",
  "aboutSection": "export default function About() { return (<JSX for about section with brand keywords and links>) }",
  "layoutConfig": { "type": "grid or flex", "columns": 1-3, "gap": "gap class" },
  "customCSS": "any additional CSS custom properties or @keyframes needed",
  "themeOverrides": { "primaryColor": "hex", "accentColor": "hex", "fontFamily": "font stack" }
}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Grok API error: ${res.status} ${text.slice(0, 240)}`);
  }

  const json = await res.json();
  const rawText = json.choices?.[0]?.message?.content;
  if (!rawText || typeof rawText !== "string") {
    throw new Error("No text response from Grok");
  }

  // Parse, stripping any accidental markdown fences
  let raw = rawText.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// Full Pipeline Orchestrator
// ---------------------------------------------------------------------------

export async function generateCreatorSite(
  xData: XImportData
): Promise<SiteGenerationResult> {
  // Step 1: Grok analyzes the profile (graceful fallback if unavailable)
  const grokAnalysis = (await analyzeProfileForSite(xData)) ?? {
    rewrittenBio: xData.bio || `Welcome to @${xData.username}'s store`,
    suggestedCategory: "creator",
    suggestedThemePreset: "xai3",
    brandKeywords: xData.metrics.top_themes.slice(0, 3),
    colorMood: "dark",
    audienceType: "creative",
  };

  // Step 2: Grok generates site components
  const components = await generateSiteComponents(xData, grokAnalysis);

  return {
    grokAnalysis,
    components,
    generatedAt: new Date().toISOString(),
  };
}
