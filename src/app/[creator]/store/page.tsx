import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import {
  getCreatorProfile,
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
import WireframeRenderer from "@/components/builder/WireframeRenderer";
import StoreRareProjectConversations from "@/components/StoreRareProjectConversations";
import { getTemplateDefinition } from "@/templates/registry";
import type { TemplatePreviewProps } from "@/templates/types";
import { parseStoredBuilderDocument, type BuilderPreviewData } from "@/lib/builderDocument";
import type { WireframeLayout } from "@/components/builder/WireframeBuilder";

const RESERVED = new Set([
  "console", "login", "signup", "admin", "api", "stores", "products",
  "builder", "builder-popup", "build", "studio", "playground",
  "onboarding", "maintenance", "eula", "privacy", "terms",
  "sitemap.xml", "robots.txt", "favicon.ico",
]);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ creator: string }>;
}) {
  const { creator } = await params;
  if (RESERVED.has(creator.toLowerCase())) return {};
  const profile = await getCreatorProfile(creator.toLowerCase());
  if (!profile) return { title: "Store Not Found" };
  return {
    title: `@${profile.x_username} Store | RareImagery`,
    description: `Shop @${profile.x_username}'s store on RareImagery`,
  };
}

export default async function CreatorStorePage({
  params,
}: {
  params: Promise<{ creator: string }>;
}) {
  const { creator } = await params;
  const normalized = creator.toLowerCase();

  if (RESERVED.has(normalized)) {
    notFound();
  }

  const [profile, products, publishedBuilds] = await Promise.all([
    getCreatorProfile(normalized, { noStore: true }),
    getProductsByStoreSlug(normalized),
    getPublishedBuilds(normalized),
  ]);

  if (!profile) {
    notFound();
  }

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
            @{profile.x_username}&apos;s store is being set up.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <Link href={`/${profile.x_username}` as Route} className="text-sm text-indigo-400 hover:text-indigo-300">
              &larr; Back to profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Template preview props
  const templateProps: TemplatePreviewProps = {
    handle: profile.x_username,
    avatar: profile.profile_picture_url ?? undefined,
    banner: profile.banner_url ?? undefined,
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
    avatar: profile.profile_picture_url ?? null,
    banner: profile.banner_url ?? null,
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

  // Detect wireframe builds
  const wireframeLayout: WireframeLayout | null = (() => {
    for (const build of publishedBuilds) {
      try {
        const parsed = JSON.parse(build.code);
        if (parsed?.schemaVersion === 1 && parsed?.type === "wireframe" && parsed?.layout) {
          return parsed.layout as WireframeLayout;
        }
      } catch { /* not wireframe JSON */ }
    }
    return null;
  })();

  if (profile.store_theme === "myspace") {
    return (
      <>
        <StoreNav creator={creator} />
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
        <BuilderGate storeSlug={creator} theme={profile.store_theme} />
      </>
    );
  }

  if (publishedBuilderBuilds.length > 0) {
    return (
      <>
        <StoreNav creator={creator} />
        <div className="pt-12">
          <StoreBuildRenderer builds={publishedBuilderBuilds} previewData={builderPreviewData} />
          <StoreRareProjectConversations creator={creator} />
        </div>
        <BuilderGate storeSlug={creator} theme={profile.store_theme} />
      </>
    );
  }

  if (wireframeLayout) {
    return (
      <>
        <StoreNav creator={creator} />
        <div className="min-h-screen bg-zinc-950 pt-12">
          <WireframeRenderer layout={wireframeLayout} profile={profile} products={products} />
          <StoreRareProjectConversations creator={creator} />
        </div>
        <BuilderGate storeSlug={creator} theme={profile.store_theme} />
      </>
    );
  }

  const templateId =
    typeof profile.store_theme_config?.templateId === "string"
      ? profile.store_theme_config.templateId
      : null;

  const templateDefinition = getTemplateDefinition(templateId);

  if (templateDefinition) {
    const TemplateComponent = templateDefinition.StorefrontComponent;
    return (
      <>
        <StoreNav creator={creator} />
        <div className="pt-12">
          <TemplateComponent {...templateProps} />
          <StoreRareProjectConversations creator={creator} />
          <StoreBuildRenderer builds={publishedBuilds} />
        </div>
        <BuilderGate storeSlug={creator} theme={profile.store_theme} />
      </>
    );
  }

  if (profile.store_theme === "minimal") {
    return (
      <>
        <StoreNav creator={creator} />
        <div className="pt-12">
          <MinimalTheme profile={profile} products={products} />
          <StoreRareProjectConversations creator={creator} />
          <StoreBuildRenderer builds={publishedBuilds} />
        </div>
        <BuilderGate storeSlug={creator} theme={profile.store_theme} />
      </>
    );
  }

  if (profile.store_theme === "neon") {
    return (
      <>
        <StoreNav creator={creator} />
        <div className="pt-12">
          <NeonTheme profile={profile} products={products} />
          <StoreRareProjectConversations creator={creator} />
          <StoreBuildRenderer builds={publishedBuilds} />
        </div>
        <BuilderGate storeSlug={creator} theme={profile.store_theme} />
      </>
    );
  }

  if (profile.store_theme === "editorial") {
    return (
      <>
        <StoreNav creator={creator} />
        <div className="pt-12">
          <EditorialTheme profile={profile} products={products} />
          <StoreRareProjectConversations creator={creator} />
          <StoreBuildRenderer builds={publishedBuilds} />
        </div>
        <BuilderGate storeSlug={creator} theme={profile.store_theme} />
      </>
    );
  }

  if (profile.store_theme === "xmimic") {
    const data = await fetchCreatorData(normalized);
    return (
      <>
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
        <BuilderGate storeSlug={creator} theme={profile.store_theme} />
      </>
    );
  }

  // Default: Xai3 theme
  return (
    <>
      <StoreNav creator={creator} />
      <div className="pt-12">
        <Xai3Theme profile={profile} products={products} />
        <StoreRareProjectConversations creator={creator} />
        <StoreBuildRenderer builds={publishedBuilds} />
      </div>
      <BuilderGate storeSlug={creator} theme={profile.store_theme} />
    </>
  );
}
