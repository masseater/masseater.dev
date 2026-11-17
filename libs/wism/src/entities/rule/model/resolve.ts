import { settingOf } from "@masseater.dev/lint-host";
import type { Setting } from "@masseater.dev/lint-host";
import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import type { Plugin, Rule, RuleEntry, WismConfig } from "#/shared/config/index.ts";

const SEPARATOR = "/";
const NAME_START = 1;

export interface ScriptRule {
  readonly id: string;
  readonly rule: Rule;
  readonly setting: Setting;
}

const isPluginRule = (id: string): boolean => Str.includes(SEPARATOR)(id);

const pluginOf = (id: string): string => Arr.headNonEmpty(Str.split(id, SEPARATOR));

const nameOf = (id: string): string =>
  pipe(Str.split(id, SEPARATOR), Arr.drop(NAME_START), Arr.join(SEPARATOR));

const scriptOf =
  (plugins: Readonly<Record<string, Plugin>>) =>
  ([id, entry]: readonly [string, RuleEntry]): Option.Option<ScriptRule> =>
    pipe(
      Rec.get(plugins, pluginOf(id)),
      Option.flatMap((plugin) => Rec.get(plugin.rules ?? {}, nameOf(id))),
      Option.map((rule): ScriptRule => ({ id, rule, setting: settingOf(entry) })),
      Option.filter(({ setting }) => setting.severity !== "off"),
    );

export const resolve = (config: WismConfig): readonly ScriptRule[] =>
  pipe(
    Rec.toEntries(config.rules ?? {}),
    Arr.filter(([id]) => isPluginRule(id)),
    Arr.map(scriptOf(config.plugins ?? {})),
    Arr.getSomes,
  );

export const unknownRules = (config: WismConfig): readonly string[] => {
  const plugins = config.plugins ?? {};
  return pipe(
    Rec.keys(config.rules ?? {}),
    Arr.filter(
      (id) =>
        !isPluginRule(id) ||
        pipe(
          Rec.get(plugins, pluginOf(id)),
          Option.flatMap((plugin) => Rec.get(plugin.rules ?? {}, nameOf(id))),
          Option.isNone,
        ),
    ),
  );
};
