import { drupalAuthHeaders, drupalWriteHeaders, DRUPAL_API_URL } from "./drupal";

const PROFILE_BUILDS_KEY = "builderBuildsV2";

function getBasicAuthHeader(): Record<string, string> | null {
  const user = process.env.DRUPAL_API_USER;
  const pass = process.env.DRUPAL_API_PASS;
  if (!user || !pass) return null;
  return {
    Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`,
  };
}

function getBearerAuthHeader(): Record<string, string> | null {
  const token = process.env.DRUPAL_API_TOKEN;
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function getWriteAuthCandidates(): Promise<Array<Record<string, string>>> {
  const candidates: Array<Record<string, string>> = [];
  const seen = new Set<string>();

  function pushHeaders(headers: Record<string, string> | null) {
    if (!headers || Object.keys(headers).length === 0) return;
    const key = Object.entries(headers)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join("|");
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(headers);
  }

  // 1) Session cookie + CSRF
  try {
    pushHeaders(await drupalWriteHeaders());
  } catch {
    // ignore and continue with explicit auth headers below
  }

  // 2) Basic auth
  pushHeaders(getBasicAuthHeader());

  // 3) Bearer token
  pushHeaders(getBearerAuthHeader());

  // Final fallback to legacy helper output (if distinct)
  pushHeaders(drupalAuthHeaders());

  return candidates;
}

export interface Build {
  id: string;
  label: string;
  code: string;
  createdAt: string;
  published?: boolean;
}

export interface BuildDocument {
  schemaVersion: 2;
  updatedAt: string;
  builds: Build[];
}

export type BuildStorageShape =
  | "missing-store"
  | "empty"
  | "legacy-array"
  | "versioned-v2"
  | "invalid-json"
  | "unknown-object";

export interface BuildStorageInspection {
  storeSlug: string;
  storeUuid: string | null;
  shape: BuildStorageShape;
  buildCount: number;
  publishedCount: number;
  updatedAt: string | null;
  rawBytes: number;
  needsMigration: boolean;
  builds: Build[];
}

export interface SaveBuildsResult {
  ok: boolean;
  status?: number;
  error?: string;
}

function isBuild(value: unknown): value is Build {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.code === "string" &&
    typeof candidate.createdAt === "string"
  );
}

function normalizeBuilds(value: unknown): Build[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isBuild)
    .map((build) => ({
      ...build,
      published: build.published === true,
    }));
}

function isBuildDocument(value: unknown): value is BuildDocument {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    candidate.schemaVersion === 2 &&
    typeof candidate.updatedAt === "string" &&
    Array.isArray(candidate.builds)
  );
}

function parseBuildDocument(raw: string | null | undefined): BuildDocument {
  if (!raw) {
    return {
      schemaVersion: 2,
      updatedAt: new Date(0).toISOString(),
      builds: [],
    };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      return {
        schemaVersion: 2,
        updatedAt: new Date(0).toISOString(),
        builds: normalizeBuilds(parsed),
      };
    }

    if (isBuildDocument(parsed)) {
      return {
        schemaVersion: 2,
        updatedAt: parsed.updatedAt,
        builds: normalizeBuilds(parsed.builds),
      };
    }
  } catch {
    // Fall through to empty document.
  }

  return {
    schemaVersion: 2,
    updatedAt: new Date(0).toISOString(),
    builds: [],
  };
}

function inspectRawBuildDocument(raw: string | null | undefined): Omit<BuildStorageInspection, "storeSlug" | "storeUuid"> {
  if (!raw) {
    return {
      shape: "empty",
      buildCount: 0,
      publishedCount: 0,
      updatedAt: null,
      rawBytes: 0,
      needsMigration: false,
      builds: [],
    };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      const builds = normalizeBuilds(parsed);
      return {
        shape: "legacy-array",
        buildCount: builds.length,
        publishedCount: builds.filter((build) => build.published === true).length,
        updatedAt: null,
        rawBytes: raw.length,
        needsMigration: true,
        builds,
      };
    }

    if (isBuildDocument(parsed)) {
      const builds = normalizeBuilds(parsed.builds);
      return {
        shape: "versioned-v2",
        buildCount: builds.length,
        publishedCount: builds.filter((build) => build.published === true).length,
        updatedAt: parsed.updatedAt,
        rawBytes: raw.length,
        needsMigration: false,
        builds,
      };
    }

    return {
      shape: "unknown-object",
      buildCount: 0,
      publishedCount: 0,
      updatedAt: null,
      rawBytes: raw.length,
      needsMigration: true,
      builds: [],
    };
  } catch {
    return {
      shape: "invalid-json",
      buildCount: 0,
      publishedCount: 0,
      updatedAt: null,
      rawBytes: raw.length,
      needsMigration: true,
      builds: [],
    };
  }
}

function serializeBuildDocument(builds: Build[]): string {
  const document: BuildDocument = {
    schemaVersion: 2,
    updatedAt: new Date().toISOString(),
    builds: normalizeBuilds(builds),
  };

  return JSON.stringify(document);
}

export async function getPublishedBuilds(storeSlug: string): Promise<Build[]> {
  const all = await getBuilds(storeSlug);
  return all.filter((b) => b.published === true);
}

/** Resolve the JSON:API UUID for a store given its slug */
async function resolveStoreUuid(slug: string): Promise<string | null> {
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_store/online?filter[field_store_slug]=${encodeURIComponent(slug)}&fields[commerce_store--online]=field_page_builds`,
    {
      headers: {
        ...drupalAuthHeaders(),
        Accept: "application/vnd.api+json",
      },
      cache: "no-store",
    }
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data?.[0]?.id ?? null;
}

async function fetchRawBuildFieldByUuid(uuid: string): Promise<string | null> {
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/commerce_store/online/${uuid}?fields[commerce_store--online]=field_page_builds,field_store_slug`,
    {
      headers: {
        ...drupalAuthHeaders(),
        Accept: "application/vnd.api+json",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) return null;

  const json = await res.json();
  return json.data?.attributes?.field_page_builds ?? null;
}

async function resolveProfileUuidBySlug(slug: string): Promise<string | null> {
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/node/creator_x_profile?filter[field_x_username]=${encodeURIComponent(slug)}&fields[node--creator_x_profile]=field_store_theme_config`,
    {
      headers: {
        ...drupalAuthHeaders(),
        Accept: "application/vnd.api+json",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) return null;
  const json = await res.json();
  return json.data?.[0]?.id ?? null;
}

async function fetchProfileThemeConfigRawByUuid(uuid: string): Promise<unknown> {
  const res = await fetch(
    `${DRUPAL_API_URL}/jsonapi/node/creator_x_profile/${uuid}?fields[node--creator_x_profile]=field_store_theme_config,field_x_username`,
    {
      headers: {
        ...drupalAuthHeaders(),
        Accept: "application/vnd.api+json",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) return null;
  const json = await res.json();
  return json.data?.attributes?.field_store_theme_config ?? null;
}

function parseProfileConfigObject(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  if (typeof raw === "string" && raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
}

function readBuildsFromProfileConfig(raw: unknown): Build[] {
  const config = parseProfileConfigObject(raw);
  const encoded = config[PROFILE_BUILDS_KEY];
  if (typeof encoded !== "string") return [];
  return parseBuildDocument(encoded).builds;
}

async function saveBuildsToProfileConfig(storeSlug: string, builds: Build[]): Promise<SaveBuildsResult> {
  const profileUuid = await resolveProfileUuidBySlug(storeSlug);
  if (!profileUuid) {
    return {
      ok: false,
      error: `Creator profile not found for slug: ${storeSlug}`,
    };
  }

  const existingRaw = await fetchProfileThemeConfigRawByUuid(profileUuid);
  const config = parseProfileConfigObject(existingRaw);
  config[PROFILE_BUILDS_KEY] = serializeBuildDocument(builds);

  const endpoint = `${DRUPAL_API_URL}/jsonapi/node/creator_x_profile/${profileUuid}`;
  const payload = JSON.stringify({
    data: {
      type: "node--creator_x_profile",
      id: profileUuid,
      attributes: {
        field_store_theme_config: JSON.stringify(config),
      },
    },
  });

  async function patchWithHeaders(headers: Record<string, string>) {
    return fetch(endpoint, {
      method: "PATCH",
      headers: {
        ...headers,
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json",
      },
      body: payload,
      cache: "no-store",
    });
  }

  try {
    const authCandidates = await getWriteAuthCandidates();
    if (authCandidates.length === 0) {
      return {
        ok: false,
        error: "No Drupal write auth credentials available.",
      };
    }

    let res: Response | null = null;
    for (const headers of authCandidates) {
      res = await patchWithHeaders(headers);
      if (res.ok) {
        return { ok: true, status: res.status };
      }
      if (res.status !== 403) {
        break;
      }
    }

    if (!res) {
      return {
        ok: false,
        error: "No Drupal write auth candidates could be attempted.",
      };
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        error: `Profile PATCH failed (${res.status}). Payload bytes=${payload.length}. ${body.slice(0, 400)}`,
      };
    }

    return { ok: true, status: res.status };

  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown profile save error",
    };
  }
}

export async function listBuildStoreSlugs(limit = 250): Promise<string[]> {
  const params = new URLSearchParams({
    "fields[commerce_store--online]": "field_store_slug",
    "page[limit]": String(limit),
  });

  const res = await fetch(`${DRUPAL_API_URL}/jsonapi/commerce_store/online?${params.toString()}`, {
    headers: {
      ...drupalAuthHeaders(),
      Accept: "application/vnd.api+json",
    },
    cache: "no-store",
  });

  if (!res.ok) return [];

  const json = await res.json();
  const data: Array<{ attributes?: { field_store_slug?: unknown } }> = Array.isArray(json.data) ? json.data : [];

  return data
    .map((item) => item?.attributes?.field_store_slug)
    .filter((slug): slug is string => typeof slug === "string" && slug.trim().length > 0);
}

export async function inspectBuildStorage(storeSlug: string): Promise<BuildStorageInspection> {
  const uuid = await resolveStoreUuid(storeSlug);
  if (!uuid) {
    return {
      storeSlug,
      storeUuid: null,
      shape: "missing-store",
      buildCount: 0,
      publishedCount: 0,
      updatedAt: null,
      rawBytes: 0,
      needsMigration: false,
      builds: [],
    };
  }

  const raw = await fetchRawBuildFieldByUuid(uuid);
  const inspection = inspectRawBuildDocument(raw);

  return {
    storeSlug,
    storeUuid: uuid,
    ...inspection,
  };
}

export async function migrateBuildStorage(storeSlug: string): Promise<BuildStorageInspection & { migrated: boolean }> {
  const inspection = await inspectBuildStorage(storeSlug);

  if (!inspection.storeUuid || !inspection.needsMigration) {
    return { ...inspection, migrated: false };
  }

  const migrated = await saveBuilds(storeSlug, inspection.builds);
  if (!migrated) {
    return { ...inspection, migrated: false };
  }

  const refreshed = await inspectBuildStorage(storeSlug);
  return { ...refreshed, migrated: true };
}

export async function getBuilds(storeSlug: string): Promise<Build[]> {
  const uuid = await resolveStoreUuid(storeSlug);
  if (uuid) {
    const raw = await fetchRawBuildFieldByUuid(uuid);
    const storeBuilds = parseBuildDocument(raw).builds;
    if (storeBuilds.length > 0) return storeBuilds;
  }

  const profileUuid = await resolveProfileUuidBySlug(storeSlug);
  if (!profileUuid) return [];
  const profileRaw = await fetchProfileThemeConfigRawByUuid(profileUuid);
  return readBuildsFromProfileConfig(profileRaw);
}

export async function saveBuilds(
  storeSlug: string,
  builds: Build[]
): Promise<boolean> {
  const result = await saveBuildsDetailed(storeSlug, builds);
  if (!result.ok) {
    console.error(`[builds] saveBuilds failed for ${storeSlug}: ${result.error || "unknown error"}`);
  }
  return result.ok;
}

export async function saveBuildsDetailed(
  storeSlug: string,
  builds: Build[]
): Promise<SaveBuildsResult> {
  const uuid = await resolveStoreUuid(storeSlug);
  if (!uuid) {
    return {
      ok: false,
      error: `Store not found for slug: ${storeSlug}`,
    };
  }

  const serialized = serializeBuildDocument(builds);
  const patchUrl = `${DRUPAL_API_URL}/jsonapi/commerce_store/online/${uuid}`;

  async function patchWithHeaders(headers: Record<string, string>) {
    return fetch(patchUrl, {
      method: "PATCH",
      headers: {
        ...headers,
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "commerce_store--online",
          id: uuid,
          attributes: {
            field_page_builds: serialized,
          },
        },
      }),
    });
  }

  try {
    const authCandidates = await getWriteAuthCandidates();
    if (authCandidates.length === 0) {
      return {
        ok: false,
        error: "No Drupal write auth credentials available.",
      };
    }

    let res: Response | null = null;
    for (const headers of authCandidates) {
      res = await patchWithHeaders(headers);
      if (res.ok) {
        return { ok: true, status: res.status };
      }
      if (res.status !== 403) {
        break;
      }
    }

    if (!res) {
      return {
        ok: false,
        error: "No Drupal write auth candidates could be attempted.",
      };
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const storeError = {
        ok: false,
        status: res.status,
        error: `Drupal PATCH failed (${res.status}). Payload bytes=${serialized.length}. ${body.slice(0, 400)}`,
      } as SaveBuildsResult;

      if (res.status === 403) {
        const profileResult = await saveBuildsToProfileConfig(storeSlug, builds);
        if (profileResult.ok) {
          return {
            ok: true,
            status: profileResult.status,
          };
        }

        return {
          ok: false,
          status: profileResult.status || storeError.status,
          error: `${storeError.error} | Fallback failed: ${profileResult.error || "unknown profile write error"}`,
        };
      }

      return storeError;
    }

    return { ok: true, status: res.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown save error",
    };
  }
}
