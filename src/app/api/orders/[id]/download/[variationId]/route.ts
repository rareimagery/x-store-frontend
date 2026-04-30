import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";
import { buildSignedDownloadUrl } from "@/lib/download-signing";

/**
 * GET /api/orders/[id]/download/[variationId]
 * Issues a 24h signed download URL after verifying the requester owns this order.
 * Used as a "regenerate link" path if the buyer loses the email/DM.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variationId: string }> },
) {
  const { id, variationId } = await params;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUser = session.user as { email?: string | null } | undefined;
  const sessionRole = (session as { role?: string }).role;
  const isAdmin = sessionRole === "admin";

  const orderRes = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_order/default/${id}`,
    {
      headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" },
      cache: "no-store",
    },
  );

  if (!orderRes.ok) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const orderData = await orderRes.json();
  const orderEmail = orderData.data?.attributes?.mail;
  const orderState = orderData.data?.attributes?.state;

  if (!isAdmin && orderEmail !== sessionUser?.email) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (orderState !== "completed") {
    return NextResponse.json(
      { error: "Order is not completed" },
      { status: 400 },
    );
  }

  const variationRes = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_product_variation/digital_download_variation/${variationId}?include=product_id`,
    {
      headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" },
      cache: "no-store",
    },
  );

  if (!variationRes.ok) {
    return NextResponse.json(
      { error: "This item is not a digital download" },
      { status: 400 },
    );
  }

  const variationData = await variationRes.json();
  const productInc = variationData.included?.find(
    (inc: { type: string }) =>
      inc.type === "commerce_product--digital_download",
  );

  if (!productInc) {
    return NextResponse.json(
      { error: "Not a digital product" },
      { status: 400 },
    );
  }

  const productTitle = productInc.attributes?.title || "Download";

  const baseUrl =
    process.env.NEXTAUTH_URL ||
    `https://${req.headers.get("host") || "rareimagery.net"}`;

  const { url, expiresAt } = buildSignedDownloadUrl(baseUrl, id, variationId);

  return NextResponse.json({
    url,
    expiresAt,
    productTitle,
  });
}
