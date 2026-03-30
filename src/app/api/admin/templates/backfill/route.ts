import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { drupalAuthHeaders, drupalWriteHeaders, DRUPAL_API_URL } from "@/lib/drupal";
import { resolveTemplateId } from "@/templates/catalog";

type ProfileNode = {
  id: string;
  attributes?: {
    field_x_username?: string;
    field_store_theme?: string;
    field_store_theme_config?: string | null;
  };
};

function parseThemeConfig(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (token.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun !== false;

  try {
    const baseUrl = `${DRUPAL_API_URL}/jsonapi/node/x_user_profile?page[limit]=200`;
    let url: string | null = baseUrl;
    const allProfiles: ProfileNode[] = [];

    while (url) {
      const res: Response = await fetch(url, {
        headers: { ...drupalAuthHeaders() },
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json(
          { error: `Failed to fetch profiles: ${res.status} ${text.slice(0, 200)}` },
          { status: 500 }
        );
      }

      const json = await res.json();
      const batch: ProfileNode[] = Array.isArray(json.data) ? json.data : [];
      allProfiles.push(...batch);
      url = typeof json?.links?.next?.href === "string" ? json.links.next.href : null;
    }

    const candidates = allProfiles
      .map((profile) => {
        const attrs = profile.attributes ?? {};
        const theme = attrs.field_store_theme ?? "xai3";
        const parsedConfig = parseThemeConfig(attrs.field_store_theme_config ?? null);
        const existingTemplateId = typeof parsedConfig?.templateId === "string" ? parsedConfig.templateId : null;

        if (existingTemplateId) {
          return null;
        }

        return {
          id: profile.id,
          handle: attrs.field_x_username ?? "unknown",
          theme,
          templateId: resolveTemplateId(theme),
          previousConfig: parsedConfig,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      handle: string;
      theme: string;
      templateId: string;
      previousConfig: Record<string, unknown> | null;
    }>;

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        totalProfiles: allProfiles.length,
        toBackfill: candidates.length,
        sample: candidates.slice(0, 25),
      });
    }

    const writeHeaders = await drupalWriteHeaders();
    const updated: Array<{ id: string; handle: string; templateId: string }> = [];
    const failed: Array<{ id: string; handle: string; reason: string }> = [];

    for (const row of candidates) {
      const nextConfig = {
        ...(row.previousConfig ?? {}),
        templateId: row.templateId,
        migratedAt: new Date().toISOString(),
        migrationSource: "admin-backfill",
      };

      const patchRes = await fetch(`${DRUPAL_API_URL}/jsonapi/node/x_user_profile/${row.id}`, {
        method: "PATCH",
        headers: {
          ...writeHeaders,
          "Content-Type": "application/vnd.api+json",
        },
        body: JSON.stringify({
          data: {
            type: "node--x_user_profile",
            id: row.id,
            attributes: {
              field_store_theme_config: JSON.stringify(nextConfig),
            },
          },
        }),
        cache: "no-store",
      });

      if (!patchRes.ok) {
        const text = await patchRes.text();
        failed.push({
          id: row.id,
          handle: row.handle,
          reason: `${patchRes.status} ${text.slice(0, 180)}`,
        });
      } else {
        updated.push({ id: row.id, handle: row.handle, templateId: row.templateId });
      }
    }

    return NextResponse.json({
      dryRun: false,
      totalProfiles: allProfiles.length,
      attempted: candidates.length,
      updatedCount: updated.length,
      failedCount: failed.length,
      updated: updated.slice(0, 100),
      failed: failed.slice(0, 100),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
