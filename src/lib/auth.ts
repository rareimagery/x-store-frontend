import type { NextAuthOptions } from "next-auth";
import type { Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import TwitterProvider from "next-auth/providers/twitter";

import { drupalAuthHeaders, drupalWriteHeaders } from "@/lib/drupal";
import { findProfileByUsername } from "@/lib/x-import";
import { triggerDrupalSync } from "@/lib/drupal-sync";
import { checkRequiredPaidSubscription } from "@/lib/x-subscription";

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
          scope: "tweet.read users.read follows.read offline.access",
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
      if (account?.provider !== "twitter") {
        return true;
      }

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

      const existingByUsername = await findProfileByUsername(normalizedXUsername);
      if (existingByUsername) {
        console.log(`[auth] Found existing profile by username: @${normalizedXUsername}`);
        return true;
      }

      const xUserId = account.providerAccountId;
      if (!xUserId) {
        console.error("[auth] Missing X user ID in account");
        return "/signup?error=MissingXProfile";
      }

      const existingByXUserId = await findProfileByXUserId(xUserId);
      if (existingByXUserId) {
        console.log(`[auth] Found existing profile by X ID: ${xUserId}`);
        return true;
      }

      console.log(`[auth] Checking subscription for @${normalizedXUsername}`);
      const check = await checkRequiredPaidSubscription({
        buyerXId: xUserId,
        buyerUsername: normalizedXUsername,
      });

      if (!check.subscribed) {
        console.warn(`[auth] Subscription check failed for @${normalizedXUsername}: ${check.error}`);
        const infraFailure = /configured|failed|missing|drupal|api|404|not found/i.test(check.error || "");
        if (infraFailure) {
          console.warn(`[auth] Infrastructure failure detected, allowing @${normalizedXUsername} to fail-open`);
          return true;
        }
        return `/signup?error=PaidSubscriptionRequired&username=${normalizedXUsername}`;
      }

      console.log(`[auth] Successful login for @${normalizedXUsername}`);
      return true;
    },
    async jwt({ token, account, profile, user }) {
      const appToken = token as AppToken;
      if (account?.provider === "twitter" && profile) {
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

        // Sync X data to Drupal if profile already exists.
        // Profile creation is handled by the store creation wizard —
        // we only update existing profiles here on subsequent logins.
        // Tell Drupal to sync X data on login (Drupal owns the X API calls).
        if (appToken.xUsername) {
          const xUser = appToken.xUsername;
          (async () => {
            const existing = await findProfileByUsername(xUser);
            if (existing) {
              await triggerDrupalSync(xUser);
            }
          })().catch((err) =>
            console.error(`[auth] Drupal sync trigger failed for @${appToken.xUsername}:`, err)
          );
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
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
};
