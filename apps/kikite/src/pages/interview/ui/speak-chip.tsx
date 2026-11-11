import { useCallback } from "react";
import type { ReactNode } from "react";

import { useChangeSettings, useSettings } from "#/pages/interview/model/hooks";

import { Chip } from "./chip.tsx";

const ON = "する";
const OFF = "しない";

const labelOf = (speak: boolean): string => {
  if (speak) {
    return ON;
  }
  return OFF;
};

const SpeakChip = ({ speak }: Readonly<{ speak: boolean }>): ReactNode => {
  const current = useSettings().speak;
  const change = useChangeSettings();
  const onClick = useCallback(() => {
    change({ speak });
  }, [change, speak]);
  return <Chip active={current === speak} label={labelOf(speak)} onClick={onClick} />;
};

export { SpeakChip };
