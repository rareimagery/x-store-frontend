import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllProductSlugs,
  getProductBySlug,
  getRelatedProducts,
  getCreatorProfile,
  type ProductDetail,
  type Product,
} from "@/lib/drupal";
import CreatorPageHeader from "@/components/CreatorPageHeader";
import ProductTabs from "@/components/ProductTabs";
import PayWithXMoneyButton from "@/components/PayWithXMoneyButton";
import ProductDetailClient from "@/components/ProductDetailClient";
import { getStoreUrl } from "@/lib/store-url";

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const slugs = await getAllProductSlugs();
    return slugs.map((s) => ({ slug: s.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product Not Found" };

  const title = product.seo_title || `${product.title} | RareImagery`;
  const description =
    product.seo_description ||
    product.short_description.replace(/<[^>]*>/g, "").slice(0, 160);

  return {
    title,
    description,
    openGraph: {
      title: product.title,
      description,
      type: "website",
      images: product.images[0]?.url ? [product.images[0].url] : [],
    },
  };
}

function Breadcrumb({ product }: { product: ProductDetail }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-zinc-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="hover:text-zinc-900">
            Home
          </Link>
        </li>
        <li>/</li>
        {product.store_slug && (
          <>
            <li>
              <Link
                href={`/stores/${product.store_slug}`}
                className="hover:text-zinc-900"
              >
                {product.store_name}
              </Link>
            </li>
            <li>/</li>
          </>
        )}
        {product.categories[0] && (
          <>
            <li className="text-zinc-400">{product.categories[0]}</li>
            <li>/</li>
          </>
        )}
        <li className="truncate text-zinc-900">{product.title}</li>
      </ol>
    </nav>
  );
}

function PriceBlock({ product }: { product: ProductDetail }) {
  const hasVariantPrices =
    product.variations.length > 1 &&
    new Set(product.variations.map((v) => v.price)).size > 1;
  const minPrice = Math.min(
    ...product.variations.map((v) => parseFloat(v.price))
  );
  const onSale =
    product.variations.some((v) => v.on_sale) && product.list_price;

  return (
    <div className="flex items-baseline gap-3">
      {onSale && product.list_price ? (
        <>
          <span className="text-2xl font-bold text-zinc-900">
            ${parseFloat(product.price).toFixed(2)}
          </span>
          <span className="text-lg text-zinc-400 line-through">
            ${parseFloat(product.list_price).toFixed(2)}
          </span>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
            SAVE{" "}
            {Math.round(
              ((parseFloat(product.list_price) - parseFloat(product.price)) /
                parseFloat(product.list_price)) *
                100
            )}
            %
          </span>
        </>
      ) : hasVariantPrices ? (
        <span className="text-2xl font-bold text-zinc-900">
          From ${minPrice.toFixed(2)}
        </span>
      ) : (
        <span className="text-2xl font-bold text-zinc-900">
          ${parseFloat(product.price).toFixed(2)}
        </span>
      )}

      {product.instant_download && (
        <span className="ml-2 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
          Instant Download
        </span>
      )}
    </div>
  );
}

function TrustBadges({ product }: { product: ProductDetail }) {
  const badges: { icon: string; text: string }[] = [
    { icon: "shield", text: "Secure Checkout" },
  ];

  if (product.product_type === "digital_download") {
    badges.push({ icon: "zap", text: "Instant Download" });
  }
  if (product.handmade) {
    badges.push({ icon: "hand", text: "Handmade" });
  }
  if (product.made_to_order) {
    badges.push({ icon: "clock", text: "Made to Order" });
  }
  if (
    product.product_type === "clothing" ||
    product.product_type === "crafts"
  ) {
    badges.push({ icon: "refresh", text: "Easy Returns" });
  }
  badges.push({ icon: "check", text: "Satisfaction Guarantee" });

  const iconMap: Record<string, React.ReactNode> = {
    shield: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    zap: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    hand: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
      </svg>
    ),
    clock: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    refresh: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    check: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  };

  return (
    <div className="flex flex-wrap gap-3">
      {badges.map((badge) => (
        <div
          key={badge.text}
          className="flex items-center gap-1.5 text-xs text-zinc-500"
        >
          <span className="text-zinc-400">{iconMap[badge.icon]}</span>
          {badge.text}
        </div>
      ))}
    </div>
  );
}

