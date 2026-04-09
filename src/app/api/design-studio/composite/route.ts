import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import sharp from "sharp";

export const maxDuration = 30;

interface CompositeRequest {
  image: string;
  top_text?: string;
  bottom_text?: string;
  style?: string;
  product_type?: string;
}

const CANVAS_SIZES: Record<string, { w: number; h: number }> = {
  t_shirt: { w: 2400, h: 3200 },
  hoodie: { w: 2400, h: 3200 },
  ballcap: { w: 2400, h: 1200 },
  digital_drop: { w: 2400, h: 2400 },
};

// Style presets — each produces a different look
const STYLES: Record<string, {
  bg: string;
  topFont: { color: string; stroke: string; shadow: boolean; arc: boolean };
  bottomFont: { color: string; stroke: string; shadow: boolean };
  glow?: string;
}> = {
  bold: {
    bg: "#000000",
    topFont: { color: "#FFD700", stroke: "#000000", shadow: true, arc: true },
    bottomFont: { color: "#FF2020", stroke: "#000000", shadow: true },
  },
  clean: {
    bg: "#111111",
    topFont: { color: "#FFFFFF", stroke: "#333333", shadow: false, arc: false },
    bottomFont: { color: "#CCCCCC", stroke: "#333333", shadow: false },
  },
  neon: {
    bg: "#0A0A1A",
    topFont: { color: "#00FFFF", stroke: "#003333", shadow: true, arc: true },
    bottomFont: { color: "#FF00FF", stroke: "#330033", shadow: true },
    glow: "#00FFFF",
  },
  fire: {
    bg: "#1A0500",
    topFont: { color: "#FF6600", stroke: "#330000", shadow: true, arc: true },
    bottomFont: { color: "#FFCC00", stroke: "#332200", shadow: true },
    glow: "#FF3300",
  },
  ice: {
    bg: "#050515",
    topFont: { color: "#88DDFF", stroke: "#002244", shadow: true, arc: false },
    bottomFont: { color: "#FFFFFF", stroke: "#003366", shadow: true },
    glow: "#4488FF",
  },
  streetwear: {
    bg: "#0D0D0D",
    topFont: { color: "#FFFFFF", stroke: "#000000", shadow: true, arc: false },
    bottomFont: { color: "#FF3333", stroke: "#000000", shadow: true },
  },
  vintage: {
    bg: "#1C1510",
    topFont: { color: "#D4A562", stroke: "#3D2B1A", shadow: false, arc: true },
    bottomFont: { color: "#C49A6C", stroke: "#3D2B1A", shadow: false },
  },
  purple: {
    bg: "#0D0015",
    topFont: { color: "#C084FC", stroke: "#2D004D", shadow: true, arc: true },
    bottomFont: { color: "#E9D5FF", stroke: "#2D004D", shadow: true },
    glow: "#8B5CF6",
  },
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return { r: parseInt(h.slice(0, 2), 16) || 0, g: parseInt(h.slice(2, 4), 16) || 0, b: parseInt(h.slice(4, 6), 16) || 0 };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function buildTextSvg(
  text: string,
  canvasWidth: number,
  fontSize: number,
  fontColor: string,
  strokeColor: string,
  shadow: boolean,
  arc: boolean,
): Buffer {
  const fc = hexToRgb(fontColor);
  const sc = hexToRgb(strokeColor);
  const lineHeight = fontSize * 1.3;
  const words = text.toUpperCase().split(/\s+/);

  // Word wrap
  const lines: string[] = [];
  let cur = "";
  const maxChars = Math.floor(canvasWidth / (fontSize * 0.58));
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (test.length > maxChars && cur) { lines.push(cur); cur = word; }
    else cur = test;
    if (lines.length >= 2) break;
  }
  if (cur && lines.length < 2) lines.push(cur);

  const totalHeight = Math.ceil(lines.length * lineHeight + fontSize);
  const strokeW = Math.max(3, fontSize / 12);

  const svgLines = lines.map((line, i) => {
    const y = fontSize * 0.9 + i * lineHeight;
    const shadowEl = shadow
      ? `<text x="50%" y="${y + 4}" text-anchor="middle" font-family="'Impact','Arial Black','Helvetica Neue',sans-serif" font-size="${fontSize}" font-weight="900" fill="rgba(0,0,0,0.6)" letter-spacing="${fontSize * 0.06}">${escapeXml(line)}</text>`
      : "";
    const mainEl = `<text x="50%" y="${y}" text-anchor="middle" font-family="'Impact','Arial Black','Helvetica Neue',sans-serif" font-size="${fontSize}" font-weight="900" fill="rgb(${fc.r},${fc.g},${fc.b})" stroke="rgb(${sc.r},${sc.g},${sc.b})" stroke-width="${strokeW}" paint-order="stroke" letter-spacing="${fontSize * 0.06}">${escapeXml(line)}</text>`;
    return shadowEl + mainEl;
  }).join("\n");

  // Optional arc path for top text
  let pathDef = "";
  let textContent = svgLines;
  if (arc && lines.length === 1) {
    const arcRadius = canvasWidth * 0.42;
    const centerX = canvasWidth / 2;
    pathDef = `<defs><path id="arc" d="M ${centerX - arcRadius},${fontSize * 1.2} A ${arcRadius},${arcRadius} 0 0,1 ${centerX + arcRadius},${fontSize * 1.2}" /></defs>`;
    const shadowTP = shadow
      ? `<text font-family="'Impact','Arial Black','Helvetica Neue',sans-serif" font-size="${fontSize}" font-weight="900" fill="rgba(0,0,0,0.6)" letter-spacing="${fontSize * 0.08}"><textPath href="#arc" startOffset="50%" text-anchor="middle">${escapeXml(lines[0])}</textPath></text>`
      : "";
    const mainTP = `<text font-family="'Impact','Arial Black','Helvetica Neue',sans-serif" font-size="${fontSize}" font-weight="900" fill="rgb(${fc.r},${fc.g},${fc.b})" stroke="rgb(${sc.r},${sc.g},${sc.b})" stroke-width="${strokeW}" paint-order="stroke" letter-spacing="${fontSize * 0.08}"><textPath href="#arc" startOffset="50%" text-anchor="middle">${escapeXml(lines[0])}</textPath></text>`;
    textContent = shadowTP + mainTP;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${totalHeight}">${pathDef}${textContent}</svg>`;
  return Buffer.from(svg);
}

function buildGlowSvg(width: number, height: number, color: string, imgTop: number, imgHeight: number): Buffer {
  const c = hexToRgb(color);
  const cy = imgTop + imgHeight / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><radialGradient id="g" cx="50%" cy="${(cy / height) * 100}%" r="40%">
      <stop offset="0%" stop-color="rgb(${c.r},${c.g},${c.b})" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="rgb(${c.r},${c.g},${c.b})" stop-opacity="0"/>
    </radialGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#g)"/>
  </svg>`;
  return Buffer.from(svg);
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
  if (!body.top_text && !body.bottom_text) return NextResponse.json({ error: "Text required" }, { status: 400 });

  try {
    const imgBuf = await fetchImageBuffer(body.image);
    const imgMeta = await sharp(imgBuf).metadata();
    const imgW = imgMeta.width || 800;
    const imgH = imgMeta.height || 800;

    const canvas = CANVAS_SIZES[body.product_type || "t_shirt"] || CANVAS_SIZES.t_shirt;
    const style = STYLES[body.style || "bold"] || STYLES.bold;
    const padding = 80;

    // Scale image
    const maxW = canvas.w - padding * 2;
    const scale = Math.min(maxW / imgW, 1.8);
    const sW = Math.round(imgW * scale);
    const sH = Math.round(imgH * scale);
    const scaledImg = await sharp(imgBuf).resize(sW, sH, { fit: "inside" }).png().toBuffer();

    const fontSize = Math.round(canvas.w * 0.09);

    // Build text
    let topBuf: Buffer | null = null;
    let topH = 0;
    if (body.top_text) {
      topBuf = buildTextSvg(body.top_text, canvas.w, fontSize, style.topFont.color, style.topFont.stroke, style.topFont.shadow, style.topFont.arc);
      topH = (await sharp(topBuf).metadata()).height || fontSize * 2;
    }

    let botBuf: Buffer | null = null;
    let botH = 0;
    if (body.bottom_text) {
      botBuf = buildTextSvg(body.bottom_text, canvas.w, Math.round(fontSize * 0.85), style.bottomFont.color, style.bottomFont.stroke, style.bottomFont.shadow, false);
      botH = (await sharp(botBuf).metadata()).height || fontSize * 2;
    }

    const totalH = topH + padding + sH + padding + botH;
    const canvasH = Math.max(canvas.h, totalH + padding * 2);
    const startY = Math.round((canvasH - totalH) / 2);

    const composites: sharp.OverlayOptions[] = [];
    let y = startY;

    // Glow effect behind image
    if (style.glow) {
      const glowBuf = buildGlowSvg(canvas.w, canvasH, style.glow, startY + topH + padding, sH);
      composites.push({ input: glowBuf, top: 0, left: 0 });
    }

    if (topBuf) { composites.push({ input: topBuf, top: y, left: 0 }); y += topH + padding; }
    composites.push({ input: scaledImg, top: y, left: Math.round((canvas.w - sW) / 2) });
    y += sH + padding;
    if (botBuf) { composites.push({ input: botBuf, top: y, left: 0 }); }

    const bgRgb = hexToRgb(style.bg);
    const result = await sharp({
      create: { width: canvas.w, height: canvasH, channels: 4, background: { r: bgRgb.r, g: bgRgb.g, b: bgRgb.b, alpha: 255 } },
    }).composite(composites).png().toBuffer();

    const dataUrl = `data:image/png;base64,${result.toString("base64")}`;

    return NextResponse.json({
      success: true,
      image_url: dataUrl,
      image_urls: [dataUrl], // Match generate API format
      width: canvas.w,
      height: canvasH,
      style: body.style || "bold",
      available_styles: Object.keys(STYLES),
    });
  } catch (err: any) {
    console.error("[composite] Error:", err);
    return NextResponse.json({ error: err.message || "Compositing failed" }, { status: 500 });
  }
}
