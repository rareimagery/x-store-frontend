import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { drupalWriteHeaders } from "@/lib/drupal";

const DRUPAL_API = process.env.DRUPAL_API_URL;

interface GeneratedBlock {
  drupalId: string;
  type: string;
  label: string;
  column: "left" | "center" | "right";
  order: number;
}

/**
 * POST /api/blocks/generate
 *
 * Creates Drupal block_content instances from X profile data and store info.
 * Returns a wireframe layout referencing the created block IDs.
 *
 * Body: { profileData, storeSlug, storeName, hasProducts }
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.xUsername && token?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!DRUPAL_API) {
    return NextResponse.json({ error: "Drupal not configured" }, { status: 500 });
  }

  const body = await req.json();
  const {
    profileData,
    storeSlug,
    storeName,
    hasProducts,
  } = body as {
    profileData: {
      username: string;
      displayName?: string;
      bio?: string;
      bannerUrl?: string;
      avatarUrl?: string;
      followerCount?: number;
      topPosts?: any[];
      topFollowers?: any[];
    };
    storeSlug: string;
    storeName: string;
    hasProducts?: boolean;
  };

  if (!profileData?.username || !storeSlug) {
    return NextResponse.json(
      { error: "profileData.username and storeSlug required" },
      { status: 400 }
    );
  }

  const writeHeaders = await drupalWriteHeaders();
  const blocks: GeneratedBlock[] = [];

  async function createBlock(
    bundleType: string,
    info: string,
    attributes: Record<string, unknown>
  ): Promise<string | null> {
    try {
      const res = await fetch(
        `${DRUPAL_API}/jsonapi/block_content/${bundleType}`,
        {
          method: "POST",
          headers: {
            ...writeHeaders,
            "Content-Type": "application/vnd.api+json",
          },
          body: JSON.stringify({
            data: {
              type: `block_content--${bundleType}`,
              attributes: { info, ...attributes },
            },
          }),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        console.error(`[blocks/generate] Failed to create ${bundleType}: ${res.status}`, text);
        return null;
      }
      const json = await res.json();
      return json.data?.id || null;
    } catch (err) {
      console.error(`[blocks/generate] Error creating ${bundleType}:`, err);
      return null;
    }
  }

  // ---- Hero Banner (center, from banner + store name) ----
  const heroId = await createBlock("hero_banner", `${storeSlug}-hero`, {
    field_heading: storeName || `${profileData.displayName || profileData.username}'s Store`,
    field_subheading: profileData.bio?.slice(0, 200) || `Welcome to @${profileData.username}'s store`,
    field_background_image_url: profileData.bannerUrl || null,
    field_cta_text: hasProducts ? "Shop Now" : "Learn More",
    field_cta_url: `/${storeSlug}${hasProducts ? "/store" : ""}`,
  });
  if (heroId) {
    blocks.push({ drupalId: heroId, type: "hero_banner", label: "Hero Banner", column: "center", order: 0 });
  }

  // ---- Text Block — About (left, from bio) ----
  if (profileData.bio) {
    const aboutId = await createBlock("text_block", `${storeSlug}-about`, {
      field_heading: "About",
      field_body_text: { value: profileData.bio, format: "basic_html" },
    });
    if (aboutId) {
      blocks.push({ drupalId: aboutId, type: "text_block", label: "About", column: "left", order: 0 });
    }
  }

  // ---- Social Feed (left, from top posts) ----
  if (profileData.topPosts?.length) {
    const feedId = await createBlock("social_feed", `${storeSlug}-social-feed`, {
      field_heading: "Latest Posts",
      field_max_items: Math.min(profileData.topPosts.length, 5),
    });
    if (feedId) {
      blocks.push({ drupalId: feedId, type: "social_feed", label: "Social Feed", column: "left", order: 1 });
    }
  }

  // ---- Product Grid (center, if store has products) ----
  if (hasProducts) {
    const gridId = await createBlock("product_grid", `${storeSlug}-products`, {
      field_heading: "Shop",
      field_gallery_columns: 2,
      field_max_items: 6,
    });
    if (gridId) {
      blocks.push({ drupalId: gridId, type: "product_grid", label: "Products", column: "center", order: 1 });
    }
  }

  // ---- CTA — Follow on X (right) ----
  const ctaId = await createBlock("cta_section", `${storeSlug}-follow-cta`, {
    field_heading: "Follow Me",
    field_body_text: {
      value: `Stay up to date with @${profileData.username}`,
      format: "basic_html",
    },
    field_cta_text: "Follow on X",
    field_cta_url: `https://x.com/${profileData.username}`,
  });
  if (ctaId) {
    blocks.push({ drupalId: ctaId, type: "cta_section", label: "Follow CTA", column: "right", order: 0 });
  }

  // ---- Newsletter Signup (right) ----
  const nlId = await createBlock("newsletter", `${storeSlug}-newsletter`, {
    field_heading: "Stay in the Loop",
    field_body_text: {
      value: "Get notified about new drops and exclusives.",
      format: "basic_html",
    },
    field_cta_text: "Subscribe",
  });
  if (nlId) {
    blocks.push({ drupalId: nlId, type: "newsletter", label: "Newsletter", column: "right", order: 1 });
  }

  // ---- Testimonial placeholder (right) ----
  const testId = await createBlock("testimonial", `${storeSlug}-testimonial`, {
    field_quote_text: {
      value: "Amazing creator with great content!",
      format: "basic_html",
    },
    field_author_name: "Happy Supporter",
    field_author_handle: "",
  });
  if (testId) {
    blocks.push({ drupalId: testId, type: "testimonial", label: "Testimonial", column: "right", order: 2 });
  }

  // Build the wireframe layout JSON
  const layout = {
    left: blocks.filter((b) => b.column === "left").sort((a, b) => a.order - b.order),
    center: blocks.filter((b) => b.column === "center").sort((a, b) => a.order - b.order),
    right: blocks.filter((b) => b.column === "right").sort((a, b) => a.order - b.order),
  };

  return NextResponse.json({
    success: true,
    blocksCreated: blocks.length,
    blocks,
    layout,
  });
}
