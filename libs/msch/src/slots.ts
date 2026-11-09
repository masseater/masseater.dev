import { Array as Arr, Option } from "effect";

import {
  isCallExpression,
  isNewExpression,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isSignatureDeclaration,
  isVariableDeclaration,
  SyntaxKind,
} from "./compiler.ts";
import type {
  Checker,
  Declaration,
  Expression,
  ParameterDeclaration,
  PropertyDeclaration,
  PropertySignatureDeclaration,
  TypeSymbol,
  TypeNode,
  VariableDeclaration,
} from "./compiler.ts";
import { declarationsOf, referencedSymbols } from "./syntax.ts";

type AnnotatedDeclaration =
  | ParameterDeclaration
  | VariableDeclaration
  | PropertySignatureDeclaration
  | PropertyDeclaration;

const ANNOTATED_KINDS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.Parameter,
  SyntaxKind.VariableDeclaration,
  SyntaxKind.PropertySignature,
  SyntaxKind.PropertyDeclaration,
]);

const isAnnotated = (declaration: Declaration): declaration is AnnotatedDeclaration =>
  ANNOTATED_KINDS.has(declaration.kind);

const annotationOf = (declaration: Declaration): Option.Option<TypeNode> =>
  Option.liftPredicate(declaration, isAnnotated).pipe(
    Option.flatMap((annotated) => Option.fromUndefinedOr(annotated.type)),
  );

const argumentSlot =
  (checker: Checker) =>
  (expression: Expression): Option.Option<Declaration> => {
    const call = expression.parent;
    if (!isCallExpression(call) && !isNewExpression(call)) {
      return Option.none();
    }
    const { arguments: listed } = call;
    const callArguments: readonly Expression[] = listed ?? [];
    const index = callArguments.indexOf(expression);
    return Option.fromUndefinedOr(checker.getResolvedSignature(call).declaration).pipe(
      Option.flatMap((handle) => Option.fromUndefinedOr(handle.resolve())),
      Option.filter(isSignatureDeclaration),
      Option.flatMap((declaration) => Arr.get(declaration.parameters, index)),
    );
  };

const propertySlot =
  (checker: Checker) =>
  (expression: Expression): Option.Option<Declaration> => {
    const assignment = expression.parent;
    if (!isPropertyAssignment(assignment) || !isObjectLiteralExpression(assignment.parent)) {
      return Option.none();
    }
    return Option.fromUndefinedOr(checker.getContextualType(assignment.parent)).pipe(
      Option.flatMap((objectType) =>
        Option.fromUndefinedOr(objectType.getProperty(assignment.name.getText())),
      ),
      Option.flatMap((property) => Arr.head(declarationsOf(property))),
    );
  };

const variableSlot = (expression: Expression): Option.Option<Declaration> => {
  const declaration = expression.parent;
  if (!isVariableDeclaration(declaration) || declaration.initializer !== expression) {
    return Option.none();
  }
  return Option.some(declaration);
};

const slotOf =
  (checker: Checker) =>
  (expression: Expression): Option.Option<Declaration> =>
    argumentSlot(checker)(expression).pipe(
      Option.orElse(() => propertySlot(checker)(expression)),
      Option.orElse(() => variableSlot(expression)),
    );

const contextSymbolsOf =
  (checker: Checker) =>
  (expression: Expression): readonly TypeSymbol[] => {
    const alias = Option.fromUndefinedOr(checker.getContextualType(expression)).pipe(
      Option.flatMap((contextual) => Option.fromUndefinedOr(contextual.getAliasSymbol())),
    );
    if (Option.isSome(alias)) {
      return [alias.value];
    }
    return slotOf(checker)(expression).pipe(
      Option.flatMap(annotationOf),
      Option.map((annotation) => referencedSymbols(checker)(annotation)),
      Option.getOrElse(() => []),
    );
  };

export { annotationOf, contextSymbolsOf, slotOf };
