import { getPublishedBuilds } from "@/lib/drupalBuilds";

export interface StoreTheme {
  colorScheme: string;
  pageBackground: string;
}

/**
 * Load the color scheme and page background from a creator's published wireframe build.
 */
export async function getStoreTheme(storeSlug: string): Promise<StoreTheme> {
  try {
    const builds = await getPublishedBuilds(storeSlug);
    for (const build of builds) {
      try {
        const parsed = JSON.parse(build.code);
        if (parsed?.schemaVersion === 1 && parsed?.type === "wireframe") {
          return {
            colorScheme: parsed.colorScheme || "midnight",
            pageBackground: parsed.pageBackground || "",
          };
        }
      } catch {}
    }
  } catch {}
  return { colorScheme: "midnight", pageBackground: "" };
}
