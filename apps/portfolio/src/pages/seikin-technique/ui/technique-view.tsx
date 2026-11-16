import type { ReactNode } from "react";

import type { Technique } from "#/entities/technique/index.ts";

import { ExamplesSection } from "./examples-section.tsx";
import { OriginList } from "./origin-list.tsx";
import { ReproductionSection } from "./reproduction-section.tsx";
import { TechniqueHeader } from "./technique-header.tsx";
import { TechniquePager } from "./technique-pager.tsx";

export const TechniqueView = ({
  technique,
  source,
}: Readonly<{ technique: Technique; source: string }>): ReactNode => (
  <article className="flex w-full max-w-5xl flex-col gap-10">
    <TechniqueHeader name={technique.name} />
    <div className="grid gap-10 lg:grid-cols-2">
      <ReproductionSection source={source} technique={technique} />
      <ExamplesSection examples={technique.examples} />
    </div>
    <OriginList origins={technique.origins} />
    <TechniquePager slug={technique.slug} />
  </article>
);
