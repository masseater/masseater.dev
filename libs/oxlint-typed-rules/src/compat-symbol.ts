import { Array as Arr, Option, pipe } from "effect";
import type { Node } from "typescript/ast";
import type { NodeHandle, Project, Symbol as NativeSymbol, SymbolFlags } from "typescript/sync";

const resolveAll = (project: Project, handles: readonly NodeHandle[]): readonly Node[] =>
  pipe(
    handles,
    Arr.flatMap((handle) => Option.fromNullishOr(handle.resolve(project)).pipe(Option.toArray)),
  );

interface LegacySymbol {
  readonly getName: () => string;
  readonly getDeclarations: () => readonly Node[];
}

class CompatSymbol implements LegacySymbol {
  static readonly #interned = new WeakMap<NativeSymbol, CompatSymbol>();

  public readonly native: NativeSymbol;

  public readonly flags: SymbolFlags;

  public readonly name: string;

  readonly #project: Project;

  #declarations: readonly Node[] | undefined;

  private constructor(project: Project, native: NativeSymbol) {
    this.#project = project;
    this.native = native;
    this.flags = native.flags;
    this.name = native.name;
  }

  public static intern(project: Project, native: NativeSymbol): CompatSymbol {
    return Option.fromNullishOr(CompatSymbol.#interned.get(native)).pipe(
      Option.getOrElse(() => {
        const created = new CompatSymbol(project, native);
        CompatSymbol.#interned.set(native, created);
        return created;
      }),
    );
  }

  public static optional(
    project: Project,
    native: NativeSymbol | undefined,
  ): CompatSymbol | undefined {
    return Option.fromNullishOr(native).pipe(
      Option.map((symbol) => CompatSymbol.intern(project, symbol)),
      Option.getOrUndefined,
    );
  }

  public get declarations(): readonly Node[] {
    this.#declarations ??= resolveAll(this.#project, this.native.declarations);
    return this.#declarations;
  }

  public getName(): string {
    return this.name;
  }

  public getDeclarations(): readonly Node[] {
    return this.declarations;
  }
}

export type { LegacySymbol };
export { CompatSymbol };
