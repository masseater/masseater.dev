import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

export type Hint = Readonly<{ key: string; meaning: string }>;

const HINTS: readonly Hint[] = [
  { key: "M", meaning: "始点・終点" },
  { key: "Space", meaning: "再生・一時停止" },
];

export const KeyHints = ({ hints }: Readonly<{ hints: readonly Hint[] }>): ReactNode => (
  <p className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
    {pipe(
      [...HINTS, ...hints],
      Arr.map(({ key, meaning }) => (
        <span key={key} className="flex items-center gap-2">
          <kbd className="border-input rounded border px-1.5 font-mono">{key}</kbd>
          {meaning}
        </span>
      )),
    )}
  </p>
);
