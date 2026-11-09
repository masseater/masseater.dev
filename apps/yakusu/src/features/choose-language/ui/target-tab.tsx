import { useCallback } from "react";
import type { ReactNode } from "react";

import { languageName } from "#/entities/language";
import type { LanguageCode } from "#/entities/language";
import { useChooseTarget } from "#/features/choose-language/model/choose";

import { LanguageTab } from "./language-tab.tsx";

const TargetTab = ({
  active,
  code,
}: Readonly<{ active: boolean; code: LanguageCode }>): ReactNode => {
  const chooseTarget = useChooseTarget();
  const onSelect = useCallback(() => {
    chooseTarget(code);
  }, [chooseTarget, code]);
  return <LanguageTab active={active} label={languageName(code)} onSelect={onSelect} />;
};

export { TargetTab };
