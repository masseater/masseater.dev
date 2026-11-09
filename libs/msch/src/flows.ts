import { Array as Arr, Option, String as Str, pipe } from "effect";

import {
  getNameOfDeclaration,
  isClassDeclaration,
  isElementAccessExpression,
  isIdentifier,
  isInterfaceDeclaration,
  isPropertyAccessExpression,
  isSignatureDeclaration,
  isTypeAliasDeclaration,
} from "./compiler.ts";
import type {
  Checker,
  ClassDeclaration,
  Declaration,
  Expression,
  InterfaceDeclaration,
  Node,
  Program,
  SignatureDeclaration,
  SourceFile,
  TypeSymbol,
  Type,
} from "./compiler.ts";
import type { ValueSite } from "./sites.ts";
import { annotationOf, slotOf } from "./slots.ts";
import {
  contains,
  declarationsOf,
  descendantsOf,
  isExternalDeclaration,
  NODE_MODULES_SEGMENT,
  symbolAt,
} from "./syntax.ts";
import { isSubsetOf, vocabularyOf } from "./values.ts";

interface Flow {
  readonly site: ValueSite;
  readonly target: string;
}

interface FlowContext {
  readonly checker: Checker;
  readonly program: Program;
  readonly sites: readonly ValueSite[];
}

const SCOPE_PREFIX = "@";
const SCOPED_SEGMENTS = 2;
const UNSCOPED_SEGMENTS = 1;
const MODULE_PREFIX = /^".*?"\./u;

const packageOf = (fileName: string): string => {
  const afterModules = pipe(
    fileName,
    Str.lastIndexOf(NODE_MODULES_SEGMENT),
    Option.match({
      onNone: () => fileName,
      onSome: (index) => Str.slice(index + NODE_MODULES_SEGMENT.length)(fileName),
    }),
  );
  const segments = Str.split("/")(afterModules);
  if (Str.startsWith(SCOPE_PREFIX)(afterModules)) {
    return pipe(Arr.take(segments, SCOPED_SEGMENTS), Arr.join("/"));
  }
  return pipe(Arr.take(segments, UNSCOPED_SEGMENTS), Arr.join("/"));
};

const externalDeclarationOf =
  (context: FlowContext) =>
  (symbol: TypeSymbol): Option.Option<Declaration> =>
    Arr.findFirst(declarationsOf(symbol), (declaration) =>
      isExternalDeclaration(context.program)(declaration),
    );

const aliasTarget =
  (context: FlowContext) =>
  (type: Type): Option.Option<string> =>
    Option.fromUndefinedOr(type.getAliasSymbol()).pipe(
      Option.flatMap((alias) =>
        externalDeclarationOf(context)(alias).pipe(
          Option.map(
            (declaration) =>
              `${Str.replace(MODULE_PREFIX, "")(context.checker.getFullyQualifiedName(alias))} from ${packageOf(declaration.getSourceFile().fileName)}`,
          ),
        ),
      ),
    );

const isNamedContainer = (
  node: Node,
): node is SignatureDeclaration | InterfaceDeclaration | ClassDeclaration =>
  isSignatureDeclaration(node) || isInterfaceDeclaration(node) || isClassDeclaration(node);

const slotTarget =
  (context: FlowContext) =>
  (expression: Expression): Option.Option<string> =>
    slotOf(context.checker)(expression).pipe(
      Option.filter((slot) => isExternalDeclaration(context.program)(slot)),
      Option.filter((slot) =>
        Option.isSome(vocabularyOf(context.checker)(context.checker.getTypeAtLocation(slot))),
      ),
      Option.map((slot) => {
        const owner = Option.liftPredicate(slot.parent, isNamedContainer).pipe(
          Option.flatMap((container) => Option.fromUndefinedOr(getNameOfDeclaration(container))),
          Option.map((name) => ` of ${name.getText()}`),
          Option.getOrElse(() => ""),
        );
        const name = Option.fromUndefinedOr(getNameOfDeclaration(slot)).pipe(
          Option.map((found) => found.getText()),
          Option.getOrElse(() => "value"),
        );
        return `${name}${owner} from ${packageOf(slot.getSourceFile().fileName)}`;
      }),
    );

const libraryTargetOf =
  (context: FlowContext) =>
  (expression: Expression, contextual: Type): Option.Option<string> =>
    aliasTarget(context)(contextual).pipe(Option.orElse(() => slotTarget(context)(expression)));

const siteWithin =
  (context: FlowContext) =>
  (node: Node): Option.Option<ValueSite> =>
    Arr.findFirst(context.sites, (site) => contains(node)(site.node));

const aliasSite =
  (context: FlowContext) =>
  (type: Type): Option.Option<ValueSite> =>
    Option.fromUndefinedOr(type.getAliasSymbol()).pipe(
      Option.flatMap((alias) => Arr.findFirst(declarationsOf(alias), isTypeAliasDeclaration)),
      Option.flatMap(siteWithin(context)),
    );

const annotationSite =
  (context: FlowContext) =>
  (expression: Expression): Option.Option<ValueSite> =>
    symbolAt(context.checker)(expression).pipe(
      Option.flatMap((symbol) => Option.fromUndefinedOr(symbol.valueDeclaration)),
      Option.flatMap((handle) => Option.fromUndefinedOr(handle.resolve())),
      Option.flatMap(annotationOf),
      Option.flatMap((annotation) =>
        siteWithin(context)(annotation).pipe(
          Option.orElse(() => aliasSite(context)(context.checker.getTypeFromTypeNode(annotation))),
        ),
      ),
    );

const siteBehind =
  (context: FlowContext) =>
  (expression: Expression): Option.Option<ValueSite> =>
    aliasSite(context)(context.checker.getTypeAtLocation(expression)).pipe(
      Option.orElse(() => annotationSite(context)(expression)),
    );

const isFlowSource = (node: Node): node is Expression =>
  isIdentifier(node) || isPropertyAccessExpression(node) || isElementAccessExpression(node);

const flowOf =
  (context: FlowContext) =>
  (expression: Expression): Option.Option<Flow> =>
    Option.fromUndefinedOr(context.checker.getContextualType(expression)).pipe(
      Option.flatMap((contextual) =>
        Option.all([
          vocabularyOf(context.checker)(contextual),
          libraryTargetOf(context)(expression, contextual),
        ]),
      ),
      Option.flatMap(([vocabulary, target]) =>
        siteBehind(context)(expression).pipe(
          Option.filter((site) => isSubsetOf(site.values, vocabulary.values)),
          Option.map((site) => ({ site, target })),
        ),
      ),
    );

const flowsIn =
  (context: FlowContext) =>
  (sourceFile: SourceFile): readonly Flow[] =>
    Arr.getSomes(
      pipe(
        descendantsOf(sourceFile),
        Arr.filter((node) => isFlowSource(node)),
        Arr.map((node) => flowOf(context)(node)),
      ),
    );

export { flowsIn };
export type { Flow, FlowContext };
