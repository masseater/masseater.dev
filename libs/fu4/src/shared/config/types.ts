import type { RuleEntry, RuleOptions, Severity } from "@masseater.dev/lint-host";
import type { Effect, Option } from "effect";

export type { RuleEntry, RuleOptions, Severity } from "@masseater.dev/lint-host";

export interface Position {
  readonly line: number;
  readonly column: number;
}

export type YamlKind = "scalar" | "sequence" | "mapping" | "alias";

export type YamlStyle = "plain" | "single-quoted" | "double-quoted" | "literal" | "folded";

export interface YamlNode {
  readonly id: number;
  readonly kind: YamlKind;
  readonly tag: string;
  readonly value: string;
  readonly style: YamlStyle;
  readonly line: number;
  readonly column: number;
  readonly children: readonly YamlNode[];
}

export interface SyntaxNode {
  readonly id: number;
  readonly type: string;
  readonly named: boolean;
  readonly isError: boolean;
  readonly isMissing: boolean;
  readonly isExtra: boolean;
  readonly start: number;
  readonly end: number;
  readonly field: string | undefined;
  readonly parent: SyntaxNode | undefined;
  readonly children: readonly SyntaxNode[];
  readonly namedChildren: readonly SyntaxNode[];
  readonly text: string;
}

export interface ParseError {
  readonly line: number;
  readonly column: number;
  readonly message: string;
}

export interface Source {
  readonly text: string;
  readonly yaml: YamlNode | undefined;
  readonly syntax: SyntaxNode | undefined;
  readonly errors: readonly ParseError[];
  readonly lines: readonly string[];
  readonly positionOf: (offset: number) => Position;
}

export type InputKind = "workflow" | "action" | "dependabot" | "pre-commit";

export type ScriptLanguage = "bash" | "powershell";

export interface Report {
  readonly message: string;
  readonly line: number;
  readonly column: number;
  readonly length?: number;
  readonly detail?: string;
  readonly rule?: string;
}

export interface Project {
  readonly root: string;
  readonly exists: (path: string) => boolean;
  readonly read: (path: string) => Option.Option<string>;
  readonly parse: (path: string) => Option.Option<Source>;
}

export interface RuleContext {
  readonly filename: string;
  readonly kind: InputKind;
  readonly source: Source;
  readonly options: RuleOptions;
  readonly settings: Readonly<Record<string, unknown>>;
  readonly project: Project;
  readonly parseScript: (language: ScriptLanguage, text: string) => Source;
  readonly report: (report: Report) => void;
}

export interface Rule {
  readonly meta: {
    readonly description: string;
    readonly kinds?: readonly InputKind[];
    readonly docs?: string;
  };
  readonly check: (context: RuleContext) => void | Effect.Effect<void>;
}

export interface Plugin {
  readonly rules: Readonly<Record<string, Rule>>;
}

export interface Override {
  readonly files: readonly string[];
  readonly rules: Readonly<Record<string, RuleEntry>>;
}

export interface Fu4Config {
  readonly extends?: readonly Fu4Config[];
  readonly plugins?: Readonly<Record<string, Plugin>>;
  readonly rules?: Readonly<Record<string, RuleEntry>>;
  readonly settings?: Readonly<Record<string, unknown>>;
  readonly overrides?: readonly Override[];
  readonly ignores?: readonly string[];
}

export interface Diagnostic {
  readonly path: string;
  readonly line: number;
  readonly column: number;
  readonly length?: number;
  readonly rule: string;
  readonly message: string;
  readonly detail?: string;
  readonly severity: Exclude<Severity, "off">;
}
