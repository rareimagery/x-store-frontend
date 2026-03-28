import { NextRequest, NextResponse } from "next/server";
import { getCreatorStoreBySlug } from "@/lib/drupal";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net";
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || "TEAMID";

export async function GET(req: NextRequest) {
  // Extract subdomain from hostname
  const hostname = req.headers.get("host") || "";
  const subdomain = hostname.split(":")[0].replace(`.${BASE_DOMAIN}`, "").toLowerCase();

  // Default bundle ID for the main domain
  let bundleId = `net.rareimagery.app`;

  // If on a creator subdomain, use their bundle ID
  if (subdomain && subdomain !== hostname.split(":")[0]) {
    const storeResult = await getCreatorStoreBySlug(subdomain);
    if (storeResult) {
      const customConfig = storeResult.store.attributes?.field_app_config;
      if (customConfig) {
        try {
          const parsed = JSON.parse(customConfig);
          bundleId = parsed.app?.bundle_id_ios || `net.rareimagery.${subdomain}`;
        } catch {
          bundleId = `net.rareimagery.${subdomain}`;
        }
      } else {
        bundleId = `net.rareimagery.${subdomain}`;
      }
    }
  }

  const aasa = {
    applinks: {
      details: [
        {
          appIDs: [`${APPLE_TEAM_ID}.${bundleId}`],
          components: [
            { "/": "/products/*", comment: "Opens product detail in app" },
            { "/": "/collections/*", comment: "Opens collection in app" },
            { "/": "/*", comment: "All other paths open in app" },
          ],
        },
      ],
    },
    webcredentials: {
      apps: [`${APPLE_TEAM_ID}.${bundleId}`],
    },
  };

  return NextResponse.json(aasa, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
