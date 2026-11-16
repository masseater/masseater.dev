import { useCallback } from "react";
import type { ReactNode } from "react";

import { useSource } from "#/entities/language/index.ts";
import type { Side } from "#/entities/language/index.ts";
import { useChooseSource } from "#/features/pick-language/model/choose.ts";
import { useIsSearching, useSetQueryText } from "#/features/pick-language/model/search.ts";

import { Choice } from "./choice.tsx";

const DETECT = "言語を検出";

export const DetectChoice = ({ side }: Readonly<{ side: Side }>): ReactNode => {
  const source = useSource();
  const chooseSource = useChooseSource();
  const setQuery = useSetQueryText();
  const searching = useIsSearching();
  const onChoose = useCallback(() => {
    chooseSource({ kind: "detect" });
    setQuery("");
  }, [chooseSource, setQuery]);
  if (side !== "source" || searching) {
    return false;
  }
  return <Choice chosen={source.kind === "detect"} label={DETECT} onChoose={onChoose} />;
};
