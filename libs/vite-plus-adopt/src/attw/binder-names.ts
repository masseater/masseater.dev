import { Option, Predicate } from "effect";
import { ModifierFlags, SyntaxKind } from "typescript/ast";
import type { BinaryExpression, CallExpression, ModuleDeclaration, Node } from "typescript/ast";
import {
  isBinaryExpression,
  isBindingElement,
  isCallExpression,
  isExportAssignment,
  isExportDeclaration,
  isIdentifier,
  isModuleDeclaration,
  isPropertyAccessExpression,
  isStringLiteral,
  isVariableDeclaration,
  isVariableStatement,
} from "typescript/ast/is";

import { AssignmentKind, getAssignmentDeclarationKind } from "./binder-assignment.ts";
import { escapeLeadingUnderscores } from "./binder-symbols.ts";
import {
  getElementOrPropertyAccessName,
  isAccessExpression,
  isStringOrNumericLiteralLike,
  nameText,
} from "./binder-syntax.ts";
import type { AccessExpression } from "./binder-syntax.ts";
import { EMPTY, hasFlag, withFlags } from "./flags.ts";

const isNodeValue = (value: unknown): value is Node =>
  Predicate.hasProperty(value, "kind") && Predicate.isNumber(value.kind);

const declaredName = (node: Node): Option.Option<Node> => {
  if ("name" in node && isNodeValue(node.name)) {
    return Option.some(node.name);
  }
  return Option.none();
};

const syntacticModifierFlags = (node: Node): number => {
  if ("modifierFlags" in node && Predicate.isNumber(node.modifierFlags)) {
    return node.modifierFlags;
  }
  return EMPTY;
};

const hasSyntacticModifier = (node: Node, flag: number): boolean =>
  hasFlag(syntacticModifierFlags(node), flag);

const declarationOfBinding = (node: Node): Node => {
  let current = node;
  while (isBindingElement(current)) {
    current = current.parent.parent;
  }
  return current;
};

const combinedModifierFlags = (node: Node): number => {
  const declaration = declarationOfBinding(node);
  const own = syntacticModifierFlags(declaration);
  if (!isVariableDeclaration(declaration)) {
    return own;
  }
  const list = declaration.parent;
  const withList = withFlags(own, syntacticModifierFlags(list));
  if (isVariableStatement(list.parent)) {
    return withFlags(withList, syntacticModifierFlags(list.parent));
  }
  return withList;
};

const hasExportModifier = (node: Node): boolean =>
  hasFlag(combinedModifierFlags(node), ModifierFlags.Export);

const nameOfAccess = (node: AccessExpression): Node => {
  if (isPropertyAccessExpression(node)) {
    return node.name;
  }
  if (isStringOrNumericLiteralLike(node.argumentExpression)) {
    return node.argumentExpression;
  }
  return node;
};

const assignmentName = (node: BinaryExpression, inJsFile: boolean): Option.Option<Node> => {
  const kind = getAssignmentDeclarationKind(node, inJsFile);
  if (kind === AssignmentKind.ModuleExports || kind === AssignmentKind.None) {
    return Option.none();
  }
  return Option.map(Option.liftPredicate(node.left, isAccessExpression), nameOfAccess);
};

const definedPropertyName = (node: CallExpression): Option.Option<Node> => {
  const [, property] = node.arguments;
  return Option.fromNullishOr(property);
};

const nameOfNamedNode = (node: Node): Option.Option<Node> => {
  if (isAccessExpression(node)) {
    return Option.some(nameOfAccess(node));
  }
  if (isExportDeclaration(node)) {
    return Option.none();
  }
  return declaredName(node);
};

const nameOfDeclaration = (node: Node, inJsFile: boolean): Option.Option<Node> => {
  if (isBinaryExpression(node)) {
    return assignmentName(node, inJsFile);
  }
  if (isCallExpression(node)) {
    return definedPropertyName(node);
  }
  return nameOfNamedNode(node);
};

const isGlobalScopeAugmentation = (node: ModuleDeclaration): boolean =>
  isIdentifier(node.name) &&
  node.name.text === "global" &&
  node.keyword !== SyntaxKind.NamespaceKeyword;

const isAmbientModule = (node: Node): node is ModuleDeclaration =>
  isModuleDeclaration(node) && (isStringLiteral(node.name) || isGlobalScopeAugmentation(node));

const ambientModuleName = (name: Node): string => {
  if (isIdentifier(name)) {
    return "__global";
  }
  return `"${Option.getOrElse(nameText(name), () => "")}"`;
};

const nameOfNamedDeclaration = (node: Node, name: Node): Option.Option<string> => {
  if (isAmbientModule(node)) {
    return Option.some(ambientModuleName(name));
  }
  if (isAccessExpression(name)) {
    return getElementOrPropertyAccessName(name);
  }
  return Option.map(nameText(name), escapeLeadingUnderscores);
};

const unnamedDeclarationName = (node: Node): Option.Option<string> => {
  if (node.kind === SyntaxKind.ExportDeclaration) {
    return Option.some("__export");
  }
  if (node.kind === SyntaxKind.SourceFile || node.kind === SyntaxKind.BinaryExpression) {
    return Option.some("export=");
  }
  return Option.none();
};

const declarationName = (node: Node, inJsFile: boolean): Option.Option<string> => {
  if (isExportAssignment(node)) {
    return Option.some(
      Option.match(
        Option.liftPredicate(node, () => node.isExportEquals),
        {
          onNone: () => "default",
          onSome: () => "export=",
        },
      ),
    );
  }
  return Option.match(nameOfDeclaration(node, inJsFile), {
    onNone: () => unnamedDeclarationName(node),
    onSome: (name) => nameOfNamedDeclaration(node, name),
  });
};

export { declarationName, hasExportModifier, hasSyntacticModifier, isAmbientModule, isNodeValue };
