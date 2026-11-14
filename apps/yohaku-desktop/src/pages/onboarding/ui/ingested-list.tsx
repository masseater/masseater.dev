import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { useSources } from "#/entities/source";

import { SourceFacts } from "./source-facts.tsx";

const LABEL = "入れた設定";

const IngestedList = (): ReactNode => {
  const sources = pipe(
    useSources(),
    Array.filter(({ origin }) => origin !== "manuscript"),
  );
  if (!Array.isReadonlyArrayNonEmpty(sources)) {
    return false;
  }
  return (
    <ul aria-label={LABEL} className="flex flex-col gap-3">
      {pipe(
        sources,
        Array.map((source) => <SourceFacts key={source.id} source={source} />),
      )}
    </ul>
  );
};

export { IngestedList };
