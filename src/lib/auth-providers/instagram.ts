// ---------------------------------------------------------------------------
// Instagram OAuth Provider for next-auth v4
// Uses Instagram Graph API (Business/Creator accounts only)
// Basic Display API was deprecated December 2024
// ---------------------------------------------------------------------------

import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth";

export interface InstagramProfile {
  id: string;
  username: string;
  account_type?: "BUSINESS" | "MEDIA_CREATOR" | "PERSONAL";
  name?: string;
  profile_picture_url?: string;
}

export default function InstagramProvider(
  options: OAuthUserConfig<InstagramProfile>
): OAuthConfig<InstagramProfile> {
  return {
    id: "instagram",
    name: "Instagram",
    type: "oauth",
    authorization: {
      url: "https://www.facebook.com/v21.0/dialog/oauth",
      params: {
        scope: "instagram_basic,pages_show_list",
        response_type: "code",
      },
    },
    token: {
      url: "https://graph.facebook.com/v21.0/oauth/access_token",
    },
    userinfo: {
      url: "https://graph.instagram.com/v21.0/me",
      params: { fields: "id,username,account_type,name,profile_picture_url" },
      async request({ tokens }: any) {
        // First get the user's Instagram Business account via Facebook Graph API
        const pagesRes = await fetch(
          `https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account&access_token=${tokens.access_token}`
        );
        const pagesData = await pagesRes.json();
        const igAccountId = pagesData.data?.[0]?.instagram_business_account?.id;

        if (igAccountId) {
          // Fetch Instagram profile via Graph API
          const igRes = await fetch(
            `https://graph.instagram.com/v21.0/${igAccountId}?fields=id,username,name,profile_picture_url&access_token=${tokens.access_token}`
          );
          return igRes.json();
        }

        // Fallback: return basic Facebook profile info
        const fbRes = await fetch(
          `https://graph.facebook.com/v21.0/me?fields=id,name,email&access_token=${tokens.access_token}`
        );
        const fbProfile = await fbRes.json();
        return {
          id: fbProfile.id,
          username: fbProfile.name || fbProfile.id,
          name: fbProfile.name,
        };
      },
    },
    profile(profile: InstagramProfile) {
      return {
        id: profile.id,
        name: profile.name || profile.username,
        image: profile.profile_picture_url || null,
      };
    },
    style: { logo: "", bg: "#E1306C", text: "#ffffff" },
    options,
  };
}
