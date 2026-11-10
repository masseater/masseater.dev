import { useCallback } from "react";
import type { ReactNode } from "react";

import { useChooseTarget } from "#/pages/translator/model/choose.ts";
import { languageName } from "#/pages/translator/model/languages.ts";
import type { LanguageCode } from "#/pages/translator/model/languages.ts";

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
