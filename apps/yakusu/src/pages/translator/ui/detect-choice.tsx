import { useCallback } from "react";
import type { ReactNode } from "react";

import { useChooseSource } from "#/pages/translator/model/choose.ts";
import { useIsSearching, useSetQueryText } from "#/pages/translator/model/search.ts";
import { useSource } from "#/pages/translator/model/selection.ts";
import type { Side } from "#/pages/translator/model/selection.ts";

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
