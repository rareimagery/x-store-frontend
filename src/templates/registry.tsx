import type { ComponentType } from "react";
import { BlankTemplate } from "@/templates/Blank";
import { ModernCartTemplate } from "@/templates/ModernCart";
import { PostsFeedTemplate } from "@/templates/PostsFeed";
import { RetroTemplate } from "@/templates/Retro";
import { VideoStoreTemplate } from "@/templates/VideoStore";
import { DEFAULT_TEMPLATE_ID, type TemplateId } from "@/templates/catalog";
import type { PreviewPost, PreviewProduct, TemplatePreviewProps } from "@/templates/types";

export type TemplateData = {
  content: Array<{
    type: string;
    props?: Record<string, unknown>;
  }>;
  root: {
    props: Record<string, unknown>;
  };
};

export type BuilderStarterInput = {
  handle: string;
  bio: string;
  avatar?: string | null;
  banner?: string | null;
  products: PreviewProduct[];
  posts: PreviewPost[];
};

export type TemplateLaunchCard = {
  templateId: TemplateId;
  title: string;
  previewClassName: string;
  prompt: string;
};

export type TemplateDefinition = {
  id: TemplateId;
  name: string;
  description: string;
  createData: (input: BuilderStarterInput) => TemplateData;
  StorefrontComponent: ComponentType<TemplatePreviewProps>;
  launchCards: TemplateLaunchCard[];
};

export const EMPTY_CANVAS: TemplateData = {
  content: [],
  root: { props: {} },
};

function topProducts(products: PreviewProduct[]): string {
  if (products.length === 0) return "curated creator essentials";
  return products
    .slice(0, 3)
    .map((product) => product.title)
    .join(", ");
}

function leadPost(posts: PreviewPost[]): string {
  return posts[0]?.text || "Latest updates and curated drops for your audience.";
}

function displayHandle(handle: string): string {
  return handle.startsWith("@") ? handle : `@${handle}`;
}

