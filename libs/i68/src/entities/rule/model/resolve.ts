import { settingOf } from "@masseater.dev/lint-host";
import type { Setting } from "@masseater.dev/lint-host";
import { Array as Arr, Match, Option, Record as Rec, String as Str, pipe } from "effect";

import type { Diagnostic, I68Config, Plugin, Rule } from "#/shared/config/index.ts";

const SEPARATOR = "/";
const START = 0;
const ENABLED: Setting = settingOf("error");

export interface ResolvedRule {
  readonly id: string;
  readonly rule: Rule;
  readonly setting: Setting;
}

type PluginEntry = readonly [string, Plugin];

export const reportedSeverity = (setting: Setting): Diagnostic["severity"] =>
  Match.value(setting.severity).pipe(
    Match.when("warn", (): Diagnostic["severity"] => "warn"),
    Match.orElse((): Diagnostic["severity"] => "error"),
  );

const idOf = (plugin: string, name: string): string => `${plugin}${SEPARATOR}${name}`;

const pluginOf = (id: string): string =>
  pipe(
    Str.indexOf(SEPARATOR)(id),
    Option.match({
      onNone: () => id,
      onSome: (slash) => Str.slice(START, slash)(id),
    }),
  );

const rulesOf =
  (config: I68Config) =>
  ([plugin, value]: PluginEntry): readonly ResolvedRule[] =>
    pipe(
      Rec.toEntries(value.rules),
      Arr.map(([name, rule]): ResolvedRule => {
        const id = idOf(plugin, name);
        return {
          id,
          rule,
          setting: pipe(
            config.rules ?? {},
            Rec.get(id),
            Option.map(settingOf),
            Option.getOrElse(() => ENABLED),
          ),
        };
      }),
      Arr.filter(({ setting }) => setting.severity !== "off"),
    );

export const resolve = (config: I68Config): readonly ResolvedRule[] =>
  pipe(Rec.toEntries(config.plugins ?? {}), Arr.flatMap(rulesOf(config)));

export const unknownPlugins = (config: I68Config): readonly string[] =>
  pipe(
    Rec.keys(config.rules ?? {}),
    Arr.map(pluginOf),
    Arr.filter((plugin) => !Rec.has(config.plugins ?? {}, plugin)),
    Arr.dedupe,
  );
