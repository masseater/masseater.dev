import type { ReactNode } from "react";

import type { UtteranceValue } from "#/entities/watashi/index.ts";
import { jstMinute } from "#/shared/model/index.ts";
import { Row } from "#/shared/ui/index.ts";

export const UtteranceRow = ({ utterance }: Readonly<{ utterance: UtteranceValue }>): ReactNode => (
  <Row lead={jstMinute(utterance.timestamp)}>
    <p className="text-foreground text-sm leading-relaxed break-words whitespace-pre-wrap">
      {utterance.text}
    </p>
  </Row>
);
