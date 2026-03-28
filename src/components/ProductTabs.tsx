"use client";

import { useState } from "react";
import type { ProductDetail } from "@/lib/drupal";

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex border-b border-zinc-100 py-3 last:border-0">
      <span className="w-40 flex-shrink-0 text-sm font-medium text-zinc-500">{label}</span>
      <span className="text-sm text-zinc-900">{value}</span>
    </div>
  );
}

function DetailsTab({ product }: { product: ProductDetail }) {
  return (
    <div
      className="prose prose-zinc max-w-none text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: product.body || "<p>No description available.</p>" }}
    />
  );
}

function ClothingSpecs({ product }: { product: ProductDetail }) {
  const specs: [string, string | null][] = [
    ["Material", product.material],
    ["Brand", product.brand],
    ["Gender", product.gender],
    ["Care Instructions", product.care_instructions],
    ["Country of Origin", product.country_of_origin],
    ["Sustainability", product.sustainability],
    ["Shipping Weight", product.shipping_weight ? `${product.shipping_weight} oz` : null],
  ];

  const filtered = specs.filter(([, v]) => v);
  if (filtered.length === 0) return <p className="text-sm text-zinc-500">No specifications available.</p>;

  return (
    <div>
      {filtered.map(([label, value]) => (
        <SpecRow key={label} label={label} value={value!} />
      ))}
    </div>
  );
}

function DigitalSpecs({ product }: { product: ProductDetail }) {
  const specs: [string, string | null][] = [
    ["File Formats", product.file_formats.length > 0 ? product.file_formats.join(", ") : null],
    ["File Size", product.file_size],
    ["Dimensions / Resolution", product.dimensions_resolution],
    ["Software Required", product.software_required],
    ["Language", product.language],
    ["Version", product.version],
    ["License", product.license_type],
    ["Page Count", product.page_count ? String(product.page_count) : null],
    ["Download Limit", "Unlimited"],
  ];

  const filtered = specs.filter(([, v]) => v);
  if (filtered.length === 0) return <p className="text-sm text-zinc-500">No specifications available.</p>;

  return (
    <div>
      {filtered.map(([label, value]) => (
        <SpecRow key={label} label={label} value={value!} />
      ))}
    </div>
  );
}

function CraftsSpecs({ product }: { product: ProductDetail }) {
  const specs: [string, string | null][] = [
    ["Dimensions", product.craft_dimensions],
    ["Materials", product.materials_used],
    ["Technique", product.craft_technique],
    ["Maker", product.maker],
    ["Handmade", product.handmade ? "Yes - each piece is unique" : null],
    ["Made to Order", product.made_to_order ? "Yes" : null],
    ["Production Time", product.production_time],
    ["Customizable", product.customizable ? "Yes" : null],
    ["Gift Wrap Available", product.gift_wrap ? "Yes" : null],
    ["Care Instructions", product.care_instructions],
    ["Safety Info", product.safety_info],
    ["Shipping Weight", product.shipping_weight ? `${product.shipping_weight} oz` : null],
  ];

  const filtered = specs.filter(([, v]) => v);
  if (filtered.length === 0) return <p className="text-sm text-zinc-500">No specifications available.</p>;

  return (
    <div>
      {filtered.map(([label, value]) => (
        <SpecRow key={label} label={label} value={value!} />
      ))}
    </div>
  );
}

