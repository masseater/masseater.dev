import type { SearchResult } from "@masseater.dev/aredoko-protocol";
import { cn } from "@masseater.dev/ui/cn";
import type { ReactNode } from "react";

import { useAnalysis } from "#/features/indexing";

import { ResultPreview } from "./result-preview.tsx";

const TileThumbnail = ({
  result,
  active,
}: Readonly<{ result: typeof SearchResult.Type; active: boolean }>): ReactNode => {
  const { waiting, now } = useAnalysis(result);
  return (
    <span
      className={cn(
        "bg-muted relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border group-hover:border-foreground/40",
        active && "border-primary ring-2 ring-primary",
      )}
    >
      <span
        className={cn(
          "flex size-full items-center justify-center transition-all duration-700",
          waiting && "opacity-40 grayscale",
        )}
      >
        <ResultPreview result={result} />
      </span>
      {now && (
        <span
          aria-hidden
          className="from-primary/0 via-primary/50 to-primary/0 motion-safe:animate-scan pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b"
        />
      )}
    </span>
  );
};

export { TileThumbnail };
