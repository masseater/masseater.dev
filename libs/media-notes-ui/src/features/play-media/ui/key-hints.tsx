import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

const HINTS = [
  { key: "M", meaning: "始点・終点" },
  { key: "Space", meaning: "再生・一時停止" },
] as const;

export const KeyHints = (): ReactNode => (
  <p className="text-muted-foreground flex items-center gap-4 text-xs">
    {pipe(
      HINTS,
      Arr.map(({ key, meaning }) => (
        <span key={key} className="flex items-center gap-2">
          <kbd className="border-input rounded border px-1.5 font-mono">{key}</kbd>
          {meaning}
        </span>
      )),
    )}
  </p>
);
