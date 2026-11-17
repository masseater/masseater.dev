import type { RuleEntry, RuleOptions, Severity } from "@r_masseater/lint-host";

import type { NodeType } from "#/shared/native/index.ts";

export type { RuleEntry, RuleOptions, Severity } from "@r_masseater/lint-host";

export interface Position {
  readonly line: number;
  readonly column: number;
}

export interface MarkdownNode {
  readonly type: NodeType;
  readonly id: number;
  readonly start: number;
  readonly end: number;
  readonly parent: MarkdownNode | undefined;
  readonly children: readonly MarkdownNode[];
  readonly data: Readonly<Record<string, unknown>>;
}

export interface Report {
  readonly message: string;
  readonly node?: MarkdownNode;
  readonly line?: number;
  readonly column?: number;
  readonly length?: number;
  readonly detail?: string;
}

export interface RuleContext {
  readonly filename: string;
  readonly text: string;
  readonly lines: readonly string[];
  readonly options: RuleOptions;
  readonly root: MarkdownNode;
  readonly textOf: (node: MarkdownNode) => string;
  readonly positionOf: (offset: number) => Position;
  readonly report: (report: Report) => void;
}

export type Visitors = Readonly<
  Partial<Record<NodeType | `${NodeType}:exit`, (node: MarkdownNode) => void>>
>;

export interface Rule {
  readonly meta: { readonly description: string; readonly tags?: readonly string[] };
  readonly create: (context: RuleContext) => Visitors;
}

export interface MarkdownlintRule {
  readonly names: readonly string[];
  readonly description: string;
  readonly tags: readonly string[];
  readonly parser: string;
  readonly function: unknown;
  readonly [field: string]: unknown;
}

export interface Plugin {
  readonly rules?: Readonly<Record<string, Rule>>;
  readonly markdownlintRules?: readonly MarkdownlintRule[];
}

export interface Y8Config {
  readonly plugins?: Readonly<Record<string, Plugin>>;
  readonly rules?: Readonly<Record<string, RuleEntry>>;
  readonly ignores?: readonly string[];
  readonly inlineConfig?: boolean;
}

export interface Diagnostic {
  readonly path: string;
  readonly line: number;
  readonly column?: number;
  readonly length?: number;
  readonly rule: string;
  readonly message: string;
  readonly detail?: string;
  readonly context?: string;
  readonly severity: Exclude<Severity, "off">;
}
