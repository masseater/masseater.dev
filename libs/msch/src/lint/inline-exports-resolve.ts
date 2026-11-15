import { Array as Arr, Option, pipe } from "effect";

import type {
  Declaration,
  ExportList,
  Import,
  ImportBinding,
  Specifier,
  Statement,
} from "./inline-exports-source.ts";

export interface DeclarationResolution {
  readonly kind: "declaration";
  readonly statements: readonly Declaration[];
}

export interface ImportResolution {
  readonly kind: "import";
  readonly statement: Import;
  readonly binding: ImportBinding;
}

export interface DefaultResolution {
  readonly kind: "default";
  readonly name: string;
}

export type Resolution = DeclarationResolution | ImportResolution | DefaultResolution;

export interface Resolved {
  readonly specifier: Specifier;
  readonly resolution: Option.Option<Resolution>;
}

const DEFAULT_NAME = "default";
const CLASS_DECLARATION = "ClassDeclaration";
const TYPE_DECLARATIONS: ReadonlySet<string> = new Set([
  "TSTypeAliasDeclaration",
  "TSInterfaceDeclaration",
]);

export const isTypeOnly =
  (list: ExportList) =>
  (specifier: Specifier): boolean =>
    list.typeOnly || specifier.typeOnly;

const exportsAsItself =
  (list: ExportList) =>
  (name: string): boolean =>
    pipe(
      list.specifiers,
      Arr.some(
        (specifier) => Option.contains(specifier.local, name) && specifier.exported === name,
      ),
    );

const declarationOf =
  (list: ExportList, specifier: Specifier) =>
  (statements: readonly Declaration[]): Option.Option<Resolution> => {
    const whole = pipe(
      statements,
      Arr.every((statement) => pipe(statement.names, Arr.every(exportsAsItself(list)))),
    );
    const keepsKind =
      !isTypeOnly(list)(specifier) ||
      pipe(
        statements,
        Arr.every((statement) => TYPE_DECLARATIONS.has(statement.type)),
      );
    if (!whole || !keepsKind) {
      return Option.none();
    }
    return Option.some({ kind: "declaration", statements });
  };

const declarationsNamed = (list: ExportList, name: string): readonly Declaration[] =>
  pipe(
    list.body,
    Arr.filter(
      (statement): statement is Declaration =>
        statement.kind === "declaration" && pipe(statement.names, Arr.contains(name)),
    ),
  );

const importIn =
  (name: string) =>
  (statement: Statement): Option.Option<Resolution> => {
    if (statement.kind !== "import") {
      return Option.none();
    }
    return pipe(
      statement.bindings,
      Arr.findFirst((binding) => binding.local === name),
      Option.map((binding): Resolution => ({ kind: "import", statement, binding })),
    );
  };

export const isTypeOnlyClass =
  (list: ExportList) =>
  (specifier: Specifier): boolean =>
    isTypeOnly(list)(specifier) &&
    pipe(
      specifier.local,
      Option.exists((local) => {
        const statements = declarationsNamed(list, local);
        return (
          Arr.isReadonlyArrayNonEmpty(statements) &&
          pipe(
            statements,
            Arr.every((statement) => statement.type === CLASS_DECLARATION),
          )
        );
      }),
    );

const resolutionOf =
  (list: ExportList) =>
  (specifier: Specifier): Option.Option<Resolution> =>
    pipe(
      specifier.local,
      Option.flatMap((local): Option.Option<Resolution> => {
        if (specifier.exported === DEFAULT_NAME) {
          return Option.some({ kind: "default", name: local });
        }
        if (local !== specifier.exported) {
          return Option.none();
        }
        const statements = declarationsNamed(list, local);
        if (Arr.isReadonlyArrayNonEmpty(statements)) {
          return declarationOf(list, specifier)(statements);
        }
        return pipe(list.body, Arr.findFirst(importIn(local)));
      }),
    );

export const kindOf =
  <Kind extends Resolution["kind"]>(kind: Kind) =>
  (resolved: Resolved): readonly Extract<Resolution, { readonly kind: Kind }>[] =>
    pipe(
      resolved.resolution,
      Option.filter(
        (found): found is Extract<Resolution, { readonly kind: Kind }> => found.kind === kind,
      ),
      Option.toArray,
    );

export const restOf = (resolved: readonly Resolved[]): readonly Specifier[] =>
  pipe(
    resolved,
    Arr.filter((entry) => Option.isNone(entry.resolution)),
    Arr.map((entry) => entry.specifier),
  );

export const resolvedOf = (list: ExportList): readonly Resolved[] =>
  pipe(
    list.specifiers,
    Arr.map((specifier) => ({ specifier, resolution: resolutionOf(list)(specifier) })),
  );
