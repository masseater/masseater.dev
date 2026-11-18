import { Array as Arr, Option, Result, String as Str, pipe } from "effect";

import { matchesPattern, parseExpression, singleTail } from "#/entities/expression-tree/index.ts";
import type { ContextExpr, Spanned } from "#/entities/expression-tree/index.ts";
import type { EnvValue, LoE } from "#/features/audit-workflows/model/common.ts";
import type { Document, Route } from "#/shared/yamlpath/index.ts";
import { offsetInsideComment, queryPretty } from "#/shared/yamlpath/index.ts";

import { displayEnv } from "./common.ts";

const OPEN = "${{";
const CLOSE = "}}";
const QUOTE = "'";
const BRACE = "}";
const START = 0;
const NEXT = 1;
const STATIC_FLAG = 2;

export interface Extracted {
  readonly raw: string;
  readonly fenced: boolean;
}

export interface FencedAt {
  readonly expr: Extracted;
  readonly start: number;
  readonly end: number;
}

export const extracted = (raw: string): Extracted => ({
  raw,
  fenced: Str.startsWith(OPEN)(raw) && Str.endsWith(CLOSE)(raw),
});

export const asBare = (expr: Extracted): string => {
  if (!expr.fenced) {
    return expr.raw;
  }
  return Str.slice(OPEN.length, expr.raw.length - CLOSE.length)(expr.raw);
};

export const parseBare = (raw: string): Option.Option<Spanned> => {
  const bare = asBare(extracted(raw));
  return Result.getSuccess(parseExpression(bare));
};

const charAt =
  (view: string) =>
  (index: number): string =>
    Str.slice(index, index + NEXT)(view);

const closingOf =
  (view: string) =>
  (index: number, inString: boolean): Option.Option<number> => {
    if (index >= view.length) {
      return Option.none();
    }
    const char = charAt(view)(index);
    if (char === QUOTE) {
      return closingOf(view)(index + NEXT, !inString);
    }
    if (!inString && char === BRACE && charAt(view)(index - NEXT) === BRACE) {
      return Option.some(index);
    }
    return closingOf(view)(index + NEXT, inString);
  };

const fencedAt =
  (view: string, offset: number) =>
  (start: number): Option.Option<FencedAt> =>
    pipe(
      closingOf(view)(start, false),
      Option.map((end) => ({
        expr: { raw: Str.slice(start, end + NEXT)(view), fenced: true },
        start: start + offset,
        end: end + offset + NEXT,
      })),
    );

export const extractFenced =
  (text: string) =>
  (offset: number): Option.Option<FencedAt> => {
    const view = Str.slice(offset)(text);
    return pipe(view, Str.indexOf(OPEN), Option.flatMap(fencedAt(view, offset)));
  };

const shifted =
  (bias: number) =>
  (fenced: FencedAt): FencedAt => ({
    expr: fenced.expr,
    start: fenced.start + bias,
    end: fenced.end + bias,
  });

export const extractAllFenced = (text: string): readonly FencedAt[] =>
  Option.match(extractFenced(text)(START), {
    onNone: () => [],
    onSome: (first) => {
      if (first.end >= text.length) {
        return [first];
      }
      return [
        first,
        ...pipe(extractAllFenced(Str.slice(first.end)(text)), Arr.map(shifted(first.end))),
      ];
    },
  });

