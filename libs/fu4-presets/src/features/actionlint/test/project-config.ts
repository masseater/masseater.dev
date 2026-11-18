import type { Fu4Config } from "@r_masseater/fu4";
import { Array as Arr, Option, Predicate, Record as Rec, pipe } from "effect";
import { minimatch } from "minimatch";
import { parse } from "yaml";

import { presets } from "#/app/presets.ts";

interface PathRule {
  readonly ignore?: readonly string[];
}

export interface ProjectConfig {
  readonly config: Fu4Config;
  readonly ignored: (file: string, message: string) => boolean;
}

const recordOf = (value: unknown): Readonly<Record<string, unknown>> => {
  if (Predicate.isObject(value) && !Arr.isArray(value)) {
    return value;
  }
  return {};
};

const patternsFor =
  (paths: Readonly<Record<string, unknown>>) =>
  (file: string): readonly RegExp[] =>
    pipe(
      Rec.toEntries(paths),
      Arr.filter(([glob]) => minimatch(file, glob)),
      Arr.flatMap(([, rule]) => (recordOf(rule) as PathRule).ignore ?? []),
      Arr.map((source) => new RegExp(source, "u")),
    );

export const projectConfigOf = (text: Option.Option<string>): ProjectConfig => {
  const raw = pipe(
    text,
    Option.map((found): unknown => parse(found)),
    Option.getOrUndefined,
    recordOf,
  );
  const { paths, ...settings } = raw;
  const patterns = patternsFor(recordOf(paths));
  return {
    config: {
      ...presets.actionlint,
      settings: { ...presets.actionlint.settings, actionlint: settings },
    },
    ignored: (file, message) =>
      pipe(
        patterns(file),
        Arr.some((pattern) => pattern.test(message)),
      ),
  };
};
