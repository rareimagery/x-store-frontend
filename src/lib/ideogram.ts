// ---------------------------------------------------------------------------
// Ideogram v3 — AI image generation via Replicate API
// Best-in-class text rendering + high quality designs
// ---------------------------------------------------------------------------

import Replicate from "replicate";

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;

export interface IdeogramResult {
  url: string;
  urls: string[];
  provider: "ideogram";
}

export interface IdeogramOptions {
  prompt: string;
  numImages?: number;
  aspectRatio?: string;
  styleRef?: string; // URL of style reference image
  magicPromptOption?: "AUTO" | "ON" | "OFF";
}

const PRODUCT_ASPECTS: Record<string, string> = {
  t_shirt: "3:4",
  hoodie: "3:4",
  ballcap: "1:1",
  digital_drop: "1:1",
};

export function isIdeogramConfigured(): boolean {
  return !!REPLICATE_TOKEN;
}

// ---------------------------------------------------------------------------
// Flux 2 Pro — high quality photorealistic generation via Replicate
// ---------------------------------------------------------------------------

export interface FluxResult {
  url: string;
  urls: string[];
  provider: "flux";
}

export async function generateWithFlux(
  options: { prompt: string; numImages?: number; productType?: string; aspectRatio?: string }
): Promise<FluxResult> {
  if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured");
  const replicate = new Replicate({ auth: REPLICATE_TOKEN });
  const aspect = PRODUCT_ASPECTS[options.productType || "t_shirt"] || "3:4";

  console.log("[flux] Generating:", { promptPreview: options.prompt.slice(0, 100), aspect });

  const output = await replicate.run("black-forest-labs/flux-2-pro", {
    input: {
      prompt: options.prompt,
      aspect_ratio: options.aspectRatio || aspect,
      output_format: "webp",
      output_quality: 90,
      safety_tolerance: 5,
    },
  });

  let urls: string[] = [];
  if (Array.isArray(output)) {
    urls = output.map((item: unknown) => typeof item === "string" ? item : (item && typeof item === "object" && "url" in item) ? (item as { url: string }).url : String(item)).filter(Boolean);
  } else if (typeof output === "string") {
    urls = [output];
  } else if (output && typeof output === "object" && "url" in output) {
    urls = [(output as { url: string }).url];
  }

  if (urls.length === 0) throw new Error("Flux returned no images");
  return { url: urls[0], urls, provider: "flux" };
}

// ---------------------------------------------------------------------------
// Ideogram v3 — best text rendering via Replicate
// ---------------------------------------------------------------------------

export async function generateWithIdeogram(
  options: IdeogramOptions & { productType?: string }
): Promise<IdeogramResult> {
  if (!REPLICATE_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN not configured");
  }

  const replicate = new Replicate({ auth: REPLICATE_TOKEN });

  const aspect = PRODUCT_ASPECTS[options.productType || "t_shirt"] || "3:4";

  const input: Record<string, unknown> = {
    prompt: options.prompt,
    aspect_ratio: options.aspectRatio || aspect,
    magic_prompt_option: options.magicPromptOption || "AUTO",
    num_images: Math.min(Math.max(options.numImages || 4, 1), 4),
  };

  // Style reference image
  if (options.styleRef) {
    input.style_reference_images = options.styleRef;
  }

  console.log("[ideogram] Generating:", {
    promptPreview: options.prompt.slice(0, 100),
    aspect: input.aspect_ratio,
    numImages: input.num_images,
    hasStyleRef: !!options.styleRef,
  });

  const output = await replicate.run(
    "ideogram-ai/ideogram-v3-turbo",
    { input }
  );

  // Replicate returns an array of URLs or FileOutput objects
  let urls: string[] = [];
  if (Array.isArray(output)) {
    urls = output.map((item: unknown) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "url" in item) return (item as { url: string }).url;
      return String(item);
    }).filter(Boolean);
  } else if (typeof output === "string") {
    urls = [output];
  }

  if (urls.length === 0) {
    throw new Error("Ideogram returned no images");
  }

  return {
    url: urls[0],
    urls,
    provider: "ideogram",
  };
}
