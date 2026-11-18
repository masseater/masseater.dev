import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import type { Expr, ExprError, Token } from "#/entities/expression/model/ast.ts";
import { quote, sortedQuotes } from "#/shared/text/index.ts";

import { ROOTS, childOf, elementsOf, isLeaf } from "./input-tree.ts";
import type { InputNode } from "./input-tree.ts";

export interface Untrusted {
  readonly enter: (expr: Expr) => void;
  readonly leave: (expr: Expr) => void;
  readonly finish: () => readonly ExprError[];
}

interface Walk {
  readonly filtering: boolean;
  readonly cur: readonly InputNode[];
  readonly start: Option.Option<Token>;
}

interface Stepped {
  readonly walk: Walk;
  readonly error: Option.Option<ExprError>;
}

const ADVICE =
  "see https://docs.github.com/en/actions/reference/security/secure-use#good-practices-for-mitigating-script-injection-attacks for more details";
const SAFE = new Set(["contains", "startswith", "endswith"]);
const STEP = 1;
const NONE = 0;
const SINGLE = 1;
const IDLE: Walk = { filtering: false, cur: [], start: Option.none() };

const isSafeCall = (expr: Expr): boolean =>
  expr.type === "call" && SAFE.has(Str.toLowerCase(expr.callee));

const messageOf = (inputs: readonly string[]): string => {
  if (inputs.length === SINGLE) {
    return `${quote(Arr.join(inputs, ""))} is potentially untrusted. avoid using it directly in inline scripts. instead, pass it through an environment variable. ${ADVICE}`;
  }
  return `object filter extracts potentially untrusted properties ${sortedQuotes(inputs)}. avoid using the value directly in inline scripts. instead, pass the value through an environment variable. ${ADVICE}`;
};

const ended = (walk: Walk): Option.Option<ExprError> => {
  const inputs = pipe(
    walk.cur,
    Arr.filter(isLeaf),
    Arr.map((node) => node.path),
  );
  return pipe(
    walk.start,
    Option.filter(() => Arr.isReadonlyArrayNonEmpty(inputs)),
    Option.map((token) => ({ message: messageOf(inputs), line: token.line, column: token.column })),
  );
};

const end = (walk: Walk): Stepped => ({ walk: IDLE, error: ended(walk) });
const moved = (walk: Walk): Stepped => ({ walk, error: Option.none() });

const onProp = (walk: Walk, name: string): Stepped =>
  moved({
    ...walk,
    cur: pipe(
      walk.cur,
      Arr.flatMap((node) => Option.toArray(childOf(name)(node))),
    ),
  });

const onIndex = (walk: Walk, index: Expr): Stepped => {
  if (index.type === "string") {
    return onProp(walk, index.value);
  }
  if (walk.filtering) {
    return moved({ ...walk, filtering: false });
  }
  return onProp(walk, "*");
};

const onVariable = (walk: Walk, name: string, token: Token): Stepped => {
  const { error } = end(walk);
  const started = Option.match(Rec.get(ROOTS, name), {
    onNone: () => IDLE,
    onSome: (root): Walk => ({ ...IDLE, start: Option.some(token), cur: [root] }),
  });
  return { walk: started, error };
};

const onFilter = (walk: Walk): Stepped =>
  moved({
    ...walk,
    filtering: true,
    cur: pipe(
      walk.cur,
      Arr.flatMap((node) => elementsOf(node)),
    ),
  });

const step = (walk: Walk, expr: Expr): Stepped => {
  if (expr.type === "variable") {
    return onVariable(walk, expr.name, expr.token);
  }
  if (expr.type === "object-deref") {
    return onProp(walk, expr.property);
  }
  if (expr.type === "index") {
    return onIndex(walk, expr.index);
  }
  if (expr.type === "array-deref") {
    return onFilter(walk);
  }
  return end(walk);
};

export const untrusted = (): Untrusted => {
  const errors: ExprError[] = [];
  let walk = IDLE;
  let safeCalls = NONE;
  const record = (stepped: Stepped): void => {
    ({ walk } = stepped);
    errors.push(...Option.toArray(stepped.error));
  };
  return {
    enter: (expr) => {
      if (isSafeCall(expr)) {
        safeCalls += STEP;
      }
    },
    leave: (expr) => {
      if (safeCalls === NONE) {
        record(step(walk, expr));
      } else if (isSafeCall(expr)) {
        safeCalls -= STEP;
      }
    },
    finish: () => {
      record(end(walk));
      return errors;
    },
  };
};
