"use client";

import { signOut, useSession } from "next-auth/react";

interface ConsoleUserMenuProps {
  onAction?: () => void;
}

export default function ConsoleUserMenu({ onAction }: ConsoleUserMenuProps) {
  const { data: session } = useSession();

  return (
    <div className="flex w-full items-center justify-between gap-3">
      <span className="truncate text-sm text-zinc-400">
        {session?.user?.name ?? session?.user?.email ?? "User"}
      </span>
      <button
        onClick={() => {
          onAction?.();
          signOut({ callbackUrl: "/" });
        }}
        className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-white"
      >
        Sign Out
      </button>
    </div>
  );
}
