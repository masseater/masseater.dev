import type { Fu4Config, Plugin } from "@r_masseater/fu4";
import { Array as Arr, Record as Rec, pipe } from "effect";

import { actionlint } from "#/features/actionlint/index.ts";
import { ZIZMOR_CONCERNS, zizmor } from "#/features/zizmor/index.ts";

const enabled =
  (name: string) =>
  (rules: readonly string[]): NonNullable<Fu4Config["rules"]> =>
    Rec.fromEntries(
      pipe(
        rules,
        Arr.map((rule): readonly [string, "error"] => [`${name}/${rule}`, "error"]),
      ),
    );

const presetOf =
  (name: string, plugin: Plugin) =>
  (rules: readonly string[]): Fu4Config => ({
    plugins: Rec.singleton(name, plugin),
    rules: enabled(name)(rules),
  });

const zizmorPreset = presetOf("zizmor", zizmor);

export const presets = {
  actionlint: presetOf("actionlint", actionlint)(Rec.keys(actionlint.rules)),
  zizmor: {
    all: zizmorPreset(Rec.keys(zizmor.rules)),
    ...pipe(ZIZMOR_CONCERNS, Rec.map(zizmorPreset)),
  },
};
