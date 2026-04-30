import { DRUPAL_API_URL, drupalAuthHeaders } from "@/lib/drupal";
import { buildSignedDownloadUrl } from "@/lib/download-signing";
import { notifyCreator } from "@/lib/notifications";

interface FulfillItem {
  vid: string;
  id?: string;
  qty?: number;
  title?: string;
}

interface FulfillOpts {
  drupalOrderUuid: string;
  buyerEmail: string;
  buyerXUsername?: string;
  items: FulfillItem[];
  baseUrl: string;
}

interface FulfillResult {
  fulfilled: number;
  skipped: number;
  errors: string[];
}

/**
 * Detect digital_download items in a completed order, generate signed download
 * URLs, and DM/email the buyer. Provider-agnostic — call from any webhook
 * (Stripe today, X Money when its API ships).
 */
export async function fulfillDigitalOrder(
  opts: FulfillOpts,
): Promise<FulfillResult> {
  const result: FulfillResult = { fulfilled: 0, skipped: 0, errors: [] };

  for (const item of opts.items) {
    if (!item.vid) {
      result.skipped++;
      continue;
    }

    try {
      const variationRes = await fetch(
        `${DRUPAL_API_URL}/jsonapi/commerce_product_variation/digital_download_variation/${item.vid}?include=product_id`,
        {
          headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" },
          cache: "no-store",
        },
      );

      if (!variationRes.ok) {
        result.skipped++;
        continue;
      }

      const variationData = await variationRes.json();
      const productInc = variationData.included?.find(
        (inc: { type: string }) =>
          inc.type === "commerce_product--digital_download",
      );

      if (!productInc) {
        result.skipped++;
        continue;
      }

      const productTitle =
        productInc.attributes?.title || item.title || "Your purchase";

      const { url } = buildSignedDownloadUrl(
        opts.baseUrl,
        opts.drupalOrderUuid,
        item.vid,
      );

      await notifyCreator({
        type: "purchase_complete",
        email: opts.buyerEmail,
        xUsername: opts.buyerXUsername,
        productName: productTitle,
        downloadUrl: url,
      }).catch((err) => {
        console.error(
          `[digital-fulfillment] notify failed for ${item.vid}:`,
          err,
        );
      });

      result.fulfilled++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`${item.vid}: ${msg}`);
    }
  }

  return result;
}