function DeliveryInfo({ product }: { product: ProductDetail }) {
  if (product.product_type === "digital_download") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Available immediately after purchase. Download link sent to your email.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
      <svg className="h-5 w-5 flex-shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
      </svg>
      <div>
        {product.made_to_order ? (
          <span>
            Production time: {product.production_time || "3-5 business days"}{" "}
            before shipping
          </span>
        ) : (
          <span>Estimated delivery: 5-7 business days</span>
        )}
      </div>
    </div>
  );
}

function RelatedProductCard({ product }: { product: Product }) {
  const slug = product.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return (
    <Link
      href={`/products/${slug}`}
      className="group flex-shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md"
      style={{ width: "240px" }}
    >
      {product.image_url ? (
        <div className="relative aspect-square overflow-hidden bg-zinc-100">
          <Image
            src={product.image_url}
            alt={product.title}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="240px"
          />
        </div>
      ) : (
        <div className="flex aspect-square items-center justify-center bg-zinc-100">
          <svg className="h-10 w-10 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
      )}
      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-zinc-900">
          {product.title}
        </h3>
        <p className="mt-1 text-sm font-bold text-zinc-900">
          ${parseFloat(product.price).toFixed(2)}
        </p>
      </div>
    </Link>
  );
}

function StructuredData({ product }: { product: ProductDetail }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.short_description.replace(/<[^>]*>/g, ""),
    image: product.images.map((img) => img.url),
    sku: product.sku,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand }
      : undefined,
    offers: {
      "@type": "Offer",
      url: `https://rareimagery.net/products/${product.slug}`,
      priceCurrency: product.currency,
      price: product.price,
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: product.store_name,
      },
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://rareimagery.net",
      },
      ...(product.store_slug
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: product.store_name,
              item: getStoreUrl(product.store_slug),
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: product.store_slug ? 3 : 2,
        name: product.title,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  let relatedProducts: Product[] = [];
  try {
    relatedProducts = await getRelatedProducts(product);
  } catch {
    // Non-critical — render page without related products
  }

  // Load creator profile for the header if product belongs to a store
  const creatorProfile = product.store_slug
    ? await getCreatorProfile(product.store_slug).catch(() => null)
    : null;

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <StructuredData product={product} />

      {creatorProfile && (
        <div className="bg-zinc-950">
          <CreatorPageHeader profile={creatorProfile} activePage="store" />
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Breadcrumb product={product} />

        {/* Main product layout — client component syncs color ↔ gallery */}
        <div className="mb-8">
          {/* Header */}
          <div className="mb-6">
            {product.store_slug && (
              <Link
                href={`/stores/${product.store_slug}`}
                className="mb-2 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600">
                  {product.store_name.charAt(0).toUpperCase()}
                </span>
                {product.store_name}
              </Link>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              {product.title}
            </h1>
            {product.sku && (
              <p className="mt-1 text-xs text-zinc-400">SKU: {product.sku}</p>
            )}
            <div className="mt-3"><PriceBlock product={product} /></div>
            {product.short_description && (
              <div
                className="mt-3 text-sm leading-relaxed text-zinc-600"
                dangerouslySetInnerHTML={{ __html: product.short_description }}
              />
            )}
          </div>

          <ProductDetailClient product={product} baseImages={product.images} />

          <div className="mt-6 space-y-4">
            <PayWithXMoneyButton
              productId={product.id}
              price={parseFloat(product.price)}
              sellerHandle={product.store_slug || product.store_name}
            />
            <TrustBadges product={product} />
            <DeliveryInfo product={product} />
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-12 border-t border-zinc-200 pt-8">
          <ProductTabs product={product} />
        </div>

        {/* Reviews placeholder */}
        <div className="mt-12 border-t border-zinc-200 pt-8">
          <h2 className="mb-6 text-xl font-bold text-zinc-900">
            Customer Reviews
          </h2>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-8 text-center">
            <p className="text-sm text-zinc-500">
              No reviews yet. Be the first to review this product!
            </p>
            <button className="mt-4 rounded-full bg-zinc-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700">
              Write a Review
            </button>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12 border-t border-zinc-200 pt-8">
            <h2 className="mb-6 text-xl font-bold text-zinc-900">
              More from this shop
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {relatedProducts.map((rp) => (
                <RelatedProductCard key={rp.id} product={rp} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-zinc-200 bg-white py-10 text-center">
        <p className="text-xs text-zinc-400">
          Powered by{" "}
          <Link
            href="/"
            className="font-medium text-zinc-600 hover:text-zinc-900"
          >
            RareImagery
          </Link>
        </p>
      </footer>
    </div>
  );
}
