import { Array as Arr, Option, Schema, pipe } from "effect";

export type Range = readonly [number, number];

export interface Declaration {
  readonly kind: "declaration";
  readonly type: string;
  readonly range: Range;
  readonly names: readonly string[];
}

export interface ImportBinding {
  readonly local: string;
  readonly imported: string;
  readonly typeOnly: boolean;
}

export interface Import {
  readonly kind: "import";
  readonly range: Range;
  readonly from: Range;
  readonly bindings: readonly ImportBinding[];
}

export type Statement = Declaration | Import;

export interface Specifier {
  readonly range: Range;
  readonly local: Option.Option<string>;
  readonly exported: string;
  readonly typeOnly: boolean;
}

export interface ExportList {
  readonly range: Range;
  readonly typeOnly: boolean;
  readonly specifiers: readonly Specifier[];
  readonly body: readonly Statement[];
}

const TYPE_KIND = "type";
const DEFAULT_NAME = "default";
const NAMESPACE_NAME = "*";

const RangeSchema = Schema.Tuple([Schema.Finite, Schema.Finite]);
const KindSchema = Schema.optionalKey(Schema.String);
const IdentifierSchema = Schema.Struct({ type: Schema.Literal("Identifier"), name: Schema.String });
const StringSchema = Schema.Struct({ type: Schema.Literal("Literal"), value: Schema.String });
const NameSchema = Schema.Union([IdentifierSchema, StringSchema]);

const PatternSchema = Schema.Union([
  IdentifierSchema,
  Schema.Struct({
    type: Schema.Literal("ObjectPattern"),
    properties: Schema.Array(Schema.Unknown),
  }),
  Schema.Struct({ type: Schema.Literal("ArrayPattern"), elements: Schema.Array(Schema.Unknown) }),
  Schema.Struct({ type: Schema.Literal("Property"), value: Schema.Unknown }),
  Schema.Struct({ type: Schema.Literal("AssignmentPattern"), left: Schema.Unknown }),
  Schema.Struct({ type: Schema.Literal("RestElement"), argument: Schema.Unknown }),
]);
const decodePattern = Schema.decodeUnknownOption(PatternSchema);

const BindingSchema = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("ImportSpecifier"),
    local: IdentifierSchema,
    imported: NameSchema,
    importKind: KindSchema,
  }),
  Schema.Struct({
    type: Schema.Literals(["ImportDefaultSpecifier", "ImportNamespaceSpecifier"]),
    local: IdentifierSchema,
  }),
]);

const RangedSchema = Schema.Struct({ range: RangeSchema });
const DeclaratorSchema = Schema.Struct({ id: Schema.Unknown });
const ExportSpecifierSchema = Schema.Struct({
  range: RangeSchema,
  local: NameSchema,
  exported: NameSchema,
  exportKind: KindSchema,
});
const ParentSchema = Schema.Struct({ body: Schema.Array(Schema.Unknown) });
const QuotedSchema = Schema.fromJsonString(Schema.String);

const decodeImport = Schema.decodeUnknownOption(
  Schema.Struct({
    type: Schema.Literal("ImportDeclaration"),
    range: RangeSchema,
    source: RangedSchema,
    importKind: KindSchema,
    specifiers: Schema.Array(BindingSchema),
  }),
);
const decodeVariable = Schema.decodeUnknownOption(
  Schema.Struct({
    type: Schema.Literal("VariableDeclaration"),
    range: RangeSchema,
    declarations: Schema.Array(DeclaratorSchema),
  }),
);
const decodeNamed = Schema.decodeUnknownOption(
  Schema.Struct({ type: Schema.String, range: RangeSchema, id: IdentifierSchema }),
);
const decodeList = Schema.decodeUnknownOption(
  Schema.Struct({
    range: RangeSchema,
    source: Schema.Null,
    declaration: Schema.Null,
    exportKind: KindSchema,
    specifiers: Schema.Array(ExportSpecifierSchema),
    parent: ParentSchema,
  }),
);

