import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Origin } from "#/entities/technique";

import { OriginView } from "./origin-view";

const OriginList = ({ origins }: Readonly<{ origins: readonly Origin[] }>): ReactNode => (
  <div className="flex flex-col gap-8">
    {pipe(
      origins,
      Arr.map((origin) => <OriginView key={`${origin.article}-${origin.name}`} origin={origin} />),
    )}
  </div>
);

export { OriginList };
