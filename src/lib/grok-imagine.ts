// ---------------------------------------------------------------------------
// Grok Imagine — AI image generation via x.ai API
// ---------------------------------------------------------------------------

const XAI_API_URL = "https://api.x.ai/v1/images/generations";
const XAI_API_KEY = process.env.XAI_API_KEY || process.env.GROK_API_KEY;

export interface GrokImageResult {
  url: string;
  revisedPrompt?: string;
}

const PRODUCT_PROMPTS: Record<string, string> = {
  t_shirt: "print-ready t-shirt design, transparent background, high resolution 1024x1024, centered artwork, vector clean edges, POD optimized",
  hoodie: "print-ready hoodie design, transparent background, high resolution 1024x1024, centered artwork, bold graphic, POD optimized",
  ballcap: "print-ready hat embroidery design, transparent background, high resolution 1024x1024, centered compact artwork, clean edges, POD optimized",
};

/**
 * Generate a design image using Grok Imagine.
 */
export async function generateDesign(
  prompt: string,
  productType: string
): Promise<GrokImageResult> {
  if (!XAI_API_KEY) {
    throw new Error("XAI_API_KEY / GROK_API_KEY not configured");
  }

  const productSuffix = PRODUCT_PROMPTS[productType] || PRODUCT_PROMPTS.t_shirt;
  const fullPrompt = `${prompt} | ${productSuffix}`;

  // x.ai image generation — uses the chat completions endpoint with image model
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-2-image",
      messages: [
        {
          role: "user",
          content: fullPrompt,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err?.error?.message || err?.detail || JSON.stringify(err).slice(0, 200);
    throw new Error(`Grok Imagine API error ${res.status}: ${detail}`);
  }

  const data = await res.json();

  // grok-2-image returns image URLs in the assistant message content
  const message = data.choices?.[0]?.message;
  const content = message?.content;

  // Content may be a string URL or an array with image objects
  let imageUrl: string | null = null;

  if (typeof content === "string") {
    // Check if it's a direct URL
    const urlMatch = content.match(/https?:\/\/[^\s"']+\.(png|jpg|jpeg|webp)/i);
    if (urlMatch) {
      imageUrl = urlMatch[0];
    }
  }

  // Check for image_url in structured content
  if (!imageUrl && Array.isArray(content)) {
    for (const part of content) {
      if (part.type === "image_url" && part.image_url?.url) {
        imageUrl = part.image_url.url;
        break;
      }
    }
  }

  // Check refusal
  if (!imageUrl && message?.refusal) {
    throw new Error(`Grok refused: ${message.refusal}`);
  }

  if (!imageUrl) {
    throw new Error("Grok Imagine returned no image URL");
  }

  return {
    url: imageUrl,
    revisedPrompt: typeof content === "string" ? undefined : undefined,
  };
}