type Pattern = typeof PatternSchema.Type;
type SinglePattern = Extract<
  Pattern,
  { readonly type: "Property" | "AssignmentPattern" | "RestElement" }
>;
type Binding = typeof BindingSchema.Type;
type Name = typeof NameSchema.Type;

const nameOf = (name: Name): string => {
  if (name.type === "Literal") {
    return name.value;
  }
  return name.name;
};

const identifierOf = (name: Name): Option.Option<string> => {
  if (name.type === "Literal") {
    return Option.none();
  }
  return Option.some(name.name);
};

const childOf = (pattern: SinglePattern): unknown => {
  if (pattern.type === "Property") {
    return pattern.value;
  }
  if (pattern.type === "AssignmentPattern") {
    return pattern.left;
  }
  return pattern.argument;
};

const childrenOf = (pattern: Pattern): readonly unknown[] => {
  if (pattern.type === "ObjectPattern") {
    return pattern.properties;
  }
  if (pattern.type === "ArrayPattern") {
    return pattern.elements;
  }
  if (pattern.type === "Identifier") {
    return [];
  }
  return [childOf(pattern)];
};

const bindingNames = (node: unknown): readonly string[] =>
  pipe(
    decodePattern(node),
    Option.match({
      onNone: () => [],
      onSome: (pattern) => {
        if (pattern.type === "Identifier") {
          return [pattern.name];
        }
        return pipe(childrenOf(pattern), Arr.flatMap(bindingNames));
      },
    }),
  );

const importedOf = (binding: Binding): string => {
  if (binding.type === "ImportSpecifier") {
    if (binding.imported.type === "Literal") {
      const { value } = binding.imported;
      return pipe(
        Schema.encodeOption(QuotedSchema)(value),
        Option.getOrElse(() => value),
      );
    }
    return binding.imported.name;
  }
  if (binding.type === "ImportDefaultSpecifier") {
    return DEFAULT_NAME;
  }
  return NAMESPACE_NAME;
};

const typeOnlyOf = (binding: Binding): boolean =>
  binding.type === "ImportSpecifier" && binding.importKind === TYPE_KIND;

const importOf = (node: unknown): Option.Option<Statement> =>
  pipe(
    decodeImport(node),
    Option.map((statement): Statement => ({
      kind: "import",
      range: statement.range,
      from: statement.source.range,
      bindings: pipe(
        statement.specifiers,
        Arr.map((binding) => ({
          local: binding.local.name,
          imported: importedOf(binding),
          typeOnly: statement.importKind === TYPE_KIND || typeOnlyOf(binding),
        })),
      ),
    })),
  );

const declarationOf = (node: unknown): Option.Option<Statement> =>
  pipe(
    decodeVariable(node),
    Option.map((statement): Statement => ({
      kind: "declaration",
      type: statement.type,
      range: statement.range,
      names: pipe(
        statement.declarations,
        Arr.flatMap((declarator) => bindingNames(declarator.id)),
      ),
    })),
    Option.orElse(() =>
      pipe(
        decodeNamed(node),
        Option.map((statement): Statement => ({
          kind: "declaration",
          type: statement.type,
          range: statement.range,
          names: [statement.id.name],
        })),
      ),
    ),
  );

const statementOf = (node: unknown): Option.Option<Statement> =>
  pipe(
    importOf(node),
    Option.orElse(() => declarationOf(node)),
  );

export const exportListOf = (node: unknown): Option.Option<ExportList> =>
  pipe(
    decodeList(node),
    Option.filter((list) => Arr.isReadonlyArrayNonEmpty(list.specifiers)),
    Option.map((list) => ({
      range: list.range,
      typeOnly: list.exportKind === TYPE_KIND,
      specifiers: pipe(
        list.specifiers,
        Arr.map((specifier) => ({
          range: specifier.range,
          local: identifierOf(specifier.local),
          exported: nameOf(specifier.exported),
          typeOnly: specifier.exportKind === TYPE_KIND,
        })),
      ),
      body: pipe(list.parent.body, Arr.map(statementOf), Arr.getSomes),
    })),
  );
