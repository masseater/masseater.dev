import type { ReactNode } from "react";

import { useDirection } from "#/entities/translation/index.ts";
import { LanguageBar } from "#/features/pick-language/index.ts";
import { SwapButton } from "#/features/swap-languages/index.ts";

export const DirectionBar = (): ReactNode => {
  const { detected, target } = useDirection();
  return (
    <LanguageBar detected={detected} target={target}>
      <SwapButton />
    </LanguageBar>
  );
};