function ShippingTab({ product }: { product: ProductDetail }) {
  if (product.product_type === "digital_download") {
    return (
      <div className="space-y-4 text-sm text-zinc-700">
        <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4">
          <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div>
            <p className="font-semibold text-green-900">Instant Digital Delivery</p>
            <p className="mt-1 text-green-700">Available immediately after purchase. Download link sent to your email.</p>
          </div>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold text-zinc-900">Refund Policy</h4>
          <p>Due to the digital nature of this product, all sales are final. If you experience any issues accessing your download, please contact the seller.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm text-zinc-700">
      <div className="space-y-2">
        <h4 className="font-semibold text-zinc-900">Shipping</h4>
        <ul className="list-inside list-disc space-y-1">
          <li>Standard shipping: 5-7 business days</li>
          <li>Express shipping: 2-3 business days</li>
          {product.shipping_class && <li>Shipping class: {product.shipping_class}</li>}
          {product.shipping_weight && <li>Package weight: {product.shipping_weight} oz</li>}
        </ul>
        {product.made_to_order && (
          <p className="mt-2 rounded-lg bg-amber-50 p-3 text-amber-800">
            <strong>Made to Order:</strong> Production time is {product.production_time || "3-5 business days"} before shipping.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <h4 className="font-semibold text-zinc-900">Returns & Exchanges</h4>
        <ul className="list-inside list-disc space-y-1">
          <li>30-day return window on unworn/unused items</li>
          <li>Items must be in original packaging</li>
          {product.customizable && <li>Custom/personalized items are final sale</li>}
          <li>Buyer pays return shipping</li>
        </ul>
      </div>
    </div>
  );
}

function LicenseTab({ product }: { product: ProductDetail }) {
  if (!product.license_details) {
    return (
      <div className="text-sm text-zinc-700">
        <p>License type: {product.license_type || "Personal Use"}</p>
        <div className="mt-4 space-y-2">
          <h4 className="font-semibold text-zinc-900">What you can do:</h4>
          <ul className="list-inside list-disc space-y-1">
            <li>Use for personal projects</li>
            <li>Print for personal use</li>
          </ul>
          <h4 className="mt-3 font-semibold text-zinc-900">What you cannot do:</h4>
          <ul className="list-inside list-disc space-y-1">
            <li>Redistribute or resell the files</li>
            <li>Claim as your own work</li>
            <li>Use in competing products for resale</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div
      className="prose prose-zinc max-w-none text-sm"
      dangerouslySetInnerHTML={{ __html: product.license_details }}
    />
  );
}

function SizeGuideTab({ product }: { product: ProductDetail }) {
  if (product.size_guide) {
    return (
      <div
        className="prose prose-zinc max-w-none text-sm"
        dangerouslySetInnerHTML={{ __html: product.size_guide }}
      />
    );
  }

  return (
    <div className="text-sm">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className="py-2 pr-4 font-semibold text-zinc-900">Size</th>
            <th className="py-2 pr-4 font-semibold text-zinc-900">Chest (in)</th>
            <th className="py-2 pr-4 font-semibold text-zinc-900">Waist (in)</th>
            <th className="py-2 font-semibold text-zinc-900">Length (in)</th>
          </tr>
        </thead>
        <tbody className="text-zinc-600">
          {[
            ["XS", "32-34", "26-28", "26"],
            ["S", "35-37", "29-31", "27"],
            ["M", "38-40", "32-34", "28"],
            ["L", "41-43", "35-37", "29"],
            ["XL", "44-46", "38-40", "30"],
            ["XXL", "47-49", "41-43", "31"],
          ].map(([size, chest, waist, length]) => (
            <tr key={size} className="border-b border-zinc-100">
              <td className="py-2 pr-4 font-medium text-zinc-900">{size}</td>
              <td className="py-2 pr-4">{chest}</td>
              <td className="py-2 pr-4">{waist}</td>
              <td className="py-2">{length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProductTabs({ product }: { product: ProductDetail }) {
  const tabs: Tab[] = [];

  // Details tab (all types)
  tabs.push({
    id: "details",
    label: "Details",
    content: <DetailsTab product={product} />,
  });

  // Specifications tab
  if (product.product_type === "clothing" || product.product_type === "printful") {
    tabs.push({ id: "specs", label: "Specifications", content: <ClothingSpecs product={product} /> });
  } else if (product.product_type === "digital_download") {
    tabs.push({ id: "specs", label: "Specifications", content: <DigitalSpecs product={product} /> });
  } else if (product.product_type === "crafts") {
    tabs.push({ id: "specs", label: "Specifications", content: <CraftsSpecs product={product} /> });
  }

  // Shipping tab
  tabs.push({
    id: "shipping",
    label: product.product_type === "digital_download" ? "Delivery" : "Shipping & Returns",
    content: <ShippingTab product={product} />,
  });

  // License tab (digital only)
  if (product.product_type === "digital_download") {
    tabs.push({
      id: "license",
      label: "License",
      content: <LicenseTab product={product} />,
    });
  }

  // Size guide (clothing only)
  if (product.product_type === "clothing") {
    tabs.push({
      id: "size-guide",
      label: "Size Guide",
      content: <SizeGuideTab product={product} />,
    });
  }

  // Customization tab (crafts, if customizable)
  if (product.product_type === "crafts" && product.customizable) {
    tabs.push({
      id: "customization",
      label: "Customization",
      content: (
        <div className="space-y-3 text-sm text-zinc-700">
          <p className="font-semibold text-zinc-900">This item can be personalized!</p>
          {product.customization_details ? (
            <div dangerouslySetInnerHTML={{ __html: product.customization_details }} />
          ) : (
            <p>Add your personalization details in the order notes at checkout.</p>
          )}
          <p className="rounded-lg bg-amber-50 p-3 text-amber-800">
            Custom/personalized items may take additional production time and are final sale.
          </p>
        </div>
      ),
    });
  }

  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "details");

  const currentTab = tabs.find((t) => t.id === activeTab) ?? tabs[0];

  return (
    <div>
      {/* Tab headers */}
      <div className="flex gap-1 overflow-x-auto border-b border-zinc-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition ${
              activeTab === tab.id
                ? "border-b-2 border-zinc-900 text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="py-6">{currentTab?.content}</div>
    </div>
  );
}
