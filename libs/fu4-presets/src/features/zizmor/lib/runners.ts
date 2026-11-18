import { Array as Arr, Match, Option, String as Str, pipe } from "effect";

import { childOf, leafExpressions, matchesPattern } from "#/entities/expression-tree/index.ts";
import type { ContextExpr, Literal, Spanned } from "#/entities/expression-tree/index.ts";
import type { SymbolicLocation } from "#/features/zizmor/model/finding.ts";
import type { NormalJob } from "#/features/zizmor/model/input.ts";
import hosted from "#/shared/data/zizmor/github-hosted-runners.json" with { type: "json" };

import { asBare, extracted, parseBare } from "./expressions.ts";
import { isStaticExpansion } from "./matrix.ts";
import { jobLocation, matrixOf } from "./workflow.ts";

const HOSTED: ReadonlySet<string> = new Set(hosted);

export type RunnerEvidence = "classic-sentinel" | "runner-group" | "explicitly-flagged";

export type Runner =
  | { readonly type: "github-owned" }
  | { readonly type: "third-party" }
  | {
      readonly type: "self-hosted";
      readonly location: SymbolicLocation;
      readonly evidence: RunnerEvidence;
      readonly fromMatrix: boolean;
    }
  | {
      readonly type: "indeterminate";
      readonly location: SymbolicLocation;
      readonly selfHostedEvidence: boolean;
      readonly fromMatrix: boolean;
    };

export interface RunnerPolicy {
  readonly denyRunners: ReadonlySet<string>;
  readonly allowGroups: ReadonlySet<string>;
}

interface Scope {
  readonly job: NormalJob;
  readonly policy: RunnerPolicy;
  readonly fromMatrix: boolean;
}

type Expanded = readonly [boolean, string];

const sameText =
  (left: string) =>
  (right: string): boolean =>
    Str.toLowerCase(left) === Str.toLowerCase(right);

const selfHosted =
  (evidence: RunnerEvidence) =>
  ({ job, fromMatrix }: Scope): Runner => ({
    type: "self-hosted",
    location: jobLocation(job),
    evidence,
    fromMatrix,
  });

const evaluateRunner =
  (scope: Scope) =>
  (label: string): Runner => {
    if (pipe(Arr.fromIterable(scope.policy.denyRunners), Arr.some(sameText(label)))) {
      return selfHosted("explicitly-flagged")(scope);
    }
    if (HOSTED.has(label)) {
      return { type: "github-owned" };
    }
    return { type: "third-party" };
  };

const selfHostedEvidence =
  (policy: RunnerPolicy) =>
  (input: string): boolean =>
    Str.includes("self-hosted")(Str.toLowerCase(input)) ||
    pipe(
      Arr.fromIterable(policy.denyRunners),
      Arr.some((runner) => Str.includes(runner)(input)),
    );

const indeterminate =
  ({ job, fromMatrix }: Scope) =>
  (evidence: boolean): Runner => ({
    type: "indeterminate",
    location: jobLocation(job),
    selfHostedEvidence: evidence,
    fromMatrix,
  });

const literalText: (literal: Literal) => string = Match.type<Literal>().pipe(
  Match.discriminatorsExhaustive("kind")({
    string: (literal) => literal.value,
    null: () => "null",
    number: (literal) => String(literal.value),
    boolean: (literal) => String(literal.value),
  }),
);

const isMatrix = childOf("matrix");

const matrixRunners =
  (scope: Scope) =>
  (expanded: readonly Expanded[]): readonly Runner[] => {
    const statics = pipe(
      expanded,
      Arr.filter(([isStatic]) => isStatic),
      Arr.map(([, value]) => value),
    );
    if (pipe(statics, Arr.some(sameText("self-hosted")))) {
      return [selfHosted("classic-sentinel")(scope)];
    }
    if (pipe(statics, Arr.some(selfHostedEvidence(scope.policy)))) {
      return [indeterminate(scope)(true)];
    }
    return pipe(
      expanded,
      Arr.map(([isStatic, value]) => {
        if (isStatic) {
          return evaluateRunner(scope)(value);
        }
        return indeterminate(scope)(false);
      }),
    );
  };

const fromMatrix =
  (scope: Scope) =>
  (context: ContextExpr): readonly Runner[] =>
    Option.match(matrixOf(scope.job), {
      onNone: () => [indeterminate({ ...scope, fromMatrix: false })(false)],
      onSome: (matrix) =>
        pipe(
          matrix.expansions,
          Arr.filter((expansion) => matchesPattern(expansion.path)(context)),
          Arr.map((expansion): Expanded => [isStaticExpansion(expansion), expansion.value]),
          matrixRunners({ ...scope, fromMatrix: true }),
        ),
    });

const expand =
  (scope: Scope) =>
  (leaf: Spanned): readonly Runner[] => {
    const { expr } = leaf;
    if (expr.type === "literal") {
      return [evaluateRunner(scope)(literalText(expr.literal))];
    }
    if (expr.type === "context" && isMatrix(expr)) {
      return fromMatrix(scope)(expr);
    }
    return [indeterminate(scope)(selfHostedEvidence(scope.policy)(leaf.origin.raw))];
  };

const groupRunners =
  (scope: Scope) =>
  (group: string): readonly Runner[] => {
    if (pipe(Arr.fromIterable(scope.policy.allowGroups), Arr.some(sameText(group)))) {
      return [{ type: "github-owned" }];
    }
    return [selfHosted("runner-group")(scope)];
  };

const opaqueRunner =
  (scope: Scope) =>
  (bare: string): Runner => {
    const evidence = selfHostedEvidence(scope.policy)(bare);
    return indeterminate(scope)(evidence);
  };

const expressionRunners =
  (scope: Scope) =>
  (raw: string): readonly Runner[] =>
    Option.match(parseBare(raw), {
      onNone: () => [opaqueRunner(scope)(asBare(extracted(raw)))],
      onSome: (parsed) => pipe(leafExpressions(parsed), Arr.flatMap(expand(scope))),
    });

export const runnersOf =
  (job: NormalJob) =>
  (policy: RunnerPolicy): readonly Runner[] => {
    const scope: Scope = { job, policy, fromMatrix: false };
    const { runsOn } = job.model;
    if (runsOn.type === "expr") {
      return expressionRunners(scope)(runsOn.raw);
    }
    const { value } = runsOn;
    if (value.type !== "target") {
      return Option.match(value.group, { onNone: () => [], onSome: groupRunners(scope) });
    }
    if (pipe(value.labels, Arr.some(sameText("self-hosted")))) {
      return [selfHosted("classic-sentinel")(scope)];
    }
    return pipe(value.labels, Arr.map(evaluateRunner(scope)));
  };
