import { NextRequest, NextResponse } from "next/server";
import {
  inspectBuildStorage,
  listBuildStoreSlugs,
  migrateBuildStorage,
  type BuildStorageInspection,
} from "@/lib/drupalBuilds";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type MigrationSummary = {
  processed: number;
  migrated: number;
  needsMigration: number;
  byShape: Record<string, number>;
};

function normalizeSlugs(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function buildSummary(results: Array<BuildStorageInspection & { migrated?: boolean }>): MigrationSummary {
  const byShape: Record<string, number> = {};

  for (const result of results) {
    byShape[result.shape] = (byShape[result.shape] || 0) + 1;
  }

  return {
    processed: results.length,
    migrated: results.filter((result) => result.migrated).length,
    needsMigration: results.filter((result) => result.needsMigration).length,
    byShape,
  };
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun !== false;
  const all = body?.all === true;
  const limit = typeof body?.limit === "number" && body.limit > 0 ? Math.min(body.limit, 250) : 250;
  let storeSlugs = normalizeSlugs(body?.storeSlugs);

  if (all) {
    storeSlugs = await listBuildStoreSlugs(limit);
  }

  if (storeSlugs.length === 0) {
    return NextResponse.json(
      { error: "Provide storeSlugs: string[] or set all: true" },
      { status: 400 }
    );
  }

  const results: Array<BuildStorageInspection & { migrated?: boolean }> = [];

  for (const storeSlug of storeSlugs) {
    if (dryRun) {
      results.push(await inspectBuildStorage(storeSlug));
      continue;
    }

    results.push(await migrateBuildStorage(storeSlug));
  }

  return NextResponse.json({
    dryRun,
    all,
    summary: buildSummary(results),
    results,
  });
}