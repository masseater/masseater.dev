import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { fieldOf } from "#/shared/syntax/index.ts";

import { findingAt, report } from "./finding.ts";
import type { State } from "./finding.ts";
import { INTERNAL_VARIABLES } from "./internal-variables.ts";
import { ancestors, parentOf, sameNode } from "./node.ts";
import { commandWrites, descriptorOf } from "./writes.ts";

const NAMED = new Set(["variable_assignment", "subscript"]);
const FLAG = 1;

const declarationKeyword = (node: SyntaxNode): string =>
  pipe(
    Arr.head(node.children),
    Option.map((child) => child.text),
    Option.getOrElse(() => ""),
  );

const declarationFlags = (node: SyntaxNode): string =>
  pipe(
    node.namedChildren,
    Arr.filter((child) => child.type === "word" && Str.startsWith("-")(child.text)),
    Arr.map((child) => Str.slice(FLAG)(child.text)),
    Arr.join(""),
  );

const isAssignmentOnly = (command: SyntaxNode): boolean =>
  Option.exists(fieldOf("name")(command), (name) =>
    pipe(
      name.children,
      Arr.some((child) => child.isMissing),
    ),
  );

const isExportingDeclaration = (node: SyntaxNode): boolean =>
  declarationKeyword(node) === "export" || Str.includes("x")(declarationFlags(node));

const isExported = (node: SyntaxNode): boolean =>
  Option.exists(
    parentOf(node),
    (parent) =>
      (parent.type === "command" && !isAssignmentOnly(parent)) ||
      (parent.type === "declaration_command" && isExportingDeclaration(parent)),
  );

const isAppending = (node: SyntaxNode): boolean =>
  pipe(
    node.children,
    Arr.some((child) => !child.named && child.type === "+="),
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
    if (isAppending(node)) {
      for (const name of Option.toArray(assignedName(node))) {
        state.use(name);
      }
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

const isLoopVariable = (node: SyntaxNode): boolean =>
  node.field === "variable" &&
  Option.exists(parentOf(node), (parent) => parent.type === "for_statement");

export const checkName =
  (state: State) =>
  (node: SyntaxNode): void => {
    if (isAssignedName(node) || isLoopVariable(node)) {
      return;
    }
    const declaration = pipe(
      parentOf(node),
      Option.filter((parent) => parent.type === "declaration_command"),
    );
    if (Option.isSome(declaration) && !isExportingDeclaration(declaration.value)) {
      state.assign(findingAt({ state, code: "unusedVariable" })(node, node.text));
      return;
    }
    state.use(node.text);
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

const DECLARING = new Set(["local", "declare", "export", "readonly", "typeset"]);
const SCOPED = new Set(["local", "declare", "typeset"]);
const SUBSTITUTIONS = new Set(["command_substitution"]);
const WORDS = new Set(["string", "concatenation"]);

const hasSubstitution = (node: SyntaxNode): boolean =>
  SUBSTITUTIONS.has(node.type) ||
  (WORDS.has(node.type) && pipe(node.namedChildren, Arr.some(hasSubstitution)));

const isInFunction = (node: SyntaxNode): boolean =>
  pipe(
    ancestors(node),
    Arr.some((parent) => parent.type === "function_definition"),
  );

const isLocalReadonly = (node: SyntaxNode, keyword: string): boolean => {
  const flags = declarationFlags(node);
  const local = !Str.includes("g")(flags) && SCOPED.has(keyword) && isInFunction(node);
  return local && (keyword === "readonly" || Str.includes("r")(flags));
};

export const checkMaskedReturns =
  (state: State) =>
  (node: SyntaxNode): void => {
    const keyword = declarationKeyword(node);
    if (!DECLARING.has(keyword) || isLocalReadonly(node, keyword)) {
      return;
    }
    const masked = pipe(
      node.namedChildren,
      Arr.filter(
        (child) =>
          child.type === "variable_assignment" &&
          Option.exists(fieldOf("value")(child), hasSubstitution),
      ),
    );
    for (const child of masked) {
      report({ state, code: "maskedReturn" })(child);
    }
  };

export const checkLoopVariable =
  (state: State) =>
  (node: SyntaxNode): void => {
    for (const variable of Option.toArray(fieldOf("variable")(node))) {
      state.assign(findingAt({ state, code: "unusedVariable" })(node, variable.text));
    }
  };

export const checkCommandWrites =
  (state: State) =>
  (node: SyntaxNode): void => {
    for (const write of commandWrites(node)) {
      if (Option.isSome(descriptorOf(write.node))) {
        state.use(write.name);
      } else {
        state.assign(findingAt({ state, code: "unusedVariable" })(write.node, write.name));
      }
    }
  };

const TESTED = new Set(["-v", "-R"]);
const SUBSCRIPT = /^(?<name>[A-Za-z_]\w*)/u;

export const checkTestUse =
  (state: State) =>
  (node: SyntaxNode): void => {
    const tested = pipe(
      node.children,
      Arr.some((child) => TESTED.has(child.text)),
    );
    if (!tested) {
      return;
    }
    for (const operand of Arr.drop(node.namedChildren, FLAG)) {
      const name = pipe(
        Option.fromNullishOr(SUBSCRIPT.exec(operand.text)),
        Option.flatMap((match) => Option.fromNullishOr(match.groups)),
        Option.flatMap((groups) => Option.fromNullishOr(groups["name"])),
      );
      for (const found of Option.toArray(name)) {
        state.use(found);
      }
    }
  };

export const isReportedUnused = (name: string): boolean =>
  !INTERNAL_VARIABLES.has(name) && !Str.startsWith("_")(name);
