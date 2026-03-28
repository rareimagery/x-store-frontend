"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductImage } from "@/lib/drupal";

export default function ProductGallery({
  images,
  title,
}: {
  images: ProductImage[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-zinc-100">
        <svg
          className="h-24 w-24 text-zinc-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      </div>
    );
  }

  const activeImage = images[activeIndex];

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div
        className="relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl bg-zinc-100"
        onClick={() => setZoomed(true)}
      >
        <Image
          src={activeImage.url}
          alt={activeImage.alt || title}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === activeIndex
                  ? "border-zinc-900 ring-1 ring-zinc-900"
                  : "border-zinc-200 hover:border-zinc-400"
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt || `${title} view ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setZoomed(false)}
        >
          <button
            onClick={() => setZoomed(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((activeIndex - 1 + images.length) % images.length);
                }}
                className="absolute left-4 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((activeIndex + 1) % images.length);
                }}
                className="absolute right-4 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          <div
            className="relative h-[80vh] w-[80vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activeImage.url}
              alt={activeImage.alt || title}
              fill
              className="object-contain"
              sizes="80vw"
            />
          </div>

          {/* Lightbox thumbnails */}
          {images.length > 1 && (
            <div className="absolute bottom-4 flex gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIndex(i);
                  }}
                  className={`h-2 w-2 rounded-full transition ${
                    i === activeIndex ? "bg-white" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
