// ---------------------------------------------------------------------------
// Grok Imagine — AI image generation + editing via x.ai API
// /v1/images/generations = text-to-image
// /v1/images/edits = image editing (uses the uploaded reference)
// Always uses grok-imagine-image-pro for best quality
// ---------------------------------------------------------------------------

import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";
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

const PRODUCT_PROMPTS: Record<string, string> = {
  t_shirt: "print-ready t-shirt design, transparent background, high resolution, centered artwork, vector clean edges, POD optimized",
  hoodie: "print-ready hoodie front design, transparent background, high resolution, centered artwork, bold graphic, POD optimized",
  ballcap: "print-ready hat embroidery design, transparent background, high resolution, centered compact artwork, clean edges, POD optimized",
  digital_drop: "high-resolution digital artwork, clean, vibrant, ready for social media and print",
};

const EXACT_EDIT_PROMPT = (base: string) =>
  `Keep the uploaded reference image 100% identical — do NOT redraw, restyle, reinterpret, change pose, expression, fur, colors, lighting, or ANY detail of the subject. Preserve pixel-level fidelity. ONLY add the merch design layout as described. ${base}`;

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

  // With reference → /edits (actually uses the image), without → /generations
  const hasReference = !!referenceUrl;
  const endpoint = hasReference ? XAI_EDIT_URL : XAI_API_URL;
  const finalPrompt = hasReference ? EXACT_EDIT_PROMPT(cleanedPrompt) : cleanedPrompt;

  const body: Record<string, unknown> = {
    model: "grok-imagine-image-pro",
    prompt: finalPrompt,
    n: Math.min(Math.max(variants, 1), 4),
    response_format: "url",
  };

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
