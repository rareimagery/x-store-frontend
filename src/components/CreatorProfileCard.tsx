"use client";

import Image from "next/image";
import Link from "next/link";
import FollowButton from "./FollowButton";

interface CreatorProfileCardProps {
  storeId: string;
  storeName: string;
  storeSlug: string;
  xUsername: string;
  bio?: string;
  profilePictureUrl?: string | null;
  bannerUrl?: string | null;
  followerCount?: number;
  followingCount?: number;
  productCount?: number;
  mutualFriends?: { xUsername: string; profilePictureUrl?: string | null }[];
  variant?: "full" | "compact" | "mini";
  className?: string;
}

export default function CreatorProfileCard({
  storeId,
  storeName,
  storeSlug,
  xUsername,
  bio = "",
  profilePictureUrl,
  bannerUrl,
  followerCount = 0,
  followingCount = 0,
  productCount = 0,
  mutualFriends = [],
  variant = "full",
  className = "",
}: CreatorProfileCardProps) {
  if (variant === "mini") {
    return (
      <MiniCard
        storeSlug={storeSlug}
        xUsername={xUsername}
        profilePictureUrl={profilePictureUrl}
        followerCount={followerCount}
        className={className}
      />
    );
  }

  if (variant === "compact") {
    return (
      <CompactCard
        storeId={storeId}
        storeName={storeName}
        storeSlug={storeSlug}
        xUsername={xUsername}
        profilePictureUrl={profilePictureUrl}
        followerCount={followerCount}
        productCount={productCount}
        className={className}
      />
    );
  }

  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden ${className}`}
    >
      {/* Banner */}
      <div className="relative h-28 bg-gradient-to-br from-zinc-800 to-zinc-700">
        {bannerUrl && (
          <Image
            src={bannerUrl}
            alt={`${xUsername} banner`}
            fill
            className="object-cover"
            unoptimized
          />
        )}
      </div>

      {/* Profile section */}
      <div className="px-4 pb-4">
        {/* Avatar — overlaps banner */}
        <div className="relative -mt-10 mb-3 flex items-end justify-between">
          <div className="w-20 h-20 rounded-full border-4 border-zinc-900 bg-zinc-800 overflow-hidden flex-shrink-0">
            {profilePictureUrl ? (
              <Image
                src={profilePictureUrl}
                alt={xUsername}
                width={80}
                height={80}
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500 text-2xl font-bold">
                {xUsername.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="mb-1">
            <FollowButton
              targetStoreId={storeId}
              targetStoreName={storeName}
              followerCount={followerCount}
              showCount={false}
              size="sm"
            />
          </div>
        </div>

        {/* Name & handle */}
        <Link
          href={`/stores/${storeSlug}`}
          className="block hover:underline"
        >
          <h3 className="text-white font-semibold text-lg leading-tight">
            {storeName}
          </h3>
          <p className="text-zinc-400 text-sm">@{xUsername}</p>
        </Link>

        {/* Bio */}
        {bio && (
          <p className="text-zinc-300 text-sm mt-2 line-clamp-2">{bio}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <span className="text-zinc-300">
            <strong className="text-white">{formatCount(followerCount)}</strong>{" "}
            <span className="text-zinc-500">followers</span>
          </span>
          <span className="text-zinc-300">
            <strong className="text-white">{formatCount(followingCount)}</strong>{" "}
            <span className="text-zinc-500">following</span>
          </span>
          <span className="text-zinc-300">
            <strong className="text-white">{productCount}</strong>{" "}
            <span className="text-zinc-500">products</span>
          </span>
        </div>

        {/* Mutual friends */}
        {mutualFriends.length > 0 && (
          <div className="flex items-center gap-2 mt-3 text-xs text-zinc-400">
            <div className="flex -space-x-2">
              {mutualFriends.slice(0, 3).map((friend) => (
                <div
                  key={friend.xUsername}
                  className="w-5 h-5 rounded-full border border-zinc-800 bg-zinc-700 overflow-hidden"
                >
                  {friend.profilePictureUrl ? (
                    <Image
                      src={friend.profilePictureUrl}
                      alt={friend.xUsername}
                      width={20}
                      height={20}
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-400">
                      {friend.xUsername.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <span>
              Friends with @{mutualFriends[0].xUsername}
              {mutualFriends.length > 1 &&
                ` and ${mutualFriends.length - 1} more`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Compact variant (for lists, My Picks, Discover page) ----

function CompactCard({
  storeId,
  storeName,
  storeSlug,
  xUsername,
  profilePictureUrl,
  followerCount,
  productCount,
  className,
}: {
  storeId: string;
  storeName: string;
  storeSlug: string;
  xUsername: string;
  profilePictureUrl?: string | null;
  followerCount: number;
  productCount: number;
  className: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 hover:border-zinc-700 transition-colors ${className}`}
    >
      <Link href={`/stores/${storeSlug}`} className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden">
          {profilePictureUrl ? (
            <Image
              src={profilePictureUrl}
              alt={xUsername}
              width={48}
              height={48}
              className="object-cover w-full h-full"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold">
              {xUsername.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <Link href={`/stores/${storeSlug}`} className="hover:underline">
          <p className="text-white font-medium text-sm truncate">{storeName}</p>
          <p className="text-zinc-500 text-xs">@{xUsername}</p>
        </Link>
        <p className="text-zinc-500 text-xs mt-0.5">
          {formatCount(followerCount)} followers · {productCount} products
        </p>
      </div>

      <FollowButton
        targetStoreId={storeId}
        targetStoreName={storeName}
        showCount={false}
        size="sm"
      />
    </div>
  );
}

// ---- Mini variant (for inline mentions, "Friends with" avatars) ----

function MiniCard({
  storeSlug,
  xUsername,
  profilePictureUrl,
  followerCount,
  className,
}: {
  storeSlug: string;
  xUsername: string;
  profilePictureUrl?: string | null;
  followerCount: number;
  className: string;
}) {
  return (
    <Link
      href={`/stores/${storeSlug}`}
      className={`inline-flex items-center gap-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50 px-2 py-1 hover:bg-zinc-800 transition-colors ${className}`}
    >
      <div className="w-5 h-5 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
        {profilePictureUrl ? (
          <Image
            src={profilePictureUrl}
            alt={xUsername}
            width={20}
            height={20}
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-400">
            {xUsername.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <span className="text-xs text-zinc-300">@{xUsername}</span>
    </Link>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
