import type { ReactNode } from "react";

const KEY = "M";
const MEANING = "始点・終点";

export const KeyHint = (): ReactNode => (
  <p className="text-muted-foreground flex items-center gap-2 text-xs">
    <kbd className="border-input rounded border px-1.5 font-mono">{KEY}</kbd>
    {MEANING}
  </p>
);
