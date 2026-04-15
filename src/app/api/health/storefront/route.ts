import { NextResponse } from "next/server";
import { getCreatorProfile, getAllCreatorProfiles } from "@/lib/drupal";

/**
 * GET /api/health/storefront
 * Validates storefront rendering pipeline: profile resolution, theme data, template availability.
 */
export async function GET() {
  const start = Date.now();
  const checks: { name: string; ok: boolean; ms: number; detail?: string }[] = [];

  // 1. Get all creator profiles (SSG)
  let profiles: any[] = [];
  try {
    const t0 = Date.now();
    profiles = await getAllCreatorProfiles();
    checks.push({
      name: "profile_list",
      ok: true,
      ms: Date.now() - t0,
      detail: `${profiles.length} creator profile(s) found`,
    });
  } catch (err: any) {
    checks.push({ name: "profile_list", ok: false, ms: Date.now() - start, detail: err.message });
  }

  // 2. Resolve first profile (if any exist)
  if (profiles.length > 0) {
    const testUsername = profiles[0].x_username;
    try {
      const t0 = Date.now();
      const profile = await getCreatorProfile(testUsername);
      const hasRequiredFields = !!(
        profile &&
        profile.x_username &&
        profile.store_theme &&
        profile.store_status
      );

      checks.push({
        name: "profile_resolve",
        ok: !!profile && hasRequiredFields,
        ms: Date.now() - t0,
        detail: profile
          ? `@${profile.x_username}: theme=${profile.store_theme}, status=${profile.store_status}, bio=${profile.bio ? "yes" : "no"}, pfp=${profile.profile_picture_url ? "yes" : "no"}`
          : "Profile not found",
      });

      // 3. Check store status
      checks.push({
        name: "store_status",
        ok: profile?.store_status === "approved",
        ms: 0,
        detail: `Status: ${profile?.store_status || "unknown"}`,
      });

      // 4. Check theme is valid
      const validThemes = ["default", "xai3", "retro", "minimal", "neon", "editorial", "xmimic"];
      const themeValid = validThemes.includes(profile?.store_theme || "default");
      checks.push({
        name: "theme_valid",
        ok: themeValid,
        ms: 0,
        detail: `Theme: ${profile?.store_theme || "default"} (${themeValid ? "valid" : "unknown theme"})`,
      });
    } catch (err: any) {
      checks.push({ name: "profile_resolve", ok: false, ms: Date.now() - start, detail: err.message });
    }
  } else {
    checks.push({ name: "profile_resolve", ok: true, ms: 0, detail: "No profiles to test (empty platform)" });
  }

  // 5. Subdomain middleware check
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net";
  checks.push({
    name: "subdomain_config",
    ok: !!baseDomain,
    ms: 0,
    detail: `Base domain: ${baseDomain}`,
  });

  // 6. Template registry
  try {
    const { getTemplateDefinition } = await import("@/templates/registry");
    const testTemplates = ["modern-cart", "ai-video-store", "retro", "latest-posts", "blank"];
    const found = testTemplates.filter((id) => !!getTemplateDefinition(id));
    checks.push({
      name: "templates",
      ok: found.length === testTemplates.length,
      ms: 0,
      detail: `${found.length}/${testTemplates.length} templates registered`,
    });
  } catch (err: any) {
    checks.push({ name: "templates", ok: false, ms: 0, detail: err.message });
  }

  const allOk = checks.every((c) => c.ok);
  return NextResponse.json({
    service: "storefront",
    status: allOk ? "healthy" : "degraded",
    totalMs: Date.now() - start,
    checks,
  }, { status: allOk ? 200 : 503 });
}
