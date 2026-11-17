import { fileURLToPath } from "node:url";

import treeSitter from "@vscode/tree-sitter-wasm";
import { Effect, Option } from "effect";

export type Language = treeSitter.Language;

export type SyntaxNode = treeSitter.Node;

const PARSER_KEY = "parser";

const parsers = new Map<string, Promise<void>>();

const languages = new Map<string, Promise<Language>>();

const once = <A>(
  started: Map<string, Promise<A>>,
  key: string,
  start: () => Promise<A>,
): Promise<A> => {
  const running = started.get(key);
  if (running !== undefined) {
    return running;
  }
  const promise = start();
  started.set(key, promise);
  return promise;
};

const grammarFile = (grammar: string): string =>
  fileURLToPath(import.meta.resolve(`@vscode/tree-sitter-wasm/wasm/tree-sitter-${grammar}.wasm`));

export const loadLanguage = (grammar: string): Effect.Effect<Language, unknown> =>
  Effect.tryPromise({
    try: () =>
      once(parsers, PARSER_KEY, () => treeSitter.Parser.init()).then(() =>
        once(languages, grammar, () => treeSitter.Language.load(grammarFile(grammar))),
      ),
    catch: (cause) => cause,
  });

export const readTree = <A>(
  language: Language,
  source: string,
  read: (root: SyntaxNode) => A,
): Option.Option<A> => {
  const parser = new treeSitter.Parser();
  parser.setLanguage(language);
  const tree = parser.parse(source);
  parser.delete();
  if (tree === null) {
    return Option.none();
  }
  const result = read(tree.rootNode);
  tree.delete();
  return Option.some(result);
};
