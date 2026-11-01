import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Group } from "#/pages/seikin-index/model/groups";

import { TechniqueLink } from "./technique-link";

const TechniqueGroup = ({ group }: Readonly<{ group: Group }>): ReactNode => (
  <div className="flex flex-col gap-2">
    <h3 className="text-muted-foreground text-sm">{group.name}</h3>
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {pipe(
        group.techniques,
        Arr.map((technique) => <TechniqueLink key={technique.slug} technique={technique} />),
      )}
    </ul>
  </div>
);

export { TechniqueGroup };
