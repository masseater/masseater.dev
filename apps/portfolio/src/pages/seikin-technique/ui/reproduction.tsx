import type { ReactNode } from "react";

import type { Technique } from "#/entities/technique";
import { DanceStage, parseEffect } from "#/features/dance-stage";

const Reproduction = ({
  technique,
  source,
}: Readonly<{ technique: Technique; source: string }>): ReactNode => (
  <div className="flex flex-col gap-3">
    <DanceStage
      label={`${technique.name}で加工したセイキンダンス`}
      slug={technique.slug}
      source={source}
    />
    <p className="text-sm leading-relaxed">{parseEffect(source).note}</p>
  </div>
);

export { Reproduction };
