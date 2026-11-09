import { useCallback } from "react";
import type { ReactNode } from "react";

import { useSource } from "#/entities/language";
import type { Side } from "#/entities/language";
import { useChooseSource } from "#/features/choose-language/model/choose";
import { useIsSearching, useSetQueryText } from "#/features/choose-language/model/search";

import { Choice } from "./choice.tsx";

const DETECT = "言語を検出";

const DetectChoice = ({ side }: Readonly<{ side: Side }>): ReactNode => {
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

export { DetectChoice };
