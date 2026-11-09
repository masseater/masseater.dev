import { Array as Arr, Option, Order, pipe } from "effect";

import {
  isCallExpression,
  isInterfaceDeclaration,
  isObjectLiteralExpression,
  isTypeAliasDeclaration,
  isTypeLiteralNode,
} from "./compiler.ts";
import type {
  Checker,
  Declaration,
  InterfaceDeclaration,
  Node,
  SourceFile,
  TypeSymbol,
  Type,
  TypeAliasDeclaration,
} from "./compiler.ts";
import { describeLibraryType, isObjectType } from "./library.ts";
import type { LibraryShape } from "./library.ts";
import { CANDIDATE_LIMIT, problemAt } from "./problem.ts";
import type { Problem } from "./problem.ts";
import {
  declarationsOf,
  descendantsOf,
  isGenericDeclaration,
  propertyNamesOf,
  referencedSymbols,
} from "./syntax.ts";
import { schemaTypeOf } from "./values.ts";

interface ShapeContext {
  readonly checker: Checker;
  readonly shapes: readonly LibraryShape[];
}

interface ShapeSite {
  readonly node: Node;
  readonly type: Type;
}

interface ShapeMatch {
  readonly shape: LibraryShape;
  readonly extra: number;
}

const MINIMUM_SHAPE_PROPERTIES = 3;
const EXACT = 0;

const isPlainInterface = (node: Node): node is InterfaceDeclaration =>
  isInterfaceDeclaration(node) && !isGenericDeclaration(node);

const isPlainTypeLiteral = (node: Node): node is TypeAliasDeclaration =>
  isTypeAliasDeclaration(node) && !isGenericDeclaration(node) && isTypeLiteralNode(node.type);

const isDeclaredShape = (node: Node): node is InterfaceDeclaration | TypeAliasDeclaration =>
  isPlainInterface(node) || isPlainTypeLiteral(node);

const declaredShapeOf =
  (checker: Checker) =>
  (node: Node): Option.Option<Type> =>
    Option.liftPredicate(node, isDeclaredShape).pipe(
      Option.map((declaration) => checker.getTypeAtLocation(declaration.name)),
    );

const schemaShapeOf =
  (checker: Checker) =>
  (node: Node): Option.Option<Type> => {
    if (!isCallExpression(node)) {
      return Option.none();
    }
    const { arguments: callArguments } = node;
    if (
      !pipe(
        callArguments,
        Arr.some((argument) => isObjectLiteralExpression(argument)),
      )
    ) {
      return Option.none();
    }
    return schemaTypeOf(checker)(checker.getTypeAtLocation(node)).pipe(
      Option.filter((type) => isObjectType(checker)(type)),
    );
  };

const shapeSitesIn =
  (checker: Checker) =>
  (sourceFile: SourceFile): readonly ShapeSite[] =>
    Arr.getSomes(
      pipe(
        descendantsOf(sourceFile),
        Arr.map((node) =>
          declaredShapeOf(checker)(node).pipe(
            Option.orElse(() => schemaShapeOf(checker)(node)),
            Option.map((type) => ({ node, type })),
          ),
        ),
      ),
    );

interface LocalProperty {
  readonly name: string;
  readonly type: Type;
}

interface OpenTypeIds {
  readonly any: number;
  readonly unknown: number;
}

const openTypeIdsOf = (checker: Checker): OpenTypeIds => ({
  any: checker.getAnyType().id,
  unknown: checker.getUnknownType().id,
});

const sameProperty =
  (checker: Checker, open: OpenTypeIds) =>
  (localType: Type, library: TypeSymbol): boolean => {
    const libraryType = checker.getTypeOfSymbol(library);
    return (
      libraryType.id !== open.any &&
      libraryType.id !== open.unknown &&
      checker.isTypeAssignableTo(localType, libraryType) &&
      checker.isTypeAssignableTo(libraryType, localType)
    );
  };

const matchOf =
  (context: ShapeContext, open: OpenTypeIds) =>
  (locals: readonly LocalProperty[], shape: LibraryShape): Option.Option<ShapeMatch> => {
    const { checker } = context;
    const matches = pipe(
      locals,
      Arr.every((local) =>
        Option.fromUndefinedOr(checker.getPropertyOfType(shape.type, local.name)).pipe(
          Option.exists((library) => sameProperty(checker, open)(local.type, library)),
        ),
      ),
    );
    if (!matches) {
      return Option.none();
    }
    return Option.some({
      shape,
      extra: propertyNamesOf(checker)(shape.type).length - locals.length,
    });
  };

const localPropertiesOf =
  (checker: Checker) =>
  (symbols: readonly TypeSymbol[]): readonly LocalProperty[] =>
    pipe(
      Arr.zip(symbols, checker.getTypeOfSymbol(symbols)),
      Arr.map(([symbol, type]) => ({ name: symbol.name, type })),
    );

const derivedDeclarationsOf =
  (checker: Checker) =>
  (node: Node): ReadonlySet<Declaration> =>
    new Set(
      pipe(
        referencedSymbols(checker)(node),
        Arr.flatMap((symbol) => declarationsOf(symbol)),
      ),
    );

const matchOrder = Order.mapInput(Order.Number, (match: ShapeMatch) => match.extra);

const shapeProblem = (site: ShapeSite, matches: readonly ShapeMatch[]): Problem => {
  const shown = pipe(
    Arr.take(matches, CANDIDATE_LIMIT),
    Arr.map((match) => describeLibraryType(match.shape)),
    Arr.join(", "),
  );
  const advice = Option.match(
    Arr.findFirst(matches, (match) => match.extra === EXACT),
    {
      onNone: () =>
        "Derive it from the library type, for example with Pick, instead of copying its properties.",
      onSome: () => "Use the library type instead of copying it.",
    },
  );
  return problemAt({ rule: "library-shape", message: `This shape copies ${shown}. ${advice}` })(
    site.node,
  );
};

const shapeProblemOf =
  (context: ShapeContext, open: OpenTypeIds) =>
  (site: ShapeSite): Option.Option<Problem> => {
    const symbols = context.checker.getPropertiesOfType(site.type);
    if (symbols.length < MINIMUM_SHAPE_PROPERTIES) {
      return Option.none();
    }
    const locals = localPropertiesOf(context.checker)(symbols);
    const derived = derivedDeclarationsOf(context.checker)(site.node);
    const candidates = pipe(
      context.shapes,
      Arr.filter((shape) => !derived.has(shape.declaration)),
      Arr.map((shape) => matchOf(context, open)(locals, shape)),
      Arr.getSomes,
    );
    const matches = Arr.sort(candidates, matchOrder);
    return Option.liftPredicate(matches, Arr.isReadonlyArrayNonEmpty).pipe(
      Option.map((found) => shapeProblem(site, found)),
    );
  };

const shapeProblemsIn =
  (context: ShapeContext) =>
  (sourceFile: SourceFile): readonly Problem[] => {
    const sites = shapeSitesIn(context.checker)(sourceFile);
    if (!Arr.isReadonlyArrayNonEmpty(sites)) {
      return [];
    }
    const open = openTypeIdsOf(context.checker);
    return Arr.getSomes(
      pipe(
        sites,
        Arr.map((site) => shapeProblemOf(context, open)(site)),
      ),
    );
  };

export { shapeProblemsIn };
export type { ShapeContext };
