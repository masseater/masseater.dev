import { useCallback } from "react";
import type { ReactNode } from "react";

import { useSelection } from "#/entities/language";
import type { Language, Selection, Side } from "#/entities/language";
import { useChooseSource, useChooseTarget } from "#/features/choose-language/model/choose";
import { useSetQueryText } from "#/features/choose-language/model/search";

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

const LanguageChoice = ({
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

export { LanguageChoice };
