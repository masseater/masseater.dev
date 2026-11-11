import { Option } from "effect";
import type { ReactNode } from "react";

import type { Entry } from "#/pages/interview/model/hooks";

import { RatingButtons } from "./rating-buttons.tsx";

const HistoryItem = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => {
  if (entry.kind === "speech") {
    return <li className="text-muted-foreground text-sm leading-relaxed">{entry.text}</li>;
  }
  return (
    <li className="text-muted-foreground flex items-center gap-2 pt-2 text-sm font-medium">
      <span className="min-w-0 flex-1">{entry.question}</span>
      {Option.isSome(entry.strategy) && <RatingButtons id={entry.id} rating={entry.rating} />}
    </li>
  );
};

export { HistoryItem };
