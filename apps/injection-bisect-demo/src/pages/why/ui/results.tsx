import type { ReactNode } from "react";

import { COPY } from "#/pages/why/model/copy";

import { ResultsTable } from "./results-table";
import { Section } from "./section";

const Results = (): ReactNode => (
  <Section title={COPY.results.title}>
    <ResultsTable />
  </Section>
);

export { Results };
