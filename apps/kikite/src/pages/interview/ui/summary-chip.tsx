import { useCallback } from "react";
import type { ReactNode } from "react";

import { useChangeSettings, useSettings } from "#/pages/interview/model/hooks";

import { Chip } from "./chip.tsx";

const SummaryChip = ({ seconds }: Readonly<{ seconds: number }>): ReactNode => {
  const { summarySeconds } = useSettings();
  const change = useChangeSettings();
  const onClick = useCallback(() => {
    change({ summarySeconds: seconds });
  }, [change, seconds]);
  return <Chip active={summarySeconds === seconds} label={`${seconds} 秒ごと`} onClick={onClick} />;
};

export { SummaryChip };
