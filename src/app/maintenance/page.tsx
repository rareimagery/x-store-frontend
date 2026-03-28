export default function MaintenancePage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 rounded-full border border-zinc-700 px-4 py-1 text-xs uppercase tracking-[0.2em] text-zinc-400">
          RareImagery Private Beta
        </p>
        <h1 className="text-4xl font-bold sm:text-5xl">We are tuning the experience</h1>
        <p className="mt-5 max-w-2xl text-base text-zinc-400 sm:text-lg">
          RareImagery is currently in maintenance mode while we prepare launch quality updates.
          Approved testers can continue using the playground during this period.
        </p>
      </div>
    </main>
  );
}
