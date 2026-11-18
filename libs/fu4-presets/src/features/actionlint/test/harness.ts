import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import { actionlint } from "#/app/presets.ts";

import { isPorted, kindOf, sameLines } from "./expected.ts";

const COMMENT = " #";
const FIELDS = " ";

export const FIXTURES = "../../../../../fu4/native/core/tests/fixtures/actionlint";
export const PREFIX = "actionlint/";

export const PORTED = pipe(
  Rec.get(actionlint().plugins ?? {}, "actionlint"),
  Option.map((plugin) => Rec.keys(plugin.rules)),
  Option.getOrElse((): readonly string[] => []),
);

interface Known {
  readonly id: string;
  readonly kind: string;
}

export interface Outcome {
  readonly id: string;
  readonly want: readonly string[];
  readonly have: readonly string[];
}

const knownOf = (line: string): readonly Known[] => {
  const [entry] = Str.split(COMMENT)(line);
  const [id, kind = ""] = Str.split(FIELDS)(Str.trim(entry));
  if (Str.isEmpty(id)) {
    return [];
  }
  return [{ id, kind }];
};

export const lines = (text: string): readonly string[] => Str.split("\n")(text);

export const expectedOf = (text: string): readonly string[] =>
  pipe(
    lines(text),
    Arr.filter((line) => Option.exists(kindOf(line), isPorted(PORTED))),
  );

const differs = (outcome: Outcome): boolean => !sameLines(outcome.have)(outcome.want);

const report = (outcome: Outcome): string =>
  Arr.join([outcome.id, "  want", ...outcome.want, "  have", ...outcome.have], "\n");

const unexpectedOf = (failing: readonly Outcome[], listed: readonly Known[]): readonly string[] => {
  const ids = pipe(
    listed,
    Arr.map((entry) => entry.id),
  );
  return pipe(
    failing,
    Arr.filter((outcome) => !Arr.contains(ids, outcome.id)),
    Arr.map(report),
  );
};

const fixedOf =
  (failing: readonly Outcome[], checked: readonly Outcome[]) =>
  (listed: readonly Known[]): readonly string[] => {
    const failed = pipe(
      failing,
      Arr.map((outcome) => outcome.id),
    );
    const ids = pipe(
      checked,
      Arr.map((outcome) => outcome.id),
    );
    return pipe(
      listed,
      Arr.filter(
        (entry) =>
          Arr.contains(PORTED, entry.kind) &&
          Arr.contains(ids, entry.id) &&
          !Arr.contains(failed, entry.id),
      ),
      Arr.map((entry) => entry.id),
    );
  };

export const KNOWN = "known-failures.txt";

export const verdictOf =
  (known: string) =>
  (
    outcomes: readonly Outcome[],
  ): { readonly unexpected: readonly string[]; readonly fixed: readonly string[] } => {
    const listed = pipe(lines(known), Arr.flatMap(knownOf));
    const failing = pipe(outcomes, Arr.filter(differs));
    return {
      unexpected: unexpectedOf(failing, listed),
      fixed: fixedOf(failing, outcomes)(listed),
    };
  };

const CONFIG_NAME = "the fu4 section of vite.config.ts";

export const normalize = (message: string): string =>
  pipe(
    message,
    Str.replaceAll(`variables in ${CONFIG_NAME} are`, "variables in actionlint.yaml are"),
    Str.replaceAll(`is empty in ${CONFIG_NAME}.`, "is empty in actionlint.yaml."),
    Str.replaceAll(CONFIG_NAME, "actionlint.yaml config file"),
  );
