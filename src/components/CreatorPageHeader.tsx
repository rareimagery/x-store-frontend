import Link from "next/link";
import type { Route } from "next";
import type { CreatorProfile } from "@/lib/drupal";

interface CreatorPageHeaderProps {
  profile: CreatorProfile;
  activePage: "profile" | "store" | "favorites" | "gallery" | "articles";
}

export default function CreatorPageHeader({ profile, activePage }: CreatorPageHeaderProps) {
  const bio = profile.bio?.replace(/<[^>]*>/g, "") || "";
  const handle = profile.x_username;

  const navItems: Array<{ id: string; label: string; href: string; external?: boolean }> = [
    { id: "profile", label: "Home", href: `/${handle}` },
    { id: "store", label: "Store", href: `/${handle}/store` },
    { id: "favorites", label: "Favorites", href: `/${handle}/favorites` },
    { id: "gallery", label: "Gallery", href: `/${handle}/gallery` },
    { id: "articles", label: "Articles", href: `https://x.com/${handle}/articles`, external: true },
  ];

  return (
    <div className="border-b border-zinc-800">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex items-center gap-4">
          {profile.profile_picture_url ? (
            <Link href={`/${handle}` as Route}>
              <img
                src={profile.profile_picture_url}
                alt={`@${handle}`}
                className="h-16 w-16 rounded-full object-cover border-2 border-zinc-800"
              />
            </Link>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-xl font-bold text-zinc-500">
              {handle?.[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">
              {(profile.title || handle).replace(/\s*X\s*Profile\s*/i, "")}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <a
                href={`https://x.com/${handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                @{handle}
              </a>
              {bio && (
                <span className="text-sm text-zinc-500 hidden sm:inline">
                  &middot; {bio.slice(0, 80)}{bio.length > 80 ? "..." : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        <nav className="mt-6 flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = item.id === activePage;
            if (item.external) {
              return (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                >
                  {item.label}
                </a>
              );
            }
            return (
              <Link
                key={item.id}
                href={item.href as Route}
                className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "text-white bg-zinc-800"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
