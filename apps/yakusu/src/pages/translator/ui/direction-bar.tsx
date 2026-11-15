import type { ReactNode } from "react";

import { useDirection } from "#/entities/translation";
import { LanguageBar } from "#/features/pick-language";
import { SwapButton } from "#/features/swap-languages";

const DirectionBar = (): ReactNode => {
  const { detected, target } = useDirection();
  return (
    <LanguageBar detected={detected} target={target}>
      <SwapButton />
    </LanguageBar>
  );
};

export { DirectionBar };
