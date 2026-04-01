import { NextResponse } from "next/server";
import { drupalAuthHeaders } from "@/lib/drupal";

const DRUPAL_API = process.env.DRUPAL_API_URL;

export interface BlockComponentDef {
  id: string;
  type: string;
  label: string;
  description: string;
  icon: string;
  /** Default column placement: "left" | "center" | "right" | "full" */
  defaultColumn: "left" | "center" | "right" | "full";
  /** Default span in 12-col grid */
  defaultSpan: number;
}

/** Static catalog of available builder blocks. */
const BLOCK_CATALOG: BlockComponentDef[] = [
  {
    id: "product_grid",
    type: "product_grid",
    label: "Product Grid",
    description: "Display products from your store",
    icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
    defaultColumn: "center",
    defaultSpan: 6,
  },
  {
    id: "pinned_post",
    type: "pinned_post",
    label: "Pinned Post",
    description: "Your pinned X post, auto-synced",
    icon: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z",
    defaultColumn: "center",
    defaultSpan: 6,
  },
  {
    id: "social_feed",
    type: "social_feed",
    label: "Social Feed",
    description: "Recent X posts",
    icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z",
    defaultColumn: "center",
    defaultSpan: 6,
  },
  {
    id: "music_player",
    type: "music_player",
    label: "Music Player",
    description: "Embed Spotify or Apple Music player",
    icon: "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3",
    defaultColumn: "right",
    defaultSpan: 3,
  },
  {
    id: "x_articles",
    type: "x_articles",
    label: "X Articles",
    description: "Display your long-form X posts and articles",
    icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z",
    defaultColumn: "center",
    defaultSpan: 6,
  },
  {
    id: "grok_gallery",
    type: "grok_gallery",
    label: "Grok Gallery",
    description: "Showcase your AI-generated images and videos",
    icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    defaultColumn: "center",
    defaultSpan: 6,
  },
  {
    id: "x_communities",
    type: "x_communities",
    label: "X Communities",
    description: "Communities you belong to on X",
    icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584m12-1.697a5.971 5.971 0 00-.941-3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0z",
    defaultColumn: "right",
    defaultSpan: 3,
  },
  {
    id: "my_favorites",
    type: "my_favorites",
    label: "My Favorites",
    description: "Show your favorite X creators with their profile and bio",
    icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
    defaultColumn: "left",
    defaultSpan: 3,
  },
];

/**
 * GET /api/blocks — Returns the block component catalog.
 * Optionally fetches saved block instances from Drupal for a store.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storeSlug = searchParams.get("store");

  const result: {
    catalog: BlockComponentDef[];
    instances: any[];
  } = {
    catalog: BLOCK_CATALOG,
    instances: [],
  };

  // If a store slug is provided, fetch any saved block instances from Drupal
  if (storeSlug && DRUPAL_API) {
    try {
      const res = await fetch(
        `${DRUPAL_API}/jsonapi/block_content/hero_banner?page[limit]=1`,
        {
          headers: { ...drupalAuthHeaders(), Accept: "application/vnd.api+json" },
          next: { revalidate: 0 },
        }
      );
      if (res.ok) {
        // Block content API is accessible — could fetch store-specific instances
        // For now, just confirm connectivity
      }
    } catch {
      // Drupal block content not accessible — catalog-only mode
    }
  }

  return NextResponse.json(result);
}
