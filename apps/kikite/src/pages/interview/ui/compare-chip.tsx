import { useCallback } from "react";
import type { ReactNode } from "react";

import { useChangeSettings, useSettings } from "#/pages/interview/model/hooks";

import { Chip } from "./chip.tsx";

const LABEL = "全部を並べる";

const CompareChip = (): ReactNode => {
  const { compare } = useSettings();
  const change = useChangeSettings();
  const onClick = useCallback(() => {
    change({ compare: true });
  }, [change]);
  return <Chip active={compare} label={LABEL} onClick={onClick} />;
};

export { CompareChip };
