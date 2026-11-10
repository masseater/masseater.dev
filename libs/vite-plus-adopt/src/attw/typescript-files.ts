import { Option, Predicate } from "effect";
import { ScriptKind } from "typescript/ast";
import type { Node, SourceFile } from "typescript/ast";
import { ModuleKind, ModuleResolutionKind } from "typescript/sync";

import { bindSourceFile } from "./binder.ts";
import { getModeForUsageLocation as modeForUsage } from "./module-mode.ts";
import type { ModeOptions } from "./module-mode.ts";
import { getNormalizedAbsolutePath } from "./paths.ts";
import { modeToNumber } from "./resolution-mode-numbers.ts";
import { parseSourceFile } from "./ts-api.ts";

type CompilerOptionsLike = Readonly<Partial<Record<"module" | "moduleResolution", number>>>;

const ROOT = "/";
const SCRIPT_KIND_AFTER_TEXT = 2;

const RESOLUTION_NAMES: ReadonlyMap<number, ModeOptions["moduleResolution"]> = new Map([
  [ModuleResolutionKind.Node10, "Node10"],
  [ModuleResolutionKind.Node16, "Node16"],
  [ModuleResolutionKind.NodeNext, "Node16"],
  [ModuleResolutionKind.Bundler, "Bundler"],
]);

const MODULE_NAMES: ReadonlyMap<number, ModeOptions["module"]> = new Map([
  [ModuleKind.CommonJS, "CommonJS"],
  [ModuleKind.ESNext, "ESNext"],
  [ModuleKind.Node16, "Node16"],
  [ModuleKind.NodeNext, "Node16"],
]);

const SCRIPT_KINDS: ReadonlySet<unknown> = new Set(Object.values(ScriptKind));

const resolutionNameOf = (kind: number | undefined): ModeOptions["moduleResolution"] =>
  Option.fromNullishOr(kind).pipe(
    Option.flatMapNullishOr((value) => RESOLUTION_NAMES.get(value)),
    Option.getOrElse((): ModeOptions["moduleResolution"] => "Node10"),
  );

const moduleNameOf = (kind: number | undefined): ModeOptions["module"] =>
  Option.fromNullishOr(kind).pipe(
    Option.flatMapNullishOr((value) => MODULE_NAMES.get(value)),
    Option.getOrElse((): ModeOptions["module"] => "CommonJS"),
  );

const modeOptionsOf = (options: CompilerOptionsLike): ModeOptions => ({
  moduleResolution: resolutionNameOf(options.moduleResolution),
  module: moduleNameOf(options.module),
});

const getModeForUsageLocation = (
  sourceFile: SourceFile,
  usage: Node,
  options: CompilerOptionsLike,
): ModuleKind | undefined =>
  Option.getOrUndefined(
    modeForUsage(sourceFile, usage, modeOptionsOf(options)).pipe(
      Option.map((mode) => modeToNumber(mode)),
    ),
  );

const isScriptKind = (value: unknown): value is ScriptKind =>
  Predicate.isNumber(value) && SCRIPT_KINDS.has(value);

const createSourceFile = (
  fileName: string,
  text: string,
  ...parseArguments: readonly unknown[]
): SourceFile =>
  parseSourceFile(
    getNormalizedAbsolutePath(fileName, ROOT),
    text,
    Option.liftPredicate(parseArguments[SCRIPT_KIND_AFTER_TEXT], isScriptKind),
  );

const fileFunctions = { bindSourceFile, createSourceFile, getModeForUsageLocation };

export { fileFunctions };
