import type { ReactNode } from "react";

import { LanguageBar } from "#/features/choose-language";
import { useDirection } from "#/features/translate-text";

import { SwapButton } from "./swap-button.tsx";

const DirectionBar = (): ReactNode => {
  const { detected, target } = useDirection();
  return (
    <LanguageBar detected={detected} target={target}>
      <SwapButton />
    </LanguageBar>
  );
};

export { DirectionBar };
