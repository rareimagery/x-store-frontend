"use client";

import { useConsole } from "@/components/ConsoleContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import BuildPageClient from "@/components/BuildPageClient";

export default function SetupPage() {
  const { hasStore, xUsername } = useConsole();
  const router = useRouter();

  // If they already have a store, redirect to dashboard
  useEffect(() => {
    if (hasStore) {
      router.replace("/console");
    }
  }, [hasStore, router]);

  if (hasStore) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Create Your Store</h1>
      <BuildPageClient xUsername={xUsername || ""} skipXImport={!xUsername} />
    </div>
  );
}
