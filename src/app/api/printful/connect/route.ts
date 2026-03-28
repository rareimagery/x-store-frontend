import { NextRequest, NextResponse } from "next/server";

import { drupalWriteHeaders } from "@/lib/drupal";
import { getStoreInfo, PrintfulApiError } from "@/lib/printful";

const DRUPAL_API = process.env.DRUPAL_API_URL;

export async function POST(req: NextRequest) {
  try {
    const { storeId, apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    // Verify the API key with Printful
    let storeInfo: any;
    try {
      storeInfo = await getStoreInfo(apiKey);
    } catch (err) {
      if (err instanceof PrintfulApiError) {
        return NextResponse.json(
          { error: "Invalid Printful API key" },
          { status: 401 }
        );
      }
      throw err;
    }

    const printfulStoreName = storeInfo?.name || "Printful Store";
    const printfulStoreId = String(storeInfo?.id || "");

    // Persist the API key and Printful store ID to the Drupal commerce_store
    if (DRUPAL_API && storeId) {
      const writeHeaders = await drupalWriteHeaders();
      const patchRes = await fetch(
        `${DRUPAL_API}/jsonapi/commerce_store/online/${storeId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/vnd.api+json",
            ...writeHeaders,
          },
          body: JSON.stringify({
            data: {
              type: "commerce_store--online",
              id: storeId,
              attributes: {
                field_printful_api_key: apiKey,
                field_printful_store_id: printfulStoreId,
              },
            },
          }),
        }
      );

      if (!patchRes.ok) {
        const text = await patchRes.text();
        console.error("Failed to save Printful key to Drupal:", text);
      }
    }

    return NextResponse.json({
      success: true,
      printful_store: printfulStoreName,
      printful_store_id: printfulStoreId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Connection failed" },
      { status: 500 }
    );
  }
}
