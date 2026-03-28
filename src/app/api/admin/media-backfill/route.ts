import { NextRequest, NextResponse } from "next/server";
import { isSafeImageUrl } from "@/lib/ownership";
import { drupalWriteHeaders } from "@/lib/drupal";

const DRUPAL_API_URL = process.env.DRUPAL_API_URL || "http://72.62.80.155:32778";

type ProfileNode = {
  id: string;
  attributes?: Record<string, unknown>;
};

type BackfillResult = {
  handle: string;
  profileId: string | null;
  avatar: Record<string, unknown>;
  banner: Record<string, unknown>;
  usedXFallback: boolean;
  errors: string[];
};

function firstNonEmptyString(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function normalizeHandle(input: string): string {
  return input.trim().replace(/^@+/, "").toLowerCase();
}

function buildBasicAuthHeader(): string {
  const user = process.env.DRUPAL_API_USER;
  const pass = process.env.DRUPAL_API_PASS;
  if (!user || !pass) {
    throw new Error("DRUPAL_API_USER and DRUPAL_API_PASS must be set");
  }
  return `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
}

async function findProfileByHandle(handle: string): Promise<ProfileNode | null> {
  const auth = buildBasicAuthHeader();
  const url =
    `${DRUPAL_API_URL}/jsonapi/node/creator_x_profile?` +
    `filter[field_x_username]=${encodeURIComponent(handle)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: auth,
      Accept: "application/vnd.api+json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Drupal profile lookup failed (${res.status})`);
  }

  const json = await res.json();
  return (json.data?.[0] as ProfileNode | undefined) || null;
}

async function fetchXProfileMedia(handle: string): Promise<{ avatar: string | null; banner: string | null }> {
  const token = process.env.X_API_BEARER_TOKEN;
  if (!token) return { avatar: null, banner: null };

  const params = new URLSearchParams({
    "user.fields": "id,profile_image_url,profile_banner_url",
  });

  const res = await fetch(
    `https://api.x.com/2/users/by/username/${encodeURIComponent(handle)}?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return { avatar: null, banner: null };
  }

  const json = await res.json();
  const user = json.data;
  if (!user) return { avatar: null, banner: null };

  const avatar =
    typeof user.profile_image_url === "string"
      ? user.profile_image_url.replace("_normal", "_400x400")
      : null;
  const banner =
    typeof user.profile_banner_url === "string"
      ? /\/\d+x\d+$/.test(user.profile_banner_url)
        ? user.profile_banner_url
        : `${user.profile_banner_url}/1500x500`
      : null;

  return { avatar, banner };
}

async function uploadImageToProfileField(
  sourceUrl: string | null,
  profileId: string,
  fieldName: "field_profile_picture" | "field_background_banner",
  filenamePrefix: string,
  writeHeaders: Record<string, string>,
  dryRun: boolean
): Promise<Record<string, unknown>> {
  if (!sourceUrl) {
    return { status: "skipped", reason: "missing-source-url" };
  }
  if (!isSafeImageUrl(sourceUrl)) {
    return { status: "skipped", reason: "unsafe-url" };
  }

  if (dryRun) {
    return { status: "dry-run", sourceUrl };
  }

  const imageRes = await fetch(sourceUrl, { cache: "no-store" });
  if (!imageRes.ok) {
    return { status: "skipped", reason: `download-${imageRes.status}` };
  }

  const contentType = imageRes.headers.get("content-type") || "image/jpeg";
  const ext = contentType.includes("png") ? "png" : "jpg";
  const bytes = Buffer.from(await imageRes.arrayBuffer());

  const uploadRes = await fetch(
    `${DRUPAL_API_URL}/jsonapi/node/creator_x_profile/${profileId}/${fieldName}`,
    {
      method: "POST",
      headers: {
        ...writeHeaders,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `file; filename=\"${filenamePrefix}.${ext}\"`,
        Accept: "application/vnd.api+json",
      },
      body: bytes,
    }
  );

  if (!uploadRes.ok) {
    const details = (await uploadRes.text()).slice(0, 220);
    return { status: "failed", httpStatus: uploadRes.status, details };
  }

  const json = await uploadRes.json();
  return {
    status: "uploaded",
    fileId: json.data?.id || null,
    sourceUrl,
  };
}

