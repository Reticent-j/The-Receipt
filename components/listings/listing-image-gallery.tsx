"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

interface ListingImageGalleryProps {
  images: string[];
  title: string;
}

export function ListingImageGallery({
  images,
  title,
}: ListingImageGalleryProps): React.JSX.Element {
  const [active, setActive] = useState(0);
  const main = images[active];

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/30 text-muted-foreground">
        No photos for this listing
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border/80 bg-muted shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={main}
          alt={title}
          className="h-full w-full object-cover transition-opacity duration-300"
        />
      </div>
      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                i === active
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
