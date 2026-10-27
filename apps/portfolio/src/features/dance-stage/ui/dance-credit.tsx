import type { ReactNode } from "react";

import { danceSource } from "#/features/dance-stage/model/source";

const CREDIT_TAIL = "の映像で、人物の切り抜きと骨格はこのサイトで推定した。";

const DanceCredit = (): ReactNode => (
  <p className="text-muted-foreground text-xs leading-relaxed">
    {`素材は${danceSource.performer}さんが踊る`}
    <a
      className="decoration-foreground/30 hover:decoration-foreground underline underline-offset-4"
      href={danceSource.url}
      rel="noreferrer"
      target="_blank"
    >
      {`「${danceSource.title}」`}
    </a>
    {CREDIT_TAIL}
  </p>
);

export { DanceCredit };
