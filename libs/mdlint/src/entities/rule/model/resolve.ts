import { Array as Arr, Match, Option, Record as Rec, String as Str, pipe } from "effect";

import type {
  Diagnostic,
  MarkdownlintRule,
  MdlintConfig,
  Plugin,
  Rule,
  RuleEntry,
  RuleOptions,
  Severity,
} from "#/shared/config/index.ts";

export const BUILTIN = "markdownlint";

const SEPARATOR = "/";
const START = 0;
const NO_OPTIONS: RuleOptions = {};

export interface Setting {
  readonly severity: Severity;
  readonly options: RuleOptions;
}

export const reportedSeverity = (setting: Setting): Diagnostic["severity"] =>
  Match.value(setting.severity).pipe(
    Match.when("warn", (): Diagnostic["severity"] => "warn"),
    Match.orElse((): Diagnostic["severity"] => "error"),
  );

export interface ScriptRule {
  readonly id: string;
  readonly rule: Rule;
  readonly setting: Setting;
}

export interface CompatRule {
  readonly id: string;
  readonly rule: MarkdownlintRule;
  readonly setting: Setting;
}

export interface Resolved {
  readonly core: Readonly<Record<string, unknown>>;
  readonly scripts: readonly ScriptRule[];
  readonly compat: readonly CompatRule[];
}

interface RuleId {
  readonly plugin: string;
  readonly name: string;
}

type PluginEntry = readonly [string, Plugin];

const settingOf = (entry: RuleEntry): Setting =>
  Match.value(entry).pipe(
    Match.when(Match.string, (severity): Setting => ({ severity, options: NO_OPTIONS })),
    Match.orElse(([severity, options]): Setting => ({
      severity,
      options: options ?? NO_OPTIONS,
    })),
  );

const ruleIdOf = (id: string): RuleId =>
  pipe(
    Str.indexOf(SEPARATOR)(id),
    Option.match({
      onNone: (): RuleId => ({ plugin: BUILTIN, name: id }),
      onSome: (slash): RuleId => ({
        plugin: Str.slice(START, slash)(id),
        name: Str.slice(slash + SEPARATOR.length)(id),
      }),
    }),
  );

const isOn = (setting: Setting): boolean => setting.severity !== "off";

const coreSeverity = (severity: Severity): string =>
  Match.value(severity).pipe(
    Match.when("warn", () => "warning"),
    Match.orElse(() => "error"),
  );

const coreEntry = (setting: Setting): unknown =>
  Match.value(setting.severity).pipe(
    Match.when("off", (): unknown => false),
    Match.orElse((severity): unknown => ({ ...setting.options, severity: coreSeverity(severity) })),
  );

const ENABLED: Setting = { severity: "error", options: NO_OPTIONS };

const configured =
  (config: MdlintConfig, plugin: string) =>
  (name: string): Option.Option<Setting> =>
    pipe(config.rules ?? {}, Rec.get(`${plugin}${SEPARATOR}${name}`), Option.map(settingOf));

const scriptRules =
  (config: MdlintConfig) =>
  ([plugin, value]: PluginEntry): readonly ScriptRule[] =>
    pipe(
      Rec.toEntries(value.rules ?? {}),
      Arr.map(([name, rule]): ScriptRule => ({
        id: `${plugin}${SEPARATOR}${name}`,
        rule,
        setting: Option.getOrElse(configured(config, plugin)(name), () => ENABLED),
      })),
      Arr.filter(({ setting }) => isOn(setting)),
    );

const compatRule =
  (config: MdlintConfig, plugin: string) =>
  (rule: MarkdownlintRule): Option.Option<CompatRule> =>
    pipe(
      Arr.head(rule.names),
      Option.map((name): CompatRule => ({
        id: `${plugin}${SEPARATOR}${name}`,
        rule,
        setting: pipe(
          rule.names,
          Arr.findFirst(configured(config, plugin)),
          Option.getOrElse(() => ENABLED),
        ),
      })),
    );

const compatRules =
  (config: MdlintConfig) =>
  ([plugin, value]: PluginEntry): readonly CompatRule[] =>
    pipe(
      value.markdownlintRules ?? [],
      Arr.flatMap((rule) => Option.toArray(compatRule(config, plugin)(rule))),
      Arr.filter(({ setting }) => isOn(setting)),
    );

const builtinEntries = (config: MdlintConfig): Readonly<Record<string, unknown>> =>
  pipe(
    Rec.toEntries(config.rules ?? {}),
    Arr.map(([id, entry]) => ({ ...ruleIdOf(id), setting: settingOf(entry) })),
    Arr.filter(({ plugin }) => plugin === BUILTIN),
    Arr.map(({ name, setting }): readonly [string, unknown] => [name, coreEntry(setting)]),
    Rec.fromEntries,
  );

export const resolve = (config: MdlintConfig): Resolved => {
  const plugins = Rec.toEntries(config.plugins ?? {});
  return {
    core: { default: true, ...builtinEntries(config) },
    scripts: pipe(plugins, Arr.flatMap(scriptRules(config))),
    compat: pipe(plugins, Arr.flatMap(compatRules(config))),
  };
};

export const unknownPlugins = (config: MdlintConfig): readonly string[] =>
  pipe(
    Rec.keys(config.rules ?? {}),
    Arr.map((id) => ruleIdOf(id).plugin),
    Arr.filter((plugin) => plugin !== BUILTIN && !Rec.has(config.plugins ?? {}, plugin)),
    Arr.dedupe,
  );
