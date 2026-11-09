import { Array as Arr, Option, String as Str, pipe } from "effect";

import {
  getJSDocTags,
  getTextOfJSDocComment,
  isIdentifier,
  isSourceFile,
  isVariableDeclaration,
  isVariableDeclarationList,
  isVariableStatement,
  SyntaxKind,
} from "./compiler.ts";
import type {
  Checker,
  Declaration,
  Node,
  SourceFile,
  Type,
  VariableDeclaration,
  VariableDeclarationList,
} from "./compiler.ts";
import { problemAt } from "./problem.ts";
import type { Problem } from "./problem.ts";
import type { Project } from "./project.ts";
import { columnOf, descendantsOf, lineOf } from "./syntax.ts";
import { finiteValuesOf, formatValues, literalValuesOf, sameValues } from "./values.ts";
import type { Value } from "./values.ts";

interface Owner {
  readonly conceptId: string;
  readonly key: string;
  readonly name: string;
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly packageName: Option.Option<string>;
  readonly values: readonly Value[];
}

interface OwnerScan {
  readonly owners: readonly Owner[];
  readonly problems: readonly Problem[];
}

interface Annotated {
  readonly node: Node;
  readonly conceptId: string;
}

const OWNER_TAG = "msch";
const FIRST_OWNER_COUNT = 1;

const ownerKeyOf = (declaration: Declaration): Option.Option<string> => {
  if (!isVariableDeclaration(declaration) || !isIdentifier(declaration.name)) {
    return Option.none();
  }
  return Option.some(`${declaration.getSourceFile().fileName}#${declaration.name.text}`);
};

const annotationsOf = (node: Node): readonly Annotated[] =>
  pipe(
    getJSDocTags(node),
    Arr.filter((tag) => tag.tagName.text === OWNER_TAG),
    Arr.map((tag) => ({ node, conceptId: Str.trim(getTextOfJSDocComment(tag.comment) ?? "") })),
  );

const ANNOTATABLE_KINDS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.VariableDeclaration,
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.ClassDeclaration,
  SyntaxKind.InterfaceDeclaration,
  SyntaxKind.TypeAliasDeclaration,
  SyntaxKind.EnumDeclaration,
  SyntaxKind.PropertySignature,
  SyntaxKind.PropertyAssignment,
  SyntaxKind.PropertyDeclaration,
]);

const isAnnotatable = (node: Node): boolean => ANNOTATABLE_KINDS.has(node.kind);

const isConstList = (list: VariableDeclarationList): boolean =>
  Option.fromUndefinedOr(list.getFirstToken()).pipe(
    Option.exists((token) => token.kind === SyntaxKind.ConstKeyword),
  );

const isModuleStatementList = (list: VariableDeclarationList): boolean =>
  isVariableStatement(list.parent) && isSourceFile(list.parent.parent);

const isModuleConstList = (node: Node): node is VariableDeclarationList =>
  isVariableDeclarationList(node) && isModuleStatementList(node) && isConstList(node);

const isModuleConst = (node: Node): node is VariableDeclaration =>
  isVariableDeclaration(node) && isIdentifier(node.name) && isModuleConstList(node.parent);

const objectValuesOf =
  (checker: Checker) =>
  (type: Type): Option.Option<readonly Value[]> =>
    literalValuesOf(
      pipe(
        checker.getPropertiesOfType(type),
        Arr.map((property) => checker.getTypeOfSymbol(property)),
      ),
    );

const ownerValuesOf =
  (checker: Checker) =>
  (declaration: VariableDeclaration): Option.Option<readonly Value[]> => {
    const type = checker.getTypeAtLocation(declaration.name);
    return finiteValuesOf(checker)(type).pipe(Option.orElse(() => objectValuesOf(checker)(type)));
  };

const annotationProblem = (message: string): ((node: Node) => Problem) =>
  problemAt({ rule: "owner-annotation", message });

const scanned = (owners: readonly Owner[], problems: readonly Problem[]): OwnerScan => ({
  owners,
  problems,
});

const ownerOf =
  (project: Project) =>
  (annotated: Annotated): OwnerScan => {
    const { node, conceptId } = annotated;
    if (!isModuleConst(node)) {
      return scanned(
        [],
        [annotationProblem(`@${OWNER_TAG} registers an owner only on a module-scope const.`)(node)],
      );
    }
    if (conceptId === "") {
      return scanned([], [annotationProblem(`@${OWNER_TAG} needs a concept id.`)(node)]);
    }
    const values = ownerValuesOf(project.checker)(node);
    return Option.match(Option.all([values, ownerKeyOf(node)]), {
      onNone: () =>
        scanned(
          [],
          [annotationProblem(`The owner of ${conceptId} holds no finite value set.`)(node)],
        ),
      onSome: ([ownedValues, key]) =>
        scanned(
          [
            {
              conceptId,
              key,
              name: node.name.getText(),
              file: node.getSourceFile().fileName,
              line: lineOf(node),
              column: columnOf(node),
              packageName: project.packageName,
              values: ownedValues,
            },
          ],
          [],
        ),
    });
  };

const annotatedIn = (sourceFile: SourceFile): readonly Annotated[] =>
  pipe(
    descendantsOf(sourceFile),
    Arr.filter((node) => isAnnotatable(node)),
    Arr.flatMap((node) => annotationsOf(node)),
  );

const ownerProblem =
  (message: string) =>
  (owner: Owner): Problem => ({
    file: owner.file,
    line: owner.line,
    column: owner.column,
    rule: "owner-annotation",
    message,
  });

const conflictProblems = (owners: readonly Owner[]): readonly Problem[] =>
  pipe(
    owners,
    Arr.flatMap((owner, index) => {
      const earlier = Arr.take(owners, index);
      const sameConcept = pipe(
        earlier,
        Arr.filter((other) => other.conceptId === owner.conceptId),
      );
      const sameSet = pipe(
        earlier,
        Arr.filter(
          (other) => other.conceptId !== owner.conceptId && sameValues(other.values, owner.values),
        ),
      );
      return [
        ...pipe(
          Arr.take(sameConcept, FIRST_OWNER_COUNT),
          Arr.map(() =>
            ownerProblem(`The concept ${owner.conceptId} already has an owner.`)(owner),
          ),
        ),
        ...pipe(
          Arr.take(sameSet, FIRST_OWNER_COUNT),
          Arr.map((other) =>
            ownerProblem(
              `The values ${formatValues(owner.values)} are already owned by ${other.conceptId}.`,
            )(owner),
          ),
        ),
      ];
    }),
  );

const ownersIn = (project: Project): OwnerScan => {
  const results = pipe(
    project.sourceFiles,
    Arr.flatMap((sourceFile) =>
      pipe(
        annotatedIn(sourceFile),
        Arr.map((annotated) => ownerOf(project)(annotated)),
      ),
    ),
  );
  return scanned(
    pipe(
      results,
      Arr.flatMap((result) => result.owners),
    ),
    pipe(
      results,
      Arr.flatMap((result) => result.problems),
    ),
  );
};

const combineOwnerScans = (scans: readonly OwnerScan[]): OwnerScan => {
  const owners = Arr.dedupeWith(
    pipe(
      scans,
      Arr.flatMap((scan) => scan.owners),
    ),
    (left, right) => left.key === right.key,
  );
  const problems = [
    ...pipe(
      scans,
      Arr.flatMap((scan) => scan.problems),
    ),
    ...conflictProblems(owners),
  ];
  return { owners, problems };
};

export { OWNER_TAG, combineOwnerScans, ownerKeyOf, ownersIn };
export type { Owner, OwnerScan };
