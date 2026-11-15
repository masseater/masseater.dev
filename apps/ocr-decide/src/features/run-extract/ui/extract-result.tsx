import { CircleX } from "lucide-react";
import type { ReactNode } from "react";

import { linesOf } from "#/entities/extraction";
import type { ExtractState } from "#/features/run-extract/api/use-extract";

import { ResultTable } from "./result-table";

export const ExtractResult = ({ state }: Readonly<{ state: ExtractState }>): ReactNode => {
  if (state.status !== "finished") {
    return "";
  }
  if (state.outcome.status === "failed") {
    return (
      <p className="flex items-start gap-2 text-sm [&_svg]:size-4 [&_svg]:shrink-0">
        <CircleX />
        {state.outcome.reason}
      </p>
    );
  }
  return <ResultTable lines={linesOf(state.outcome)} />;
};
