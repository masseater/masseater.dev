import { Array as Arr, Match, Option, Record as Rec, pipe } from "effect";

export type Severity = "off" | "warn" | "error";

export type RuleOptions = Readonly<Record<string, unknown>>;

export type RuleEntry = Severity | readonly [Severity] | readonly [Severity, RuleOptions];

export interface Setting {
  readonly severity: Severity;
  readonly options: RuleOptions;
}

const NO_OPTIONS: RuleOptions = {};

export const settingOf = (entry: RuleEntry): Setting =>
  Match.value(entry).pipe(
    Match.when(Match.string, (severity): Setting => ({ severity, options: NO_OPTIONS })),
    Match.orElse(([severity, options]): Setting => ({
      severity,
      options: options ?? NO_OPTIONS,
    })),
  );

const optionsOf = (entry: RuleEntry): Option.Option<RuleOptions> =>
  Match.value(entry).pipe(
    Match.when(Match.string, () => Option.none()),
    Match.orElse(([, options]) => Option.fromUndefinedOr(options)),
  );

const overridden = (earlier: RuleEntry, later: RuleEntry): RuleEntry =>
  pipe(
    optionsOf(later),
    Option.orElse(() => optionsOf(earlier)),
    Option.match({
      onNone: () => later,
      onSome: (options): RuleEntry => [settingOf(later).severity, options],
    }),
  );

export const mergedRules = (
  layers: readonly (Readonly<Record<string, RuleEntry>> | undefined)[],
): Readonly<Record<string, RuleEntry>> => {
  const merged: Record<string, RuleEntry> = {};
  for (const [name, later] of pipe(
    layers,
    Arr.flatMap((layer) => Rec.toEntries(layer ?? {})),
  )) {
    merged[name] = pipe(
      Rec.get(merged, name),
      Option.match({
        onNone: () => later,
        onSome: (earlier) => overridden(earlier, later),
      }),
    );
  }
  return merged;
};
