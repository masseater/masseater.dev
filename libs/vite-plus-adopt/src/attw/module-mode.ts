import { Array as Arr, Option } from "effect";
import { SyntaxKind } from "typescript/ast";
import type {
  ExportDeclaration,
  ImportDeclaration,
  JSDocImportTag,
  Node,
  SourceFile,
} from "typescript/ast";
import {
  isCallExpression,
  isExportDeclaration,
  isIdentifier,
  isImportAttributes,
  isImportClause,
  isImportDeclaration,
  isImportEqualsDeclaration,
  isImportTypeNode,
  isJSDocImportTag,
  isParenthesizedExpression,
  isStringLiteralLikeNode,
} from "typescript/ast/is";

import { fileExtensionIsOneOf } from "./extensions.ts";
import type { ResolutionKind, ResolutionMode } from "./resolution-types.ts";
import { impliedNodeFormatOf, packageJsonScopeOf } from "./source-file.ts";

type EmitModuleKind = "CommonJS" | "ESNext" | "Node16";

interface ModeOptions {
  readonly moduleResolution: ResolutionKind;
  readonly module: EmitModuleKind;
}

const SINGLE = 1;
const RESOLUTION_MODES: ReadonlyMap<string, ResolutionMode> = new Map([
  ["import", "ESNext"],
  ["require", "CommonJS"],
]);

const resolutionModeOf = (text: string): Option.Option<ResolutionMode> =>
  Option.fromNullishOr(RESOLUTION_MODES.get(text));

const isTypeOnlyImport = (clause: Node | undefined): boolean =>
  Option.fromNullishOr(clause).pipe(
    Option.filter((node) => isImportClause(node)),
    Option.exists((node) => node.phaseModifier === SyntaxKind.TypeKeyword),
  );

const resolutionModeOverride = (attributes: Node | undefined): Option.Option<ResolutionMode> =>
  Option.fromNullishOr(attributes).pipe(
    Option.filter((node) => isImportAttributes(node)),
    Option.map((node) => node.attributes),
    Option.filter((elements) => elements.length === SINGLE),
    Option.flatMap((elements) => Arr.head(elements)),
    Option.filter(
      (element) => isStringLiteralLikeNode(element.name) && element.name.text === "resolution-mode",
    ),
    Option.flatMap((element) =>
      Option.liftPredicate(element.value, (value) => isStringLiteralLikeNode(value)),
    ),
    Option.flatMap((value) => resolutionModeOf(value.text)),
  );

type TypeOnlyStatement = ExportDeclaration | ImportDeclaration | JSDocImportTag;

const isTypeOnlyExport = (node: Node): node is ExportDeclaration =>
  isExportDeclaration(node) && node.isTypeOnly;

const isImportStatement = (node: Node): node is ImportDeclaration | JSDocImportTag =>
  isImportDeclaration(node) || isJSDocImportTag(node);

const isTypeOnlyImportStatement = (node: Node): node is ImportDeclaration | JSDocImportTag =>
  isImportStatement(node) && isTypeOnlyImport(node.importClause);

const isTypeOnlyStatement = (node: Node): node is TypeOnlyStatement =>
  isTypeOnlyExport(node) || isTypeOnlyImportStatement(node);

const typeOnlyOverride = (usage: Node): Option.Option<ResolutionMode> =>
  Option.liftPredicate(usage.parent, isTypeOnlyStatement).pipe(
    Option.flatMap((statement) => resolutionModeOverride(statement.attributes)),
  );

const importTypeOverride = (usage: Node): Option.Option<ResolutionMode> =>
  Option.fromNullishOr(usage.parent.parent).pipe(
    Option.filter((node) => isImportTypeNode(node)),
    Option.flatMap((node) => resolutionModeOverride(node.attributes)),
  );

const importSyntaxAffectsModuleResolution = (options: ModeOptions): boolean =>
  options.moduleResolution !== "Node10";

interface ExplicitFormat {
  readonly format: ResolutionMode;
  readonly scopeType: string;
  readonly extensions: readonly string[];
}

