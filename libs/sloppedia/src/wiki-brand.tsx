import type { ReactNode } from "react";

import { targets } from "./config.ts";
import type { SloppediaConfig } from "./config.ts";
import { WikiLink } from "./wiki-link.tsx";
import { WikiLogo } from "./wiki-logo.tsx";
import { WikiWordmark } from "./wiki-wordmark.tsx";

const WikiBrand = ({ config }: Readonly<{ config: SloppediaConfig }>): ReactNode => (
  <WikiLink className="flex items-center gap-3" config={config} target={targets.main}>
    <WikiLogo letter={config.logoLetter} />
    <WikiWordmark config={config} />
  </WikiLink>
);

export { WikiBrand };
