import { NextRequest, NextResponse } from "next/server";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";
import { verifyDownload } from "@/lib/download-signing";

/**
 * GET /api/download/verify?o=<orderId>&i=<variationId>&e=<expiresAt>&s=<signature>
 * Verifies HMAC signature + expiry, then streams the private Drupal file.
 * Public route — security comes from the signature itself.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const orderId = sp.get("o") || "";
  const variationId = sp.get("i") || "";
  const expiresAt = parseInt(sp.get("e") || "0", 10);
  const signature = sp.get("s") || "";

  if (!orderId || !variationId || !expiresAt || !signature) {
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  }

  const check = verifyDownload(orderId, variationId, expiresAt, signature);
  if (!check.valid) {
    return NextResponse.json(
      {
        error:
          check.reason === "expired"
            ? "This download link has expired. Request a new link from your order page."
            : "Invalid download link",
      },
      { status: 403 },
    );
  }

  const variationRes = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_product_variation/digital_download_variation/${variationId}?include=product_id.field_download_file`,
    {
      headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" },
      cache: "no-store",
    },
  );

  if (!variationRes.ok) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const variationData = await variationRes.json();
  const included = variationData.included || [];

  const product = included.find(
    (inc: { type: string }) => inc.type === "commerce_product--digital_download",
  );

  if (!product) {
    return NextResponse.json(
      { error: "Not a digital product" },
      { status: 400 },
    );
  }

  const fileRel = product.relationships?.field_download_file?.data;
  if (!fileRel) {
    return NextResponse.json(
      { error: "No download file attached" },
      { status: 404 },
    );
  }

  const fileEntity = included.find(
    (inc: { type: string; id: string }) =>
      inc.type === "file--file" && inc.id === fileRel.id,
  );

  if (!fileEntity) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const fileUrl: string | undefined = fileEntity.attributes?.uri?.url;
  const filename: string = fileEntity.attributes?.filename || "download";

  if (!fileUrl) {
    return NextResponse.json({ error: "File URL missing" }, { status: 500 });
  }

  const fileRes = await fetch(`${DRUPAL_API_URL}${fileUrl}`, {
    headers: { ...drupalAuthHeaders() },
  });

  if (!fileRes.ok || !fileRes.body) {
    return NextResponse.json({ error: "File fetch failed" }, { status: 502 });
  }

  return new NextResponse(fileRes.body, {
    status: 200,
    headers: {
      "Content-Type":
        fileRes.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
