import type { ReactNode } from "react";

import type { SloppediaConfig } from "./config.ts";

const WikiWordmark = ({ config }: Readonly<{ config: SloppediaConfig }>): ReactNode => (
  <span className="flex flex-col">
    <span className="text-wiki-text font-serif text-2xl leading-tight">{config.name}</span>
    <span className="text-wiki-subtle text-xs">{config.tagline}</span>
  </span>
);

export { WikiWordmark };
