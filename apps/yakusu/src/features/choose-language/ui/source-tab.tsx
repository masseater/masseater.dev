import { useCallback } from "react";
import type { ReactNode } from "react";

import { languageName, useSource } from "#/entities/language";
import type { LanguageCode } from "#/entities/language";
import { useChooseSource } from "#/features/choose-language/model/choose";

import { LanguageTab } from "./language-tab.tsx";

const SourceTab = ({ code }: Readonly<{ code: LanguageCode }>): ReactNode => {
  const source = useSource();
  const chooseSource = useChooseSource();
  const onSelect = useCallback(() => {
    chooseSource({ kind: "language", code });
  }, [chooseSource, code]);
  return (
    <LanguageTab
      active={source.kind === "language" && source.code === code}
      label={languageName(code)}
      onSelect={onSelect}
    />
  );
};

export { SourceTab };
