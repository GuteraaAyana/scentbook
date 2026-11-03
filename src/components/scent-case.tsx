import { scentGlow } from "@/lib/glow";
import { BottleImage } from "./bottle-image";

type Props = {
  name: string;
  imageUrl: string | null;
  accords: { color: string; strength: number }[];
  // The large case on a fragrance page loads first; grid cases load lazily.
  priority?: boolean;
  sizes: string;
  className?: string;
};

// A fragrance in its display case: the bottle, lit from behind by its accord
// colors. Without a bottle image, the light alone stands in for it.
//
// Images are linked straight from Fragella's CDN (`unoptimized`), not copied
// or resized by our server; see DECISIONS.md 009.
export function ScentCase({ name, imageUrl, accords, priority, sizes, className = "" }: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded-md ring-1 ring-line ring-inset ${className}`}
      style={scentGlow(accords)}
    >
      {imageUrl && <BottleImage src={imageUrl} name={name} sizes={sizes} priority={priority} />}
    </div>
  );
}
