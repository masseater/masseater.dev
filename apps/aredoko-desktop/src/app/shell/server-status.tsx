import type { ReactNode } from "react";

import { IndexingProgress, useFollowAnalysis } from "#/features/indexing";
import { useStatus } from "#/shared/api";

import { Unreachable } from "./unreachable.tsx";

const STARTING = "起動しています…";

const ServerStatus = (): ReactNode => {
  const status = useStatus();
  useFollowAnalysis();
  if (status.isPending) {
    return <p className="text-muted-foreground text-xs">{STARTING}</p>;
  }
  if (status.isError) {
    return <Unreachable />;
  }
  return <IndexingProgress size="xs" />;
};

export { ServerStatus };
