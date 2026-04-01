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

  const res = await fetch(XAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-2-image",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1024",
      response_format: "url",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Grok Imagine API error ${res.status}: ${err?.error?.message || res.statusText}`
    );
  }

  const data = await res.json();
  const image = data.data?.[0];

  if (!image?.url) {
    throw new Error("Grok Imagine returned no image");
  }

  return {
    url: image.url,
    revisedPrompt: image.revised_prompt,
  };
}
