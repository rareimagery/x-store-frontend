import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCreatorProfile,
  getAllCreatorProfiles,
  getProductsByStoreSlug,
  fetchCreatorData,
} from "@/lib/drupal";
import { getPublishedBuilds } from "@/lib/drupalBuilds";
import MySpaceTheme from "@/components/themes/MySpaceTheme";
import MinimalTheme from "@/components/themes/MinimalTheme";
import NeonTheme from "@/components/themes/NeonTheme";
import EditorialTheme from "@/components/themes/EditorialTheme";
import Xai3Theme from "@/components/themes/Xai3Theme";
import XMimicTheme from "@/components/themes/XMimicTheme";
import Sidebar from "@/components/Sidebar";
import StoreNav from "@/components/StoreNav";
import BuilderGate from "@/components/builder/BuilderGate";
import StoreBuildRenderer from "@/components/builder/StoreBuildRenderer";
import XSubscribeGate from "@/components/XSubscribeGate";
import StoreRareProjectConversations from "@/components/StoreRareProjectConversations";
import { getTemplateDefinition } from "@/templates/registry";
import type { TemplatePreviewProps } from "@/templates/types";
import { parseStoredBuilderDocument, type BuilderPreviewData } from "@/lib/builderDocument";

async function getTemplatePreviewMedia(handle: string): Promise<{ avatar: string | null; banner: string | null }> {
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "rareimagery.net";
  const url = `https://${baseDomain}/api/template-preview/${encodeURIComponent(handle.toLowerCase())}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { avatar: null, banner: null };
    const json = await res.json();
    return {
      avatar: typeof json?.avatar === "string" ? json.avatar : null,
      banner: typeof json?.banner === "string" ? json.banner : null,
    };
  } catch {
    return { avatar: null, banner: null };
  }
}

export async function generateStaticParams() {
  try {
    const profiles = await getAllCreatorProfiles();
    return profiles.map((p) => ({ creator: p.x_username }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ creator: string }>;
}) {
  const { creator } = await params;
  const profile = await getCreatorProfile(creator.toLowerCase());
  if (!profile) return { title: "Creator Not Found" };
  return {
    title: `@${profile.x_username} Store | RareImagery X Marketplace`,
    description: profile.bio?.replace(/<[^>]*>/g, "").slice(0, 160),
  };
}

export default async function CreatorStorePage({
  params,
}: {
  params: Promise<{ creator: string }>;
}) {
  const { creator } = await params;
  const normalizedCreator = creator.toLowerCase();
  const [profile, products, publishedBuilds, previewMedia] = await Promise.all([
    getCreatorProfile(normalizedCreator, { noStore: true }),
    getProductsByStoreSlug(normalizedCreator),
    getPublishedBuilds(normalizedCreator),
    getTemplatePreviewMedia(normalizedCreator),
  ]);

  if (!profile) {
    notFound();
  }

  // Pending / rejected stores show a holding page
  if (profile.store_status !== "approved") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="max-w-md text-center px-6">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
            <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="mb-3 text-2xl font-bold">Store Coming Soon</h1>
          <p className="mb-2 text-zinc-400">
            @{profile.x_username}&apos;s store is being reviewed and will be live shortly.
          </p>
          <p className="text-sm text-zinc-600">
            Check back soon or follow{" "}
            <a href={`https://x.com/${profile.x_username}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
              @{profile.x_username}
            </a>{" "}
            on X for updates.
          </p>
          <div className="mt-8">
            <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
              &larr; Back to RareImagery
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (profile.store_theme === "myspace") {
    return (
      <>
        <StoreNav creator={creator} />
        <XSubscribeGate storeSlug={normalizedCreator} creatorUsername={profile.x_username}>
          <div className="pt-12">
            <MySpaceTheme
              profile={profile}
              products={products}
              backgroundUrl={profile.myspace_background ?? undefined}
              musicUrl={profile.myspace_music_url ?? undefined}
              glitterColor={profile.myspace_glitter_color ?? undefined}
              accentColor={profile.myspace_accent_color ?? undefined}
              themeConfig={profile.store_theme_config ?? undefined}
            />
            <StoreRareProjectConversations creator={creator} />
            <StoreBuildRenderer builds={publishedBuilds} />
          </div>
        </XSubscribeGate>
        <BuilderGate storeSlug={creator} theme={profile.store_theme} />
      </>
    );
  }

  const templateId =
    typeof profile.store_theme_config?.templateId === "string"
      ? profile.store_theme_config.templateId
      : null;

  const templateProps: TemplatePreviewProps = {
    handle: profile.x_username,
    avatar: profile.profile_picture_url ?? previewMedia.avatar ?? undefined,
    banner: profile.banner_url ?? previewMedia.banner ?? undefined,
    bio: profile.bio ?? undefined,
    products: products.map((product) => ({
      id: product.id,
      title: product.title,
      price: Number.parseFloat(product.price || "0") || 0,
      image: product.image_url ?? undefined,
      description: product.description ?? undefined,
    })),
    posts: (profile.top_posts || []).map((post) => ({
      id: post.id,
      text: post.text,
    })),
    videos: (profile.top_posts || [])
      .filter((post) => !!post.image_url)
      .slice(0, 6)
      .map((post) => ({
        id: post.id,
        url: post.image_url || "",
        thumbnail: post.image_url,
      })),
  };

  const builderPreviewData: BuilderPreviewData = {
    handle: profile.x_username,
    bio: profile.bio ?? "",
    avatar: profile.profile_picture_url ?? previewMedia.avatar ?? null,
    banner: profile.banner_url ?? previewMedia.banner ?? null,
    followerCount: profile.follower_count ?? 0,
    friends: (profile.top_followers || []).map((friend, index) => ({
      id: `${friend.username || "friend"}-${index}`,
      username: friend.username,
      displayName: friend.display_name,
      avatar: friend.profile_image_url ?? undefined,
      followerCount: friend.follower_count,
    })),
    posts: (profile.top_posts || []).map((post) => ({
      id: post.id,
      text: post.text,
      image: post.image_url ?? undefined,
    })),
    products: products.map((product) => ({
      id: product.id,
      title: product.title,
      price: Number.parseFloat(product.price || "0") || 0,
      image: product.image_url ?? undefined,
      description: product.description ?? undefined,
    })),
  };

  const publishedBuilderBuilds = publishedBuilds.filter((build) => parseStoredBuilderDocument(build.code));

  if (publishedBuilderBuilds.length > 0) {
    return (
      <>
        <StoreNav creator={creator} />
        <XSubscribeGate storeSlug={normalizedCreator} creatorUsername={profile.x_username}>
          <div className="pt-12">
            <StoreBuildRenderer builds={publishedBuilderBuilds} previewData={builderPreviewData} />
            <StoreRareProjectConversations creator={creator} />
          </div>
        </XSubscribeGate>
        <BuilderGate storeSlug={creator} theme={profile.store_theme} />
      </>
    );
  }

  const templateDefinition = getTemplateDefinition(templateId);

  if (templateDefinition) {
    const TemplateComponent = templateDefinition.StorefrontComponent;

    return (
      <>
        <StoreNav creator={creator} />
        <XSubscribeGate storeSlug={normalizedCreator} creatorUsername={profile.x_username}>
          <div className="pt-12">
            <TemplateComponent {...templateProps} />
            <StoreRareProjectConversations creator={creator} />
            <StoreBuildRenderer builds={publishedBuilds} />
          </div>
        </XSubscribeGate>
        <BuilderGate storeSlug={creator} theme={profile.store_theme} />
      </>
    );
  }

  if (profile.store_theme === "minimal") {
    return (
      <>
        <StoreNav creator={creator} />
        <XSubscribeGate storeSlug={normalizedCreator} creatorUsername={profile.x_username}>
          <div className="pt-12">
            <MinimalTheme profile={profile} products={products} />
            <StoreRareProjectConversations creator={creator} />
            <StoreBuildRenderer builds={publishedBuilds} />
          </div>
        </XSubscribeGate>
        <BuilderGate storeSlug={creator} theme={profile.store_theme} />
      </>
    );
  }

  if (profile.store_theme === "neon") {
    return (
      <>
        <StoreNav creator={creator} />
        <XSubscribeGate storeSlug={normalizedCreator} creatorUsername={profile.x_username}>
          <div className="pt-12">
            <NeonTheme profile={profile} products={products} />
            <StoreRareProjectConversations creator={creator} />
            <StoreBuildRenderer builds={publishedBuilds} />
          </div>
        </XSubscribeGate>
        <BuilderGate storeSlug={creator} theme={profile.store_theme} />
      </>
    );
  }

  if (profile.store_theme === "editorial") {
    return (
      <>
        <StoreNav creator={creator} />
        <XSubscribeGate storeSlug={normalizedCreator} creatorUsername={profile.x_username}>
          <div className="pt-12">
            <EditorialTheme profile={profile} products={products} />
            <StoreRareProjectConversations creator={creator} />
            <StoreBuildRenderer builds={publishedBuilds} />
          </div>
        </XSubscribeGate>
        <BuilderGate storeSlug={creator} theme={profile.store_theme} />
      </>
    );
  }

  if (profile.store_theme === "xmimic") {
    const data = await fetchCreatorData(normalizedCreator);
    return (
      <>
        <XSubscribeGate storeSlug={normalizedCreator} creatorUsername={profile.x_username}>
          <div className="bg-black text-white min-h-screen flex">
            <Sidebar
              handle={creator}
              recentPosts={data?.recentPosts ?? []}
              profilePictureUrl={profile.profile_picture_url}
              displayName={profile.title || profile.x_username}
              productCount={products.length}
            />
            <main className="ml-72 flex-1">
              <XMimicTheme profile={profile} products={products} />
              <StoreRareProjectConversations creator={creator} />
              <StoreBuildRenderer builds={publishedBuilds} />
            </main>
          </div>
        </XSubscribeGate>
        <BuilderGate storeSlug={creator} theme={profile.store_theme} />
      </>
    );
  }

  // Xai3 is the default theme — X-feed style center column with cart
  // Also handles explicit "xai3" selection and any unrecognized theme value
  return (
    <>
      <StoreNav creator={creator} />
      <XSubscribeGate storeSlug={normalizedCreator} creatorUsername={profile.x_username}>
        <div className="pt-12">
          <Xai3Theme profile={profile} products={products} />
          <StoreRareProjectConversations creator={creator} />
          <StoreBuildRenderer builds={publishedBuilds} />
        </div>
      </XSubscribeGate>
      <BuilderGate storeSlug={creator} theme={profile.store_theme} />
    </>
  );
}
