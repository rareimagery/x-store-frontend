// ---------------------------------------------------------------------------
// Next.js Instrumentation — runs once on server startup
// Validates critical environment variables so misconfigurations fail fast.
// ---------------------------------------------------------------------------

export function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const required: [string, string][] = [
    ["DRUPAL_API_URL", "Drupal backend API base URL"],
    ["DRUPAL_API_USER", "Drupal API username for auth"],
    ["DRUPAL_API_PASS", "Drupal API password for auth"],
    ["NEXTAUTH_SECRET", "NextAuth session encryption secret"],
  ];

  const missing = required.filter(([key]) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      "\n[startup] Missing required environment variables:\n" +
        missing.map(([key, desc]) => `  - ${key}: ${desc}`).join("\n") +
        "\n"
    );
  }

  const recommended: [string, string][] = [
    ["X_CLIENT_ID", "X OAuth 2.0 client ID (login with X)"],
    ["X_CLIENT_SECRET", "X OAuth 2.0 client secret"],
    ["X_API_BEARER_TOKEN", "X API app-only bearer token"],
    ["CRON_SECRET", "Vercel cron job authorization token"],
  ];

  const missingRecommended = recommended.filter(([key]) => !process.env[key]);

  if (missingRecommended.length > 0) {
    console.warn(
      "[startup] Recommended environment variables not set:\n" +
        missingRecommended.map(([key, desc]) => `  - ${key}: ${desc}`).join("\n")
    );
  }
}
