import type { ReactNode } from "react";

import type { Technique } from "#/entities/technique";
import { DanceCredit } from "#/features/dance-stage";
import type { Shader } from "#/pages/seikin-technique/api/load-technique";
import { REPRODUCTION_HEADING } from "#/pages/seikin-technique/model/copy";

import { Reproduction } from "./reproduction";

const ReproductionSection = ({
  technique,
  shader,
}: Readonly<{ technique: Technique; shader: Shader }>): ReactNode => (
  <section className="flex flex-col gap-4">
    <h2 className="font-display text-2xl font-light">{REPRODUCTION_HEADING}</h2>
    <Reproduction shader={shader} technique={technique} />
    <DanceCredit />
  </section>
);

export { ReproductionSection };
