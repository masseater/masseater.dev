import { Array as Arr, Option, Predicate } from "effect";
import { ScriptKind } from "typescript/ast";
import type { Node, SourceFile } from "typescript/ast";
import {
  isExportAssignment,
  isExportDeclaration,
  isExpressionStatement,
  isStringLiteral,
} from "typescript/ast/is";
import { SymbolFlags } from "typescript/sync";

import { createFileSymbol } from "./binder-cjs.ts";
import { declareExport } from "./binder-declarations.ts";
import type { FileBinding, SymbolFlagPair } from "./binder-declarations.ts";
import { bindJSDocTypeAliases } from "./binder-jsdoc.ts";
import { bindFileNodes } from "./binder-walk.ts";

const USE_STRICT = "use strict";

const JSON_EXPORT: SymbolFlagPair = { includes: SymbolFlags.Property, excludes: SymbolFlags.All };

const bindings = new WeakMap<SourceFile, FileBinding>();

const isJsFile = (file: SourceFile): boolean =>
  file.scriptKind === ScriptKind.JS || file.scriptKind === ScriptKind.JSX;

const hasExportDeclarations = (file: SourceFile): boolean =>
  file.statements.some(
    (statement) => isExportDeclaration(statement) || isExportAssignment(statement),
  );

const directiveText = (statement: Node): Option.Option<string> =>
  Option.liftPredicate(statement, isExpressionStatement).pipe(
    Option.map((directive) => directive.expression),
    Option.filter(isStringLiteral),
    Option.map((literal) => literal.text),
  );

const hasUseStrictPrologue = (file: SourceFile): boolean =>
  Arr.takeWhile(file.statements.map(directiveText), Option.isSome).some((text) =>
    Option.contains(text, USE_STRICT),
  );

const createBinding = (file: SourceFile): FileBinding => {
  const isExternalModule =
    Predicate.isNotUndefined(file.externalModuleIndicator) && file.externalModuleIndicator !== true;
  return {
    file,
    locals: new Map(),
    isJs: isJsFile(file),
    exportContext: file.isDeclarationFile && !hasExportDeclarations(file),
    strict: isExternalModule || hasUseStrictPrologue(file),
    isExternalModule,
  };
};

const declareFileSymbol = (binding: FileBinding): void => {
  if (binding.isExternalModule) {
    createFileSymbol(binding);
    return;
  }
  if (binding.file.scriptKind === ScriptKind.JSON) {
    createFileSymbol(binding);
    declareExport(binding, binding.file, JSON_EXPORT);
  }
};

const writableValue = (value: unknown): PropertyDescriptor => ({
  value,
  writable: true,
  configurable: true,
  enumerable: true,
});

const exposeOnSourceFile = (binding: FileBinding): void => {
  Object.defineProperties(binding.file, {
    symbol: writableValue(binding.symbol),
    locals: writableValue(binding.locals),
    commonJsModuleIndicator: writableValue(binding.commonJsModuleIndicator),
  });
};

const bindingOf = (file: SourceFile): Option.Option<FileBinding> =>
  Option.fromNullishOr(bindings.get(file));

const bindSourceFile = (file: SourceFile): void => {
  if (bindings.has(file)) {
    return;
  }
  const binding = createBinding(file);
  bindings.set(file, binding);
  declareFileSymbol(binding);
  const nodes = bindFileNodes(binding);
  if (binding.isJs) {
    bindJSDocTypeAliases(binding, nodes);
  }
  exposeOnSourceFile(binding);
};

export { bindSourceFile, bindingOf };
