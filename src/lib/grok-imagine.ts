// ---------------------------------------------------------------------------
// Grok Imagine — AI image generation via x.ai API
// Supports text-to-image AND image-to-image (PFP/upload reference)
// ---------------------------------------------------------------------------

import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";
import { upgradeProfileImageUrl } from "@/lib/x-api/utils";

const XAI_API_URL = "https://api.x.ai/v1/images/generations";
const XAI_API_KEY = process.env.XAI_API_KEY || process.env.GROK_API_KEY;

export interface GrokImageResult {
  url: string;
  usedPfp: boolean;
  usedUpload: boolean;
  pfpUsername?: string;
}

const PRODUCT_PROMPTS: Record<string, string> = {
  t_shirt: "print-ready t-shirt design, transparent background, high resolution, centered artwork, vector clean edges, POD optimized",
  hoodie: "print-ready hoodie design, transparent background, high resolution, centered artwork, bold graphic, POD optimized",
  ballcap: "print-ready hat embroidery design, transparent background, high resolution, centered compact artwork, clean edges, POD optimized",
};

const PFP_PATTERN = /@([A-Za-z0-9_]+)\s*(?:pfp|profile\s*pic|avatar|photo)/i;
const MY_PFP_PATTERN = /\b(?:my|the)\s+(?:pfp|profile\s*pic|avatar|photo)\b/i;

async function fetchPfpUrl(username: string): Promise<string | null> {
  // Try Drupal first (owns the X API data)
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
    } catch {
      // Fall through to X API
    }
  }

  // Fallback: direct X API call
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

function cleanPrompt(prompt: string, productType: string): string {
  const cleaned = prompt
    .replace(PFP_PATTERN, "")
    .replace(MY_PFP_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const suffix = PRODUCT_PROMPTS[productType] || PRODUCT_PROMPTS.t_shirt;
  return `${cleaned} | ${suffix}`;
}

export async function generateDesign(
  prompt: string,
  productType: string,
  currentUsername?: string,
  referenceImageDataUrl?: string
): Promise<GrokImageResult> {
  if (!XAI_API_KEY) {
    throw new Error("XAI_API_KEY / GROK_API_KEY not configured");
  }

  // Priority: uploaded reference > @username PFP > text-only
  let referenceUrl: string | null = referenceImageDataUrl || null;
  let pfpUsername: string | undefined;
  let usedUpload = !!referenceImageDataUrl;

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

  const cleanedPrompt = cleanPrompt(prompt, productType);

  // Build the request — grok-imagine-image uses /v1/images/generations
  const body: Record<string, unknown> = {
    model: "grok-imagine-image",
    prompt: referenceUrl
      ? (usedUpload
          ? `Use this uploaded image as a reference to create a design. ${cleanedPrompt}. Transform it while keeping the core visual elements.`
          : `Use this profile picture as a reference to create a design. ${cleanedPrompt}. Keep the original style and likeness.`)
      : cleanedPrompt,
    n: 1,
    response_format: "url",
  };

  // If we have a reference image, include it
  if (referenceUrl) {
    body.image = referenceUrl;
  }

  const res = await fetch(XAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err?.error?.message || err?.error || JSON.stringify(err).slice(0, 300);
    throw new Error(`Grok Imagine API error ${res.status}: ${detail}`);
  }

  const data = await res.json();
  const imageUrl = data.data?.[0]?.url;

  if (!imageUrl) {
    throw new Error("Grok Imagine returned no image URL");
  }

  return {
    url: imageUrl,
    usedPfp: !!referenceUrl && !usedUpload,
    usedUpload,
    pfpUsername,
  };
}
