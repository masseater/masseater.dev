import { Option, Predicate } from "effect";
import type { BinaryExpression, CallExpression, Node } from "typescript/ast";
import {
  isBinaryExpression,
  isCallExpression,
  isIdentifier,
  isObjectLiteralExpression,
  isSourceFile,
} from "typescript/ast/is";
import { SymbolFlags } from "typescript/sync";

import {
  bindExportsPropertyAssignment,
  forEachIdentifierInEntityName,
  isExportsOrModuleExportsOrAlias,
  lookupIdentifier,
} from "./binder-cjs.ts";
import { declare, exportsOf } from "./binder-declarations.ts";
import type { FileBinding, Scope, SymbolFlagPair } from "./binder-declarations.ts";
import {
  hasFunctionLikeExpandoInitializer,
  isExpandoSymbol,
  isFunctionSymbol,
} from "./binder-expando-symbol.ts";
import { addDeclarationToSymbol, exportOf } from "./binder-symbols.ts";
import type { BoundSymbol } from "./binder-symbols.ts";
import {
  getElementOrPropertyAccessName,
  isAccessExpression,
  isDynamicElementAccess,
} from "./binder-syntax.ts";
import type { AccessExpression } from "./binder-syntax.ts";
import { EMPTY, combineFlags, hasFlag, withFlags, withoutFlags } from "./flags.ts";

const DESCRIPTOR_ARGUMENT = 2;

const NAMESPACE_FLAGS: SymbolFlagPair = {
  includes: combineFlags(SymbolFlags.Module, SymbolFlags.Assignment),
  excludes: withoutFlags(SymbolFlags.ValueModuleExcludes, SymbolFlags.Assignment),
};

const METHOD_FLAGS: SymbolFlagPair = {
  includes: SymbolFlags.Method,
  excludes: SymbolFlags.MethodExcludes,
};

const PROPERTY_FLAGS: SymbolFlagPair = {
  includes: SymbolFlags.Property,
  excludes: SymbolFlags.PropertyExcludes,
};

const ACCESSOR_FLAGS: readonly (readonly [string, SymbolFlagPair])[] = [
  [
    "set",
    {
      includes: combineFlags(SymbolFlags.SetAccessor, SymbolFlags.Property),
      excludes: SymbolFlags.SetAccessorExcludes,
    },
  ],
  [
    "get",
    {
      includes: combineFlags(SymbolFlags.GetAccessor, SymbolFlags.Property),
      excludes: SymbolFlags.GetAccessorExcludes,
    },
  ],
];

const lookupSymbolForPropertyAccess = (
  binding: FileBinding,
  node: Node,
): Option.Option<BoundSymbol> => {
  if (isIdentifier(node)) {
    return lookupIdentifier(binding, node);
  }
  if (!isAccessExpression(node)) {
    return Option.none();
  }
  const parent = lookupSymbolForPropertyAccess(binding, node.expression);
  return getElementOrPropertyAccessName(node).pipe(
    Option.flatMap((name) => parent.pipe(Option.flatMap((owner) => exportOf(owner, name)))),
  );
};

const isAliasSymbol = (symbol: Option.Option<BoundSymbol>): boolean =>
  Option.exists(symbol, (found) => hasFlag(found.flags, SymbolFlags.Alias));

const addNamespaceDeclaration =
  (binding: FileBinding) =>
  (
    name: Node,
    symbol: Option.Option<BoundSymbol>,
    parent: Option.Option<BoundSymbol>,
  ): Option.Option<BoundSymbol> => {
    if (Option.isSome(symbol)) {
      addDeclarationToSymbol(symbol.value, name, NAMESPACE_FLAGS.includes);
      return symbol;
    }
    return parent.pipe(
      Option.map((owner) =>
        declare(binding, {
          target: exportsOf(Option.some(owner)),
          node: name,
          flags: NAMESPACE_FLAGS,
        }),
      ),
    );
  };

const bindMissingNamespaces = (
  binding: FileBinding,
  entityName: Node,
): Option.Option<BoundSymbol> =>
  forEachIdentifierInEntityName(binding, {
    node: entityName,
    containerIsFile: true,
    action: addNamespaceDeclaration(binding),
  });

const descriptorPropertyNames = (call: CallExpression): readonly string[] => {
  const descriptor = call.arguments[DESCRIPTOR_ARGUMENT];
  if (Predicate.isUndefined(descriptor) || !isObjectLiteralExpression(descriptor)) {
    return [];
  }
  return descriptor.properties.flatMap((property) => {
    if ("name" in property && isIdentifier(property.name)) {
      return [property.name.text];
    }
    return [];
  });
};

