import { definePlugin } from "@r_masseater/i68";
import type { I68Config, Plugin, RuleEntry } from "@r_masseater/i68";
import { Option, pipe } from "effect";

import { breath } from "./breath.ts";
import { melodyLeap } from "./melody-leap.ts";
import { outOfKey } from "./out-of-key.ts";
import { partRange } from "./part-range.ts";
import type { Ranges } from "./part-range.ts";

export interface PopOptions {
  readonly ranges?: Ranges;
  readonly maxLeap?: number;
  readonly breathSeconds?: number;
}

export const popPlugin: Plugin = definePlugin({
  rules: {
    "out-of-key": outOfKey,
    "part-range": partRange,
    "melody-leap": melodyLeap,
    breath,
  },
});

const warnWith =
  (key: string) =>
  (value: unknown): RuleEntry =>
    pipe(
      Option.fromNullishOr(value),
      Option.match({
        onNone: (): RuleEntry => "warn",
        onSome: (given): RuleEntry => ["warn", { [key]: given }],
      }),
    );

export const pop = (options: PopOptions = {}): I68Config => ({
  plugins: { pop: popPlugin },
  rules: {
    "pop/out-of-key": "warn",
    "pop/part-range": warnWith("ranges")(options.ranges),
    "pop/melody-leap": warnWith("max")(options.maxLeap),
    "pop/breath": warnWith("seconds")(options.breathSeconds),
  },
});
