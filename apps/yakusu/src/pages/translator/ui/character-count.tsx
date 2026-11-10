import type { ReactNode } from "react";

import { MAX_CHARACTERS, useDraft } from "#/pages/translator/model/draft.ts";

const counter = new Intl.NumberFormat("ja");

const LIMIT = counter.format(MAX_CHARACTERS);

const CharacterCount = (): ReactNode => (
  <p className="text-muted-foreground px-6 pb-3 text-right text-xs tabular-nums">
    {`${counter.format(useDraft().length)} / ${LIMIT}`}
  </p>
);

export { CharacterCount };
