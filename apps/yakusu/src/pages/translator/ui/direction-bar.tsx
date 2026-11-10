import type { ReactNode } from "react";

import { useDirection } from "#/pages/translator/api/translation.ts";

import { LanguageBar } from "./language-bar.tsx";
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
