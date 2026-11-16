import { Array as Arr, Option, pipe } from "effect";
import type { Context, ESTree, Rule } from "vite-plus/lint/plugins";

const NAMESPACE = "*";
const DEFAULT = "default";

export interface ImportBan {
  readonly module: string;
  readonly names: Option.Option<readonly string[]>;
  readonly typesAllowed: boolean;
}

export interface MemberBan {
  readonly object: string;
  readonly properties: readonly string[];
}

export interface Intent {
  readonly message: string;
  readonly imports: readonly ImportBan[];
  readonly members: readonly MemberBan[];
}

const importedName = (specifier: ESTree.ImportDeclarationSpecifier): string => {
  if (specifier.type === "ImportDefaultSpecifier") {
    return DEFAULT;
  }
  if (specifier.type === "ImportNamespaceSpecifier") {
    return NAMESPACE;
  }
  if (specifier.imported.type === "Identifier") {
    return specifier.imported.name;
  }
  return specifier.imported.value;
};

const isTypeOnly = (
  node: ESTree.ImportDeclaration,
  specifier: ESTree.ImportDeclarationSpecifier,
): boolean =>
  node.importKind === "type" ||
  (specifier.type === "ImportSpecifier" && specifier.importKind === "type");

const isBannedSpecifier =
  (node: ESTree.ImportDeclaration, ban: ImportBan, names: readonly string[]) =>
  (specifier: ESTree.ImportDeclarationSpecifier): boolean =>
    !(ban.typesAllowed && isTypeOnly(node, specifier)) &&
    Arr.contains([NAMESPACE, ...names], importedName(specifier));

const wholeImport = (node: ESTree.ImportDeclaration, ban: ImportBan): readonly ESTree.Node[] => {
  if (ban.typesAllowed && node.importKind === "type") {
    return [];
  }
  return [node];
};

const bannedIn =
  (node: ESTree.ImportDeclaration) =>
  (ban: ImportBan): readonly ESTree.Node[] => {
    if (node.source.value !== ban.module) {
      return [];
    }
    return Option.match(ban.names, {
      onNone: () => wholeImport(node, ban),
      onSome: (names): readonly ESTree.Node[] =>
        pipe(node.specifiers, Arr.filter(isBannedSpecifier(node, ban, names))),
    });
  };

const propertyOf = (node: ESTree.MemberExpression): Option.Option<string> => {
  if (!node.computed && node.property.type === "Identifier") {
    return Option.some(node.property.name);
  }
  if (node.property.type === "Literal" && typeof node.property.value === "string") {
    return Option.some(node.property.value);
  }
  return Option.none();
};

const isBannedMember =
  (node: ESTree.MemberExpression) =>
  (ban: MemberBan): boolean =>
    node.object.type === "Identifier" &&
    node.object.name === ban.object &&
    pipe(
      propertyOf(node),
      Option.exists((property) => Arr.contains(ban.properties, property)),
    );

const reportImports = (context: Context, intent: Intent, node: ESTree.ImportDeclaration): void => {
  const banned = pipe(intent.imports, Arr.flatMap(bannedIn(node)));
  for (const found of banned) {
    context.report({ node: found, message: intent.message });
  }
};

export const ruleOf = (intent: Intent): Rule => ({
  meta: { type: "problem" },
  create: (context) => ({
    ImportDeclaration: (node): void => {
      reportImports(context, intent, node);
    },
    MemberExpression: (node): void => {
      if (pipe(intent.members, Arr.some(isBannedMember(node)))) {
        context.report({ node, message: intent.message });
      }
    },
  }),
});
