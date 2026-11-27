import type { BoundSymbol } from "./binder-symbols.ts";

export class SymbolTable {
  readonly #entries = new Map<string, BoundSymbol>();

  public get entries(): ReadonlyMap<string, BoundSymbol> {
    return this.#entries;
  }

  public readonly add = (symbol: BoundSymbol): void => {
    this.#entries.set(symbol.escapedName, symbol);
  };
}
