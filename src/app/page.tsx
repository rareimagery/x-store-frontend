import Image from "next/image";
import Link from "next/link";
import { getAllCreatorProfiles, CreatorProfile } from "@/lib/drupal";
import AuthButton from "@/components/AuthButton";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const SENTIMENT_STYLE: Record<string, string> = {
  "Very Positive": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Positive: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  Neutral: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  Mixed: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

function CreatorCard({ creator }: { creator: CreatorProfile }) {
  const sentiment = creator.metrics?.audience_sentiment ?? null;
  const engScore = creator.metrics?.engagement_score ?? 0;
  const themes = creator.metrics?.top_themes?.slice(0, 3) ?? [];
  const sentimentStyle =
    sentiment ? SENTIMENT_STYLE[sentiment] ?? SENTIMENT_STYLE.Neutral : null;

  return (
    <Link
      href={`/stores/${creator.x_username}`}
      className="group flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition hover:border-indigo-500/50 hover:bg-zinc-900 hover:shadow-lg hover:shadow-indigo-500/10"
    >
      {/* Avatar + identity */}
      <div className="flex items-center gap-4">
        {creator.profile_picture_url ? (
          <Image
            src={creator.profile_picture_url}
            alt={creator.x_username}
            width={56}
            height={56}
            className="h-14 w-14 flex-shrink-0 rounded-full object-cover ring-2 ring-zinc-700 group-hover:ring-indigo-500/60"
          />
        ) : (
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-xl font-bold text-white">
            {creator.x_username.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-white group-hover:text-indigo-400">
            @{creator.x_username}
          </h3>
          <p className="text-sm text-zinc-500">
            {formatCount(creator.follower_count)} followers
          </p>
        </div>
        {sentimentStyle && (
          <span
            className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${sentimentStyle}`}
          >
            {sentiment}
          </span>
        )}
      </div>

      {/* Bio */}
      {creator.bio && (
        <p
          className="mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-400"
          dangerouslySetInnerHTML={{ __html: creator.bio }}
        />
      )}

      {/* Metrics row */}
      {creator.metrics && (
        <div className="mt-4 flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            {engScore}% eng.
          </span>
          <span className="text-zinc-700">·</span>
          <span>{formatCount(creator.metrics.avg_views)} avg views</span>
          <span className="text-zinc-700">·</span>
          <span className="capitalize">{creator.metrics.posting_frequency?.toLowerCase()}</span>
        </div>
      )}

      {/* Theme chips */}
      {themes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {themes.map((t) => (
            <span
              key={t}
              className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

function PipelineStep({
  step,
  icon,
  label,
  detail,
  accent,
}: {
  step: number;
  icon: React.ReactNode;
  label: string;
  detail: string;
  accent: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div
        className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border ${accent}`}
      >
        {icon}
      </div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Step {step}
      </div>
      <h3 className="mb-1 text-base font-bold text-white">{label}</h3>
      <p className="max-w-[200px] text-sm text-zinc-500">{detail}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="mb-4">{icon}</div>
      <h3 className="mb-2 font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-500">{description}</p>
    </div>
  );
}

export default async function LandingPage() {
  let creators: CreatorProfile[] = [];
  try {
    creators = await getAllCreatorProfiles();
  } catch {
    // Drupal unreachable at build time — render empty grid
  }

  const approvedCreators = creators.filter(
    (c) => c.store_status === "approved"
  );

  const totalFollowers = creators.reduce(
    (sum, c) => sum + (c.follower_count ?? 0),
    0
  );
  const totalPosts = creators.reduce(
    (sum, c) => sum + (c.top_posts?.length ?? 0),
    0
  );
  const avgEngagement =
    creators.length > 0
      ? Math.round(
          creators.reduce(
            (sum, c) => sum + (c.metrics?.engagement_score ?? 0),
            0
          ) / creators.length
        )
      : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* ── Nav ── */}
      <nav className="fixed top-0 z-50 w-full border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-lg font-bold text-white">
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              RareImagery
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/build"
              className="hidden rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white sm:block"
            >
              Create Store
            </Link>
            <AuthButton />
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-zinc-800/60">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-indigo-600/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-40 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Powered by X and Grok AI
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Your X presence.
            </span>
            <br />
            <span className="text-white">Your creator store.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
            RareImagery imports your X profile, runs Grok AI analytics on your
            audience, and launches your branded storefront — complete with
            AI-generated themes and product suggestions.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/build"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/40"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Launch My Store with X
            </Link>
            {approvedCreators.length > 0 && (
              <a
                href="#creators"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-8 py-3.5 text-base font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
              >
                Browse Creators
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── Platform stats ── */}
      {creators.length > 0 && (
        <section className="border-b border-zinc-800/60 bg-zinc-900/30">
          <div className="mx-auto grid max-w-4xl grid-cols-2 divide-x divide-zinc-800 sm:grid-cols-4">
            {[
              { label: "Creators", value: formatCount(creators.length) },
              { label: "Followers Tracked", value: formatCount(totalFollowers) },
              { label: "Posts Analyzed", value: formatCount(totalPosts) },
              { label: "Avg Engagement", value: `${avgEngagement}%` },
            ].map(({ label, value }) => (
              <div key={label} className="px-6 py-5 text-center">
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── How it works ── */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-white">How it works</h2>
          <p className="mt-3 text-zinc-500">
            From your first X post to a live store in minutes.
          </p>
        </div>

        <div className="relative grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Connector line — desktop only */}
          <div className="absolute left-1/2 top-7 hidden h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-zinc-700 to-transparent lg:block" />

          <PipelineStep
            step={1}
            accent="border-sky-500/30 bg-sky-500/10"
            label="Connect X"
            detail="Sign in with X. We pull your profile, top posts, followers, and engagement data via X API v2."
            icon={
              <svg className="h-7 w-7 text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            }
          />

          <PipelineStep
            step={2}
            accent="border-violet-500/30 bg-violet-500/10"
            label="Grok Analysis"
            detail="Grok AI reads your content, detects themes, scores your audience sentiment, and suggests products."
            icon={
              <svg className="h-7 w-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 001.357 2.059l.1.045M14.25 3.104c.251.023.501.05.75.082M19.5 14.25v.75c0 .828-.672 1.5-1.5 1.5h-15a1.5 1.5 0 01-1.5-1.5v-.75" />
              </svg>
            }
          />

          <PipelineStep
            step={3}
            accent="border-fuchsia-500/30 bg-fuchsia-500/10"
            label="Grok Generates"
            detail="Grok builds your hero section, about page, layout, CSS, and theme overrides from your brand profile."
            icon={
              <svg className="h-7 w-7 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            }
          />

          <PipelineStep
            step={4}
            accent="border-emerald-500/30 bg-emerald-500/10"
            label="Live Store"
            detail="Your store goes live at creator.rareimagery.net — your own subdomain with themes, products, and commerce."
            icon={
              <svg className="h-7 w-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72" />
              </svg>
            }
          />
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="border-t border-zinc-800/60 bg-zinc-900/20">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white">
              Built for X creators
            </h2>
            <p className="mt-3 text-zinc-500">
              Every feature is designed around your social presence.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="X API v2 Import"
              description="Automatic profile sync — followers, top posts, media, engagement metrics, and audience data pulled directly from X."
              icon={
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15">
                  <svg className="h-5 w-5 text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
              }
            />
            <FeatureCard
              title="Grok 3 Intelligence"
              description="Audience sentiment scoring, content theme detection, product category recommendations, and engagement analysis."
              icon={
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15">
                  <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </div>
              }
            />
            <FeatureCard
              title="Grok Site Generation"
              description="Grok writes your hero copy, about section, custom CSS, layout config, and brand color system automatically."
              icon={
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-500/15">
                  <svg className="h-5 w-5 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
              }
            />
            <FeatureCard
              title="6 Creator Themes"
              description="Xai3 dark, MySpace retro, Neon glow, Editorial magazine, Minimal clean, and XMimic — each AI-matched to your brand."
              icon={
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/15">
                  <svg className="h-5 w-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
                  </svg>
                </div>
              }
            />
            <FeatureCard
              title="Printful POD + Commerce"
              description="Connect Printful, add print-on-demand products, manage orders, and accept payments via Stripe — all in one place."
              icon={
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
                  <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </div>
              }
            />
            <FeatureCard
              title="Subdomain Storefronts"
              description="Every creator gets creator.rareimagery.net — your own domain, your own brand, with full social and follow graph."
              icon={
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
                  <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                </div>
              }
            />
          </div>
        </div>
      </section>

      {/* ── Creator Grid ── */}
      <section id="creators" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white">Featured Creators</h2>
            <p className="mt-1 text-zinc-500">
              Stores built and AI-enhanced on RareImagery.
            </p>
          </div>
          {approvedCreators.length > 0 && (
            <span className="text-sm text-zinc-600">
              {approvedCreators.length} live store
              {approvedCreators.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {approvedCreators.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 py-20 text-center">
            <p className="text-zinc-500">
              No approved stores yet.{" "}
              <Link href="/build" className="text-indigo-400 hover:text-indigo-300">
                Be the first creator →
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {approvedCreators.map((creator) => (
              <CreatorCard key={creator.id} creator={creator} />
            ))}
          </div>
        )}
      </section>

      {/* ── CTA Banner ── */}
      <section className="border-t border-zinc-800/60">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to launch your store?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            Connect your X account. Grok AI analyzes your audience and builds
            your site. You&apos;re live.
          </p>
          <Link
            href="/build"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-purple-500"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Start with X — it&apos;s free
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-600">
        <div className="mb-2 flex items-center justify-center gap-4">
          <Link href="/terms" className="transition-colors hover:text-zinc-400">
            Terms of Service
          </Link>
          <span>&middot;</span>
          <Link href="/eula" className="transition-colors hover:text-zinc-400">
            EULA
          </Link>
          <span>&middot;</span>
          <Link href="/privacy" className="transition-colors hover:text-zinc-400">
            Privacy Policy
          </Link>
        </div>
        &copy; {new Date().getFullYear()} RareImagery. All rights reserved.
      </footer>
    </div>
  );
}
