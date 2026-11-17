import { Match } from "effect";

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
