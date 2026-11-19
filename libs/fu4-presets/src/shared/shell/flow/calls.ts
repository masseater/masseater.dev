import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, pipe } from "effect";

import { commandNameOf } from "#/shared/shell/command-name.ts";
import { commandWrites } from "#/shared/shell/writes.ts";
import { fieldOf } from "#/shared/syntax/index.ts";

import type { Analysis, Execute } from "./analysis.ts";
import { functionKey, joinAll, scopeOf, setAll, setStatus, statusOf } from "./scope.ts";
import type { Change, Scope, Status } from "./scope.ts";

interface Callee {
  readonly name: string;
  readonly body: SyntaxNode;
}

const restore = (before: Scope, locals: ReadonlySet<string>, after: Scope): Scope => {
  const statuses = new Map(after.statuses);
  for (const local of locals) {
    const previous = Option.fromNullishOr(before.statuses.get(local));
    if (Option.isSome(previous)) {
      statuses.set(local, previous.value);
    } else {
      statuses.delete(local);
    }
  }
  return { statuses };
};

const callFunction = (
  analysis: Analysis,
  flow: Option.Option<Scope>,
  { name, body }: Callee,
): Option.Option<Scope> => {
  analysis.enter(name);
  const after = analysis.exec(flow, body);
  const locals = analysis.leave(name);
  return pipe(
    after,
    Option.map((scope) => restore(scopeOf(flow), locals, scope)),
  );
};

const call = (analysis: Analysis, flow: Option.Option<Scope>, name: string): Option.Option<Scope> =>
  pipe(
    analysis.bodyOf(name),
    Option.filter(() => !analysis.isCalling(name)),
    Option.match({
      onNone: () => flow,
      onSome: (body) => {
        const called = callFunction(analysis, flow, { name, body });
        if (Option.exists(flow, (scope) => statusOf(functionKey(name))(scope) === "clean")) {
          return called;
        }
        return joinAll([flow, called]);
      },
    }),
  );

const isAssignmentOnly = (node: SyntaxNode): boolean =>
  pipe(
    fieldOf("name")(node),
    Option.exists((name) =>
      pipe(
        name.children,
        Arr.some((child) => child.isMissing),
      ),
    ),
  );

const writeStatus = (integer: boolean): Status => {
  if (integer) {
    return "clean";
  }
  return "dirty";
};

const command: Execute = (analysis, flow, node) => {
  if (isAssignmentOnly(node)) {
    return analysis.block(
      flow,
      pipe(
        node.namedChildren,
        Arr.filter((child) => child.type === "variable_assignment"),
      ),
    );
  }
  analysis.scan(flow, node);
  const name = Option.getOrElse(commandNameOf(node), () => "");
  if (name === "exit") {
    return Option.none();
  }
  const changes = pipe(
    commandWrites(node),
    Arr.map((write): Change => ({ name: write.name, status: writeStatus(write.integer) })),
  );
  return call(analysis, setAll(changes)(flow), name);
};

const defineFunction: Execute = (analysis, flow, node) => {
  const name = pipe(
    fieldOf("name")(node),
    Option.map((found) => found.text),
    Option.getOrElse(() => ""),
  );
  for (const body of Option.toArray(fieldOf("body")(node))) {
    analysis.define(name, body);
    callFunction(analysis, flow, { name, body });
  }
  return setStatus({ name: functionKey(name), status: "clean" })(flow);
};

export const CALL_HANDLERS: ReadonlyMap<string, Execute> = new Map<string, Execute>([
  ["command", command],
  ["function_definition", defineFunction],
]);
