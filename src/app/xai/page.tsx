import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "xAI Store | RareImagery",
  description: "Official xAI and Grok merch — tees, hoodies, hats, and more. Built to understand the universe.",
  openGraph: {
    title: "xAI Store | RareImagery",
    description: "Official xAI and Grok merch — tees, hoodies, hats, and more.",
    images: ["https://shop.x.com/cdn/shop/files/xAI_Model.png?v=1763696117&width=1200"],
  },
};

const XAI_COLLECTION = [
  { name: "xAI Human Connection Tee", price: 35, image: "https://shop.x.com/cdn/shop/files/HumanConnectionFlatLay.jpg", slug: "xai-human-connection-tee" },
  { name: "xAI Dark Ani Tee", price: 35, image: "https://shop.x.com/cdn/shop/files/DarkAniFlatLay_f7a066be-8246-4225-9376-fceff8e76c52.jpg", slug: "xai-dark-ani-tee" },
  { name: "Understand The Universe Tee", price: 35, image: "https://shop.x.com/cdn/shop/files/Untitled-58.png", slug: "understand-the-universe-tee" },
  { name: "Grok Logo Tee", price: 35, image: "https://shop.x.com/cdn/shop/files/Untitled-60.png", slug: "grok-logo-tee" },
  { name: "xAI Logo Tee", price: 35, image: "https://shop.x.com/cdn/shop/files/Untitled-56.png", slug: "xai-logo-tee" },
  { name: "The xAI Hoodie", price: 80, image: "https://shop.x.com/cdn/shop/files/Untitled-51.png", slug: "the-xai-hoodie" },
  { name: "The Grok Hoodie", price: 80, image: "https://shop.x.com/cdn/shop/files/Untitled-54.png", slug: "the-grok-hoodie" },
  { name: "xAI Trucker Hat", price: 35, image: "https://shop.x.com/cdn/shop/files/xAI-Trucker-Front_v2.jpg", slug: "xai-trucker-hat" },
  { name: "xAI Dad Hat", price: 35, image: "https://shop.x.com/cdn/shop/files/xAI-DadHat-Front_v2.jpg", slug: "xai-dad-hat" },
  { name: "Grok Trucker Hat", price: 35, image: "https://shop.x.com/cdn/shop/files/Grok-Trucker-Front_v2.jpg", slug: "grok-trucker-hat" },
  { name: "Grok Dad Hat", price: 35, image: "https://shop.x.com/cdn/shop/files/Grok-DadHat-Front_v2.jpg", slug: "grok-dad-hat" },
];

const X_COLLECTION = [
  { name: "X The Everything Mug", price: 35, image: "https://shop.x.com/cdn/shop/files/XTravelMug_Black_Front_v3.jpg", slug: "x-the-everything-mug" },
  { name: "The Core X Crewneck", price: 65, image: "https://shop.x.com/cdn/shop/files/XCoreCrewneck_Front.jpg", slug: "the-core-x-crewneck" },
  { name: "X Thermal Beanie", price: 30, image: "https://shop.x.com/cdn/shop/files/XThermalBeaniev2.png", slug: "x-thermal-beanie" },
  { name: "X Signature Crew Sock Set", price: 25, image: "https://shop.x.com/cdn/shop/files/XSignatureCrewPairv2.png", slug: "x-signature-crew-sock-set" },
  { name: "The Core Trucker Hat", price: 35, image: "https://shop.x.com/cdn/shop/files/Hat1.jpg", slug: "the-core-trucker-hat" },
  { name: "The Core Tee", price: 35, image: "https://shop.x.com/cdn/shop/files/P1333022_v2.png", slug: "the-core-tee" },
  { name: "The Retro Crewneck", price: 75, image: "https://shop.x.com/cdn/shop/files/IMG_1744.png", slug: "the-retro-crewneck" },
  { name: "The Retro Tee", price: 40, image: "https://shop.x.com/cdn/shop/files/IMG_1746.png", slug: "the-retro-tee" },
  { name: "The Core Hoodie", price: 80, image: "https://shop.x.com/cdn/shop/files/IMG_2026_b30d4249-ba9e-4def-a2f7-12bd89ae3ede.png", slug: "the-core-hoodie" },
  { name: "The Core Dad Hat", price: 35, image: "https://shop.x.com/cdn/shop/files/4L1A4006_01d0107c-cd78-46b2-a915-7d5c2ae0ac18.png", slug: "the-core-dad-hat" },
];

