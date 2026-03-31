import { NextResponse } from "next/server";

/**
 * Debug endpoint to verify auth configuration (no secrets exposed)
 * GET /api/debug/auth-config
 */
const BUILD_VERSION = "2026-03-31-v3-wizard";

export async function GET() {
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const hasSecret = !!process.env.NEXTAUTH_SECRET;
  const clientId = process.env.X_CLIENT_ID || process.env.X_CONSUMER_KEY || "";
  const clientSecret = process.env.X_CLIENT_SECRET || process.env.X_CONSUMER_SECRET || "";
  const drupalUrl = process.env.DRUPAL_API_URL;

  const adminXUsernames = process.env.ADMIN_X_USERNAMES || "";
  const consoleAdminEmail = process.env.CONSOLE_ADMIN_EMAIL || "";

  return NextResponse.json({
    BUILD_VERSION,
    NEXTAUTH_URL: nextAuthUrl || "(NOT SET)",
    NEXTAUTH_SECRET_set: hasSecret,
    NEXTAUTH_SECRET_length: process.env.NEXTAUTH_SECRET?.length || 0,
    X_CLIENT_ID_set: !!clientId,
    X_CLIENT_ID_length: clientId.length,
    X_CLIENT_ID_preview: clientId ? `${clientId.slice(0, 6)}...` : "(NOT SET)",
    X_CLIENT_SECRET_set: !!clientSecret,
    X_CLIENT_SECRET_length: clientSecret.length,
    X_CLIENT_SECRET_matches_ID: clientId === clientSecret,
    expected_callback_url: nextAuthUrl
      ? `${nextAuthUrl}/api/auth/callback/twitter`
      : "(NEXTAUTH_URL not set)",
    DRUPAL_API_URL: drupalUrl || "(NOT SET)",
    DRUPAL_API_USER_set: !!process.env.DRUPAL_API_USER,
    DRUPAL_API_PASS_set: !!process.env.DRUPAL_API_PASS,
    ADMIN_X_USERNAMES_set: !!adminXUsernames,
    ADMIN_X_USERNAMES_value: adminXUsernames || "(NOT SET)",
    CONSOLE_ADMIN_EMAIL_set: !!consoleAdminEmail,
    CONSOLE_ADMIN_EMAIL_preview: consoleAdminEmail
      ? `${consoleAdminEmail.slice(0, 4)}...`
      : "(NOT SET)",
    CONSOLE_ADMIN_PASSWORD_set: !!process.env.CONSOLE_ADMIN_PASSWORD,
    NODE_ENV: process.env.NODE_ENV,
  });
}
