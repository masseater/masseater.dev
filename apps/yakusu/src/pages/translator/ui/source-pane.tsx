import type { ReactNode } from "react";

import { CharacterCount, ClearButton, SourceText } from "#/features/edit-source";

export const SourcePane = (): ReactNode => (
  <div className="relative flex min-h-72 flex-col">
    <SourceText />
    <ClearButton />
    <CharacterCount />
  </div>
);
