import { accordWash } from "@/lib/wash";
import { BottleImage } from "./bottle-image";

type Props = {
  name: string;
  imageUrl: string | null;
  accords: { color: string; strength: number }[];
  // The community average, shown as a badge; null hides it.
  score?: number | null;
  // The large poster on a fragrance page loads first; others load lazily.
  priority?: boolean;
  sizes: string;
  className?: string;
};

// A fragrance's poster: a tall card washed in its accord colours, with the
// bottle in front and its score in the corner.
//
// Bottle images are linked straight from Fragella's CDN (`unoptimized`), not
// copied or resized by our server; see DECISIONS.md 009.
export function Poster({ name, imageUrl, accords, score, priority, sizes, className = "" }: Props) {
  return (
    <div
      className={`relative aspect-[2/3] overflow-hidden rounded-md shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] ${className}`}
      style={accordWash(accords)}
    >
      {imageUrl && <BottleImage src={imageUrl} name={name} sizes={sizes} priority={priority} />}
      {score != null && (
        <span className="absolute top-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-xs font-extrabold text-gold">
          <span className="sr-only">Community score </span>
          {score}
        </span>
      )}
    </div>
  );
}