const accessorFlags = (call: CallExpression): SymbolFlagPair => {
  const names = descriptorPropertyNames(call);
  const matched = ACCESSOR_FLAGS.filter(([name]) => names.includes(name)).map(([, flags]) => flags);
  return {
    includes: combineFlags(...matched.map((flags) => flags.includes)),
    excludes: combineFlags(...matched.map((flags) => flags.excludes)),
  };
};

const expandoMemberFlags = (declaration: Node): SymbolFlagPair => {
  if (hasFunctionLikeExpandoInitializer(declaration)) {
    return METHOD_FLAGS;
  }
  if (isCallExpression(declaration)) {
    const accessors = accessorFlags(declaration);
    if (accessors.includes !== EMPTY) {
      return accessors;
    }
  }
  return PROPERTY_FLAGS;
};

const bindExpandoMember = (
  binding: FileBinding,
  declaration: Node,
  namespace: Option.Option<BoundSymbol>,
): void => {
  const owner = namespace.pipe(Option.filter(isExpandoSymbol));
  if (Option.isNone(owner)) {
    return;
  }
  owner.value.exports ??= new Map();
  const flags = expandoMemberFlags(declaration);
  declare(binding, {
    target: exportsOf(owner),
    node: declaration,
    flags: {
      includes: withFlags(flags.includes, SymbolFlags.Assignment),
      excludes: withoutFlags(flags.excludes, SymbolFlags.Assignment),
    },
  });
};

const parentOfBinaryChain = (node: Node): Node => {
  let current = node;
  while (isBinaryExpression(current.parent)) {
    current = current.parent;
  }
  return current.parent;
};

const isTopLevelNamespaceAssignment = (access: AccessExpression): boolean => {
  if (isBinaryExpression(access.parent)) {
    return isSourceFile(parentOfBinaryChain(access.parent).parent);
  }
  return isSourceFile(access.parent.parent);
};

const namespaceFor = (
  binding: FileBinding,
  target: Node,
  isTopLevel: boolean,
): Option.Option<BoundSymbol> => {
  const found = lookupSymbolForPropertyAccess(binding, target);
  if (isTopLevel && !isAliasSymbol(found)) {
    return bindMissingNamespaces(binding, target);
  }
  return found;
};

const leftmostRoot = (node: Node): Node => {
  let current = node;
  while (isAccessExpression(current)) {
    current = current.expression;
  }
  return current;
};

const skipsPropertyAssignment = (binding: FileBinding, left: AccessExpression): boolean =>
  (!binding.isJs && !isFunctionSymbol(lookupSymbolForPropertyAccess(binding, left.expression))) ||
  isAliasSymbol(lookupIdentifier(binding, leftmostRoot(left)));

const bindPropertyOfNamespace = (binding: FileBinding, left: AccessExpression): void => {
  const namespace = namespaceFor(binding, left.expression, isTopLevelNamespaceAssignment(left));
  if (!isDynamicElementAccess(left)) {
    bindExpandoMember(binding, left, namespace);
  }
};

const bindableAccess = (
  binding: FileBinding,
  node: BinaryExpression,
  scope: Scope,
): Option.Option<AccessExpression> =>
  Option.liftPredicate(node.left, isAccessExpression).pipe(
    Option.filter((left) => scope.containerIsFile && !skipsPropertyAssignment(binding, left)),
  );

const isExportsAliasAccess = (binding: FileBinding, left: AccessExpression): boolean =>
  isIdentifier(left.expression) && isExportsOrModuleExportsOrAlias(binding, left.expression);

const bindSpecialPropertyAssignment = (
  binding: FileBinding,
  node: BinaryExpression,
  scope: Scope,
): void => {
  const left = bindableAccess(binding, node, scope);
  if (Option.isNone(left)) {
    return;
  }
  if (isExportsAliasAccess(binding, left.value)) {
    bindExportsPropertyAssignment(binding, node, scope);
    return;
  }
  bindPropertyOfNamespace(binding, left.value);
};

const bindObjectDefinePropertyAssignment = (
  binding: FileBinding,
  call: CallExpression,
  scope: Scope,
): void => {
  const [target] = call.arguments;
  if (!scope.containerIsFile || Predicate.isUndefined(target)) {
    return;
  }
  const isTopLevel = isSourceFile(call.parent.parent);
  bindExpandoMember(binding, call, namespaceFor(binding, target, isTopLevel));
};

export { bindObjectDefinePropertyAssignment, bindSpecialPropertyAssignment };
