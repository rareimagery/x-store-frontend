"use client";

import { useState, useEffect } from "react";

interface FollowButtonProps {
  targetStoreId: string;
  targetStoreName?: string;
  followerCount?: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  className?: string;
}

export default function FollowButton({
  targetStoreId,
  targetStoreName,
  followerCount: initialCount = 0,
  size = "md",
  showCount = true,
  className = "",
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasStore, setHasStore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    checkStatus();
  }, [targetStoreId]);

  async function checkStatus() {
    try {
      const res = await fetch(
        `/api/social/follow?targetStoreId=${targetStoreId}`
      );
      const data = await res.json();
      setIsFollowing(data.isFollowing ?? false);
      setIsLoggedIn(data.isLoggedIn ?? false);
      setHasStore(data.hasStore ?? false);
    } catch {
      // Silently fail — button just won't show active state
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle() {
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }

    if (!hasStore) {
      window.location.href = "/console/setup";
      return;
    }

    setToggling(true);
    try {
      const res = await fetch("/api/social/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStoreId }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("Follow error:", err.error);
        return;
      }

      const data = await res.json();
      setIsFollowing(data.isFollowing);
      setCount((prev) =>
        data.action === "followed" ? prev + 1 : Math.max(0, prev - 1)
      );
    } catch (err) {
      console.error("Follow toggle failed:", err);
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <button
        disabled
        className={`inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/50 text-zinc-500 ${sizeClasses(size)} ${className}`}
      >
        <span className="animate-pulse">...</span>
      </button>
    );
  }

  const baseClasses =
    "inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-200 cursor-pointer select-none";

  const followingClasses =
    "border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400";

  const notFollowingClasses =
    "border border-zinc-600 bg-white text-zinc-900 hover:bg-zinc-100";

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`${baseClasses} ${sizeClasses(size)} ${
          isFollowing ? followingClasses : notFollowingClasses
        } ${toggling ? "opacity-60 cursor-wait" : ""}`}
        title={
          isFollowing
            ? `Unfollow ${targetStoreName || "this creator"}`
            : `Follow ${targetStoreName || "this creator"}`
        }
      >
        {toggling ? (
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : isFollowing ? (
          <FollowingIcon />
        ) : (
          <FollowIcon />
        )}
        <span className="follow-label">
          {isFollowing ? "Following" : "Follow"}
        </span>
      </button>
      {showCount && count > 0 && (
        <span className="text-sm text-zinc-400">
          {formatCount(count)}
        </span>
      )}
    </div>
  );
}

function sizeClasses(size: "sm" | "md" | "lg"): string {
  switch (size) {
    case "sm":
      return "px-3 py-1 text-xs";
    case "md":
      return "px-4 py-1.5 text-sm";
    case "lg":
      return "px-5 py-2 text-base";
  }
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function FollowIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  );
}

function FollowingIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}
