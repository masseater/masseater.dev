import { useCallback } from "react";
import type { ReactNode } from "react";

import { useChangeSettings, useSettings } from "#/pages/interview/model/hooks";

import { Chip } from "./chip.tsx";

const MANUAL_LABEL = "手動";
const MANUAL = 0;

const labelOf = (seconds: number): string => {
  if (seconds > MANUAL) {
    return `${seconds} 秒`;
  }
  return MANUAL_LABEL;
};

const SilenceChip = ({ seconds }: Readonly<{ seconds: number }>): ReactNode => {
  const { silenceSeconds } = useSettings();
  const change = useChangeSettings();
  const onClick = useCallback(() => {
    change({ silenceSeconds: seconds });
  }, [change, seconds]);
  return <Chip active={silenceSeconds === seconds} label={labelOf(seconds)} onClick={onClick} />;
};

export { SilenceChip };
