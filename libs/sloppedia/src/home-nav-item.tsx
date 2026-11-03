import { Option } from "effect";
import type { ReactNode } from "react";

import { targets } from "./config.ts";
import type { SloppediaConfig } from "./config.ts";
import { WikiNavItem } from "./wiki-nav-item.tsx";

const HomeNavItem = ({ config }: Readonly<{ config: SloppediaConfig }>): ReactNode =>
  Option.match(config.home, {
    onNone: () => false,
    onSome: ({ label }) => <WikiNavItem config={config} label={label} target={targets.home} />,
  });

export { HomeNavItem };
