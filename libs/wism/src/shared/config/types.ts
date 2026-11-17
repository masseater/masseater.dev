export type Severity = "off" | "warn" | "error";

export type RuleOptions = Readonly<Record<string, unknown>>;

export type RuleEntry = Severity | readonly [Severity] | readonly [Severity, RuleOptions];

export interface Placement {
  readonly files: readonly string[];
  readonly allow: readonly string[];
  readonly message?: string;
}

export interface Layers {
  readonly dir: string;
  readonly files: readonly string[];
  readonly order: readonly string[];
  readonly sliced?: readonly string[];
  readonly segmented?: readonly string[];
  readonly loose?: readonly string[];
  readonly entries?: readonly string[];
  readonly open?: readonly string[];
  readonly moduleFiles?: boolean;
  readonly cross?: string;
}

export interface Kind {
  readonly name: string;
  readonly marker: string;
  readonly paths?: readonly string[];
  readonly placements?: readonly Placement[];
  readonly layers?: Layers;
}

export interface GraphNode {
  readonly path: string;
  readonly kind: string;
  readonly dir: string;
  readonly layer: string | null;
  readonly slice: string | null;
}

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
  readonly files: readonly string[];
  readonly nodes: readonly GraphNode[];
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
  readonly kinds?: readonly Kind[];
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
