import type { RuleEntry, RuleOptions, Severity } from "@masseater.dev/lint-host";

export type { RuleEntry, RuleOptions, Severity } from "@masseater.dev/lint-host";

export type ImportTarget =
  | { readonly type: "file"; readonly value: string }
  | { readonly type: "module"; readonly value: readonly string[] };

export interface GraphEdge {
  readonly from: string;
  readonly specifier: string;
  readonly target: ImportTarget;
  readonly line: number;
  readonly column: number;
  readonly wildcard: boolean;
}

export interface Report {
  readonly message: string;
  readonly path: string;
  readonly line?: number;
  readonly column?: number;
}

export interface RuleContext {
  readonly root: string;
  readonly files: readonly string[];
  readonly edges: readonly GraphEdge[];
  readonly options: RuleOptions;
  readonly report: (report: Report) => void;
}

export interface Rule {
  readonly meta: { readonly description: string };
  readonly check: (context: RuleContext) => void;
}

export interface Plugin {
  readonly rules?: Readonly<Record<string, Rule>>;
}

export interface WismConfig {
  readonly plugins?: Readonly<Record<string, Plugin>>;
  readonly rules?: Readonly<Record<string, RuleEntry>>;
  readonly ignores?: readonly string[];
}

export interface Diagnostic {
  readonly path: string;
  readonly line: number;
  readonly column: number;
  readonly rule: string;
  readonly message: string;
  readonly severity: Exclude<Severity, "off">;
}