async function patchProfileSourceUrls(
  profileId: string,
  avatarUrl: string | null,
  bannerUrl: string | null,
  writeHeaders: Record<string, string>
): Promise<{ ok: boolean; status?: number; details?: string }> {
  const attributes: Record<string, string> = {};
  if (avatarUrl) attributes.field_x_avatar_url = avatarUrl;
  if (bannerUrl) attributes.field_x_banner_url = bannerUrl;

  if (Object.keys(attributes).length === 0) {
    return { ok: true };
  }

  const res = await fetch(`${DRUPAL_API_URL}/jsonapi/node/creator_x_profile/${profileId}`, {
    method: "PATCH",
    headers: {
      ...writeHeaders,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "node--creator_x_profile",
        id: profileId,
        attributes,
      },
    }),
  });

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      details: (await res.text()).slice(0, 220),
    };
  }

  return { ok: true };
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = Boolean(body?.dryRun);
    const rawHandles: string[] = Array.isArray(body?.handles)
      ? body.handles.filter((v: unknown): v is string => typeof v === "string")
      : [];
    const handles: string[] = Array.from(
      new Set(rawHandles.map((v) => normalizeHandle(v)).filter(Boolean))
    );

    if (handles.length === 0) {
      return NextResponse.json(
        { error: "Provide handles: string[] in request body" },
        { status: 400 }
      );
    }

    const writeHeaders = dryRun ? {} : await drupalWriteHeaders();
    const results: BackfillResult[] = [];

    for (const handle of handles) {
      const result: BackfillResult = {
        handle,
        profileId: null,
        avatar: { status: "skipped", reason: "not-run" },
        banner: { status: "skipped", reason: "not-run" },
        usedXFallback: false,
        errors: [],
      };

      try {
        const profile = await findProfileByHandle(handle);
        if (!profile) {
          result.errors.push("profile-not-found");
          results.push(result);
          continue;
        }

        result.profileId = profile.id;
        const attrs = profile.attributes || {};

        let avatarUrl = firstNonEmptyString(
          attrs.field_x_avatar_url,
          attrs.field_profile_image_url,
          attrs.field_profile_picture_url
        );
        let bannerUrl = firstNonEmptyString(
          attrs.field_x_banner_url,
          attrs.field_profile_banner_url,
          attrs.field_banner_url
        );

        if (!avatarUrl || !bannerUrl) {
          const fromX = await fetchXProfileMedia(handle);
          if (!avatarUrl && fromX.avatar) avatarUrl = fromX.avatar;
          if (!bannerUrl && fromX.banner) bannerUrl = fromX.banner;
          result.usedXFallback = Boolean(fromX.avatar || fromX.banner);
        }

        result.avatar = await uploadImageToProfileField(
          avatarUrl,
          profile.id,
          "field_profile_picture",
          `${handle}-pfp-backfill`,
          writeHeaders,
          dryRun
        );

        result.banner = await uploadImageToProfileField(
          bannerUrl,
          profile.id,
          "field_background_banner",
          `${handle}-banner-backfill`,
          writeHeaders,
          dryRun
        );

        if (!dryRun && (avatarUrl || bannerUrl)) {
          const patchResult = await patchProfileSourceUrls(
            profile.id,
            avatarUrl,
            bannerUrl,
            writeHeaders
          );
          if (!patchResult.ok) {
            result.errors.push(
              `source-url-patch-failed:${patchResult.status}:${patchResult.details || "unknown"}`
            );
          }
        }
      } catch (error) {
        result.errors.push(error instanceof Error ? error.message : String(error));
      }

      results.push(result);
    }

    return NextResponse.json({
      dryRun,
      total: results.length,
      uploadedAny: results.filter(
        (r) => r.avatar.status === "uploaded" || r.banner.status === "uploaded"
      ).length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "media-backfill-failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}