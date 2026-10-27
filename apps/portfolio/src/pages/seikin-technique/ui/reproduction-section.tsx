import type { ReactNode } from "react";

import type { Technique } from "#/entities/technique";
import { DanceCredit } from "#/features/dance-stage";
import { REPRODUCTION_HEADING } from "#/pages/seikin-technique/model/copy";

import { Reproduction } from "./reproduction";

const ReproductionSection = ({
  technique,
  source,
}: Readonly<{ technique: Technique; source: string }>): ReactNode => (
  <section className="flex flex-col gap-4">
    <h2 className="font-display text-2xl font-light">{REPRODUCTION_HEADING}</h2>
    <Reproduction source={source} technique={technique} />
    <DanceCredit />
  </section>
);

export { ReproductionSection };
