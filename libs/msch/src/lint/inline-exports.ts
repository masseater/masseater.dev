import { Array as Arr, Option, pipe } from "effect";
import type { ESTree, Fix, Fixer, Plugin, Rule, SourceCode } from "vite-plus/lint/plugins";

type Statement = ESTree.Directive | ESTree.Statement;
type Binding = ESTree.BindingPattern | ESTree.BindingRestElement;
type ImportBinding =
  | ESTree.ImportSpecifier
  | ESTree.ImportDefaultSpecifier
  | ESTree.ImportNamespaceSpecifier;

type Resolution =
  | { readonly kind: "declaration"; readonly statements: readonly Statement[] }
  | {
      readonly kind: "import";
      readonly source: ESTree.ImportDeclaration;
      readonly binding: ImportBinding;
    }
  | { readonly kind: "default"; readonly name: string };

const DEFAULT_NAME = "default";
const TYPE_DECLARATIONS = new Set(["TSTypeAliasDeclaration", "TSInterfaceDeclaration"]);

const MESSAGE =
  "export は宣言に付ける（export const・export function など）。ファイルの末尾で export { … } にまとめない。";

const nameOf = (name: ESTree.ModuleExportName): string =>
  name.type === "Literal" ? name.value : name.name;

const bindingNames = (pattern: Binding): readonly string[] => {
  switch (pattern.type) {
    case "Identifier": {
      return [pattern.name];
    }
    case "ObjectPattern": {
      return pattern.properties.flatMap((property) =>
        bindingNames(property.type === "Property" ? property.value : property),
      );
    }
    case "ArrayPattern": {
      return pattern.elements.flatMap((element) => (element === null ? [] : bindingNames(element)));
    }
    case "AssignmentPattern": {
      return bindingNames(pattern.left);
    }
    case "RestElement": {
      return bindingNames(pattern.argument);
    }
  }
};

const declaredNames = (statement: Statement): readonly string[] => {
  if (statement.type === "VariableDeclaration") {
    return statement.declarations.flatMap((declarator) => bindingNames(declarator.id));
  }
  return "id" in statement && statement.id?.type === "Identifier" ? [statement.id.name] : [];
};

const importBindingOf = (
  statement: Statement,
  name: string,
): Option.Option<readonly [ESTree.ImportDeclaration, ImportBinding]> =>
  statement.type === "ImportDeclaration"
    ? pipe(
        statement.specifiers,
        Arr.findFirst((specifier) => specifier.local.name === name),
        Option.map((binding) => [statement, binding] as const),
      )
    : Option.none();

const isTypeOnly = (
  node: ESTree.ExportNamedDeclaration,
  specifier: ESTree.ExportSpecifier,
): boolean => node.exportKind === "type" || specifier.exportKind === "type";

const resolve = (
  body: readonly Statement[],
  node: ESTree.ExportNamedDeclaration,
  specifier: ESTree.ExportSpecifier,
): Option.Option<Resolution> => {
  const local = nameOf(specifier.local);
  const exported = nameOf(specifier.exported);
  if (exported === DEFAULT_NAME && specifier.local.type !== "Literal") {
    return Option.some({ kind: "default", name: local });
  }
  if (local !== exported || specifier.local.type === "Literal") {
    return Option.none();
  }
  const statements = body.filter((statement) => declaredNames(statement).includes(local));
  if (statements.length > 0) {
    const exportsWhole = statements.every((statement) =>
      declaredNames(statement).every((name) =>
        node.specifiers.some(
          (other) => nameOf(other.local) === name && nameOf(other.exported) === name,
        ),
      ),
    );
    const keepsKind =
      !isTypeOnly(node, specifier) ||
      statements.every((statement) => TYPE_DECLARATIONS.has(statement.type));
    return exportsWhole && keepsKind
      ? Option.some({ kind: "declaration", statements })
      : Option.none();
  }
  return pipe(
    body,
    Arr.findFirst((statement) => importBindingOf(statement, local)),
    Option.map(([source, binding]) => ({ kind: "import", source, binding })),
  );
};

const importedName = (binding: ImportBinding): string => {
  switch (binding.type) {
    case "ImportSpecifier": {
      return nameOf(binding.imported);
    }
    case "ImportDefaultSpecifier": {
      return DEFAULT_NAME;
    }
    case "ImportNamespaceSpecifier": {
      return "*";
    }
  }
};

const reexportOf = (
  sourceCode: SourceCode,
  source: ESTree.ImportDeclaration,
  bindings: readonly ImportBinding[],
  typeOnly: boolean,
): string => {
  const from = sourceCode.getText(source.source);
  const keyword = typeOnly ? "export type" : "export";
  const [namespace] = bindings.filter((binding) => binding.type === "ImportNamespaceSpecifier");
  if (namespace !== undefined) {
    return `${keyword} * as ${namespace.local.name} from ${from};`;
  }
  const names = bindings.map((binding) => {
    const imported = importedName(binding);
    return imported === binding.local.name ? imported : `${imported} as ${binding.local.name}`;
  });
  return `${keyword} { ${names.join(", ")} } from ${from};`;
};

const usedOutside = (
  sourceCode: SourceCode,
  binding: ImportBinding,
  node: ESTree.ExportNamedDeclaration,
): boolean =>
  sourceCode
    .getDeclaredVariables(binding)
    .flatMap((variable) => variable.references)
    .some(
      (reference) =>
        reference.identifier.range[0] < node.range[0] ||
        reference.identifier.range[1] > node.range[1],
    );

type Plan = {
  readonly declarations: readonly Statement[];
  readonly reexports: readonly string[];
  readonly removedImports: readonly ESTree.ImportDeclaration[];
  readonly rest: readonly ESTree.ExportSpecifier[];
};

