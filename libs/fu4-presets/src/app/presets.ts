import type { Fu4Config, Plugin } from "@r_masseater/fu4";
import { Array as Arr, Record as Rec, pipe } from "effect";

import { actionlintPlugin } from "#/features/actionlint/index.ts";
import { ZIZMOR_CONCERNS, zizmorPlugin } from "#/features/zizmor/index.ts";
import type { Concern, Confidence, Persona, Severity } from "#/features/zizmor/index.ts";

export interface ActionlintOptions {
  readonly "self-hosted-runner"?: { readonly labels?: readonly string[] };
  readonly "config-variables"?: readonly string[] | null;
}

export interface ZizmorOptions {
  readonly concerns?: readonly Concern[];
  readonly persona?: Persona;
  readonly minSeverity?: Severity;
  readonly minConfidence?: Confidence;
  readonly online?: boolean;
  readonly githubHost?: string;
  readonly rules?: Readonly<Record<string, unknown>>;
}

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

const ALL_CONCERNS = Rec.keys(ZIZMOR_CONCERNS);

export const actionlint = (settings: ActionlintOptions = {}): Fu4Config => ({
  ...presetOf("actionlint", actionlintPlugin)(Rec.keys(actionlintPlugin.rules)),
  settings: { actionlint: settings },
});

export const zizmor = ({
  concerns = ALL_CONCERNS,
  ...settings
}: ZizmorOptions = {}): Fu4Config => ({
  ...presetOf(
    "zizmor",
    zizmorPlugin,
  )(
    pipe(
      concerns,
      Arr.flatMap((concern) => ZIZMOR_CONCERNS[concern]),
    ),
  ),
  settings: { zizmor: settings },
});

export const recommended = (): Fu4Config => ({ extends: [actionlint(), zizmor()] });
