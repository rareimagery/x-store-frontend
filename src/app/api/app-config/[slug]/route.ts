import { NextRequest, NextResponse } from "next/server";
import { getCreatorProfile, getCreatorStoreBySlug } from "@/lib/drupal";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net";
const DRUPAL_API_URL = process.env.DRUPAL_API_URL || "";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Fetch profile and store data in parallel
  const [profile, storeResult] = await Promise.all([
    getCreatorProfile(slug),
    getCreatorStoreBySlug(slug),
  ]);

  if (!profile || !storeResult) {
    return NextResponse.json(
      { error: "Creator not found" },
      { status: 404 }
    );
  }

  const store = storeResult.store;
  const storeAttrs = store.attributes;

  // Check if store has a custom app config saved
  const customConfig = storeAttrs.field_app_config;
  if (customConfig) {
    try {
      const parsed = JSON.parse(customConfig);
      parsed.generated_at = new Date().toISOString();
      return NextResponse.json(parsed, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    } catch {
      // Fall through to auto-generated config
    }
  }

  // Auto-generate config from existing profile/store data
  const config = {
    schema_version: "1.0",
    generated_at: new Date().toISOString(),

    creator: {
      slug: profile.x_username,
      display_name: profile.title || profile.x_username,
      x_handle: `@${profile.x_username}`,
      x_user_id: profile.id,
      bio: profile.bio || "",
      avatar_url: profile.profile_picture_url,
      banner_url: profile.banner_url,
      storefront_url: `https://${slug}.${BASE_DOMAIN}`,
      store_id: store.id,
    },

    app: {
      bundle_id_ios: `net.rareimagery.${slug}`,
      bundle_id_android: `net.rareimagery.${slug}`,
      app_name: profile.title || profile.x_username,
      app_subtitle: "Shop & Posts",
      version: "1.0.0",
      tier: "hosted",
    },

    theme: {
      preset: profile.store_theme || "xai3",
      colors: {
        primary: profile.myspace_accent_color || "#FF1493",
        secondary: profile.myspace_glitter_color || "#9400D3",
        accent: "#00FFFF",
        background: "#0a0a0a",
        surface: "#1a1a2e",
        text_primary: "#FFFFFF",
        text_secondary: "#AAAAAA",
        tab_bar_background: "#0a0a0a",
        tab_bar_active: profile.myspace_accent_color || "#FF1493",
        tab_bar_inactive: "#555555",
      },
      fonts: { display: "system", body: "system" },
      dark_mode_only: true,
    },

    tabs: [
      { id: "feed", label: "Posts", icon: "sparkles", enabled: true, order: 1 },
      { id: "shop", label: "Shop", icon: "bag", enabled: true, order: 2 },
      { id: "media", label: "Media", icon: "photo", enabled: true, order: 3 },
      { id: "profile", label: "Profile", icon: "person", enabled: true, order: 4 },
    ],

    feed: {
      source: "x_posts",
      x_user_id: profile.id,
      content_types: ["tweet", "reply", "retweet", "media"],
      exclude_replies: false,
      max_items: 50,
      refresh_interval_seconds: 300,
      proxy_endpoint: `https://${BASE_DOMAIN}/api/proxy/x-feed/${profile.id}`,
    },

    shop: {
      products_endpoint: `${DRUPAL_API_URL}/jsonapi/commerce_product/default`,
      filter_by_store_id: store.id,
      layout: "grid",
      columns: 2,
      show_price: true,
      show_sold_out: true,
      checkout_mode: "webview",
      checkout_url: `https://${slug}.${BASE_DOMAIN}/cart`,
    },

    media: {
      source: "x_media",
      content_types: ["photo", "video"],
      layout: "masonry",
    },

    profile: {
      show_x_stats: true,
      show_product_count: true,
      show_storefront_link: true,
      links: [
        {
          label: "Full Storefront",
          url: `https://${slug}.${BASE_DOMAIN}`,
          icon: "globe",
        },
      ],
    },

    notifications: {
      enabled: false,
      apns_topic: null,
      fcm_project_id: null,
    },

    analytics: {
      enabled: false,
      provider: null,
    },

    meta: {
      app_store_id: null,
      play_store_id: null,
      app_store_url: null,
      play_store_url: null,
      support_email: "support@rareimagery.net",
      privacy_url: `https://${BASE_DOMAIN}/privacy`,
      terms_url: `https://${BASE_DOMAIN}/terms`,
    },
  };

  return NextResponse.json(config, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
