import { Array as Arr, Match, Option, Record as Rec, String as Str, pipe } from "effect";

import type {
  Plugin,
  Rule,
  RuleEntry,
  RuleOptions,
  Severity,
  WismConfig,
} from "#/shared/config/index.ts";

const SEPARATOR = "/";
const NO_OPTIONS: RuleOptions = {};
const NAME_START = 1;

export interface Setting {
  readonly severity: Severity;
  readonly options: RuleOptions;
}

export interface ScriptRule {
  readonly id: string;
  readonly rule: Rule;
  readonly setting: Setting;
}

export interface Resolved {
  readonly builtin: Readonly<Record<string, Severity>>;
  readonly scripts: readonly ScriptRule[];
}

const settingOf = (entry: RuleEntry): Setting =>
  Match.value(entry).pipe(
    Match.when(Match.string, (severity): Setting => ({ severity, options: NO_OPTIONS })),
    Match.orElse(([severity, options]): Setting => ({
      severity,
      options: options ?? NO_OPTIONS,
    })),
  );

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

export const resolve = (config: WismConfig): Resolved => {
  const entries = Rec.toEntries(config.rules ?? {});
  const builtin = pipe(
    entries,
    Arr.filter(([id]) => !isPluginRule(id)),
  );
  const plugged = pipe(
    entries,
    Arr.filter(([id]) => isPluginRule(id)),
  );
  return {
    builtin: pipe(
      builtin,
      Arr.map(([id, entry]) => [id, settingOf(entry).severity] as const),
      Rec.fromEntries,
    ),
    scripts: pipe(plugged, Arr.map(scriptOf(config.plugins ?? {})), Arr.getSomes),
  };
};

export const unknownPlugins = (config: WismConfig): readonly string[] =>
  pipe(
    Rec.keys(config.rules ?? {}),
    Arr.filter(isPluginRule),
    Arr.map(pluginOf),
    Arr.filter((plugin) => !Rec.has(config.plugins ?? {}, plugin)),
    Arr.dedupe,
  );