function ProductCard({ product }: { product: typeof XAI_COLLECTION[number] }) {
  return (
    <a
      href={`https://shop.x.com/products/${product.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden"
    >
      <div className="aspect-square overflow-hidden bg-[#0A0A0A]">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="mt-3">
        <h3 className="text-sm font-medium text-white group-hover:text-[#E7E7E7] transition">{product.name}</h3>
        <p className="mt-1 text-sm text-[#888]">${product.price}</p>
      </div>
    </a>
  );
}

export default function XaiStorePage() {
  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-[#1A1A1A] bg-black/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm text-[#888] hover:text-white transition">
              &larr; RareImagery
            </Link>
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              xAI
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#xai" className="text-sm text-[#888] hover:text-white transition">xAI Collection</a>
            <a href="#x" className="text-sm text-[#888] hover:text-white transition">X Collection</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative h-[80vh] min-h-[600px] overflow-hidden">
        <img
          src="https://shop.x.com/cdn/shop/files/xAI_Model.png?v=1763696117&width=5760"
          alt="xAI Collection"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="relative flex h-full flex-col items-center justify-end pb-20 text-center">
          <h1
            className="text-6xl font-bold tracking-tight sm:text-7xl lg:text-8xl"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Built to understand
            <br />
            <span className="text-[#888]">the universe.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-[#888]">
            Official xAI and Grok merch. Wear the mission.
          </p>
          <div className="mt-8 flex gap-4">
            <a
              href="#xai"
              className="rounded-none border border-white bg-white px-8 py-3 text-sm font-semibold text-black transition hover:bg-transparent hover:text-white"
            >
              Shop xAI
            </a>
            <a
              href="#x"
              className="rounded-none border border-[#888] px-8 py-3 text-sm font-semibold text-[#888] transition hover:border-white hover:text-white"
            >
              Shop X
            </a>
          </div>
        </div>
      </section>

      {/* xAI Collection */}
      <section id="xai" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10">
          <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            xAI Collection
          </h2>
          <p className="mt-2 text-[#888]">Grok, Ani, and the minds building the future.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {XAI_COLLECTION.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-7xl px-6">
        <div className="border-t border-[#1A1A1A]" />
      </div>

      {/* X Collection */}
      <section id="x" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10">
          <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            X Collection
          </h2>
          <p className="mt-2 text-[#888]">The everything brand. Core essentials and retro drops.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {X_COLLECTION.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>

      {/* Brand Story */}
      <section className="border-t border-[#1A1A1A]">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="text-2xl font-light leading-relaxed text-[#E7E7E7]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            &ldquo;In order to understand the universe, you must explore the universe.&rdquo;
          </p>
          <p className="mt-6 text-sm text-[#888]">
            xAI builds Grok to understand the universe. This is what they wear doing it.
          </p>
          <a
            href="https://x.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block text-sm text-white underline underline-offset-4 hover:text-[#888] transition"
          >
            x.ai &rarr;
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1A1A1A] py-10 text-center">
        <div className="flex items-center justify-center gap-6 text-sm text-[#888]">
          <a href="https://x.com/xai" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">@xai</a>
          <span>&middot;</span>
          <a href="https://shop.x.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">shop.x.com</a>
          <span>&middot;</span>
          <Link href="/" className="hover:text-white transition">RareImagery</Link>
        </div>
        <p className="mt-4 text-xs text-[#444]">
          Curated by RareImagery. All products sold via shop.x.com.
        </p>
      </footer>
    </div>
  );
}
