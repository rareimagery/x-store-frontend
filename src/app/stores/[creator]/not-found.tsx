import Link from "next/link";

export default function CreatorNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center">
      <h1 className="text-6xl font-extrabold text-zinc-700">404</h1>
      <p className="mt-4 text-xl font-semibold text-white">
        Creator not found
      </p>
      <p className="mt-2 max-w-md text-zinc-400">
        The creator profile you are looking for does not exist or has not been
        set up yet. Double-check the username and try again.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
      >
        &larr; Back to Marketplace
      </Link>
    </div>
  );
}
