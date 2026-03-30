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
    id: "hero_banner",
    type: "hero_banner",
    label: "Hero Banner",
    description: "Full-width banner with heading, subheading, and CTA",
    icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z",
    defaultColumn: "full",
    defaultSpan: 12,
  },
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
    id: "text_block",
    type: "text_block",
    label: "Text Block",
    description: "Rich text with heading and body",
    icon: "M4 6h16M4 12h16M4 18h7",
    defaultColumn: "center",
    defaultSpan: 6,
  },
  {
    id: "image_gallery",
    type: "image_gallery",
    label: "Image Gallery",
    description: "Grid of images",
    icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    defaultColumn: "center",
    defaultSpan: 6,
  },
  {
    id: "cta_section",
    type: "cta_section",
    label: "Call to Action",
    description: "Prominent button with description",
    icon: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122",
    defaultColumn: "right",
    defaultSpan: 3,
  },
  {
    id: "social_feed",
    type: "social_feed",
    label: "Social Feed",
    description: "Recent X posts",
    icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z",
    defaultColumn: "left",
    defaultSpan: 3,
  },
  {
    id: "video_embed",
    type: "video_embed",
    label: "Video Embed",
    description: "YouTube or video player",
    icon: "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    defaultColumn: "center",
    defaultSpan: 6,
  },
  {
    id: "testimonial",
    type: "testimonial",
    label: "Testimonial",
    description: "Customer quote or review",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    defaultColumn: "left",
    defaultSpan: 3,
  },
  {
    id: "spacer",
    type: "spacer",
    label: "Spacer",
    description: "Empty space divider",
    icon: "M4 12h16",
    defaultColumn: "full",
    defaultSpan: 12,
  },
  {
    id: "newsletter",
    type: "newsletter",
    label: "Newsletter",
    description: "Email signup form",
    icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    defaultColumn: "right",
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
