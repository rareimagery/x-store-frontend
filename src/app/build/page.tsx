import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import BuildPageClient from "@/components/BuildPageClient";

export const metadata = {
  title: "Build Your Store | RareImagery X Marketplace",
  description:
    "Sign in with X and launch your branded storefront in minutes. Grok AI auto-imports your profile, posts, and followers.",
};

function SignInButton() {
  return (
    <form
      action="/api/auth/signin/twitter"
      method="GET"
    >
      <input type="hidden" name="callbackUrl" value="/build" />
      <button
        type="submit"
        className="inline-flex items-center gap-3 rounded-xl bg-white px-8 py-4 text-lg font-bold text-black shadow-lg transition hover:bg-zinc-100 hover:shadow-xl"
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Sign in with X to Get Started
      </button>
    </form>
  );
}

export default async function BuildPage() {
  const session = await getServerSession(authOptions);

  // Store owners with existing stores go to console
  if (session && (session as any).role === "store_owner") {
    redirect("/console");
  }

  const isCreator = session && (session as any).role === "creator";
  const xUsername = (session as any)?.xUsername || "";

  if (isCreator) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <nav className="fixed top-0 z-50 w-full border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <Link href="/" className="text-lg font-bold">
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                RareImagery
              </span>
            </Link>
            <span className="text-sm text-zinc-400">
              Building as @{xUsername}
            </span>
          </div>
        </nav>

        <div className="pt-20 pb-16 px-6">
          <BuildPageClient xUsername={xUsername} />
        </div>
      </div>
    );
  }

  // Not signed in — marketing landing
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="fixed top-0 z-50 w-full border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-lg font-bold">
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              RareImagery
            </span>
          </Link>
          <Link
            href="/login"
            className="text-sm text-zinc-400 hover:text-white transition"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/50 via-zinc-950 to-zinc-950" />
        <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-36 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Powered by X + Grok AI
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
            Build Your Store
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              in Minutes
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
            Sign in with X and Grok AI instantly imports your profile picture,
            bio, top posts, and followers. Pick a theme, add products, and
            launch your branded storefront — all on your own subdomain.
          </p>

          <div className="mt-10">
            <SignInButton />
          </div>

          <p className="mt-4 text-xs text-zinc-600">
            Free to set up. No credit card required.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-800/50 bg-zinc-950">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="mb-12 text-center text-3xl font-bold">
            How It Works
          </h2>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Sign in with X",
                desc: "Connect your X account. We pull your profile picture, bio, follower count, and top posts automatically.",
                icon: (
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                ),
              },
              {
                step: "2",
                title: "Grok AI Enhances",
                desc: "Grok analyzes your content to write your store bio, suggest products, and recommend the perfect theme.",
                icon: (
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                ),
              },
              {
                step: "3",
                title: "Launch Your Store",
                desc: "Review your pre-filled store, pick a theme, add products, and go live at yourname.rareimagery.net.",
                icon: (
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-center"
              >
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400">
                  {item.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-800/50">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Everything You Need
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "Your Own Subdomain",
                desc: "Get yourname.rareimagery.net — a branded storefront that's uniquely yours.",
              },
              {
                title: "AI-Powered Setup",
                desc: "Grok AI writes your bio, suggests products, and helps you start from the right storefront template.",
              },
              {
                title: "Template-First Builder",
                desc: "Start from distinct storefront templates, then refine the layout and sections in the builder.",
              },
              {
                title: "Print-on-Demand",
                desc: "Connect Printful and sell custom merch with zero inventory. We handle fulfillment.",
              },
              {
                title: "Stripe Payments",
                desc: "Accept credit cards, Apple Pay, and Google Pay. Instant payouts to your account.",
              },
              {
                title: "Creator Analytics",
                desc: "Grok AI analyzes your engagement, audience sentiment, and recommends growth strategies.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5"
              >
                <h3 className="mb-1 font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm text-zinc-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-800/50 bg-gradient-to-b from-zinc-950 to-indigo-950/30">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="mb-4 text-3xl font-bold">Ready to Build?</h2>
          <p className="mb-8 text-zinc-400">
            It takes less than 5 minutes. Sign in with X and let Grok AI do the
            rest.
          </p>
          <SignInButton />
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-600">
        &copy; {new Date().getFullYear()} RareImagery. All rights reserved.
      </footer>
    </div>
  );
}
