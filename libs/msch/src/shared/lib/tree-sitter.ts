import { fileURLToPath } from "node:url";

import treeSitter from "@vscode/tree-sitter-wasm";
import { Effect, Option, Schema } from "effect";

export type Language = treeSitter.Language;

export type SyntaxNode = treeSitter.Node;

export interface TreeReading<Result> {
  readonly language: Language;
  readonly source: string;
  readonly read: (root: SyntaxNode) => Result;
}

const taggedError = Schema.TaggedError;

export class GrammarUnreadable extends taggedError<
  GrammarUnreadable,
  { readonly brand: unique symbol }
>()("GrammarUnreadable", { grammar: Schema.String, message: Schema.String }) {}

const PARSER_KEY = "parser";

const cache = <Value>(): ((key: string, start: () => Promise<Value>) => Promise<Value>) => {
  const started = new Map<string, Promise<Value>>();
  return (key, start) =>
    Option.getOrElse(Option.fromNullishOr(started.get(key)), () => {
      const promise = start();
      started.set(key, promise);
      return promise;
    });
};

const initParser = cache<unknown>();

const loadOnce = cache<Language>();

const grammarFile = (grammar: string): string =>
  fileURLToPath(import.meta.resolve(`@vscode/tree-sitter-wasm/wasm/tree-sitter-${grammar}.wasm`));

export const loadLanguage = (grammar: string): Effect.Effect<Language, GrammarUnreadable> => {
  const unreadable = (cause: unknown): GrammarUnreadable =>
    GrammarUnreadable.make({ grammar, message: String(cause) });
  return Effect.tryPromise({
    try: () => initParser(PARSER_KEY, () => treeSitter.Parser.init()),
    catch: unreadable,
  }).pipe(
    Effect.andThen(
      Effect.tryPromise({
        try: () => loadOnce(grammar, () => treeSitter.Language.load(grammarFile(grammar))),
        catch: unreadable,
      }),
    ),
  );
};

export const readTree = <Result>({
  language,
  source,
  read,
}: TreeReading<Result>): Option.Option<Result> => {
  const parser = new treeSitter.Parser();
  parser.setLanguage(language);
  const tree = parser.parse(source);
  parser.delete();
  return Option.map(Option.fromNullishOr(tree), (parsed) => {
    const result = read(parsed.rootNode);
    parsed.delete();
    return result;
  });
};