function productCards(products: PreviewProduct[]) {
  return products.slice(0, 3).map((product) => ({
    id: product.id,
    title: product.title,
    price: product.price,
    image: product.image,
  }));
}

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    id: "blank",
    name: "Blank Canvas",
    description: "Start clean and build section by section.",
    createData: () => EMPTY_CANVAS,
    StorefrontComponent: BlankTemplate,
    launchCards: [],
  },
  {
    id: "modern-cart",
    name: "Modern",
    description: "Balanced hero, product grid, and support section.",
    createData: ({ handle, bio, products, avatar, banner }) => ({
      content: [
        {
          type: "Hero",
          props: {
            title: `${displayHandle(handle)} Studio Store`,
            subtitle: bio || "Products, drops, and creator support in one place.",
            ctaLabel: "Shop New Drop",
            stylePreset: "studio",
            avatarUrl: avatar || undefined,
            bannerUrl: banner || undefined,
          },
        },
        {
          type: "ProductGrid",
          props: {
            heading: "Featured Collection",
            subheading: `Now featuring ${topProducts(products)}.`,
            stylePreset: "studio",
            productCards: productCards(products),
          },
        },
        {
          type: "DonationBar",
          props: {
            title: "Support the Studio",
            progressText: "62% to this month's creator goal",
            stylePreset: "studio",
          },
        },
      ],
      root: { props: {} },
    }),
    StorefrontComponent: ModernCartTemplate,
    launchCards: [
      {
        templateId: "modern-cart",
        title: "Luxury Pulse",
        previewClassName:
          "bg-[radial-gradient(circle_at_top,rgba(244,244,245,0.18),transparent_45%),linear-gradient(135deg,#111827,#09090b)]",
        prompt:
          "Build a modern luxury storefront landing section for my creator store. Use a cinematic hero, premium typography, disciplined spacing, featured product cards, subtle motion, and a polished mobile-first feel. Make it feel expensive and editorial, not generic SaaS.",
      },
      {
        templateId: "modern-cart",
        title: "Minimal Frame",
        previewClassName: "bg-[linear-gradient(180deg,#fafaf9,#e7e5e4)]",
        prompt:
          "Create a modern minimal fashion storefront section with oversized type, neutral tones, crisp spacing, restrained product cards, and a strong grid. It should feel like a contemporary boutique brand launch page.",
      },
    ],
  },
  {
    id: "ai-video-store",
    name: "Drops",
    description: "High-conversion launch page focused on fast purchasing.",
    createData: ({ handle, products, avatar, banner }) => ({
      content: [
        {
          type: "Hero",
          props: {
            title: `${displayHandle(handle)} Limited Drop`,
            subtitle: "Flash release. Limited units. Fast checkout.",
            ctaLabel: "Claim the Drop",
            stylePreset: "drop",
            avatarUrl: avatar || undefined,
            bannerUrl: banner || undefined,
          },
        },
        {
          type: "DonationBar",
          props: {
            title: "Drop Momentum",
            progressText: "73% sold in first wave",
            stylePreset: "drop",
          },
        },
        {
          type: "ProductGrid",
          props: {
            heading: "Drop Inventory: Live",
            subheading: products.length
              ? `Selling now: ${topProducts(products)}`
              : "Add products to show limited drop inventory.",
            stylePreset: "drop",
            productCards: productCards(products),
          },
        },
      ],
      root: { props: {} },
    }),
    StorefrontComponent: VideoStoreTemplate,
    launchCards: [
      {
        templateId: "ai-video-store",
        title: "Drop Zone",
        previewClassName: "bg-[linear-gradient(135deg,#18181b,#111827_50%,#1d4ed8)]",
        prompt:
          "Build a modern streetwear drop section with aggressive typography, countdown energy, limited-release product cards, campaign-style callouts, and high-contrast layout. It should feel like a live drop, not a normal shop page.",
      },
    ],
  },
  {
    id: "latest-posts",
    name: "Editorial",
    description: "Posts-first layout that funnels readers into product purchases.",
    createData: ({ handle, posts, products, avatar, banner }) => ({
      content: [
        {
          type: "PostsList",
          props: {
            heading: `${displayHandle(handle)} Feed Highlights`,
            stylePreset: "editorial",
          },
        },
        {
          type: "Hero",
          props: {
            title: `${displayHandle(handle)} Storyline`,
            subtitle: leadPost(posts),
            ctaLabel: "Read + Shop",
            stylePreset: "editorial",
            avatarUrl: avatar || undefined,
            bannerUrl: banner || undefined,
          },
        },
        {
          type: "ProductGrid",
          props: {
            heading: "Shop the Conversation",
            subheading: products.length
              ? `Shoppable picks: ${topProducts(products)}`
              : "Attach products to convert post traffic.",
            stylePreset: "editorial",
            productCards: productCards(products),
          },
        },
      ],
      root: { props: {} },
    }),
    StorefrontComponent: PostsFeedTemplate,
    launchCards: [
      {
        templateId: "latest-posts",
        title: "Editorial Drift",
        previewClassName: "bg-[linear-gradient(135deg,#f5f5f4,#d6d3d1)]",
        prompt:
          "Design an editorial storefront section that feels like a luxury campaign spread. Use serif-forward typography, asymmetric layout, immersive storytelling blocks, and product placement that feels curated instead of crowded.",
      },
      {
        templateId: "latest-posts",
        title: "Moodboard Night",
        previewClassName: "bg-[linear-gradient(180deg,#1f2937,#111827)]",
        prompt:
          "Create a Tumblr 2012 inspired storefront section with moody editorial typography, image-first storytelling, quote-style blocks, soft spacing, and an artsy indie internet feel. Prioritize atmosphere and visual identity over pure ecommerce utility.",
      },
    ],
  },
  {
    id: "retro",
    name: "Retro",
    description: "Support-first layout for memberships and recurring revenue.",
    createData: ({ handle, bio, avatar, banner, products }) => ({
      content: [
        {
          type: "Hero",
          props: {
            title: `${displayHandle(handle)} Inner Circle`,
            subtitle:
              bio || "Unlock premium content, private drops, and behind-the-scenes access.",
            ctaLabel: "Join Membership",
            stylePreset: "members",
            avatarUrl: avatar || undefined,
            bannerUrl: banner || undefined,
          },
        },
        {
          type: "DonationBar",
          props: {
            title: "Subscriber Drive",
            progressText: "128 active supporters this month",
            stylePreset: "members",
          },
        },
        {
          type: "PostsList",
          props: {
            heading: "Members-Only Updates",
            stylePreset: "members",
          },
        },
        {
          type: "ProductGrid",
          props: {
            heading: "Member Picks",
            subheading: products.length
              ? `Featured products: ${topProducts(products)}`
              : "Add products to populate member picks.",
            stylePreset: "members",
            productCards: productCards(products),
          },
        },
      ],
      root: { props: {} },
    }),
    StorefrontComponent: RetroTemplate,
    launchCards: [
      {
        templateId: "retro",
        title: "MySpace Flash",
        previewClassName: "bg-[linear-gradient(135deg,#ec4899,#60a5fa_45%,#22d3ee)]",
        prompt:
          "Build a chaotic MySpace 2008 style storefront section with glitter accents, custom profile energy, loud gradients, badges, stickers, marquee text, and stacked content boxes. Keep it usable on mobile but let it feel nostalgic, messy, and intentionally overdesigned.",
      },
    ],
  },
];

export function getTemplateDefinition(templateId: string | null | undefined): TemplateDefinition | null {
  if (!templateId) return null;
  return TEMPLATE_DEFINITIONS.find((template) => template.id === templateId) || null;
}

export const TEMPLATE_LAUNCH_CARDS: TemplateLaunchCard[] = TEMPLATE_DEFINITIONS.flatMap(
  (template) => template.launchCards
);