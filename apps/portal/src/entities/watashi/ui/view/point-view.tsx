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
      <p>
        <PointLine days={days} text={text} theme={theme} />
      </p>
    );
  }
  return (
    <details>
      <summary className="hover:bg-accent -mx-2 cursor-pointer rounded-md px-2">
        <PointLine days={days} text={text} theme={theme} />
      </summary>
      <OpenBody>{detail}</OpenBody>
    </details>
  );
};
