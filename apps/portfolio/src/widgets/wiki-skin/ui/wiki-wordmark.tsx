import type { ReactNode } from "react";

import { wiki } from "#/shared/config";

const WikiWordmark = (): ReactNode => (
  <span className="flex flex-col">
    <span className="text-wiki-text font-serif text-2xl leading-tight">{wiki.name}</span>
    <span className="text-wiki-subtle text-xs">{wiki.tagline}</span>
  </span>
);

export { WikiWordmark };
