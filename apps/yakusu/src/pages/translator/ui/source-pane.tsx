import type { ReactNode } from "react";

import { CharacterCount } from "./character-count.tsx";
import { ClearButton } from "./clear-button.tsx";
import { SourceText } from "./source-text.tsx";

const SourcePane = (): ReactNode => (
  <div className="relative flex min-h-72 flex-col">
    <SourceText />
    <ClearButton />
    <CharacterCount />
  </div>
);

export { SourcePane };
