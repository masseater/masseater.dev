import type { RuleEntry, RuleOptions, Severity } from "@masseater.dev/lint-host";

import type { NodeType } from "#/shared/native/index.ts";

export type { RuleEntry, RuleOptions, Severity } from "@masseater.dev/lint-host";

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

export type Frontmatter = Readonly<Record<string, unknown>>;

export interface PackageManifest {
  readonly directory: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface Project {
  readonly exists: (path: string) => boolean;
  readonly under: (directory: string) => readonly string[];
  readonly manifestOf: (file: string) => PackageManifest | undefined;
}

export interface RuleContext {
  readonly filename: string;
  readonly frontmatter: Frontmatter | undefined;
  readonly exists: (path: string) => boolean;
  readonly filesUnder: (directory: string) => readonly string[];
  readonly manifest: PackageManifest | undefined;
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

export type BuiltinPlugin = "agnix";

export interface Plugin {
  readonly rules?: Readonly<Record<string, Rule>>;
  readonly markdownlintRules?: readonly MarkdownlintRule[];
  readonly builtin?: BuiltinPlugin;
}

export interface Override {
  readonly files: readonly string[];
  readonly rules: Readonly<Record<string, RuleEntry>>;
}

export interface Y8Config {
  readonly extends?: readonly Y8Config[];
  readonly plugins?: Readonly<Record<string, Plugin>>;
  readonly rules?: Readonly<Record<string, RuleEntry>>;
  readonly ignores?: readonly string[];
  readonly inlineConfig?: boolean;
  readonly cache?: boolean;
  readonly overrides?: readonly Override[];
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
