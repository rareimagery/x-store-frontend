import Link from "next/link";

const HERO_PFP = "https://pbs.twimg.com/profile_images/2018074722630807552/sM0xa2fB_400x400.jpg";
const HERO_BANNER = "https://pbs.twimg.com/profile_banners/1524882641358508032/1734409768/1500x500";

export default function ComingSoonPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 text-white">
      {/* Background banner with heavy overlay */}
      <div className="absolute inset-0">
        <img src={HERO_BANNER} alt="" className="h-full w-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/90 to-zinc-950" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
        {/* Logo / PFP */}
        <div className="mb-8 flex justify-center">
          <img
            src={HERO_PFP}
            alt="RareImagery"
            className="h-28 w-28 rounded-full border-4 border-zinc-800 object-cover shadow-2xl shadow-indigo-500/20"
          />
        </div>

        {/* Brand */}
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            RareImagery
          </span>
        </h1>

        {/* Coming Soon */}
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-5 py-2 text-sm font-medium text-indigo-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
          </span>
          Coming Soon
        </div>

        <p className="mx-auto mt-8 max-w-lg text-lg leading-relaxed text-zinc-400">
          A creator commerce platform powered by X and Grok AI.
          Build your store, design merch, and connect with your community.
        </p>

        <p className="mt-4 text-sm text-zinc-600">
          We&apos;re putting the finishing touches on something special.
        </p>

        {/* X link */}
        <div className="mt-10">
          <a
            href="https://x.com/rareimagery"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-6 py-3 text-sm font-medium text-white transition hover:border-zinc-500 hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Follow @rareimagery for updates
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 w-full border-t border-zinc-800/50 py-4 text-center text-xs text-zinc-600">
        <div className="flex items-center justify-center gap-4">
          <Link href="/terms" className="transition-colors hover:text-zinc-400">Terms</Link>
          <span>&middot;</span>
          <Link href="/eula" className="transition-colors hover:text-zinc-400">EULA</Link>
          <span>&middot;</span>
          <Link href="/privacy" className="transition-colors hover:text-zinc-400">Privacy</Link>
        </div>
        <p className="mt-2">&copy; {new Date().getFullYear()} RareImagery. All rights reserved.</p>
      </footer>
    </div>
  );
}
