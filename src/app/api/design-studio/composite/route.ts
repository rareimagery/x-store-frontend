import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import sharp from "sharp";

export const maxDuration = 30;

interface CompositeRequest {
  image: string; // data:image/... or https:// URL
  top_text?: string;
  bottom_text?: string;
  font_color?: string;
  font_size?: "small" | "medium" | "large";
  background?: string; // hex color, default black
  padding?: number;
  product_type?: string;
}

// Product-specific canvas sizes (width x height)
const CANVAS_SIZES: Record<string, { w: number; h: number }> = {
  t_shirt: { w: 2400, h: 3200 },
  hoodie: { w: 2400, h: 3200 },
  ballcap: { w: 2400, h: 1200 },
  digital_drop: { w: 2400, h: 2400 },
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) || 255,
    g: parseInt(h.slice(2, 4), 16) || 255,
    b: parseInt(h.slice(4, 6), 16) || 255,
  };
}

function buildTextSvg(
  text: string,
  canvasWidth: number,
  fontSize: number,
  color: string,
  maxLines: number = 2
): Buffer {
  const rgb = hexToRgb(color);
  const lineHeight = fontSize * 1.3;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  // Simple word-wrap
  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    if (test.length > Math.floor(canvasWidth / (fontSize * 0.55))) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
    if (lines.length >= maxLines) break;
  }
  if (currentLine && lines.length < maxLines) lines.push(currentLine);

  const totalHeight = Math.ceil(lines.length * lineHeight + fontSize * 0.5);
  const svgLines = lines
    .map(
      (line, i) =>
        `<text x="50%" y="${fontSize + i * lineHeight}" text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-size="${fontSize}" font-weight="900" fill="rgb(${rgb.r},${rgb.g},${rgb.b})" stroke="rgba(0,0,0,0.5)" stroke-width="${Math.max(2, fontSize / 20)}" letter-spacing="${fontSize * 0.05}">${escapeXml(line.toUpperCase())}</text>`
    )
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${totalHeight}">${svgLines}</svg>`;
  return Buffer.from(svg);
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

async function fetchImageBuffer(source: string): Promise<Buffer> {
  if (source.startsWith("data:")) {
    const base64 = source.split(",")[1];
    if (!base64) throw new Error("Invalid data URL");
    return Buffer.from(base64, "base64");
  }
  if (source.startsWith("https://")) {
    const res = await fetch(source, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Image must be a data URL or HTTPS URL");
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: CompositeRequest = await req.json();
  if (!body.image) return NextResponse.json({ error: "image required" }, { status: 400 });
  if (!body.top_text && !body.bottom_text) {
    return NextResponse.json({ error: "At least one of top_text or bottom_text required" }, { status: 400 });
  }

  try {
    // Fetch and process the source image
    const imgBuf = await fetchImageBuffer(body.image);
    const imgMeta = await sharp(imgBuf).metadata();
    const imgWidth = imgMeta.width || 800;
    const imgHeight = imgMeta.height || 800;

    const canvas = CANVAS_SIZES[body.product_type || "t_shirt"] || CANVAS_SIZES.t_shirt;
    const bgColor = body.background || "#000000";
    const fontColor = body.font_color || "#FFFFFF";
    const padding = body.padding ?? 60;

    // Scale image to fit canvas width with padding
    const maxImgWidth = canvas.w - padding * 2;
    const scale = Math.min(maxImgWidth / imgWidth, 1.5); // Don't upscale more than 1.5x
    const scaledW = Math.round(imgWidth * scale);
    const scaledH = Math.round(imgHeight * scale);
    const scaledImg = await sharp(imgBuf).resize(scaledW, scaledH, { fit: "inside" }).png().toBuffer();

    // Font sizes based on canvas
    const fontSizeMap = { small: canvas.w * 0.06, medium: canvas.w * 0.08, large: canvas.w * 0.1 };
    const fontSize = Math.round(fontSizeMap[body.font_size || "large"]);

    // Build text SVGs
    let topSvgBuf: Buffer | null = null;
    let topHeight = 0;
    if (body.top_text) {
      topSvgBuf = buildTextSvg(body.top_text, canvas.w, fontSize, fontColor);
      const topMeta = await sharp(topSvgBuf).metadata();
      topHeight = topMeta.height || fontSize * 2;
    }

    let bottomSvgBuf: Buffer | null = null;
    let bottomHeight = 0;
    if (body.bottom_text) {
      bottomSvgBuf = buildTextSvg(body.bottom_text, canvas.w, fontSize, fontColor);
      const bottomMeta = await sharp(bottomSvgBuf).metadata();
      bottomHeight = bottomMeta.height || fontSize * 2;
    }

    // Calculate layout
    const totalContentHeight = topHeight + padding + scaledH + padding + bottomHeight;
    const canvasH = Math.max(canvas.h, totalContentHeight + padding * 2);
    const startY = Math.round((canvasH - totalContentHeight) / 2);

    // Build composite layers
    const composites: sharp.OverlayOptions[] = [];

    let yOffset = startY;

    if (topSvgBuf) {
      composites.push({ input: topSvgBuf, top: yOffset, left: 0 });
      yOffset += topHeight + padding;
    }

    // Center the image horizontally
    const imgLeft = Math.round((canvas.w - scaledW) / 2);
    composites.push({ input: scaledImg, top: yOffset, left: imgLeft });
    yOffset += scaledH + padding;

    if (bottomSvgBuf) {
      composites.push({ input: bottomSvgBuf, top: yOffset, left: 0 });
    }

    // Create final composite
    const bgRgb = hexToRgb(bgColor);
    const result = await sharp({
      create: {
        width: canvas.w,
        height: canvasH,
        channels: 4,
        background: { r: bgRgb.r, g: bgRgb.g, b: bgRgb.b, alpha: 255 },
      },
    })
      .composite(composites)
      .png()
      .toBuffer();

    // Return as data URL
    const dataUrl = `data:image/png;base64,${result.toString("base64")}`;

    return NextResponse.json({
      success: true,
      image_url: dataUrl,
      width: canvas.w,
      height: canvasH,
    });
  } catch (err: any) {
    console.error("[composite] Error:", err);
    return NextResponse.json({ error: err.message || "Compositing failed" }, { status: 500 });
  }
}
