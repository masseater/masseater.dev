import type { ReactNode } from "react";

import { Transcript } from "./transcript.tsx";

const LABEL = "文字起こし";

const TranscriptColumn = (): ReactNode => (
  <aside className="hidden w-96 shrink-0 flex-col border-l lg:flex">
    <h2 className="text-muted-foreground px-5 pt-4 text-xs font-semibold tracking-wider">
      {LABEL}
    </h2>
    <Transcript />
  </aside>
);

export { TranscriptColumn };
