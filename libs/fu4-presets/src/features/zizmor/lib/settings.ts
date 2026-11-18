import { Option, Predicate, Result, Schema, pipe } from "effect";

import type { Config } from "#/features/zizmor/model/config.ts";
import type { Confidence, Persona, Severity } from "#/features/zizmor/model/finding.ts";

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
export const SEVERITIES: readonly Severity[] = ["informational", "low", "medium", "high"];
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

const cache = new WeakMap<object, ParsedSettings>();

const withConfig = (raw: typeof RawSettings.Type): ParsedSettings =>
  pipe(
    loadConfig(raw.rules),
    Result.map((config) => ({
      config,
      persona: raw.persona ?? "regular",
      minSeverity: Option.fromNullishOr(raw.minSeverity),
      minConfidence: Option.fromNullishOr(raw.minConfidence),
      online: raw.online !== false,
      githubHost: raw.githubHost ?? "github.com",
    })),
  );

const parse = (raw: object): ParsedSettings =>
  pipe(
    decodeSettings(raw),
    Result.mapError((issue) => `invalid zizmor setting: ${issue.message}`),
    Result.flatMap(withConfig),
  );

const cached = (value: object): ParsedSettings => {
  const parsed = parse(value);
  cache.set(value, parsed);
  return parsed;
};

export const settingsOf = (settings: Readonly<Record<string, unknown>>): ParsedSettings => {
  const value = pipe(
    Option.fromNullishOr(settings["zizmor"]),
    Option.filter(Predicate.isObject),
    Option.getOrElse(() => NO_SETTINGS),
  );
  return Option.getOrElse(Option.fromNullishOr(cache.get(value)), () => cached(value));
};
