import { Option, Predicate, Result, Schema, pipe } from "effect";

import type { Config } from "#/features/audit-workflows/model/config.ts";
import { SEVERITIES } from "#/features/audit-workflows/model/finding.ts";
import type { Confidence, Persona, Severity } from "#/features/audit-workflows/model/finding.ts";

import { loadConfig } from "./config-decode.ts";

export interface ZizmorSettings {
  readonly config: Config;
  readonly persona: Persona;
  readonly minSeverity: Option.Option<Severity>;
  readonly minConfidence: Option.Option<Confidence>;
  readonly online: boolean;
  readonly githubHost: string;
}

export type ParsedSettings = Result.Result<ZizmorSettings, string>;

export const PERSONAS: readonly Persona[] = ["auditor", "pedantic", "regular"];
export const CONFIDENCES: readonly Confidence[] = ["low", "medium", "high"];

const RawSettings = Schema.Struct({
  rules: Schema.optionalKey(Schema.Unknown),
  persona: Schema.optionalKey(Schema.Literals(PERSONAS)),
  minSeverity: Schema.optionalKey(Schema.Literals(SEVERITIES)),
  minConfidence: Schema.optionalKey(Schema.Literals(CONFIDENCES)),
  online: Schema.optionalKey(Schema.Unknown),
  githubHost: Schema.optionalKey(Schema.String),
});

const decodeSettings = Schema.decodeUnknownResult(RawSettings);

const NO_SETTINGS = {};

const withConfig =
  (known: readonly string[]) =>
  (raw: typeof RawSettings.Type): ParsedSettings =>
    pipe(
      loadConfig(known)(raw.rules),
      Result.map((config) => ({
        config,
        persona: raw.persona ?? "regular",
        minSeverity: Option.fromNullishOr(raw.minSeverity),
        minConfidence: Option.fromNullishOr(raw.minConfidence),
        online: raw.online !== false,
        githubHost: raw.githubHost ?? "github.com",
      })),
    );

const parse =
  (known: readonly string[]) =>
  (raw: object): ParsedSettings =>
    pipe(
      decodeSettings(raw),
      Result.mapError((issue) => `invalid zizmor setting: ${issue.message}`),
      Result.flatMap(withConfig(known)),
    );

export type SettingsOf = (settings: Readonly<Record<string, unknown>>) => ParsedSettings;

export const settingsOf = (known: readonly string[]): SettingsOf => {
  const cache = new WeakMap<object, ParsedSettings>();
  const cached = (value: object): ParsedSettings => {
    const parsed = parse(known)(value);
    cache.set(value, parsed);
    return parsed;
  };
  return (settings) => {
    const value = pipe(
      Option.fromNullishOr(settings["zizmor"]),
      Option.filter(Predicate.isObject),
      Option.getOrElse(() => NO_SETTINGS),
    );
    return Option.getOrElse(Option.fromNullishOr(cache.get(value)), () => cached(value));
  };
};
