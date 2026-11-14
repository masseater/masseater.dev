import type { ReactNode } from "react";

import { ClaudeState } from "./claude-state.tsx";

const TITLE = "Claude Code";

const ClaudeStep = (): ReactNode => (
  <section aria-label={TITLE} className="flex items-center gap-3 border-b pb-6">
    <h2 className="w-36 shrink-0 font-bold">{TITLE}</h2>
    <ClaudeState />
  </section>
);

export { ClaudeStep };
