import type { Fu4Config, Plugin } from "@r_masseater/fu4";
import { Array as Arr, Record as Rec, pipe } from "effect";

import { actionlint } from "#/features/actionlint/index.ts";

const presetOf =
  (name: string) =>
  (plugin: Plugin): Fu4Config => ({
    plugins: Rec.singleton(name, plugin),
    rules: Rec.fromEntries(
      pipe(
        Rec.keys(plugin.rules),
        Arr.map((rule): readonly [string, "error"] => [`${name}/${rule}`, "error"]),
      ),
    ),
  });

export const presets = {
  actionlint: presetOf("actionlint")(actionlint),
};
