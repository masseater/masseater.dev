import type { RuleEntry, RuleOptions, Severity } from "@masseater.dev/lint-host";
import type { Song } from "@r_masseater/fumx-parser";
import type { Sounding } from "@r_masseater/fumx-parser/analysis";

export type { RuleEntry, RuleOptions, Severity } from "@masseater.dev/lint-host";

export interface Report {
  readonly message: string;
  readonly line: number;
  readonly column?: number;
  readonly detail?: string;
}

export interface RuleContext {
  readonly filename: string;
  readonly song: Song;
  readonly soundings: readonly Sounding[];
  readonly options: RuleOptions;
  readonly report: (report: Report) => void;
}

export interface Rule {
  readonly meta: { readonly description: string };
  readonly check: (context: RuleContext) => void;
}

export interface Plugin {
  readonly rules: Readonly<Record<string, Rule>>;
}

export interface I68Config {
  readonly extends?: readonly I68Config[];
  readonly plugins?: Readonly<Record<string, Plugin>>;
  readonly rules?: Readonly<Record<string, RuleEntry>>;
  readonly ignores?: readonly string[];
}

export interface Diagnostic {
  readonly path: string;
  readonly line: number;
  readonly column?: number;
  readonly rule: string;
  readonly message: string;
  readonly detail?: string;
  readonly severity: Exclude<Severity, "off">;
}
