"use client";

import Link from "next/link";
import { useConsole } from "@/components/ConsoleContext";
import { redirect } from "next/navigation";

export default function ConsoleDashboard() {
  const { hasStore, role } = useConsole();
  const isAdmin = role === "admin";

  if (!hasStore && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/20">
          <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold">Welcome to RareImagery</h1>
        <p className="mb-8 max-w-md text-center text-zinc-400">
          Create your storefront powered by your X profile. AI-enhanced setup takes just a few minutes.
        </p>
        <Link
          href="/console/setup"
          className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500"
        >
          Create Your Store
        </Link>
      </div>
    );
  }

  redirect("/console/my-page");
}
