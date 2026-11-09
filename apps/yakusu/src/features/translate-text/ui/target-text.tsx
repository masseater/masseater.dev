import type { ReactNode } from "react";

import { OutputText } from "./output-text.tsx";

const LABEL = "訳文";

const TargetText = (): ReactNode => (
  <output
    aria-label={LABEL}
    aria-live="polite"
    className="min-h-56 flex-1 px-6 py-5 text-2xl leading-relaxed break-words whitespace-pre-wrap"
  >
    <OutputText />
  </output>
);

export { TargetText };
