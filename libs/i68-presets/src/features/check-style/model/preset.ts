import { definePlugin } from "@r_masseater/i68";
import type { I68Config, Plugin } from "@r_masseater/i68";

import BACH_CHORALES from "#/features/check-style/data/bach-chorales.json" with { type: "json" };

import { rareTransitionOf } from "./rare-transition.ts";
import type { StyleTable } from "./table.ts";

export const bachPlugin: Plugin = definePlugin({
  rules: { "rare-transition": rareTransitionOf(BACH_CHORALES) },
});

export const bach = (): I68Config => ({
  plugins: { bach: bachPlugin },
  rules: { "bach/rare-transition": "warn" },
});

export const stylePluginOf = (table: StyleTable): Plugin =>
  definePlugin({ rules: { "rare-transition": rareTransitionOf(table) } });
