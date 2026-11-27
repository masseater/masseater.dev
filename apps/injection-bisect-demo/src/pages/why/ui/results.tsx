import { Titled } from "@masseater.dev/ui/titled";
import type { ReactNode } from "react";

import { COPY } from "#/pages/why/model/copy.ts";

import { ResultsTable } from "./results-table.tsx";

export const Results = (): ReactNode => (
  <Titled kind="section" title={COPY.results.title}>
    <ResultsTable label={COPY.results.title} />
  </Titled>
);
