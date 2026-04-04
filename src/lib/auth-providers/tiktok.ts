// ---------------------------------------------------------------------------
// TikTok OAuth Provider for next-auth v4
// Uses TikTok Login Kit v2: https://developers.tiktok.com/doc/login-kit-web
// ---------------------------------------------------------------------------

import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth";

export interface TikTokProfile {
  data: {
    user: {
      open_id: string;
      union_id?: string;
      display_name: string;
      avatar_url: string;
      avatar_url_100?: string;
    };
  };
}

export default function TikTokProvider(
  options: OAuthUserConfig<TikTokProfile>
): OAuthConfig<TikTokProfile> {
  return {
    id: "tiktok",
    name: "TikTok",
    type: "oauth",
    authorization: {
      url: "https://www.tiktok.com/v2/auth/authorize/",
      params: {
        scope: "user.info.basic",
        response_type: "code",
        client_key: options.clientId,
      },
    },
    token: {
      url: "https://open.tiktokapis.com/v2/oauth/token/",
      async request({ params, provider }: any) {
        const body = new URLSearchParams({
          client_key: options.clientId!,
          client_secret: options.clientSecret!,
          code: params.code as string,
          grant_type: "authorization_code",
          redirect_uri: provider.callbackUrl,
        });

        const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });

        const tokens = await res.json();
        if (!res.ok || tokens.error) {
          console.error("[tiktok-auth] Token exchange failed:", tokens);
          throw new Error(`TikTok token exchange failed: ${tokens.error_description || tokens.error}`);
        }

        return { tokens };
      },
    },
    userinfo: {
      url: "https://open.tiktokapis.com/v2/user/info/",
      async request({ tokens }: any) {
        const res = await fetch(
          "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
          {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          }
        );
        return res.json();
      },
    },
    profile(profile: TikTokProfile) {
      const user = profile.data.user;
      return {
        id: user.open_id,
        name: user.display_name,
        image: user.avatar_url,
      };
    },
    style: { logo: "", bg: "#000000", text: "#ffffff" },
    options,
  };
}
