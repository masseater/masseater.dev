import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { OpenBody } from "./open-body.tsx";
import { PointLine } from "./point-line.tsx";
import type { PointText } from "./point-line.tsx";

export const PointView = ({
  days,
  detail,
  text,
  theme,
}: PointText & Readonly<{ detail: ReactNode }>): ReactNode => {
  if (detail === null) {
    return (
      <p className="-mx-2 flex items-baseline gap-1 px-2">
        <span className="size-3.5 shrink-0" />
        <PointLine days={days} text={text} theme={theme} />
      </p>
    );
  }
  return (
    <details className="group">
      <summary className="hover:bg-accent -mx-2 flex cursor-pointer items-baseline gap-1 rounded-md px-2">
        <ChevronRight className="text-muted-foreground size-3.5 shrink-0 self-center transition-transform group-open:rotate-90" />
        <PointLine days={days} text={text} theme={theme} />
      </summary>
      <OpenBody>{detail}</OpenBody>
    </details>
  );
};
