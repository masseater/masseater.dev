import type { ReactNode } from "react";

import { danceSource } from "#/features/dance-stage/model/source";

const DanceCredit = (): ReactNode => (
  <p className="text-muted-foreground text-xs leading-relaxed">
    {`素材は${danceSource.performer}さんの`}
    <a
      className="decoration-foreground/30 hover:decoration-foreground underline underline-offset-4"
      href={danceSource.url}
      rel="noreferrer"
      target="_blank"
    >
      {`「${danceSource.title}」`}
    </a>
  </p>
);

export { DanceCredit };
