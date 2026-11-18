import type { Position } from "@r_masseater/fu4";
import { Array as Arr, Option, Result, String as Str } from "effect";

import { checkerOf, parse } from "#/entities/expression/index.ts";
import type { Checker, ExprType } from "#/entities/expression/index.ts";
import type { Expr, ExprError } from "#/entities/expression/model/ast.ts";
import type { Text } from "#/shared/yaml/index.ts";

import type { ExprEnv, Typed, Vars } from "./env.ts";

const OPEN = "${{";
const BASE = 1;
const NONE = 0;

export interface Site {
  readonly untrusted: boolean;
  readonly key: string;
}

export const report =
  (env: ExprEnv) =>
  (at: Position) =>
  (error: ExprError): void => {
    env.fail(
      { line: error.line + at.line - BASE, column: error.column + at.column - BASE },
      error.message,
    );
  };

const prepare = (checker: Checker, vars: Vars): void => {
  for (const [name, type] of [
    ["matrix", vars.matrix],
    ["steps", vars.steps],
    ["needs", vars.needs],
    ["jobs", vars.jobs],
  ] as const) {
    for (const found of Option.toArray(type)) {
      checker.setVar(name, found);
    }
  }
  for (const found of Option.toArray(vars.secrets)) {
    checker.updateSecrets(found);
  }
  for (const found of Option.toArray(vars.inputs)) {
    checker.updateInputs(found);
  }
  for (const found of Option.toArray(vars.dispatchInputs)) {
    checker.updateDispatchInputs(found);
  }
};

export const checkNode =
  (env: ExprEnv) =>
  (site: Site) =>
  (expr: Expr, at: Position): Option.Option<ExprType> => {
    const checker = checkerOf({ untrusted: site.untrusted, configVars: env.configVars });
    prepare(checker, env.vars());
    if (Str.isNonEmpty(site.key)) {
      checker.setWorkflowKey(site.key);
    }
    const checked = checker.check(expr);
    for (const error of checked.errors) {
      report(env)(at)(error);
    }
    return Option.liftPredicate(checked.type, () => Arr.isReadonlyArrayEmpty(checked.errors));
  };

export interface Semantics {
  readonly type: Option.Option<ExprType>;
  readonly offset: number;
}

export const checkSource =
  (env: ExprEnv) =>
  (site: Site) =>
  (source: string, at: Position): Semantics => {
    const parsed = parse(source);
    if (Result.isFailure(parsed.result)) {
      report(env)(at)(parsed.result.failure);
      return { type: Option.none(), offset: parsed.offset };
    }
    return { type: checkNode(env)(site)(parsed.result.success, at), offset: parsed.offset };
  };

const startColumn = (text: Text): number => text.column + Number(text.quoted);

interface Cursor {
  readonly rest: string;
  readonly offset: number;
}

type Scanned =
  | { readonly kind: "end" }
  | { readonly kind: "invalid" }
  | { readonly kind: "empty" }
  | { readonly kind: "typed"; readonly typed: Typed; readonly cursor: Cursor };

interface Scan {
  readonly env: ExprEnv;
  readonly site: Site;
  readonly text: Text;
}

const START: Cursor = { rest: "", offset: NONE };

const scanAt = ({ env, site, text }: Scan, cursor: Cursor, start: number): Scanned => {
  const rest = Str.slice(start)(cursor.rest);
  const offset = cursor.offset + start;
  const column = startColumn(text) + offset;
  const checked = checkSource(env)(site)(rest, { line: text.line, column });
  if (Option.isNone(checked.type)) {
    return { kind: "invalid" };
  }
  if (checked.offset === NONE) {
    return { kind: "empty" };
  }
  return {
    kind: "typed",
    typed: { type: checked.type.value, line: text.line, column: column - OPEN.length },
    cursor: { rest: Str.slice(checked.offset)(rest), offset: offset + checked.offset },
  };
};

const scanNext =
  (scan: Scan) =>
  (cursor: Cursor): Scanned =>
    Option.match(Str.indexOf(OPEN)(cursor.rest), {
      onNone: (): Scanned => ({ kind: "end" }),
      onSome: (index) => scanAt(scan, cursor, index + OPEN.length),
    });

const finish = (scanned: Scanned, typed: readonly Typed[]): Option.Option<readonly Typed[]> => {
  if (scanned.kind === "invalid") {
    return Option.none();
  }
  if (scanned.kind === "empty") {
    return Option.some([]);
  }
  return Option.some(typed);
};

export const checkExprsIn =
  (env: ExprEnv) =>
  (site: Site) =>
  (text: Text): Option.Option<readonly Typed[]> => {
    const advance = scanNext({ env, site, text });
    const typed: Typed[] = [];
    let scanned = advance({ ...START, rest: text.value });
    while (scanned.kind === "typed") {
      typed.push(scanned.typed);
      scanned = advance(scanned.cursor);
    }
    return finish(scanned, typed);
  };
