import { Option } from "effect";
import type { ReactNode } from "react";

import { phrased } from "#/pages/interview/lib/phrases";
import type { Entry } from "#/pages/interview/model/hooks";

import { RatingButtons } from "./rating-buttons.tsx";

const HistoryItem = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => {
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

export { HistoryItem };
