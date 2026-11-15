import { useCallback } from "react";
import type { ReactNode } from "react";

import { languageName } from "#/entities/language";
import type { LanguageCode } from "#/entities/language";
import { useChooseTarget } from "#/features/pick-language/model/choose";

import { LanguageTab } from "./language-tab.tsx";

export const TargetTab = ({
  active,
  code,
}: Readonly<{ active: boolean; code: LanguageCode }>): ReactNode => {
  const chooseTarget = useChooseTarget();
  const onSelect = useCallback(() => {
    chooseTarget(code);
  }, [chooseTarget, code]);
  return <LanguageTab active={active} label={languageName(code)} onSelect={onSelect} />;
};
