import { useCallback } from "react";
import type { ReactNode } from "react";

import { useChooseSource } from "#/pages/translator/model/choose.ts";
import { languageName } from "#/pages/translator/model/languages.ts";
import type { LanguageCode } from "#/pages/translator/model/languages.ts";
import { useSource } from "#/pages/translator/model/selection.ts";

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
