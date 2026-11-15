import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { UtteranceValue } from "#/entities/watashi/index.ts";
import { RowList } from "#/shared/ui/index.ts";

import { UtteranceRow } from "./utterance-row";

const TEXT = { label: "持ち主の発言", empty: "発言はない" } as const;

export const UtteranceList = ({
  utterances,
}: Readonly<{ utterances: readonly UtteranceValue[] }>): ReactNode =>
  Arr.match(utterances, {
    onEmpty: () => <p className="text-muted-foreground text-sm">{TEXT.empty}</p>,
    onNonEmpty: (spoken) => (
      <RowList label={TEXT.label}>
        {pipe(
          spoken,
          Arr.map((utterance) => <UtteranceRow key={utterance.uuid} utterance={utterance} />),
        )}
      </RowList>
    ),
  });
