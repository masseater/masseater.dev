import { Option } from "effect";
import type { ReactNode } from "react";

import { targets } from "#/shared/config/index.ts";
import type { SloppediaConfig } from "#/shared/config/index.ts";

import { WikiNavItem } from "./wiki-nav-item.tsx";

export const HomeNavItem = ({ config }: Readonly<{ config: SloppediaConfig }>): ReactNode =>
  Option.match(config.home, {
    onNone: () => false,
    onSome: ({ label }) => <WikiNavItem config={config} label={label} target={targets.home} />,
  });
