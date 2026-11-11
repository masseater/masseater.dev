import type { ReactNode } from "react";

import type { Entry } from "#/pages/interview/model/hooks";
import { STRATEGIES } from "#strategies";

const TimelineItem = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => {
  if (entry.kind === "speech") {
    return <li className="text-base leading-relaxed">{entry.text}</li>;
  }
  return (
    <li className="border-primary border-l-2 pl-3">
      <span className="text-muted-foreground text-xs">{STRATEGIES[entry.strategy].label}</span>
      <p className="font-medium">{entry.question}</p>
    </li>
  );
};

export { TimelineItem };
