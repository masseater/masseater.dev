import { Array as Arr, Option, pipe } from "effect";
import type { Node, SourceFile } from "typescript/ast";
import type { Checker, CompilerOptions, Program as NativeProgram, Project } from "typescript/sync";

import { CompatSymbol } from "./compat-symbol.ts";
import { CompatType } from "./compat-type.ts";
import { memoizeByKey } from "./memo.ts";

interface CompatChecker {
  readonly getSymbolAtLocation: (node: Node) => CompatSymbol | undefined;
  readonly getAliasedSymbol: (symbol: CompatSymbol) => CompatSymbol;
  readonly getTypeAtLocation: (node: Node) => CompatType;
  readonly getTypeOfSymbol: (symbol: CompatSymbol) => CompatType;
  readonly getBaseConstraintOfType: (type: CompatType) => CompatType | undefined;
  readonly getAwaitedType: (type: CompatType) => CompatType | undefined;
  readonly getFullyQualifiedName: (symbol: CompatSymbol) => string;
  readonly typeToString: (type: CompatType) => string;
}

interface CompatProgram {
  readonly getSourceFile: (fileName: string) => SourceFile | undefined;
  readonly getSourceFiles: () => readonly SourceFile[];
  readonly getTypeChecker: () => CompatChecker;
  readonly getCompilerOptions: () => CompilerOptions;
}

const compatChecker = (project: Project, checker: Checker): CompatChecker => ({
  getSymbolAtLocation: (node) => CompatSymbol.optional(project, checker.getSymbolAtLocation(node)),
  getAliasedSymbol: (symbol) =>
    CompatSymbol.intern(project, checker.getAliasedSymbol(symbol.native)),
  getTypeAtLocation: (node) => CompatType.intern(project, checker.getTypeAtLocation(node)),
  getTypeOfSymbol: (symbol) => CompatType.intern(project, checker.getTypeOfSymbol(symbol.native)),
  getBaseConstraintOfType: (type) =>
    CompatType.optional(project, checker.getBaseConstraintOfType(type.native)),
  getAwaitedType: (type) => CompatType.optional(project, checker.getAwaitedType(type.native)),
  getFullyQualifiedName: (symbol) => checker.getFullyQualifiedName(symbol.native),
  typeToString: (type) => checker.typeToString(type.native),
});

const isOwnSourceFile = (fileName: string): boolean =>
  !fileName.includes("/node_modules/") && !fileName.endsWith(".d.ts");

const ownSourceFiles = memoizeByKey((program: NativeProgram): readonly SourceFile[] =>
  pipe(
    program.getSourceFileNames(),
    Arr.filter(isOwnSourceFile),
    Arr.flatMap((fileName) =>
      Option.fromNullishOr(program.getSourceFile(fileName)).pipe(Option.toArray),
    ),
  ),
);

const compatPrograms = new WeakMap<NativeProgram, CompatProgram>();

const internProgram = (project: Project): CompatProgram =>
  Option.fromNullishOr(compatPrograms.get(project.program)).pipe(
    Option.getOrElse(() => {
      const { program } = project;
      const checker = compatChecker(project, project.checker);
      const created: CompatProgram = {
        getSourceFile: program.getSourceFile.bind(program),
        getSourceFiles: () => ownSourceFiles(program),
        getTypeChecker: () => checker,
        getCompilerOptions: program.getCompilerOptions.bind(program),
      };
      compatPrograms.set(program, created);
      return created;
    }),
  );

export type { CompatChecker, CompatProgram };
export { internProgram };
