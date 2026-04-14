import type { NextAuthOptions } from "next-auth";
import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import TwitterProvider from "next-auth/providers/twitter";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import TikTokProvider from "@/lib/auth-providers/tiktok";
import InstagramProvider from "@/lib/auth-providers/instagram";

import { drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";
import { findProfileByUsername } from "@/lib/x-import";
import { triggerDrupalSync } from "@/lib/drupal-sync";
// Free trial model — subscription check removed

const DRUPAL_API = process.env.DRUPAL_API_URL;
const X_OAUTH_CLIENT_ID =
  process.env.X_CLIENT_ID || process.env.X_CONSUMER_KEY || "";
const X_OAUTH_CLIENT_SECRET =
  process.env.X_CLIENT_SECRET || process.env.X_CONSUMER_SECRET || "";

type JsonApiIncludedEntity = {
  id?: string;
  attributes?: Record<string, unknown>;
};

type XProfile = {
  // X OAuth 2.0 fields (next-auth TwitterProvider v2.0)
  username?: string;
  id?: string;
  profile_image_url?: string;
  description?: string;
  verified?: boolean;
  // Legacy OAuth 1.0a fields
  screen_name?: string;
  id_str?: string;
  profile_image_url_https?: string;
  profile_banner_url?: string | null;
  // Nested structure (some next-auth versions)
  data?: {
    username?: string;
    id?: string;
    profile_image_url?: string;
    verified?: boolean;
    description?: string;
  };
};

type AuthUser = User & {
  role?: string;
  shopName?: string | null;
  storeSlug?: string | null;
};

type SocialProviderType = "twitter" | "facebook" | "google" | "tiktok" | "instagram" | "credentials" | null;

type AppToken = JWT & {
  xUsername?: string | null;
  handle?: string | null;
  xId?: string | null;
  xImage?: string | null;
  xBannerUrl?: string | null;
  xVerified?: boolean;
  verified?: boolean;
  xBio?: string | null;
  bio?: string | null;
  xAccessToken?: string | null;
  xAccessTokenSecret?: string | null;
  role?: string | null;
  shopName?: string | null;
  storeSlug?: string | null;
  providerType?: SocialProviderType;
  socialDisplayName?: string | null;
  socialProfileImage?: string | null;
  socialEmail?: string | null;
};

type AppSession = Session & {
  xUsername?: string | null;
  handle?: string | null;
  xId?: string | null;
  xAccessToken?: string | null;
  xBannerUrl?: string | null;
  xBio?: string | null;
  bio?: string | null;
  xVerified?: boolean;
  verified?: boolean;
  role?: string | null;
  shopName?: string | null;
  storeSlug?: string | null;
  providerType?: SocialProviderType;
  socialDisplayName?: string | null;
  socialProfileImage?: string | null;
};

if (!X_OAUTH_CLIENT_ID || !X_OAUTH_CLIENT_SECRET) {
  console.warn(
    "[auth] Missing X OAuth client credentials. Set X_CLIENT_ID/X_CLIENT_SECRET (or legacy X_CONSUMER_KEY/X_CONSUMER_SECRET)."
  );
}
if (X_OAUTH_CLIENT_ID && X_OAUTH_CLIENT_ID === X_OAUTH_CLIENT_SECRET) {
  console.error(
    "[auth] MISCONFIGURATION: X_CLIENT_ID and X_CLIENT_SECRET are identical. " +
    "Copy the OAuth 2.0 Client Secret (not the Client ID) from the X Developer Portal " +
    "and set it as X_CLIENT_SECRET. OAuth login will fail until this is corrected."
  );
}

async function findProfileByXUserId(xUserId: string): Promise<boolean> {
  if (!DRUPAL_API || !xUserId) return false;

  try {
    const res: Response = await fetch(
      `${DRUPAL_API}/jsonapi/node/x_user_profile?filter[field_x_user_id]=${encodeURIComponent(xUserId)}&page[limit]=1`,
      { headers: { ...drupalAuthHeaders() } }
    );
    if (!res.ok) return false;
    const json = await res.json();
    return Array.isArray(json.data) && json.data.length > 0;
  } catch {
    return false;
  }
}

/** Authenticate a store owner against Drupal */
async function authenticateDrupalUser(
  email: string,
  password: string
): Promise<{
  id: string;
  name: string;
  email: string;
  shopName?: string;
  storeSlug?: string;
} | null> {
  try {
    // 1. First attempt to login directly with the provided credentials.
    // This bypasses the need for the background 'rare' user to have 'view any user email' permissions.
    const loginUrl = `${DRUPAL_API}/user/login?_format=json`;
    const loginRes = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ name: email, pass: password }),
    });

    // If direct email login fails, try with just the 'name' part (Drupal sometimes prefers username)
    let finalLoginRes = loginRes;
    if (!loginRes.ok) {
      const usernameCandidate = email.split("@")[0];
      const secondLoginRes = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ name: usernameCandidate, pass: password }),
      });
      if (secondLoginRes.ok) {
        finalLoginRes = secondLoginRes;
      }
    }

    if (!finalLoginRes.ok) {
      console.warn(`[auth] Drupal login failed for ${email}: ${finalLoginRes.status}`);
      return null;
    }

    const loginData = await finalLoginRes.json();
    const uid = loginData.current_user?.uid;
    const sessionCookie = finalLoginRes.headers.getSetCookie?.().find(c => c.startsWith('SESS') || c.startsWith('SSESS'));

    if (!uid) return null;

    // 2. Fetch full user data using the session we just established.
    // This ensures we have permission to see the user's own data.
    const userRes = await fetch(
      `${DRUPAL_API}/jsonapi/user/user?filter[drupal_internal__uid]=${uid}&include=field_store`,
      {
        headers: {
          ...(sessionCookie ? { Cookie: sessionCookie.split(';')[0] } : {}),
          Accept: "application/vnd.api+json",
        },
      }
    );

    // If field_store is missing (e.g. for admin user), retry without include
    let finalUserRes = userRes;
    if (!userRes.ok && userRes.status === 400) {
      const retryRes = await fetch(
        `${DRUPAL_API}/jsonapi/user/user?filter[drupal_internal__uid]=${uid}`,
        {
          headers: {
            ...(sessionCookie ? { Cookie: sessionCookie.split(';')[0] } : {}),
            Accept: "application/vnd.api+json",
          },
        }
      );
      if (retryRes.ok) finalUserRes = retryRes;
    }

    if (!finalUserRes.ok) {
      console.error(`[auth] Failed to fetch user profile for uid ${uid}: ${finalUserRes.status}`);
      return null;
    }

    const userData = await finalUserRes.json();
    const drupalUser = userData?.data?.[0];
    if (!drupalUser) return null;

    const username = drupalUser.attributes.name;
    const included: JsonApiIncludedEntity[] = userData?.included || [];
    const storeRef = drupalUser.relationships?.field_store?.data;
    const store = storeRef
      ? included.find((inc) => inc.id === storeRef.id)
      : null;
    const storeSlug = (store?.attributes?.["field_store_slug"] as string | undefined) || "";
    const shopName =
      drupalUser.attributes.field_shop_name || username;

    return {
      id: `drupal-${uid}`,
      name: shopName,
      email: drupalUser.attributes.mail,
      shopName,
      storeSlug,
    };
  } catch (err) {
    console.error("Drupal auth error:", err);
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  logger: {
    error(code, metadata) {
      console.error(`[NextAuth][error] ${code}`, JSON.stringify(metadata, null, 2));
    },
    warn(code) {
      console.warn(`[NextAuth][warn] ${code}`);
    },
    debug(code, metadata) {
      console.log(`[NextAuth][debug] ${code}`, JSON.stringify(metadata, null, 2));
    },
  },
  providers: [
    TwitterProvider({
      clientId: X_OAUTH_CLIENT_ID,
      clientSecret: X_OAUTH_CLIENT_SECRET,
      version: "2.0",
      authorization: {
        params: {
          scope: "tweet.read users.read follows.read dm.write dm.read offline.access",
        },
      },
      token: {
        url: "https://api.twitter.com/2/oauth2/token",
        async request({ params, checks, provider }) {
          // X OAuth 2.0 requires HTTP Basic Auth for confidential clients.
          const basicAuth = Buffer.from(
            `${encodeURIComponent(X_OAUTH_CLIENT_ID)}:${encodeURIComponent(X_OAUTH_CLIENT_SECRET)}`
          ).toString("base64");

          const redirectUri = provider.callbackUrl;
          const codeVerifier = (checks as Record<string, string>).code_verifier;

          console.log("[auth] Token exchange →", {
            redirect_uri: redirectUri,
            has_code: !!params.code,
            has_code_verifier: !!codeVerifier,
            client_id_len: X_OAUTH_CLIENT_ID.length,
            client_secret_len: X_OAUTH_CLIENT_SECRET.length,
          });

          const body = new URLSearchParams({
            code: params.code as string,
            grant_type: "authorization_code",
            client_id: X_OAUTH_CLIENT_ID,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
          });

          const response = await fetch(
            "https://api.twitter.com/2/oauth2/token",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${basicAuth}`,
              },
              body: body.toString(),
            }
          );

          const tokens = await response.json();
          if (!response.ok) {
            console.error("[auth] X token exchange failed:", {
              status: response.status,
              error: tokens.error,
              description: tokens.error_description,
              redirect_uri: redirectUri,
            });
            throw new Error(
              `X token exchange failed: ${tokens.error} - ${tokens.error_description}`
            );
          }

          console.log("[auth] Token exchange success, got:", Object.keys(tokens));
          return { tokens };
        },
      },
      userinfo: {
        url: "https://api.twitter.com/2/users/me",
        params: {
          "user.fields":
            "profile_image_url,description,public_metrics,verified,created_at",
        },
      },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
      authorization: {
        params: { scope: "public_profile,email" },
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: { scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly" },
      },
    }),
    TikTokProvider({
      clientId: process.env.TIKTOK_CLIENT_KEY || "",
      clientSecret: process.env.TIKTOK_CLIENT_SECRET || "",
    }),
    InstagramProvider({
      clientId: process.env.INSTAGRAM_CLIENT_ID || "",
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.email === process.env.CONSOLE_ADMIN_EMAIL &&
          credentials?.password === process.env.CONSOLE_ADMIN_PASSWORD
        ) {
          const adminUser: AuthUser = {
            id: "1",
            name: "Admin",
            email: credentials!.email,
            role: "admin",
          };
          return adminUser;
        }

        if (credentials?.email && credentials?.password) {
          const drupalUser = await authenticateDrupalUser(
            credentials.email,
            credentials.password
          );
          if (drupalUser) {
            const storeOwnerUser: AuthUser = {
              id: drupalUser.id,
              name: drupalUser.name,
              email: drupalUser.email,
              role: "store_owner",
              shopName: drupalUser.shopName,
              storeSlug: drupalUser.storeSlug,
            };
            return storeOwnerUser;
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      // Social providers (Facebook, TikTok, Instagram) — allow login, store association via email
      if (["facebook", "google", "tiktok", "instagram"].includes(account?.provider || "")) {
        const email = (profile as any)?.email;
        if (!email && (account?.provider === "facebook" || account?.provider === "google")) {
          return `/signup?error=MissingEmail&provider=${account!.provider}`;
        }
        return true;
      }

      if (account?.provider !== "twitter") {
        return true;
      }

      try {
        const xProfile = (profile || {}) as XProfile;

        // X OAuth 2.0 via next-auth returns username at the top level of the profile
        const xUsername =
          xProfile.username ??
          xProfile.screen_name ??
          xProfile.data?.username ??
          "";
        const normalizedXUsername = xUsername.trim().replace(/^@+/, "").toLowerCase();

        console.log(`[auth] X login attempt: @${normalizedXUsername} (${account.providerAccountId})`);

        if (!normalizedXUsername) {
          console.error("[auth] Missing X username in profile");
          return "/signup?error=MissingXProfile";
        }

        const adminXUsernames = (process.env.ADMIN_X_USERNAMES || "")
          .toLowerCase()
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (adminXUsernames.includes(normalizedXUsername)) {
          console.log(`[auth] Admin detected: @${normalizedXUsername}`);
          return true;
        }

        // Wrap Drupal lookups in individual try-catch so a Drupal outage
        // doesn't crash the entire signIn callback ("Something went wrong")
        let existingByUsername = false;
        try {
          const found = await findProfileByUsername(normalizedXUsername);
          existingByUsername = !!found;
        } catch (err) {
          console.error(`[auth] Drupal profile lookup failed for @${normalizedXUsername}:`, err);
          // Drupal unreachable — fail open so users aren't locked out
        }
        if (existingByUsername) {
          console.log(`[auth] Found existing profile by username: @${normalizedXUsername}`);
          return true;
        }

        const xUserId = account.providerAccountId;
        if (!xUserId) {
          console.error("[auth] Missing X user ID in account");
          return "/signup?error=MissingXProfile";
        }

        let existingByXUserId = false;
        try {
          existingByXUserId = await findProfileByXUserId(xUserId);
        } catch (err) {
          console.error(`[auth] Drupal X ID lookup failed for ${xUserId}:`, err);
        }
        if (existingByXUserId) {
          console.log(`[auth] Found existing profile by X ID: ${xUserId}`);
          return true;
        }

        // Free trial model — all X users allowed, no subscription gate
        console.log(`[auth] Successful login for @${normalizedXUsername} (free trial model)`);
        return true;
      } catch (err) {
        // Catch-all: never let signIn crash with "Something went wrong".
        // Log the real error and fail-open so users can still log in.
        console.error("[auth] Unexpected error in signIn callback:", err);
        return true;
      }
    },
    async jwt({ token, account, profile, user }) {
      const appToken = token as AppToken;
      if (account?.provider === "twitter" && profile) {
        appToken.providerType = "twitter";
        const xProfile = profile as XProfile;
        appToken.xUsername =
          xProfile.username ??
          xProfile.screen_name ??
          xProfile.data?.username ??
          "";
        appToken.handle = appToken.xUsername;
        appToken.xId =
          account.providerAccountId ??
          xProfile.id_str ??
          xProfile.data?.id;
        appToken.xImage =
          xProfile.profile_image_url ??
          xProfile.profile_image_url_https ??
          xProfile.data?.profile_image_url ??
          (typeof appToken.picture === "string" ? appToken.picture : null);
        appToken.xBannerUrl =
          xProfile.profile_banner_url ?? null;
        appToken.xVerified =
          xProfile.verified ??
          xProfile.data?.verified ??
          false;
        appToken.verified = appToken.xVerified;
        appToken.xBio =
          xProfile.description ??
          xProfile.data?.description ??
          "";
        appToken.bio = appToken.xBio;
        const accessToken =
          typeof account.access_token === "string"
            ? account.access_token
            : typeof account.oauth_token === "string"
              ? account.oauth_token
              : null;
        const accessTokenSecret =
          typeof account.oauth_token_secret === "string"
            ? account.oauth_token_secret
            : null;
        appToken.xAccessToken = accessToken;
        appToken.xAccessTokenSecret = accessTokenSecret;

        const adminXUsernames = (process.env.ADMIN_X_USERNAMES || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
        const xUser = (appToken.xUsername || "").toLowerCase();
        appToken.role = adminXUsernames.includes(xUser) ? "admin" : "creator";

        // Resolve store slug + sync X data on login (must await so token gets the slug)
        if (appToken.xUsername) {
          const xUser = appToken.xUsername;
          try {
            // Resolve store slug first (fast — single Drupal call)
            const profileRes = await fetch(
              `${DRUPAL_API}/api/creator/profile/${encodeURIComponent(xUser.toLowerCase())}`,
              { cache: "no-store" }
            );
            if (profileRes.ok) {
              const profileData = await profileRes.json();
              if (profileData.store_slug) {
                appToken.storeSlug = profileData.store_slug;
              }
            }
            // Trigger sync in background (don't block login)
            triggerDrupalSync(xUser).catch(() => {});
          } catch (err) {
            console.error(`[auth] Store slug resolve failed for @${xUser}:`, err);
          }
        }
      }
      // Social providers: Facebook, TikTok, Instagram
      if (account && ["facebook", "google", "tiktok", "instagram"].includes(account.provider) && profile) {
        const socialProfile = profile as any;
        appToken.providerType = account.provider as SocialProviderType;
        appToken.socialDisplayName = socialProfile.name || socialProfile.display_name || null;
        appToken.socialProfileImage = socialProfile.image || socialProfile.picture?.data?.url || socialProfile.avatar_url || null;
        appToken.socialEmail = socialProfile.email || null;
        appToken.role = "creator";

        // Set user-facing display fields so console shows something
        if (!appToken.name && appToken.socialDisplayName) {
          appToken.name = appToken.socialDisplayName;
        }
        if (!appToken.picture && appToken.socialProfileImage) {
          appToken.picture = appToken.socialProfileImage;
        }
      }

      if (account?.provider === "credentials" && user) {
        const authUser = user as AuthUser;
        appToken.role = authUser.role || "admin";
        appToken.shopName = authUser.shopName || null;
        appToken.storeSlug = authUser.storeSlug || null;
      }

      // Keep auth simple for X users: if X identity exists, default to creator role.
      if (appToken.xUsername && !appToken.role) {
        appToken.role = "creator";
      }

      return appToken;
    },
    async session({ session, token }) {
      const appSession = session as AppSession;
      const appToken = token as AppToken;
      appSession.xUsername = appToken.xUsername ?? null;
      appSession.handle = appToken.handle ?? appToken.xUsername ?? null;
      appSession.xId = appToken.xId ?? null;
      appSession.xAccessToken = appToken.xAccessToken ?? null;
      appSession.xBannerUrl = appToken.xBannerUrl ?? null;
      appSession.xBio = appToken.xBio ?? appToken.bio ?? null;
      appSession.bio = appToken.bio ?? appToken.xBio ?? null;
      appSession.xVerified = appToken.xVerified ?? appToken.verified ?? false;
      appSession.verified = appToken.verified ?? appToken.xVerified ?? false;
      appSession.role = appToken.role ?? "creator";
      appSession.shopName = appToken.shopName ?? null;
      appSession.storeSlug = appToken.storeSlug ?? null;
      appSession.providerType = appToken.providerType ?? null;
      appSession.socialDisplayName = appToken.socialDisplayName ?? null;
      appSession.socialProfileImage = appToken.socialProfileImage ?? null;
      if (session.user) {
        (session.user as typeof session.user & { handle?: string; bio?: string; verified?: boolean }).handle =
          appToken.handle ??
          appToken.xUsername ??
          undefined;
        (session.user as typeof session.user & { handle?: string; bio?: string; verified?: boolean }).bio =
          appToken.bio ??
          appToken.xBio ??
          undefined;
        (session.user as typeof session.user & { handle?: string; bio?: string; verified?: boolean }).verified =
          Boolean(appToken.verified ?? appToken.xVerified ?? false);
      }
      return appSession;
    },
  },
  debug: process.env.NODE_ENV === "development" || process.env.NEXTAUTH_DEBUG === "true",
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
};
