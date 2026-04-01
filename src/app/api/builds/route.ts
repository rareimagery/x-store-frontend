import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";
import { getBuilds, saveBuildsDetailed } from "@/lib/drupalBuilds";
import { randomUUID } from "crypto";

type StoreJWT = JWT & {
  storeSlug?: string | null;
  xUsername?: string | null;
  handle?: string | null;
};

type StoredBuild = {
  id: string;
  label: string;
  code: string;
  createdAt: string;
  published?: boolean;
};

function pruneBuildsForInsert(builds: StoredBuild[], maxBuilds: number): StoredBuild[] {
  const next = [...builds];

  // Keep the newest history while preferring to drop drafts before published builds.
  while (next.length >= maxBuilds) {
    const oldestDraftIndex = next.findIndex((build) => build.published !== true);
    if (oldestDraftIndex >= 0) {
      next.splice(oldestDraftIndex, 1);
      continue;
    }
    next.shift();
  }

  return next;
}

function normalizeStoreSlug(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/^@+/, "").toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function getStoreSlug(token: StoreJWT): string | null {
  return (
    normalizeStoreSlug(token.storeSlug) ||
    normalizeStoreSlug(token.xUsername) ||
    normalizeStoreSlug(token.handle) ||
    null
  );
}

function getStoreSlugCandidates(token: StoreJWT): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const push = (value: string | null | undefined) => {
    const normalized = normalizeStoreSlug(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push(normalized);
  };

  push(token.storeSlug);
  push(token.xUsername);
  push(token.handle);

  const email = typeof token.email === "string" ? token.email : null;
  if (email && email.includes("@")) {
    const [localPart, domainPart] = email.split("@");
    push(localPart);
    push(domainPart?.split(".")[0] ?? null);
  }

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN;
  push(baseDomain?.split(".")[0] ?? null);

  return candidates;
}

// GET — fetch all saved builds for the authenticated user's store
export async function GET(req: NextRequest) {
  const token = (await getToken({ req })) as StoreJWT | null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slugCandidates = getStoreSlugCandidates(token);
  if (slugCandidates.length === 0) {
    return NextResponse.json({ error: "No store found" }, { status: 404 });
  }

  for (const slug of slugCandidates) {
    const builds = await getBuilds(slug);
    if (builds.length > 0) {
      return NextResponse.json({ builds, slug });
    }
  }

  const fallbackSlug = slugCandidates[0];
  const builds = await getBuilds(fallbackSlug);
  return NextResponse.json({ builds, slug: fallbackSlug });
}

// POST — save a new build
export async function POST(req: NextRequest) {
  const token = (await getToken({ req })) as StoreJWT | null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slugCandidates = getStoreSlugCandidates(token);
  if (slugCandidates.length === 0) {
    return NextResponse.json({ error: "No store found" }, { status: 404 });
  }

  const { label, code, published } = await req.json();
  if (!label || !code) {
    return NextResponse.json(
      { error: "label and code required" },
      { status: 400 }
    );
  }

  const newBuild: StoredBuild = {
    id: randomUUID(),
    label,
    code,
    createdAt: new Date().toISOString(),
    published: published === true,
  };

  let lastError: string | null = null;
  let lastStatus: number | null = null;

  for (const slug of slugCandidates) {
    const builds = await getBuilds(slug);
    const prunedBuilds = pruneBuildsForInsert(builds as StoredBuild[], 20);

    const updated = published === true
      ? [...prunedBuilds.map((b) => ({ ...b, published: false })), newBuild]
      : [...prunedBuilds, newBuild];

    const result = await saveBuildsDetailed(slug, updated);
    if (result.ok) {
      revalidatePath(`/${slug}`);
      revalidatePath(`/${slug}/store`);
      revalidatePath(`/stores/${slug}`);
      return NextResponse.json({ build: newBuild, builds: updated, slug });
    }

    lastError = result.error || "Failed to persist build";
    lastStatus = result.status || 500;
  }

  return NextResponse.json(
    { error: lastError || "Failed to persist build" },
    { status: lastStatus || 500 }
  );
}

// PATCH — toggle published state for a build
export async function PATCH(req: NextRequest) {
  const token = (await getToken({ req })) as StoreJWT | null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slugCandidates = getStoreSlugCandidates(token);
  if (slugCandidates.length === 0) {
    return NextResponse.json({ error: "No store found" }, { status: 404 });
  }

  const { id, published } = await req.json();
  if (!id || typeof published !== "boolean") {
    return NextResponse.json(
      { error: "id and published (boolean) required" },
      { status: 400 }
    );
  }

  let lastError: string | null = null;
  let lastStatus: number | null = null;

  for (const slug of slugCandidates) {
    const builds = await getBuilds(slug);
    if (!(builds as StoredBuild[]).some((b) => b.id === id)) {
      continue;
    }

    const updated = (builds as StoredBuild[]).map((b) => {
      if (published) {
        return b.id === id ? { ...b, published: true } : { ...b, published: false };
      }
      return b.id === id ? { ...b, published: false } : b;
    });

    const result = await saveBuildsDetailed(slug, updated);
    if (result.ok) {
      revalidatePath(`/${slug}/store`);
      revalidatePath(`/stores/${slug}`);
      return NextResponse.json({ ok: true, slug });
    }

    lastError = result.error || "Failed to update publish state";
    lastStatus = result.status || 500;
  }

  return NextResponse.json(
    { error: lastError || "Build not found for this account" },
    { status: lastStatus || 404 }
  );
}

// DELETE — remove a build by id
export async function DELETE(req: NextRequest) {
  const token = (await getToken({ req })) as StoreJWT | null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slugCandidates = getStoreSlugCandidates(token);
  if (slugCandidates.length === 0) {
    return NextResponse.json({ error: "No store found" }, { status: 404 });
  }

  const { id } = await req.json();
  let lastError: string | null = null;
  let lastStatus: number | null = null;

  for (const slug of slugCandidates) {
    const builds = await getBuilds(slug);
    if (!(builds as StoredBuild[]).some((b) => b.id === id)) {
      continue;
    }

    const updated = (builds as StoredBuild[]).filter((b) => b.id !== id);
    const result = await saveBuildsDetailed(slug, updated);
    if (result.ok) {
      revalidatePath(`/${slug}/store`);
      revalidatePath(`/stores/${slug}`);
      return NextResponse.json({ ok: true, slug });
    }

    lastError = result.error || "Failed to delete build";
    lastStatus = result.status || 500;
  }

  return NextResponse.json(
    { error: lastError || "Build not found for this account" },
    { status: lastStatus || 404 }
  );
}
