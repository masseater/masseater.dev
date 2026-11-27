import { Array as Arr, pipe } from "effect";
import { AstUtils, DefaultScopeProvider, StreamScope, UriUtils } from "langium";
import type {
  AstNodeDescription,
  LangiumCoreServices,
  LangiumDocument,
  Scope,
  ScopeProvider,
  URI,
} from "langium";

import { isImport, isImportedSymbol, isSong } from "#generated/langium/ast.ts";
import type { Import } from "#generated/langium/ast.ts";

import type { From } from "./problem.ts";

export const importedUriOf: From<Import, URI> = (node) =>
  UriUtils.resolvePath(UriUtils.dirname(AstUtils.getDocument(node).uri), node.path);

const keyOf: From<URI, From<string, string>> = (uri) => (name) => `${uri.toString()}#${name}`;

const keysOf: From<Import, readonly string[]> = (node) =>
  pipe(
    node.symbols,
    Arr.map((symbol) => keyOf(importedUriOf(node))(symbol.target.$refText)),
  );

const visibleOf: From<LangiumDocument, ReadonlySet<string>> = (document) => {
  const root = document.parseResult.value;
  if (!isSong(root)) {
    return new Set();
  }
  return new Set(
    pipe(
      root.imports,
      Arr.flatMap((node) => keysOf(node)),
    ),
  );
};

const narrowed: From<From<AstNodeDescription, boolean>, From<Scope, Scope>> =
  (keep) => (scope) => ({
    getElement: (name) =>
      scope
        .getElements(name)
        .filter((description) => keep(description))
        .head(),
    getElements: (name) => scope.getElements(name).filter((description) => keep(description)),
    getAllElements: () => scope.getAllElements().filter((description) => keep(description)),
  });

export const scopeProviderOf: From<LangiumCoreServices, ScopeProvider> = (services) => {
  const base = new DefaultScopeProvider(services);
  const { IndexManager } = services.shared.workspace;
  const { AstReflection } = services.shared;
  return {
    getScope: (context): Scope => {
      const { container } = context;
      if (isImportedSymbol(container) && isImport(container.$container)) {
        const source = importedUriOf(container.$container).toString();
        return new StreamScope(
          IndexManager.allElements(AstReflection.getReferenceType(context), new Set([source])),
        );
      }
      const document = AstUtils.getDocument(container);
      const visible = visibleOf(document);
      const own = document.uri.toString();
      return narrowed(
        (description) =>
          description.documentUri.toString() === own ||
          visible.has(keyOf(description.documentUri)(description.name)),
      )(base.getScope(context));
    },
  };
};
