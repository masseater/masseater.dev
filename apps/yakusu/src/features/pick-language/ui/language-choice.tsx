import { useCallback } from "react";
import type { ReactNode } from "react";

import type { Language, Selection, Side } from "#/entities/language/index.ts";
import { useSelection } from "#/entities/language/index.ts";
import { useChooseSource, useChooseTarget } from "#/features/pick-language/model/choose.ts";
import { useSetQueryText } from "#/features/pick-language/model/search.ts";

import { Choice } from "./choice.tsx";

const isChosen = ({
  selection,
  side,
  language,
}: Readonly<{ selection: Selection; side: Side; language: Language }>): boolean => {
  if (side === "target") {
    return selection.target === language.code;
  }
  return selection.source.kind === "language" && selection.source.code === language.code;
};

export const LanguageChoice = ({
  language,
  side,
}: Readonly<{ language: Language; side: Side }>): ReactNode => {
  const selection = useSelection();
  const chooseSource = useChooseSource();
  const chooseTarget = useChooseTarget();
  const setQuery = useSetQueryText();
  const onChoose = useCallback(() => {
    if (side === "source") {
      chooseSource({ kind: "language", code: language.code });
    } else {
      chooseTarget(language.code);
    }
    setQuery("");
  }, [chooseSource, chooseTarget, language, setQuery, side]);
  return (
    <Choice
      chosen={isChosen({ selection, side, language })}
      label={language.name}
      onChoose={onChoose}
    />
  );
};
