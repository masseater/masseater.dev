import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { Fact } from "#/shared/ui/index.ts";

export const ViewChips = ({ views }: Readonly<{ views: readonly string[] }>): ReactNode => (
  <div className="flex flex-wrap gap-2">
    {pipe(
      views,
      Arr.map((view) => <Fact key={view}>{view}</Fact>),
    )}
  </div>
);