const planOf = (
  sourceCode: SourceCode,
  body: readonly Statement[],
  node: ESTree.ExportNamedDeclaration,
): Plan => {
  const resolved = node.specifiers.map((specifier) => ({
    specifier,
    resolution: resolve(body, node, specifier),
  }));
  const declarations = Arr.dedupe(
    resolved.flatMap(({ resolution }) =>
      Option.isSome(resolution) && resolution.value.kind === "declaration"
        ? resolution.value.statements
        : [],
    ),
  );
  const defaults = resolved.flatMap(({ resolution }) =>
    Option.isSome(resolution) && resolution.value.kind === "default"
      ? [`export default ${resolution.value.name};`]
      : [],
  );
  const imports = resolved.flatMap(({ specifier, resolution }) =>
    Option.isSome(resolution) && resolution.value.kind === "import"
      ? [{ ...resolution.value, typeOnly: isTypeOnly(node, specifier) }]
      : [],
  );
  const sources = Arr.dedupe(imports.map(({ source }) => source));
  const groups = sources.flatMap((source) =>
    [false, true].flatMap((typeOnly) => {
      const bindings = imports
        .filter((entry) => entry.source === source && entry.typeOnly === typeOnly)
        .map(({ binding }) => binding);
      return bindings.length === 0 ? [] : [{ source, bindings, typeOnly }];
    }),
  );
  const reexports = groups.flatMap(({ source, bindings, typeOnly }) =>
    bindings.some((binding) => binding.type === "ImportNamespaceSpecifier") && bindings.length > 1
      ? bindings.map((binding) => reexportOf(sourceCode, source, [binding], typeOnly))
      : [reexportOf(sourceCode, source, bindings, typeOnly)],
  );
  const removedImports = sources.filter((source) =>
    source.specifiers.every(
      (binding) =>
        imports.some((entry) => entry.binding === binding) &&
        !usedOutside(sourceCode, binding, node),
    ),
  );
  const rest = resolved.flatMap(({ specifier, resolution }) =>
    Option.isNone(resolution) ? [specifier] : [],
  );
  return { declarations, reexports: [...defaults, ...reexports], removedImports, rest };
};

const replacementOf = (
  sourceCode: SourceCode,
  node: ESTree.ExportNamedDeclaration,
  plan: Plan,
): string => {
  const keyword = node.exportKind === "type" ? "export type" : "export";
  const list =
    plan.rest.length === 0
      ? []
      : [
          `${keyword} { ${plan.rest.map((specifier) => sourceCode.getText(specifier)).join(", ")} };`,
        ];
  return [...list, ...plan.reexports].join("\n");
};

const lineStartOf = (sourceCode: SourceCode, offset: number): number =>
  sourceCode.text.lastIndexOf("\n", offset - 1) + 1;

const indentOf = (sourceCode: SourceCode, offset: number): string =>
  sourceCode.text.slice(lineStartOf(sourceCode, offset), offset);

const removeLines = (
  fixer: Fixer,
  sourceCode: SourceCode,
  [start, end]: readonly [number, number],
): Fix => {
  const lineStart = lineStartOf(sourceCode, start);
  const indented = indentOf(sourceCode, start).trim() === "";
  return fixer.removeRange([
    indented ? lineStart : start,
    sourceCode.text[end] === "\n" ? end + 1 : end,
  ]);
};

const leadingCommentsOf = (sourceCode: SourceCode, node: Readonly<ESTree.Node>): string =>
  sourceCode
    .getCommentsBefore(node)
    .map((comment) => sourceCode.text.slice(comment.range[0], comment.range[1]))
    .join("\n");

const exportPrefixOf = (sourceCode: SourceCode, comments: string, statement: Statement): string =>
  comments === "" || leadingCommentsOf(sourceCode, statement).includes(comments)
    ? "export "
    : `${comments}\n${indentOf(sourceCode, statement.range[0])}export `;

const fixesOf = (
  fixer: Fixer,
  sourceCode: SourceCode,
  node: ESTree.ExportNamedDeclaration,
  plan: Plan,
): readonly Fix[] => {
  const replacement = replacementOf(sourceCode, node, plan);
  const comments = leadingCommentsOf(sourceCode, node);
  const [first] = sourceCode.getCommentsBefore(node);
  return [
    ...plan.declarations.map((statement) =>
      fixer.insertTextBefore(statement, exportPrefixOf(sourceCode, comments, statement)),
    ),
    ...plan.removedImports.map((source) => removeLines(fixer, sourceCode, source.range)),
    replacement === ""
      ? removeLines(fixer, sourceCode, [first === undefined ? node.range[0] : first.range[0], node.range[1]])
      : fixer.replaceText(node, replacement),
  ];
};

const bodyOf = (node: ESTree.ExportNamedDeclaration): readonly Statement[] =>
  node.parent.type === "Program" || node.parent.type === "TSModuleBlock" ? node.parent.body : [];

const inlineExports: Rule = {
  meta: { type: "suggestion", fixable: "code" },
  create: (context) => ({
    ExportNamedDeclaration: (node) => {
      if (node.source !== null || node.declaration !== null || node.specifiers.length === 0) {
        return;
      }
      const plan = planOf(context.sourceCode, bodyOf(node), node);
      const fixable = plan.rest.length < node.specifiers.length;
      context.report({
        node,
        message: MESSAGE,
        ...(fixable ? { fix: (fixer) => [...fixesOf(fixer, context.sourceCode, node, plan)] } : {}),
      });
    },
  }),
};

const plugin: Plugin & { readonly meta: { readonly name: string } } = {
  meta: { name: "msch-lint" },
  rules: { "inline-exports": inlineExports },
};

export default plugin;