const EXPLICIT_FORMATS: readonly ExplicitFormat[] = [
  { format: "CommonJS", scopeType: "commonjs", extensions: [".cjs", ".cts"] },
  { format: "ESNext", scopeType: "module", extensions: [".mjs", ".mts"] },
];

const declaresFormat = (
  sourceFile: SourceFile,
  scopeType: Option.Option<unknown>,
  explicit: ExplicitFormat,
): boolean =>
  Option.contains(scopeType, explicit.scopeType) ||
  fileExtensionIsOneOf(sourceFile.fileName, explicit.extensions);

const explicitFormatOf = (
  sourceFile: SourceFile,
  implied: Option.Option<ResolutionMode>,
): Option.Option<ResolutionMode> => {
  const scopeType = packageJsonScopeOf(sourceFile).pipe(
    Option.map((scope) => scope.contents.packageJsonContent["type"]),
  );
  const matching = EXPLICIT_FORMATS.find(
    (explicit) =>
      Option.contains(implied, explicit.format) && declaresFormat(sourceFile, scopeType, explicit),
  );
  return Option.fromNullishOr(matching).pipe(Option.map((explicit) => explicit.format));
};

const impliedNodeFormatForEmit = (
  sourceFile: SourceFile,
  options: ModeOptions,
): Option.Option<ResolutionMode> => {
  const implied = impliedNodeFormatOf(sourceFile);
  if (options.module === "Node16") {
    return implied;
  }
  return explicitFormatOf(sourceFile, implied);
};

const emitModuleFormat = (sourceFile: SourceFile, options: ModeOptions): EmitModuleKind =>
  impliedNodeFormatForEmit(sourceFile, options).pipe(Option.getOrElse(() => options.module));

const walkUpParentheses = (node: Node): Node => {
  let current = node;
  while (isParenthesizedExpression(current)) {
    current = current.parent;
  }
  return current;
};

const isRequireCall = (node: Node): boolean =>
  isCallExpression(node) &&
  isIdentifier(node.expression) &&
  node.expression.text === "require" &&
  node.arguments.length === SINGLE;

const isImportCall = (node: Node): boolean =>
  isCallExpression(node) && node.expression.kind === SyntaxKind.ImportKeyword;

const importCallMode = (sourceFile: SourceFile, options: ModeOptions): ResolutionMode => {
  if (options.module !== "Node16" && emitModuleFormat(sourceFile, options) === "CommonJS") {
    return "CommonJS";
  }
  return "ESNext";
};

const isCommonJsSyntax = (container: Node, usage: Node): boolean =>
  isImportEqualsDeclaration(container.parent) || isRequireCall(usage.parent);

const emitSyntaxForUsage = (
  sourceFile: SourceFile,
  usage: Node,
  options: ModeOptions,
): Option.Option<ResolutionMode> => {
  const container = walkUpParentheses(usage.parent);
  if (isCommonJsSyntax(container, usage)) {
    return Option.some("CommonJS");
  }
  if (isImportCall(container)) {
    return Option.some(importCallMode(sourceFile, options));
  }
  return Option.liftPredicate(
    emitModuleFormat(sourceFile, options),
    (format): format is ResolutionMode => format !== "Node16",
  );
};

const getModeForUsageLocation = (
  sourceFile: SourceFile,
  usage: Node,
  options: ModeOptions,
): Option.Option<ResolutionMode> =>
  typeOnlyOverride(usage).pipe(
    Option.orElse(() => importTypeOverride(usage)),
    Option.orElse(() =>
      Option.liftPredicate(options, importSyntaxAffectsModuleResolution).pipe(
        Option.flatMap(() => emitSyntaxForUsage(sourceFile, usage, options)),
      ),
    ),
  );

const getDefaultResolutionModeForFile = (
  sourceFile: SourceFile,
  options: ModeOptions,
): Option.Option<ResolutionMode> =>
  Option.liftPredicate(options, importSyntaxAffectsModuleResolution).pipe(
    Option.flatMap(() => impliedNodeFormatForEmit(sourceFile, options)),
  );

export { getDefaultResolutionModeForFile, getModeForUsageLocation };
export type { EmitModuleKind, ModeOptions };
