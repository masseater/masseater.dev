import { Option } from "effect";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/interview";
import { RatingButtons } from "#/features/rate-question";
import { phrased } from "#/shared/lib/phrases";

export const HistoryItem = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => {
  if (entry.kind === "speech") {
    return (
      <li className="text-foreground/85 border-foreground/20 border-l-2 pl-3 leading-relaxed wrap-anywhere break-keep">
        {phrased(entry.text)}
      </li>
    );
  }
  return (
    <li className="group text-muted-foreground relative pt-3 pr-16 text-sm leading-relaxed wrap-anywhere break-keep">
      {phrased(entry.question)}
      {Option.isSome(entry.strategy) && <RatingButtons id={entry.id} rating={entry.rating} />}
    </li>
  );
};
