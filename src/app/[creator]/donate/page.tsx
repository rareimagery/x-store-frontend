import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { getCreatorProfile } from "@/lib/drupal";
import DonationCampaignCard, { DonorWall } from "@/components/DonationCampaign";
import ThemedPage from "@/components/ThemedPage";
import { getStoreTheme } from "@/lib/storeTheme";
import type { DonationCampaign } from "@/app/api/donations/route";

const RESERVED = new Set([
  "console", "login", "signup", "admin", "api", "stores", "products",
  "builder", "builder-popup", "build", "studio", "playground",
  "onboarding", "maintenance", "eula", "privacy", "terms",
  "sitemap.xml", "robots.txt", "favicon.ico",
]);

const BASE_URL = process.env.NEXTAUTH_URL || `https://${process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net"}`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ creator: string }>;
}) {
  const { creator } = await params;
  if (RESERVED.has(creator.toLowerCase())) return {};
  const profile = await getCreatorProfile(creator.toLowerCase());
  if (!profile) return { title: "Not Found" };
  return {
    title: `Support @${profile.x_username} | RareImagery`,
    description: `Support @${profile.x_username} with a donation`,
  };
}

export default async function DonatePage({
  params,
}: {
  params: Promise<{ creator: string }>;
}) {
  const { creator } = await params;
  const normalized = creator.toLowerCase();
  if (RESERVED.has(normalized)) notFound();

  const [profile, theme] = await Promise.all([
    getCreatorProfile(normalized, { noStore: true }),
    getStoreTheme(normalized),
  ]);
  if (!profile) notFound();

  // Fetch campaigns from API
  let campaigns: DonationCampaign[] = [];
  try {
    const res = await fetch(
      `${BASE_URL}/api/donations?store=${encodeURIComponent(normalized)}`,
      { next: { revalidate: 30 } }
    );
    if (res.ok) {
      const data = await res.json();
      campaigns = data.campaigns || [];
    }
  } catch {
    // Donation API unavailable
  }

  const bio = profile.bio?.replace(/<[^>]*>/g, "") || "";

  return (
    <ThemedPage colorScheme={theme.colorScheme} pageBackground={theme.pageBackground}>
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="flex items-center gap-4">
            {profile.profile_picture_url && (
              <img
                src={profile.profile_picture_url}
                alt={`@${profile.x_username}`}
                className="h-14 w-14 rounded-full border-2 border-zinc-700"
              />
            )}
            <div>
              <h1 className="text-lg font-bold">
                Support @{profile.x_username}
              </h1>
              {bio && (
                <p className="text-sm text-zinc-400 line-clamp-1">{bio}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns */}
      <div className="mx-auto max-w-3xl px-4 py-8">
        {campaigns.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
              <svg className="h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">No Active Campaigns</h2>
            <p className="text-sm text-zinc-500">
              @{profile.x_username} hasn&apos;t started a campaign yet.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {campaigns.map((campaign) => (
              <div key={campaign.id}>
                <DonationCampaignCard campaign={campaign} />
                {campaign.donorWallEnabled && (
                  <div className="mt-4">
                    <DonorWall donors={[]} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Back link */}
        <div className="mt-12 text-center">
          <Link
            href={`/${profile.x_username}` as Route}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            &larr; Back to @{profile.x_username}
          </Link>
        </div>
      </div>
    </ThemedPage>
  );
}
