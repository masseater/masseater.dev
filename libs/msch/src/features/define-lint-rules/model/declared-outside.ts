import { Array as Arr, Option, pipe } from "effect";
import { SymbolFlags } from "typescript/sync";
import type { NodeHandle, Project, Symbol as TypeSymbol } from "typescript/sync";

export type Origin = "own" | "package" | "builtin";

const origins = new WeakMap<TypeSymbol, Origin>();
const readonlyForms = new WeakMap<Project, Map<string, Option.Option<string>>>();

const fileOrigin = (project: Project, handle: NodeHandle): Option.Option<Origin> =>
  pipe(
    Option.fromNullishOr(project.program.getSourceFileMetadataByPath(handle.path)),
    Option.flatMap(({ isDefaultLibrary, isFromExternalLibrary }): Option.Option<Origin> => {
      if (isDefaultLibrary) {
        return Option.some("builtin");
      }
      if (isFromExternalLibrary) {
        return Option.some("package");
      }
      return Option.none();
    }),
  );

const declarationOrigin =
  (project: Project) =>
  (handle: NodeHandle): Origin =>
    pipe(
      fileOrigin(project, handle),
      Option.orElse(() =>
        pipe(
          Option.fromNullishOr(handle.resolve(project)),
          Option.filter((node) => node.getSourceFile().isDeclarationFile),
          Option.as<Origin>("package"),
        ),
      ),
      Option.getOrElse((): Origin => "own"),
    );

export const originOf =
  (project: Project) =>
  (symbol: TypeSymbol): Origin =>
    origins.getOrInsertComputed(symbol, () => {
      const found = pipe(symbol.declarations, Arr.map(declarationOrigin(project)));
      if (Arr.contains(found, "builtin")) {
        return "builtin";
      }
      if (Arr.contains(found, "package")) {
        return "package";
      }
      return "own";
    });

const builtinNamed =
  (project: Project) =>
  (name: string): Option.Option<string> =>
    pipe(
      Option.fromNullishOr(project.checker.resolveName(name, SymbolFlags.Type)),
      Option.filter((symbol) => originOf(project)(symbol) === "builtin"),
      Option.as(name),
    );

export const readonlyFormOf =
  (project: Project) =>
  (name: string): Option.Option<string> =>
    readonlyForms
      .getOrInsertComputed(project, () => new Map<string, Option.Option<string>>())
      .getOrInsertComputed(name, () =>
        pipe([`Readonly${name}`, `${name}ReadOnly`], Arr.findFirst(builtinNamed(project))),
      );
