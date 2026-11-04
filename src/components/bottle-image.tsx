"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// priority: the page's main image (preloaded, fetched first). eager: visible
// as the page opens, so not lazy. Otherwise lazy.
type Props = { src: string; name: string; sizes: string; priority?: boolean; eager?: boolean };

// A bottle photo from Fragella's CDN. Some of their links are dead (403), so
// if one fails to load it's removed, and the case shows its glow alone, the
// same as a fragrance with no photo.
export function BottleImage({ src, name, sizes, priority, eager }: Props) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);

  // The server-rendered <img> can fail before React is listening for onError,
  // so also check once on mount: loaded with no pixels means it failed.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return null;

  return (
    <Image
      ref={ref}
      src={src}
      alt={`Bottle of ${name}`}
      fill
      unoptimized
      sizes={sizes}
      preload={priority}
      fetchPriority={priority ? "high" : undefined}
      loading={priority || eager ? "eager" : "lazy"}
      onError={() => setFailed(true)}
      className="object-contain px-[12%] py-[18%] drop-shadow-[0_10px_12px_rgba(0,0,0,0.45)] transition-transform duration-200 motion-safe:group-hover:-translate-y-1"
    />
  );
}
