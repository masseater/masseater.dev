import { CircleX } from "lucide-react";
import type { ReactNode } from "react";

import type { ExtractState } from "#/pages/extract/api/use-extract";
import { linesOf } from "#/pages/extract/model/result";

import { ResultTable } from "./result-table";

const ExtractResult = ({ state }: Readonly<{ state: ExtractState }>): ReactNode => {
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

export { ExtractResult };
