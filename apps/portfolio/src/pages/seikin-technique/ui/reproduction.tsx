import type { ReactNode } from "react";

import type { Technique } from "#/entities/technique";
import { DanceStage, parseEffect } from "#/features/dance-stage";
import type { Shader } from "#/pages/seikin-technique/api/load-technique";
import { PENDING } from "#/pages/seikin-technique/model/copy";

const Reproduction = ({
  technique,
  shader,
}: Readonly<{ technique: Technique; shader: Shader }>): ReactNode => {
  if (shader.status === "pending") {
    return (
      <div className="bg-muted text-muted-foreground flex aspect-video w-full items-center justify-center rounded-lg">
        {PENDING}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <DanceStage label={`${technique.name}で加工したセイキンダンス`} source={shader.source} />
      <p className="text-sm leading-relaxed">{parseEffect(shader.source).note}</p>
    </div>
  );
};

export { Reproduction };
