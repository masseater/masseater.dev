import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { fieldOf } from "#/shared/syntax/index.ts";

import type { Analysis, Execute } from "./analysis.ts";
import { appendAll, integerKey, isInteger, setAll, setStatus, statusOf } from "./scope.ts";
import type { Scope, Status } from "./scope.ts";
import { valueStatus } from "./values.ts";

const LOCAL_KEYWORDS = new Set(["local", "declare", "typeset"]);
const FLAG = 1;

interface Assignment {
  readonly node: SyntaxNode;
  readonly integer: boolean;
}

interface Target {
  readonly name: string;
  readonly subscript: boolean;
}

const isAppend = (node: SyntaxNode): boolean =>
  pipe(
    node.children,
    Arr.some((child) => !child.named && child.type === "+="),
  );

const targetOf = (node: SyntaxNode): Option.Option<Target> =>
  pipe(
    fieldOf("name")(node),
    Option.flatMap((name) => {
      if (name.type === "subscript") {
        return pipe(
          fieldOf("name")(name),
          Option.map((found): Target => ({ name: found.text, subscript: true })),
        );
      }
      return Option.some({ name: name.text, subscript: false });
    }),
  );

const assignedStatus = (scope: Scope, { node, integer }: Assignment, name: string): Status => {
  if (integer || isInteger(name)(scope)) {
    return "clean";
  }
  return Option.match(fieldOf("value")(node), {
    onNone: (): Status => "empty",
    onSome: valueStatus(scope),
  });
};

const nextStatus = (scope: Scope, assignment: Assignment, target: Target): Status => {
  if (target.subscript) {
    return "dirty";
  }
  const status = assignedStatus(scope, assignment, target.name);
  if (isAppend(assignment.node)) {
    return appendAll([statusOf(target.name)(scope), status]);
  }
  return status;
};

const assign = (
  analysis: Analysis,
  flow: Option.Option<Scope>,
  assignment: Assignment,
): Option.Option<Scope> => {
  for (const found of Option.toArray(fieldOf("value")(assignment.node))) {
    analysis.scan(flow, found);
  }
  return pipe(
    Option.all({ scope: flow, target: targetOf(assignment.node) }),
    Option.match({
      onNone: () => flow,
      onSome: ({ scope, target }) =>
        setStatus({ name: target.name, status: nextStatus(scope, assignment, target) })(flow),
    }),
  );
};

const flagsOf =
  (prefix: string) =>
  (node: SyntaxNode): string =>
    pipe(
      node.namedChildren,
      Arr.filter((child) => child.type === "word" && Str.startsWith(prefix)(child.text)),
      Arr.map((child) => Str.slice(FLAG)(child.text)),
      Arr.join(""),
    );

const declaredName = (child: SyntaxNode): Option.Option<string> => {
  if (child.type === "variable_name") {
    return Option.some(child.text);
  }
  if (child.type === "variable_assignment") {
    return pipe(
      fieldOf("name")(child),
      Option.map((named) => named.text),
    );
  }
  return Option.none();
};

interface Declaration {
  readonly integer: boolean;
  readonly local: boolean;
}

const declarationOf = (node: SyntaxNode): Declaration => {
  const flags = flagsOf("-")(node);
  const keyword = pipe(
    Arr.head(node.children),
    Option.map((child) => child.text),
    Option.getOrElse(() => ""),
  );
  return {
    integer: Str.includes("i")(flags),
    local: LOCAL_KEYWORDS.has(keyword) && !Str.includes("g")(flags),
  };
};

const integerStatus = (node: SyntaxNode, integer: boolean): Option.Option<Status> => {
  if (integer) {
    return Option.some("clean");
  }
  if (Str.includes("i")(flagsOf("+")(node))) {
    return Option.some("dirty");
  }
  return Option.none();
};

const declaredStatus = (
  analysis: Analysis,
  { integer, local }: Declaration,
): Option.Option<Status> => {
  if (integer) {
    return Option.some("clean");
  }
  if (local && analysis.inFunction()) {
    return Option.some("empty");
  }
  return Option.none();
};

type Step = (flow: Option.Option<Scope>) => Option.Option<Scope>;

const declareChild = (analysis: Analysis, declaration: Declaration, child: SyntaxNode): Step => {
  if (declaration.local) {
    for (const found of Option.toArray(declaredName(child))) {
      analysis.addLocal(found);
      analysis.addLocal(integerKey(found));
    }
  }
  if (child.type === "variable_assignment") {
    return (flow) => assign(analysis, flow, { node: child, integer: declaration.integer });
  }
  if (child.type === "variable_name") {
    return (flow) =>
      pipe(
        declaredStatus(analysis, declaration),
        Option.match({
          onNone: () => flow,
          onSome: (status) => setStatus({ name: child.text, status })(flow),
        }),
      );
  }
  return (flow) => {
    analysis.scan(flow, child);
    return flow;
  };
};

const declare: Execute = (analysis, flow, node) => {
  const declaration = declarationOf(node);
  const names = pipe(
    node.namedChildren,
    Arr.flatMap((child) => Option.toArray(declaredName(child))),
  );
  let current = pipe(
    integerStatus(node, declaration.integer),
    Option.match({
      onNone: () => flow,
      onSome: (status) =>
        setAll(
          pipe(
            names,
            Arr.map((name) => ({ name: integerKey(name), status })),
          ),
        )(flow),
    }),
  );
  for (const child of node.namedChildren) {
    current = declareChild(analysis, declaration, child)(current);
  }
  return current;
};

export const ASSIGN_HANDLERS: ReadonlyMap<string, Execute> = new Map<string, Execute>([
  [
    "variable_assignment",
    (analysis, flow, node): ReturnType<Execute> => assign(analysis, flow, { node, integer: false }),
  ],
  ["declaration_command", declare],
]);
