import type { ReactNode } from "react";

import type { Technique } from "#/entities/technique";
import type { Shader } from "#/pages/seikin-technique/api/load-technique";

import { ExamplesSection } from "./examples-section";
import { OriginList } from "./origin-list";
import { ReproductionSection } from "./reproduction-section";
import { TechniqueHeader } from "./technique-header";
import { TechniquePager } from "./technique-pager";

const TechniqueView = ({
  technique,
  shader,
}: Readonly<{ technique: Technique; shader: Shader }>): ReactNode => (
  <article className="flex w-full max-w-5xl flex-col gap-10">
    <TechniqueHeader name={technique.name} />
    <div className="grid gap-10 lg:grid-cols-2">
      <ReproductionSection shader={shader} technique={technique} />
      <ExamplesSection examples={technique.examples} />
    </div>
    <OriginList origins={technique.origins} />
    <TechniquePager slug={technique.slug} />
  </article>
);

export { TechniqueView };
