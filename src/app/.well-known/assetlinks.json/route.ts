import { NextRequest, NextResponse } from "next/server";
import { getCreatorStoreBySlug } from "@/lib/drupal";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net";
const ANDROID_SHA256 = process.env.ANDROID_SHA256_FINGERPRINT || "";

export async function GET(req: NextRequest) {
  const hostname = req.headers.get("host") || "";
  const subdomain = hostname.split(":")[0].replace(`.${BASE_DOMAIN}`, "").toLowerCase();

  let packageName = "net.rareimagery.app";

  if (subdomain && subdomain !== hostname.split(":")[0]) {
    const storeResult = await getCreatorStoreBySlug(subdomain);
    if (storeResult) {
      const customConfig = storeResult.store.attributes?.field_app_config;
      if (customConfig) {
        try {
          const parsed = JSON.parse(customConfig);
          packageName = parsed.app?.bundle_id_android || `net.rareimagery.${subdomain}`;
        } catch {
          packageName = `net.rareimagery.${subdomain}`;
        }
      } else {
        packageName = `net.rareimagery.${subdomain}`;
      }
    }
  }

  const assetlinks = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: ANDROID_SHA256 ? [ANDROID_SHA256] : [],
      },
    },
  ];

  return NextResponse.json(assetlinks, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
