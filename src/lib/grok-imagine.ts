// ---------------------------------------------------------------------------
// Grok Imagine — AI image generation + editing via x.ai API
// /v1/images/generations = text-to-image (no reference)
// /v1/images/edits = image editing (preserves uploaded reference)
// Always uses grok-imagine-image-pro
// ---------------------------------------------------------------------------

import { DRUPAL_API_URL, drupalAuthHeaders, getCreatorProfile } from "@/lib/drupal";
import { upgradeProfileImageUrl } from "@/lib/x-api/utils";

const XAI_API_URL = "https://api.x.ai/v1/images/generations";
const XAI_EDIT_URL = "https://api.x.ai/v1/images/edits";
const XAI_API_KEY = process.env.XAI_API_KEY || process.env.GROK_API_KEY;

export interface GrokImageResult {
  url: string;
  urls: string[];
  usedPfp: boolean;
  usedUpload: boolean;
  usedEdits: boolean;
  pfpUsername?: string;
}

// Printful-ready prompts — isolated flat artwork, no mockups
const PRODUCT_PROMPTS: Record<string, string> = {
  t_shirt: "isolated print-ready graphic on transparent background, high resolution 4500x5400px, centered artwork, vector clean edges, POD optimized, no mockup, no clothing, no model, just the design",
  hoodie: "isolated print-ready graphic on transparent background, high resolution 4500x5400px, centered artwork, bold graphic, POD optimized, no mockup, no hoodie body, no model, just the design",
  ballcap: "isolated print-ready graphic on transparent background, high resolution, centered compact artwork, clean edges, POD optimized, no mockup, no hat body, no model, just the design",
  pet_bandana: "isolated print-ready graphic on transparent background, high resolution, compact centered artwork suitable for triangular bandana print area, bold simple design, POD optimized, no mockup, no bandana body, just the design",
  pet_hoodie: "isolated print-ready graphic on transparent background, high resolution, centered compact artwork for small pet garment, bold clean design, POD optimized, no mockup, no clothing body, no model, just the design",
  digital_drop: "high-resolution digital artwork on transparent background, centered, vibrant, clean edges, social media + print ready, no background",
  skateboard_deck: "isolated print-ready skateboard deck artwork, landscape orientation 8.3x31.9 inch template, full bleed retro design, vibrant colors, bold graphics, POD optimized, transparent background, high resolution 4500x5400px",
  vintage_poster: "retro poster artwork in 24x36 inch dimensions, nostalgic 70s/80s/90s aesthetic with period-appropriate typography and color palette, high-resolution print-ready, transparent background",
  sticker_pack: "retro sticker sheet design with 6-8 individual die-cut stickers, vintage logos, retro badges, 80s/90s aesthetic, bold outlines, transparent background, print-ready",
  canvas_art: "vintage-style canvas artwork, retro illustration or photography aesthetic, rich textures, warm analog tones, print-ready high resolution, transparent background",
  tote_bag: "retro tote bag centered graphic design, vintage aesthetic, bold retro typography, isolated artwork on transparent background, POD optimized, no mockup, no bag body",
};

// Edit endpoint prompt — preserves uploaded image exactly, outputs flat artwork
const EXACT_EDIT_PROMPT = (base: string) =>
  `Keep the uploaded reference image 100% identical in the exact center — do NOT redraw, restyle, reinterpret, change pose, expression, fur, colors, lighting, or ANY detail. Preserve pixel-level fidelity. Output ONLY the isolated graphic on a transparent background. Do not show any hoodie, t-shirt, hat, model, background, or mockup. ONLY add the merch text overlay exactly as described. ${base}`;

const PFP_PATTERN = /@([A-Za-z0-9_]+)\s*(?:pfp|profile\s*pic|avatar|photo)/i;
const MY_PFP_PATTERN = /\b(?:my|the)\s+(?:pfp|profile\s*pic|avatar|photo)\b/i;

