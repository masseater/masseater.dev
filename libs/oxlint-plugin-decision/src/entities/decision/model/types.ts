import type { Context, ESTree, Location, Range } from "@oxlint/plugins";

import type { DecisionModel } from "./models.ts";
import type {
  CiBehaviorSchema,
  EnclosingKindSchema,
  ExplainSettingSchema,
  RuleAnswerSchema,
  RuleContextSchema,
  SeveritySchema,
  TargetSchema,
} from "./schema.ts";

export type Frozen<Value> = Value extends (...args: never) => unknown
  ? Value
  : Value extends object
    ? { readonly [Key in keyof Value]: Frozen<Value[Key]> }
    : Value;

export type SelectedNode = Frozen<ESTree.Node>;

export interface SelectMatch {
  readonly name: string | undefined;
  readonly context: Context;
}

export type Target = typeof TargetSchema.Type;

export type CiBehavior = typeof CiBehaviorSchema.Type;

export type ModelSpec = DecisionModel | readonly DecisionModel[];

export type ExplainSetting = typeof ExplainSettingSchema.Type;

export interface RuleLocation {
  readonly question: string;
  readonly cutoff: number;
}

export type EnclosingKind = typeof EnclosingKindSchema.Type;

export type RuleContext = typeof RuleContextSchema.Type;

export type Severity = typeof SeveritySchema.Type;

export type RuleAnswer = typeof RuleAnswerSchema.Type;

export interface DecisionRule {
  readonly id: string;
  readonly target: Target;
  readonly question: string;
  readonly cutoff: number;
  readonly message?: string;
  readonly select?: (node: SelectedNode, match: SelectMatch) => boolean;
  readonly location?: RuleLocation;
  readonly model?: ModelSpec;
  readonly context?: RuleContext;
  readonly answer?: RuleAnswer;
}

export interface DecisionOptions {
  readonly ci?: CiBehavior;
  readonly timeoutMs?: number;
  readonly maxSnippetChars?: number;
  readonly model?: ModelSpec;
  readonly env?: Readonly<Record<string, string>>;
  readonly explain?: ExplainSetting;
}

export interface NoulQuestion {
  readonly type: "noul";
  readonly instructions: string;
}

export interface ChoiceQuestion {
  readonly type: "choice";
  readonly instructions: string;
  readonly criteria: Readonly<Record<string, string | null>>;
}

export type Question = NoulQuestion | ChoiceQuestion;

export interface DecisionRequest {
  readonly model: string;
  readonly state: {
    readonly snippets: Readonly<Record<string, string>>;
    readonly contexts?: Readonly<Record<string, string>>;
  };
  readonly questions: Readonly<Record<string, Question>>;
}

export interface NoulAnswer {
  readonly type: "noul";
  readonly noul: number;
}

export interface ChoiceAnswer {
  readonly type: "choice";
  readonly choice: string;
  readonly probabilities?: Readonly<Record<string, number>> | undefined;
}

export type Answer = NoulAnswer | ChoiceAnswer;

export type Answers = Readonly<Record<string, Answer>>;

export interface DecisionResponse {
  readonly model: string;
  readonly answers: Answers;
}

export type DecideResult =
  | { readonly ok: true; readonly response: DecisionResponse; readonly cached?: boolean }
  | { readonly ok: false; readonly reason: string };

export interface DecideInput {
  readonly request: DecisionRequest;
  readonly timeoutMs: number;
  readonly env: Readonly<Record<string, string>>;
}

export interface DecisionProvider {
  readonly name: string;
  readonly requiredEnv: readonly string[];
  readonly models: RegExp;
  readonly decide: (input: DecideInput) => DecideResult;
  readonly decideAll: (inputs: readonly DecideInput[]) => readonly DecideResult[];
}

export interface DecisionPluginSetup extends DecisionOptions {
  readonly name?: string;
  readonly rules: readonly DecisionRule[];
}

export interface DecisionPlugin {
  readonly meta: { readonly name: string };
  readonly rules: Readonly<Record<string, object>>;
}

export interface ModelRef {
  readonly id: string;
  readonly provider: DecisionProvider;
  readonly model: string;
}

export interface ResolvedRule extends DecisionRule {
  readonly models: readonly ModelRef[];
  readonly answer: RuleAnswer;
}

export interface ResolvedOptions {
  readonly ci: CiBehavior;
  readonly timeoutMs: number;
  readonly maxSnippetChars: number;
  readonly env: Readonly<Record<string, string>>;
  readonly explain: ExplainSetting;
  readonly rules: readonly ResolvedRule[];
}

export interface RequestMatch {
  readonly rule: Pick<ResolvedRule, "question" | "location" | "answer">;
  readonly snippet: string;
  readonly truncated: boolean;
  readonly context?: string;
}

export interface Match extends RequestMatch {
  readonly rule: ResolvedRule;
  readonly loc: Location;
}

export interface Verdict {
  readonly answer: string;
  readonly probability: number;
}

export interface Verdicts {
  readonly model: string;
  readonly results: Readonly<Record<string, Verdict>>;
  readonly answers: Answers;
  readonly complete: boolean;
}

export interface LineRange {
  readonly start: number;
  readonly end: number;
}

export interface AstNode {
  readonly type: string;
  readonly range: Range;
  readonly loc: Location;
  readonly parent?: AstNode | null;
  readonly init?: unknown;
  readonly value?: unknown;
  readonly id?: AstNode | null;
  readonly key?: AstNode;
  readonly callee?: AstNode;
  readonly openingElement?: { readonly loc: Location; readonly name?: AstNode } | null;
}
