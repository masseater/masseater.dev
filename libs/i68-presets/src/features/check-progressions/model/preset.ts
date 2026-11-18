import { definePlugin } from "@r_masseater/i68";
import type { I68Config, Plugin } from "@r_masseater/i68";

import { namedProgression } from "./named.ts";

export const progressionsPlugin: Plugin = definePlugin({
  rules: { named: namedProgression },
});

export const progressions = (): I68Config => ({
  plugins: { progressions: progressionsPlugin },
  rules: { "progressions/named": "warn" },
});