async function fetchPfpUrl(username: string): Promise<string | null> {
  if (DRUPAL_API_URL) {
    try {
      const res = await fetch(
        `${DRUPAL_API_URL}/api/x-profile-sync/lookup?username=${encodeURIComponent(username)}`,
        { headers: drupalAuthHeaders(), cache: "no-store", signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = await res.json();
        const url = data.profile_image_url || data.data?.profile_image_url;
        if (url) return upgradeProfileImageUrl(url);
      }
    } catch {}
  }

  const bearer = process.env.X_API_BEARER_TOKEN;
  if (!bearer) return null;
  try {
    const res = await fetch(
      `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=profile_image_url`,
      { headers: { Authorization: `Bearer ${bearer}` }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const url = data.data?.profile_image_url;
    return url ? upgradeProfileImageUrl(url) : null;
  } catch {
    return null;
  }
}

export async function generateDesign(
  prompt: string,
  productType: string,
  currentUsername?: string,
  referenceImageDataUrl?: string,
  variants: number = 4
): Promise<GrokImageResult> {
  if (!XAI_API_KEY) throw new Error("XAI_API_KEY not configured");

  let referenceUrl: string | null = referenceImageDataUrl || null;
  let pfpUsername: string | undefined;
  let usedUpload = !!referenceImageDataUrl;

  // Auto-detect @username PFP if no reference was passed
  if (!referenceUrl) {
    const atMatch = prompt.match(PFP_PATTERN);
    if (atMatch) {
      pfpUsername = atMatch[1];
      referenceUrl = await fetchPfpUrl(pfpUsername);
    } else if (MY_PFP_PATTERN.test(prompt) && currentUsername) {
      pfpUsername = currentUsername;
      referenceUrl = await fetchPfpUrl(currentUsername);
    }
  }

  const suffix = PRODUCT_PROMPTS[productType] || PRODUCT_PROMPTS.t_shirt;
  const cleanedPrompt = `${prompt.replace(PFP_PATTERN, "").replace(MY_PFP_PATTERN, "").replace(/\s{2,}/g, " ").trim()} | ${suffix}`;

  const hasReference = !!referenceUrl;
  const endpoint = hasReference ? XAI_EDIT_URL : XAI_API_URL;
  const finalPrompt = hasReference ? EXACT_EDIT_PROMPT(cleanedPrompt) : cleanedPrompt;

  const body: Record<string, unknown> = {
    model: "grok-imagine-image-pro",
    prompt: finalPrompt,
    n: Math.min(Math.max(variants, 1), 4),
    response_format: "url",
  };

  // /edits requires image as {url, type} object — plain string gets 422
  if (hasReference) {
    body.image = { url: referenceUrl, type: "image_url" };
  }

  console.log("[grok-imagine]", {
    endpoint: hasReference ? "/edits" : "/generations",
    hasReference,
    promptPreview: finalPrompt.slice(0, 100),
  });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${XAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Grok ${hasReference ? "Edit" : "Imagine"} error ${res.status}: ${err?.error?.message || JSON.stringify(err).slice(0, 300)}`);
  }

  const data = await res.json();
  const allUrls: string[] = (data.data ?? []).map((d: any) => d.url).filter(Boolean);
  if (allUrls.length === 0) throw new Error("Grok returned no images");

  return {
    url: allUrls[0],
    urls: allUrls,
    usedPfp: hasReference && !usedUpload,
    usedUpload,
    usedEdits: hasReference,
    pfpUsername,
  };
}

// ---------------------------------------------------------------------------
// Background generation — wraps core API for page builder backgrounds
// ---------------------------------------------------------------------------

const BACKGROUND_SUFFIX =
  "wide panoramic background image, 1920x1080 aspect ratio, no text, no logos, no people, no objects in foreground, seamless wallpaper suitable for a dark website, subtle and non-distracting";

export interface BackgroundResult {
  urls: string[];
  created: number;
}

export async function generateBackground(prompt: string, n: number = 4): Promise<BackgroundResult> {
  if (!XAI_API_KEY) throw new Error("XAI_API_KEY not configured");

  const fullPrompt = `${prompt.trim()}, ${BACKGROUND_SUFFIX}`;

  const body = {
    model: "grok-imagine-image-pro",
    prompt: fullPrompt,
    n: Math.min(Math.max(n, 1), 4),
    response_format: "url" as const,
  };

  console.log("[grok-imagine] background generation", { promptPreview: fullPrompt.slice(0, 100) });

  const res = await fetch(XAI_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${XAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Grok Imagine error ${res.status}: ${err?.error?.message || JSON.stringify(err).slice(0, 300)}`);
  }

  const data = await res.json();
  const urls: string[] = (data.data ?? []).map((d: any) => d.url).filter(Boolean);
  if (urls.length === 0) throw new Error("Grok returned no images");

  return { urls, created: data.created };
}

export async function refineBackground(imageUrl: string, prompt: string): Promise<BackgroundResult> {
  if (!XAI_API_KEY) throw new Error("XAI_API_KEY not configured");

  const fullPrompt = `${prompt.trim()}, ${BACKGROUND_SUFFIX}`;

  const body = {
    model: "grok-imagine-image-pro",
    prompt: fullPrompt,
    image: { url: imageUrl, type: "image_url" },
    n: 1,
    response_format: "url" as const,
  };

  console.log("[grok-imagine] background refinement", { promptPreview: fullPrompt.slice(0, 100) });

  const res = await fetch(XAI_EDIT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${XAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Grok Edit error ${res.status}: ${err?.error?.message || JSON.stringify(err).slice(0, 300)}`);
  }

  const data = await res.json();
  const urls: string[] = (data.data ?? []).map((d: any) => d.url).filter(Boolean);
  if (urls.length === 0) throw new Error("Grok returned no images");

  return { urls, created: data.created };
}

// ---------------------------------------------------------------------------
// Creator X Context — pulls stored profile data for personalized generation
// ---------------------------------------------------------------------------

export interface CreatorXContext {
  pfpUrl: string | null;
  bannerUrl: string | null;
  bio: string;
  recentPostsSummary: string;
  topThemes: string[];
}

export async function getCreatorXContext(username: string): Promise<CreatorXContext | null> {
  try {
    const profile = await getCreatorProfile(username, { noStore: true });
    if (!profile) return null;

    const bio = (profile.bio || "").replace(/<[^>]*>/g, "").trim();
    const postTexts = (profile.top_posts || [])
      .slice(0, 8)
      .map((p) => p.text)
      .filter(Boolean);
    const themes = profile.metrics?.top_themes || [];

    return {
      pfpUrl: profile.profile_picture_url,
      bannerUrl: profile.banner_url,
      bio,
      recentPostsSummary: postTexts.join(" | ").slice(0, 500),
      topThemes: themes,
    };
  } catch (err) {
    console.error("[grok-imagine] Failed to fetch creator context:", err);
    return null;
  }
}

export async function generateBackgroundWithContext(
  prompt: string,
  username: string,
  n: number = 4
): Promise<BackgroundResult> {
  const ctx = await getCreatorXContext(username);

  let enhancedPrompt = prompt.trim();
  if (ctx && (ctx.bio || ctx.topThemes.length > 0)) {
    const vibeHints: string[] = [];
    if (ctx.bio) vibeHints.push(`Creator brand: ${ctx.bio.slice(0, 150)}`);
    if (ctx.topThemes.length > 0) vibeHints.push(`Content themes: ${ctx.topThemes.slice(0, 5).join(", ")}`);
    enhancedPrompt = `${enhancedPrompt}. ${vibeHints.join(". ")}`;
  }

  // Use banner as reference if available (Edit API preserves composition)
  if (ctx?.bannerUrl) {
    const fullPrompt = `${enhancedPrompt}, ${BACKGROUND_SUFFIX}`;
    if (!XAI_API_KEY) throw new Error("XAI_API_KEY not configured");

    const body = {
      model: "grok-imagine-image-pro",
      prompt: fullPrompt,
      image: { url: ctx.bannerUrl, type: "image_url" },
      n: Math.min(Math.max(n, 1), 4),
      response_format: "url" as const,
    };

    console.log("[grok-imagine] background with creator context + banner ref", {
      username,
      promptPreview: fullPrompt.slice(0, 100),
    });

    const res = await fetch(XAI_EDIT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${XAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      const urls: string[] = (data.data ?? []).map((d: any) => d.url).filter(Boolean);
      if (urls.length > 0) return { urls, created: data.created };
    }
    // Fall through to standard generation if edit fails
    console.warn("[grok-imagine] Banner reference edit failed, falling back to standard generation");
  }

  return generateBackground(enhancedPrompt, n);
}

export async function generateDesignWithContext(
  prompt: string,
  productType: string,
  username: string,
  referenceImageDataUrl?: string,
  variants: number = 4
): Promise<GrokImageResult> {
  const ctx = await getCreatorXContext(username);

  let enhancedPrompt = prompt;
  if (ctx && (ctx.bio || ctx.topThemes.length > 0)) {
    const vibeHints: string[] = [];
    if (ctx.bio) vibeHints.push(`Creator brand: ${ctx.bio.slice(0, 150)}`);
    if (ctx.topThemes.length > 0) vibeHints.push(`Themes: ${ctx.topThemes.slice(0, 5).join(", ")}`);
    enhancedPrompt = `${prompt.trim()}. ${vibeHints.join(". ")}`;
  }

  // Use PFP as reference when no other reference provided and prompt mentions brand/style
  const brandKeywords = /\b(my style|my brand|my vibe|my aesthetic|personal|branded)\b/i;
  const ref = referenceImageDataUrl || (brandKeywords.test(prompt) && ctx?.pfpUrl ? ctx.pfpUrl : undefined);

  return generateDesign(enhancedPrompt, productType, username, ref, variants);
}
