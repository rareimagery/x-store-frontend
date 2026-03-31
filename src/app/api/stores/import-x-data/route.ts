import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getToken } from "next-auth/jwt";
import { findProfileByUsername } from "@/lib/x-import";
import { triggerDrupalSync } from "@/lib/drupal-sync";

// ---------------------------------------------------------------------------
// POST /api/stores/import-x-data
// Tells Drupal to sync X data for the authenticated user's profile.
// Drupal owns the X API calls; Next.js just triggers and displays.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.xUsername) {
    return NextResponse.json(
      { error: "Sign in with X first" },
      { status: 401 }
    );
  }

  const xUsername = token.xUsername as string;

  const profile = await findProfileByUsername(xUsername);
  if (!profile) {
    return NextResponse.json(
      { error: "No Creator X Profile found for this account. Provision your page first." },
      { status: 404 }
    );
  }

  // Tell Drupal to sync this profile (Drupal fetches X data, stores images, etc.)
  try {
    const result = await triggerDrupalSync(xUsername);

    revalidatePath(`/stores/${xUsername}`);
    revalidatePath(`/${xUsername}`);
    revalidatePath(`/console/builder`);

    if (result.failed > 0) {
      return NextResponse.json(
        { error: `Drupal sync failed: ${result.results[0]?.error}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      profileId: profile.uuid,
      summary: { username: xUsername, synced: true },
    });
  } catch (err: any) {
    console.error("Drupal sync trigger failed:", err);
    return NextResponse.json(
      { error: `Sync failed: ${err.message}` },
      { status: 502 }
    );
  }
}
