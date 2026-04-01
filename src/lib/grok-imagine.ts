// ---------------------------------------------------------------------------
// Grok Imagine — AI image generation via x.ai chat completions
// Supports text-to-image AND image-to-image (PFP reference)
// ---------------------------------------------------------------------------

const XAI_API_URL = "https://api.x.ai/v1/chat/completions";
const XAI_API_KEY = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
const X_BEARER = process.env.X_API_BEARER_TOKEN;

export interface GrokImageResult {
  url: string;
  usedPfp: boolean;
  pfpUsername?: string;
}

const PRODUCT_PROMPTS: Record<string, string> = {
  t_shirt: "print-ready t-shirt design, transparent background, high resolution, centered artwork, vector clean edges, POD optimized",
  hoodie: "print-ready hoodie design, transparent background, high resolution, centered artwork, bold graphic, POD optimized",
  ballcap: "print-ready hat embroidery design, transparent background, high resolution, centered compact artwork, clean edges, POD optimized",
};

// Detect @username pfp / my pfp references in prompt
const PFP_PATTERN = /@([A-Za-z0-9_]+)\s*(?:pfp|profile\s*pic|avatar|photo)/i;
const MY_PFP_PATTERN = /\b(?:my|the)\s+(?:pfp|profile\s*pic|avatar|photo)\b/i;

/**
 * Fetch a user's profile image URL from X API.
 */
async function fetchPfpUrl(username: string): Promise<string | null> {
  if (!X_BEARER) return null;
  try {
    const res = await fetch(
      `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=profile_image_url`,
      { headers: { Authorization: `Bearer ${X_BEARER}` }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const url = data.data?.profile_image_url;
    // Get the full-size version
    return url ? url.replace("_normal", "_400x400") : null;
  } catch {
    return null;
  }
}

/**
 * Clean the prompt — remove PFP mentions so Grok focuses on the design.
 */
function cleanPrompt(prompt: string, productType: string): string {
  const cleaned = prompt
    .replace(PFP_PATTERN, "")
    .replace(MY_PFP_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const suffix = PRODUCT_PROMPTS[productType] || PRODUCT_PROMPTS.t_shirt;
  return `${cleaned} | ${suffix}`;
}

/**
 * Generate a design image using Grok.
 * If the prompt references a @username PFP, fetches the image and sends
 * it as a multimodal input so Grok uses it as a reference.
 */
export async function generateDesign(
  prompt: string,
  productType: string,
  currentUsername?: string
): Promise<GrokImageResult> {
  if (!XAI_API_KEY) {
    throw new Error("XAI_API_KEY / GROK_API_KEY not configured");
  }

  // Detect PFP reference
  let pfpUrl: string | null = null;
  let pfpUsername: string | undefined;

  const atMatch = prompt.match(PFP_PATTERN);
  if (atMatch) {
    pfpUsername = atMatch[1];
    pfpUrl = await fetchPfpUrl(pfpUsername);
  } else if (MY_PFP_PATTERN.test(prompt) && currentUsername) {
    pfpUsername = currentUsername;
    pfpUrl = await fetchPfpUrl(currentUsername);
  }

  const cleanedPrompt = cleanPrompt(prompt, productType);

  // Build message content — text only or multimodal with image
  type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
  let content: string | ContentPart[];

  if (pfpUrl) {
    content = [
      {
        type: "image_url" as const,
        image_url: { url: pfpUrl },
      },
      {
        type: "text" as const,
        text: `Use this profile picture as a reference to create a design. ${cleanedPrompt}. Keep the original style and likeness from the reference image.`,
      },
    ];
  } else {
    content = cleanedPrompt;
  }

  const res = await fetch(XAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-2-image",
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err?.error?.message || err?.detail || JSON.stringify(err).slice(0, 300);
    throw new Error(`Grok Imagine API error ${res.status}: ${detail}`);
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message;
  const msgContent = message?.content;

  // Extract image URL from response
  let imageUrl: string | null = null;

  if (typeof msgContent === "string") {
    const urlMatch = msgContent.match(/https?:\/\/[^\s"'<>]+/i);
    if (urlMatch) imageUrl = urlMatch[0];
  }

  if (!imageUrl && Array.isArray(msgContent)) {
    for (const part of msgContent) {
      if (part.type === "image_url" && part.image_url?.url) {
        imageUrl = part.image_url.url;
        break;
      }
    }
  }

  if (!imageUrl && message?.refusal) {
    throw new Error(`Grok refused: ${message.refusal}`);
  }

  if (!imageUrl) {
    throw new Error("Grok Imagine returned no image URL");
  }

  return {
    url: imageUrl,
    usedPfp: !!pfpUrl,
    pfpUsername,
  };
}
