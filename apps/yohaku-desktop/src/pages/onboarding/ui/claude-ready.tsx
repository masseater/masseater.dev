import { Check } from "lucide-react";
import type { ReactNode } from "react";

const LABEL = "ログイン済み";

const ClaudeReady = (): ReactNode => (
  <span className="flex items-center gap-1.5">
    <Check aria-hidden="true" className="size-4" />
    {LABEL}
  </span>
);

export { ClaudeReady };