interface Feature {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

const fencedInFeature =
  (document: Document, feature: Feature) =>
  (offset: number): readonly FencedAt[] =>
    Option.match(extractFenced(feature.text)(offset), {
      onNone: () => [],
      onSome: (next) => {
        const found = shifted(feature.start)(next);
        if (offsetInsideComment(document)(found.start)) {
          return fencedInFeature(document, feature)(next.start + NEXT);
        }
        if (found.end >= feature.end) {
          return [found];
        }
        return [found, ...fencedInFeature(document, feature)(next.end)];
      },
    });

export const fencedInRoute =
  (document: Document) =>
  (route: Route): readonly FencedAt[] =>
    fencedInFeature(document, Result.getOrThrow(queryPretty(document)(route)))(START);

export const DEFAULT_ENVIRONMENT_VARIABLES: readonly (readonly [
  string,
  Option.Option<string>,
  boolean,
])[] = [
  ["CI", Option.none(), false],
  ["GITHUB_ACTION", Option.some("github.action"), true],
  ["GITHUB_ACTION_PATH", Option.some("github.action_path"), true],
  ["GITHUB_ACTION_REPOSITORY", Option.some("github.action_repository"), true],
  ["GITHUB_ACTIONS", Option.none(), true],
  ["GITHUB_ACTOR", Option.some("github.actor"), true],
  ["GITHUB_ACTOR_ID", Option.some("github.actor_id"), true],
  ["GITHUB_API_URL", Option.some("github.api_url"), true],
  ["GITHUB_BASE_REF", Option.some("github.base_ref"), true],
  ["GITHUB_ENV", Option.some("github.env"), true],
  ["GITHUB_EVENT_NAME", Option.some("github.event_name"), true],
  ["GITHUB_EVENT_PATH", Option.some("github.event_path"), true],
  ["GITHUB_GRAPHQL_URL", Option.some("github.graphql_url"), true],
  ["GITHUB_HEAD_REF", Option.some("github.head_ref"), true],
  ["GITHUB_JOB", Option.some("github.job"), true],
  ["GITHUB_OUTPUT", Option.none(), true],
  ["GITHUB_PATH", Option.some("github.path"), true],
  ["GITHUB_REF", Option.some("github.ref"), true],
  ["GITHUB_REF_NAME", Option.some("github.ref_name"), true],
  ["GITHUB_REF_PROTECTED", Option.some("github.ref_protected"), true],
  ["GITHUB_REF_TYPE", Option.some("github.ref_type"), true],
  ["GITHUB_REPOSITORY", Option.some("github.repository"), true],
  ["GITHUB_REPOSITORY_ID", Option.some("github.repository_id"), true],
  ["GITHUB_REPOSITORY_OWNER", Option.some("github.repository_owner"), true],
  ["GITHUB_REPOSITORY_OWNER_ID", Option.some("github.repository_owner_id"), true],
  ["GITHUB_RUN_ATTEMPT", Option.some("github.run_attempt"), true],
  ["GITHUB_RUN_ID", Option.some("github.run_id"), true],
  ["GITHUB_RUN_NUMBER", Option.some("github.run_number"), true],
  ["GITHUB_SERVER_URL", Option.some("github.server_url"), true],
  ["GITHUB_SHA", Option.some("github.sha"), true],
  ["GITHUB_TRIGGERING_ACTOR", Option.some("github.triggering_actor"), true],
  ["GITHUB_WORKFLOW", Option.some("github.workflow"), true],
  ["GITHUB_WORKFLOW_REF", Option.some("github.workflow_ref"), true],
  ["GITHUB_WORKFLOW_SHA", Option.some("github.workflow_sha"), true],
  ["GITHUB_WORKSPACE", Option.some("github.workspace"), true],
  ["RUNNER_ARCH", Option.some("runner.arch"), true],
  ["RUNNER_DEBUG", Option.some("runner.debug"), true],
  ["RUNNER_ENVIRONMENT", Option.some("runner.environment"), true],
  ["RUNNER_NAME", Option.some("runner.name"), true],
  ["RUNNER_OS", Option.some("runner.os"), true],
  ["RUNNER_TEMP", Option.some("runner.temp"), true],
  ["RUNNER_TOOL_CACHE", Option.some("runner.tool_cache"), true],
];

const staticIn =
  (name: string) =>
  (env: LoE<ReadonlyMap<string, EnvValue>>): Option.Option<boolean> => {
    if (env.type === "expr") {
      return Option.some(false);
    }
    return pipe(
      Option.fromNullishOr(env.value.get(name)),
      Option.map((value) => Arr.isReadonlyArrayEmpty(extractAllFenced(displayEnv(value)))),
    );
  };

const envLookup =
  (envs: readonly LoE<ReadonlyMap<string, EnvValue>>[]) =>
  (name: string): boolean =>
    pipe(
      envs,
      Arr.findFirst(staticIn(name)),
      Option.getOrElse(() => false),
    );

export const envIsStatic =
  (context: ContextExpr) =>
  (envs: readonly LoE<ReadonlyMap<string, EnvValue>>[]): boolean =>
    pipe(
      DEFAULT_ENVIRONMENT_VARIABLES,
      Arr.findFirst(([name]) => matchesPattern(`env.${name}`)(context)),
      Option.match({
        onNone: () => pipe(singleTail(context), Option.exists(envLookup(envs))),
        onSome: (entry) => entry[STATIC_FLAG],
      }),
    );
