import type { ReactNode } from "react";

import { COPY } from "#/pages/why/model/copy.ts";

import { ResultsTable } from "./results-table.tsx";
import { Section } from "./section.tsx";

export const Results = (): ReactNode => (
  <Section title={COPY.results.title}>
    <ResultsTable />
  </Section>
);
