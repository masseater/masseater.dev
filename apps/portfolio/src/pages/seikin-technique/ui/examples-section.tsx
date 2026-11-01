import type { ReactNode } from "react";

import { TechniqueExamples } from "#/entities/technique";
import type { Example } from "#/entities/technique";
import { EXAMPLES_HEADING } from "#/pages/seikin-technique/model/copy";

const ExamplesSection = ({ examples }: Readonly<{ examples: readonly Example[] }>): ReactNode => (
  <section className="flex flex-col gap-4">
    <h2 className="font-display text-2xl font-light">{EXAMPLES_HEADING}</h2>
    <TechniqueExamples examples={examples} />
  </section>
);

export { ExamplesSection };
