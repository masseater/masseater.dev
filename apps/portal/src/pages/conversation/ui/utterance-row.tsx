import type { ReactNode } from "react";

import type { UtteranceValue } from "#/entities/watashi";
import { jstMinute } from "#/shared/model";
import { Row } from "#/shared/ui";

export const UtteranceRow = ({ utterance }: Readonly<{ utterance: UtteranceValue }>): ReactNode => (
  <Row lead={jstMinute(utterance.timestamp)}>
    <p className="text-foreground/90 text-sm leading-relaxed break-words whitespace-pre-wrap">
      {utterance.text}
    </p>
  </Row>
);
