import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { fieldOf } from "#/shared/syntax/index.ts";

import { findingAt, report } from "./finding.ts";
import type { State } from "./finding.ts";
import { ancestors, parentOf, sameNode } from "./node.ts";

const NAMED = new Set(["variable_assignment", "subscript"]);

const isExported = (node: SyntaxNode): boolean =>
  Option.exists(
    parentOf(node),
    (parent) =>
      parent.type === "command" ||
      (parent.type === "declaration_command" && !Str.startsWith("local")(parent.text)),
  );

const assignedName = (node: SyntaxNode): Option.Option<string> =>
  pipe(
    fieldOf("name")(node),
    Option.map((name) => {
      if (name.type === "subscript") {
        return Option.getOrElse(fieldOf("name")(name), () => name);
      }
      return name;
    }),
    Option.map((name) => name.text),
    Option.filter((name) => !Str.startsWith("_")(name)),
  );

export const checkAssignment =
  (state: State) =>
  (node: SyntaxNode): void => {
    if (isExported(node)) {
      return;
    }
    for (const name of Option.toArray(assignedName(node))) {
      state.assign(findingAt({ state, code: "unusedVariable" })(node, name));
    }
  };

const isAssignedName = (node: SyntaxNode): boolean =>
  Option.exists(
    parentOf(node),
    (parent) =>
      NAMED.has(parent.type) &&
      Option.exists(fieldOf("name")(parent), sameNode(node)) &&
      (parent.type === "variable_assignment" ||
        Option.exists(parentOf(parent), (grand) => grand.type === "variable_assignment")),
  );

export const checkName =
  (state: State) =>
  (node: SyntaxNode): void => {
    if (!isAssignedName(node)) {
      state.use(node.text);
    }
  };

export const checkDeclaration =
  (state: State) =>
  (node: SyntaxNode): void => {
    const inFunction = pipe(
      ancestors(node),
      Arr.some((parent) => parent.type === "function_definition"),
    );
    if (Str.startsWith("local")(node.text) && !inFunction) {
      report({ state, code: "localOutsideFunction" })(node);
    }
  };
