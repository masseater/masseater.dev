import type { ReactNode } from "react";

import { parseEffect } from "#/entities/dance-effect/index.ts";
import type { Technique } from "#/entities/technique/index.ts";
import { DanceStage } from "#/features/dance-stage/index.ts";

export const Reproduction = ({
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
