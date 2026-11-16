import { Option, Function as Fn } from "effect";
import { NodeFlags, ScriptKind } from "typescript/ast";
import type { Node, SourceFile } from "typescript/ast";

import { hasFlag } from "./flags.ts";
import type { PackageJsonInfo, ResolutionMode } from "./resolution-types.ts";

const DATA_FIRST_ARITY = 2;

interface FileInfo {
  readonly impliedNodeFormat: Option.Option<ResolutionMode>;
  readonly packageJsonScope: Option.Option<PackageJsonInfo>;
  readonly imports: readonly Node[];
  readonly moduleAugmentations: readonly Node[];
}

const infos = new WeakMap<SourceFile, FileInfo>();

const UNSET = Object.freeze({
  writable: true,
  configurable: true,
  enumerable: true,
});

export const attachFileInfo: {
  (impliedNodeFormat: Option.Option<ResolutionMode>): (sourceFile: SourceFile) => SourceFile;
  (sourceFile: SourceFile, impliedNodeFormat: Option.Option<ResolutionMode>): SourceFile;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (sourceFile: SourceFile, impliedNodeFormat: Option.Option<ResolutionMode>): SourceFile => {
    infos.set(sourceFile, {
      impliedNodeFormat,
      packageJsonScope: Option.none(),
      imports: sourceFile.imports,
      moduleAugmentations: sourceFile.moduleAugmentations,
    });
    Object.defineProperty(sourceFile, "imports", UNSET);
    Object.defineProperty(sourceFile, "moduleAugmentations", UNSET);
    return sourceFile;
  },
);

const infoOf = (sourceFile: SourceFile): Option.Option<FileInfo> =>
  Option.fromNullishOr(infos.get(sourceFile));

export const impliedNodeFormatOf = (sourceFile: SourceFile): Option.Option<ResolutionMode> =>
  Option.flatMap(infoOf(sourceFile), (info) => info.impliedNodeFormat);

export const packageJsonScopeOf = (sourceFile: SourceFile): Option.Option<PackageJsonInfo> =>
  Option.flatMap(infoOf(sourceFile), (info) => info.packageJsonScope);

export const setPackageJsonScope: {
  (scope: Option.Option<PackageJsonInfo>): (sourceFile: SourceFile) => void;
  (sourceFile: SourceFile, scope: Option.Option<PackageJsonInfo>): void;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (sourceFile: SourceFile, scope: Option.Option<PackageJsonInfo>): void => {
    Option.map(infoOf(sourceFile), (info) =>
      infos.set(sourceFile, { ...info, packageJsonScope: scope }),
    );
  },
);

export const collectExternalModuleReferences = (sourceFile: SourceFile): void => {
  Option.map(infoOf(sourceFile), (info) => {
    Object.defineProperty(sourceFile, "imports", { ...UNSET, value: info.imports });
    Object.defineProperty(sourceFile, "moduleAugmentations", {
      ...UNSET,
      value: info.moduleAugmentations,
    });
    return info;
  });
};

export const importsOf = (sourceFile: SourceFile): readonly Node[] =>
  Option.match(infoOf(sourceFile), {
    onNone: () => sourceFile.imports,
    onSome: (info) => info.imports,
  });

export const moduleAugmentationsOf = (sourceFile: SourceFile): readonly Node[] =>
  Option.match(infoOf(sourceFile), {
    onNone: () => sourceFile.moduleAugmentations,
    onSome: (info) => info.moduleAugmentations,
  });

export const isSourceFileJS = (sourceFile: SourceFile): boolean =>
  sourceFile.scriptKind === ScriptKind.JS || sourceFile.scriptKind === ScriptKind.JSX;

export const isJSDocNode = (node: Node): boolean => hasFlag(node.flags, NodeFlags.JSDoc);
