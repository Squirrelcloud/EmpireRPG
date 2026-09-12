import { useEffect, useState } from "react";
import { artCandidates } from "@/lib/empire/art";
import { cn } from "@/lib/utils";

export function ArtImage({
  src,
  fallback,
  alt = "",
  className,
}: {
  src: string;
  fallback: string;
  alt?: string;
  className?: string;
}) {
  const candidates = artCandidates(src, fallback);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [src, fallback]);

  const current = candidates[Math.min(index, candidates.length - 1)] ?? fallback;

  return (
    <img
      src={current}
      alt={alt}
      className={cn("bg-elevated object-cover", className)}
      referrerPolicy="no-referrer"
      onError={() => setIndex((n) => Math.min(n + 1, candidates.length - 1))}
    />
  );
}
