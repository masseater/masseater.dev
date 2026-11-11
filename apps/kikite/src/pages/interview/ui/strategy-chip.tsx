import { useCallback } from "react";
import type { ReactNode } from "react";

import { useChangeSettings, useSettings } from "#/pages/interview/model/hooks";
import { STRATEGIES } from "#strategies";
import type { StrategyId } from "#strategies";

import { Chip } from "./chip.tsx";

const StrategyChip = ({ id }: Readonly<{ id: StrategyId }>): ReactNode => {
  const { strategy, compare } = useSettings();
  const change = useChangeSettings();
  const onClick = useCallback(() => {
    change({ strategy: id, compare: false });
  }, [change, id]);
  return (
    <Chip active={!compare && strategy === id} label={STRATEGIES[id].label} onClick={onClick} />
  );
};

export { StrategyChip };
