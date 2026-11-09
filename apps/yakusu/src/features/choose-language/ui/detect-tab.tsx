import { Option, pipe } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { languageName, useSource } from "#/entities/language";
import type { LanguageCode } from "#/entities/language";
import { useChooseSource } from "#/features/choose-language/model/choose";

import { LanguageTab } from "./language-tab.tsx";

const DETECT = "言語を検出";

const detectLabel = (detected: Option.Option<LanguageCode>): string =>
  pipe(
    detected,
    Option.map((code) => `${languageName(code)} - 検出`),
    Option.getOrElse(() => DETECT),
  );

const DetectTab = ({
  detected,
}: Readonly<{ detected: Option.Option<LanguageCode> }>): ReactNode => {
  const source = useSource();
  const chooseSource = useChooseSource();
  const onSelect = useCallback(() => {
    chooseSource({ kind: "detect" });
  }, [chooseSource]);
  return (
    <LanguageTab
      active={source.kind === "detect"}
      label={detectLabel(detected)}
      onSelect={onSelect}
    />
  );
};

export { DetectTab };
