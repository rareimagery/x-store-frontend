import { NextRequest, NextResponse } from "next/server";
import { getCreatorProfile, getProductsByStoreSlug } from "@/lib/drupal";
import {
  findProfileByUsername,
  getDrupalFileAssetUrl,
  getProfileMediaFieldState,
  findLatestSnapshotMediaUrls,
} from "@/lib/x-import";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function stripHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/<[^>]*>/g, "").trim();
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeSvgText(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function initials(handle: string): string {
  const clean = (handle || "creator").replace(/[^a-z0-9_]/gi, "").toUpperCase();
  return clean.slice(0, 2) || "CR";
}

function fallbackAvatar(handle: string): string {
  const label = initials(handle);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" rx="120" fill="url(#g)"/>
  <text x="120" y="130" text-anchor="middle" font-size="74" font-family="Arial, Helvetica, sans-serif" fill="#ffffff" font-weight="700">${escapeSvgText(label)}</text>
</svg>`;
  return svgDataUrl(svg);
}

function fallbackBanner(handle: string): string {
  const safeHandle = escapeSvgText(handle || "creator");
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="560" viewBox="0 0 1600 560">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="50%" stop-color="#172554"/>
      <stop offset="100%" stop-color="#0f766e"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="560" fill="url(#bg)"/>
  <circle cx="1300" cy="120" r="180" fill="#ffffff" fill-opacity="0.08"/>
  <circle cx="320" cy="480" r="240" fill="#ffffff" fill-opacity="0.06"/>
  <text x="120" y="320" font-size="84" font-family="Arial, Helvetica, sans-serif" fill="#ffffff" fill-opacity="0.9" font-weight="700">@${safeHandle}</text>
</svg>`;
  return svgDataUrl(svg);
}

function fallbackProductImage(title: string): string {
  const safeTitle = escapeSvgText(title || "Product");
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1200" fill="url(#pg)"/>
  <rect x="90" y="90" width="1020" height="1020" rx="54" fill="#ffffff" fill-opacity="0.08"/>
  <text x="600" y="620" text-anchor="middle" font-size="56" font-family="Arial, Helvetica, sans-serif" fill="#ffffff" fill-opacity="0.95" font-weight="600">${safeTitle}</text>
</svg>`;
  return svgDataUrl(svg);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const normalizedHandle = handle.toLowerCase();

  try {
    const [profile, products] = await Promise.all([
      getCreatorProfile(normalizedHandle, { noStore: true }),
      getProductsByStoreSlug(normalizedHandle),
    ]);

    let resolvedAvatar = profile?.profile_picture_url || null;
    let resolvedBanner = profile?.banner_url || null;

    const avatarNeedsFallback = !resolvedAvatar || /pbs\.twimg\.com/i.test(resolvedAvatar);
    const bannerNeedsFallback = !resolvedBanner;

    if (avatarNeedsFallback || bannerNeedsFallback) {
      const snapshotMedia = await findLatestSnapshotMediaUrls(normalizedHandle);
      if (avatarNeedsFallback && snapshotMedia?.profilePicture) {
        resolvedAvatar = snapshotMedia.profilePicture;
      }
      if (bannerNeedsFallback && snapshotMedia?.backgroundBanner) {
        resolvedBanner = snapshotMedia.backgroundBanner;
      }

      const stillNeedsAvatar = !resolvedAvatar || /pbs\.twimg\.com/i.test(resolvedAvatar);
      const stillNeedsBanner = !resolvedBanner;

      if (!stillNeedsAvatar && !stillNeedsBanner) {
        // Snapshot payload already had authoritative URLs.
      } else {
      const profileUuid = profile?.id || (await findProfileByUsername(normalizedHandle))?.uuid || null;
      if (profileUuid) {
        const fieldState = await getProfileMediaFieldState(profileUuid);
        const [fallbackAvatar, fallbackBanner] = await Promise.all([
          stillNeedsAvatar && fieldState?.profilePictureFileId
            ? getDrupalFileAssetUrl(fieldState.profilePictureFileId)
            : Promise.resolve(null),
          stillNeedsBanner && fieldState?.backgroundBannerFileId
            ? getDrupalFileAssetUrl(fieldState.backgroundBannerFileId)
            : Promise.resolve(null),
        ]);

        if (fallbackAvatar) resolvedAvatar = fallbackAvatar;
        if (fallbackBanner) resolvedBanner = fallbackBanner;
      }
      }
    }

    const previewProducts = (products || []).slice(0, 8).map((product) => {
      const title = product.title || "Product";
      return {
        id: product.id,
        title,
        price: Number.parseFloat(product.price) || 0,
        image: product.image_url || fallbackProductImage(title),
        description: stripHtml(product.description),
      };
    });

    const topPosts = (profile?.top_posts || []).slice(0, 6).map((post) => ({
      id: post.id,
      text: post.text,
      image: post.image_url ?? null,
    }));

    const friends = (profile?.top_followers || []).slice(0, 8).map((friend, index) => ({
      id: `${friend.username || "friend"}-${index}`,
      username: friend.username,
      displayName: friend.display_name,
      avatar: friend.profile_image_url,
      followerCount: friend.follower_count,
    }));

    return NextResponse.json(
      {
        handle: normalizedHandle,
        avatar: resolvedAvatar || fallbackAvatar(normalizedHandle),
        banner: resolvedBanner || fallbackBanner(normalizedHandle),
        bio: stripHtml(profile?.bio),
        followerCount: profile?.follower_count || 0,
        friends,
        products: previewProducts,
        posts: topPosts,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        handle: normalizedHandle,
        avatar: fallbackAvatar(normalizedHandle),
        banner: fallbackBanner(normalizedHandle),
        bio: "",
        followerCount: 0,
        friends: [],
        products: [],
        posts: [],
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }
}
