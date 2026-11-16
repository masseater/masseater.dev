import { Array as Arr } from "effect";
import type { ReactNode } from "react";

import { refsLabel } from "#/entities/watashi/index.ts";
import type { ProfileLineValue } from "#/entities/watashi/index.ts";

export const LineItem = ({ line }: Readonly<{ line: ProfileLineValue }>): ReactNode => (
  <li className="text-sm leading-relaxed">
    {line.text}
    {Arr.isReadonlyArrayNonEmpty(line.refs) && (
      <span className="text-muted-foreground ml-2 text-xs tabular-nums">
        {refsLabel(line.refs)}
      </span>
    )}
  </li>
);
