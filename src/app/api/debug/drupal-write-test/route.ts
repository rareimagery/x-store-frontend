import { NextResponse } from "next/server";
import { saveBuildsDetailed } from "@/lib/drupalBuilds";

/**
 * Debug endpoint to test if Drupal API writes work
 * GET /api/debug/drupal-write-test
 */

export async function GET() {
  const DRUPAL_API_URL = process.env.DRUPAL_API_URL || "";
  const DRUPAL_API_USER = process.env.DRUPAL_API_USER;
  const DRUPAL_API_PASS = process.env.DRUPAL_API_PASS;

  const results: Record<string, any> = {
    env_set: {
      DRUPAL_API_URL: DRUPAL_API_URL,
      DRUPAL_API_USER: DRUPAL_API_USER ? "✓ set" : "✗ missing",
      DRUPAL_API_PASS: DRUPAL_API_PASS ? "✓ set" : "✗ missing",
    },
  };

  if (!DRUPAL_API_USER || !DRUPAL_API_PASS) {
    return NextResponse.json({
      ...results,
      error: "DRUPAL_API_USER or DRUPAL_API_PASS not set in environment",
    });
  }

  try {
    // Step 1: Get the store data
    const auth = `Basic ${Buffer.from(
      `${DRUPAL_API_USER}:${DRUPAL_API_PASS}`
    ).toString("base64")}`;

    results.auth_header = `Basic ${DRUPAL_API_USER}:***`;

    const getRespText = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online`,
      {
        method: "GET",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
      }
    ).then((r) => r.text());

    const getResp = JSON.parse(getRespText);
    
    if (!getResp.data || getResp.data.length === 0) {
      results.get_store = "✗ No stores found";
      return NextResponse.json(results);
    }

    const storeId = getResp.data[0].id;
    results.get_store = `✓ Found store ${storeId.slice(0, 8)}...`;

    // Step 2: Try to PATCH the store
    const patchBody = {
      data: {
        type: "commerce_store--online",
        id: storeId,
        attributes: {
          field_page_builds: `debug-test-${Date.now()}`,
        },
      },
    };

    const patchRespText = await fetch(
      `${DRUPAL_API_URL}/jsonapi/commerce_store/online/${storeId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: auth,
          "Content-Type": "application/vnd.api+json",
        },
        body: JSON.stringify(patchBody),
      }
    ).then((r) => r.text());

    const patchResp = JSON.parse(patchRespText);

    if (patchResp.errors) {
      results.patch_write = "✗ FAILED";
      results.patch_error = patchResp.errors[0];
    } else if (patchResp.data?.attributes?.field_page_builds) {
      results.patch_write = `✓ SUCCESS! field_page_builds = ${patchResp.data.attributes.field_page_builds}`;
    } else {
      results.patch_response = patchResp;
    }

    // Step 3: Test the same library path /api/builds uses.
    const libResult = await saveBuildsDetailed("rareimagery", [
      {
        id: `debug-${Date.now()}`,
        label: "debug",
        code: "<div>debug</div>",
        createdAt: new Date().toISOString(),
        published: false,
      },
    ]);
    results.library_saveBuildsDetailed = libResult;

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({
      ...results,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
